package cn.kanban.skill;

import cn.jiebaba.summer.ai.chat.ChatClient;
import cn.jiebaba.summer.ai.chat.ChatModel;
import cn.jiebaba.summer.ai.chat.ChatResponse;
import cn.jiebaba.summer.ai.chat.ChatResponseMetadata;
import cn.jiebaba.summer.ai.model.openai.OpenAiCompatibleChatModel;
import cn.jiebaba.summer.ai.tools.Tool;
import cn.jiebaba.summer.ai.tools.ToolCallback;
import cn.jiebaba.summer.ai.tools.ToolCallingChatModel;
import cn.jiebaba.summer.ai.tools.ToolParameter;
import cn.jiebaba.summer.ai.vectorstore.RetrievalResult;
import cn.jiebaba.summer.ai.vectorstore.SearchRequest;
import cn.jiebaba.summer.ai.vectorstore.VectorStore;
import cn.jiebaba.summer.core.annotation.Autowired;
import cn.jiebaba.summer.core.annotation.PostConstruct;
import cn.jiebaba.summer.core.annotation.Service;
import cn.jiebaba.summer.core.context.ApplicationContext;
import cn.jiebaba.summer.core.util.JsonUtil;
import cn.kanban.entity.AiCallLog;
import cn.kanban.mapper.AiCallLogMapper;
import cn.kanban.service.AiConfigService;

import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URI;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.sql.Timestamp;
import java.time.Duration;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.logging.Logger;

/**
 * 技能对话服务：LLM 自选技能（load_skill 工具）+ 工具式 RAG（search_references 工具）。
 * <p>装配方式为在本服务内部按 AiConfigService 解析的生效配置（ai_config 表优先、application.yml 兜底）
 * 手动构造模型并包装 {@link ToolCallingChatModel}（工具对象不注册为 bean），
 * 全局 {@code summer.ai.tools.enabled} 保持 false，因此 {@code AiAssistantService} 的
 * 纯 JSON 输出流程不受工具定义干扰。</p>
 * <p>原技能包中 chart-visualization / icon-retrieval 两个技能靠模型执行 curl 工作，
 * 这里改写为 Java 侧 HTTP 工具（generate_chart_image / search_icon），模型只需触发工具调用。</p>
 */
@Service
public class SkillChatService {

    private static final Logger LOG = Logger.getLogger(SkillChatService.class.getName());

    private static final String GPT_VIS_API = "https://antv-studio.alipay.com/api/gpt-vis";
    private static final String ICON_API = "https://lab.weavefox.cn/api/v1/infographic/icon";

    private final SkillRegistry skillRegistry;
    private final ApplicationContext context;

    @Autowired
    private AiConfigService aiConfigService;

    @Autowired
    private AiCallLogMapper aiCallLogMapper;

    private List<ToolCallback> tools;
    private String systemPrompt;

    public SkillChatService(SkillRegistry skillRegistry, ApplicationContext context) {
        this.skillRegistry = skillRegistry;
        this.context = context;
    }

    @PostConstruct
    public void init() {
        this.tools = List.of(
                loadSkillTool(), searchReferencesTool(), chartImageTool(), iconTool());
        this.systemPrompt = buildSystemPrompt();
    }

    /**
     * 技能对话主入口：模型按 system prompt 自选技能、按需检索参考后产出回答。
     * 模型客户端按 AiConfigService 解析的生效配置每次现构造（ai_config 表优先、yml 兜底），
     * 页面改配置后即时生效；成功/失败均落 ai_call_log（source 为 "skill-chat"，含 token 用量）。
     */
    public String chat(Long userId, Long projectId, String message) {
        long start = System.currentTimeMillis();
        AiConfigService.ResolvedConfig config = aiConfigService.resolve(AiConfigService.KEY_ASSISTANT);
        if (!config.configured()) {
            return "AI 未配置：请联系管理员在「系统设置 → AI 配置」中配置对话模型"
                    + "（技能对话需要支持工具调用的模型）。";
        }
        ChatModel model = new OpenAiCompatibleChatModel(config.baseUrl(), config.apiKey(), config.model(),
                Duration.ofSeconds(config.timeoutSeconds()), 0.2, config.maxTokens());
        ChatClient client = ChatClient.create(new ToolCallingChatModel(model, tools));
        String reply = null;
        String error = null;
        ChatResponseMetadata meta = null;
        try {
            ChatResponse resp = client.prompt(systemPrompt).user(message).call();
            reply = resp.content();
            meta = resp.metadata();
        } catch (Exception e) {
            error = e.getMessage();
        }
        log(userId, projectId, message, reply, error, (int) (System.currentTimeMillis() - start), meta);
        if (error != null) {
            throw new RuntimeException("技能对话模型调用失败：" + error);
        }
        return reply;
    }

    /** 探测向量化模型维度（embed-test 端点用）；模型未就绪时抛异常。 */
    public int embeddingDimensions() {
        return context.getBean(cn.jiebaba.summer.ai.embedding.EmbeddingModel.class).dimensions();
    }

    /**
     * 落库一条技能对话调用日志；日志写入失败不影响主流程。
     */
    private void log(Long userId, Long projectId, String message, String reply, String error,
                     int duration, ChatResponseMetadata meta) {
        try {
            AiCallLog rec = new AiCallLog();
            rec.userId = userId;
            rec.projectId = projectId;
            rec.componentId = null;
            rec.componentType = null;
            rec.instruction = truncate(message, 500);
            rec.requestPayload = null;
            rec.responseRaw = truncate(reply, 4000);
            rec.status = error == null ? "OK" : "ERROR";
            rec.error = error;
            rec.durationMs = duration;
            rec.source = "skill-chat";
            if (meta != null) {
                rec.promptTokens = meta.promptTokens();
                rec.completionTokens = meta.completionTokens();
                rec.totalTokens = meta.totalTokens();
            }
            rec.createdAt = new Timestamp(System.currentTimeMillis());
            aiCallLogMapper.insert(rec);
        } catch (Exception ignored) {
            // 日志失败不影响主流程
        }
    }

    private static String truncate(String s, int max) {
        if (s == null) return null;
        return s.length() <= max ? s : s.substring(0, max);
    }

    /** 惰性解析向量库 bean：未启用 pgvector 或 BGE-M3 资产缺失时返回 null 而非让服务不可用。 */
    private VectorStore vectorStoreOrNull() {
        try {
            return context.getBean(VectorStore.class);
        } catch (RuntimeException e) {
            LOG.warning("向量库不可用：" + e.getMessage());
            return null;
        }
    }

    /** load_skill 工具：返回技能指令正文，模型的技能自选入口。 */
    private Tool loadSkillTool() {
        return new Tool("load_skill",
                "加载指定技能的完整指令（SKILL.md 正文）。当用户请求与某个可用技能匹配时必须先调用本工具，"
                        + "然后严格按返回的指令工作。",
                List.of(ToolParameter.string("name", "技能名，见 system prompt 中的可用技能列表")),
                args -> {
                    String name = str(args, "name");
                    String body = skillRegistry.body(name);
                    if (body == null) {
                        return Map.of("error", "技能不存在：" + name,
                                "available", String.join(", ", skillRegistry.names()));
                    }
                    return Map.of("skill", name, "instructions", body);
                });
    }

    /** search_references 工具：按技能过滤的 pgvector 语义检索，返回编号片段与来源。 */
    private Tool searchReferencesTool() {
        return new Tool("search_references",
                "在指定技能的参考文档库中做语义检索，返回最相关的文档片段。load_skill 之后，"
                        + "当技能正文中的速查信息不足以完成任务（需要配置细节、用法示例）时调用。",
                List.of(
                        ToolParameter.string("skill", "技能名（须为已 load 的技能）"),
                        ToolParameter.string("query", "检索问题，用简洁关键词描述要找的内容"),
                        ToolParameter.integer("top_k", "返回条数，1-10，一般取 5")),
                args -> {
                    VectorStore vs = vectorStoreOrNull();
                    if (vs == null) {
                        return Map.of("error", "参考文档库未就绪（向量库不可用），请依据技能正文直接作答");
                    }
                    String skill = str(args, "skill");
                    String query = str(args, "query");
                    int topK = intArg(args, "top_k", 5);
                    topK = Math.max(1, Math.min(10, topK));
                    List<RetrievalResult> results = vs.similaritySearch(SearchRequest.builder()
                            .query(query).topK(topK).filter("skill", skill).build());
                    List<Map<String, Object>> hits = new ArrayList<>(results.size());
                    for (RetrievalResult r : results) {
                        Map<String, Object> hit = new LinkedHashMap<>();
                        hit.put("source", String.valueOf(r.document().metadata().get("source")));
                        hit.put("score", Math.round(r.score() * 1000.0) / 1000.0);
                        hit.put("content", r.document().content());
                        hits.add(hit);
                    }
                    return Map.of("skill", skill, "hits", hits);
                });
    }

    /** generate_chart_image 工具：替代 chart-visualization 技能的 curl，POST gpt-vis 生成图表图片。 */
    private Tool chartImageTool() {
        return new Tool("generate_chart_image",
                "调用 AntV gpt-vis API 生成图表图片，返回图片 URL。data 的 JSON 结构随图表类型而定，"
                        + "须遵循 chart-visualization 技能中「各图表 data 格式」的说明。",
                List.of(
                        ToolParameter.string("type", "图表类型，如 line/bar/column/pie/area/scatter/radar/funnel 等"),
                        ToolParameter.string("data", "图表数据的 JSON 字符串（数组或对象，按图表类型而定）"),
                        ToolParameter.string("title", "图表标题，可为空字符串")),
                args -> {
                    Map<String, Object> body = new LinkedHashMap<>();
                    body.put("type", str(args, "type"));
                    body.put("source", "chart-visualization-skills");
                    body.put("data", JsonUtil.parse(str(args, "data")));
                    body.put("title", str(args, "title"));
                    String resp;
                    try {
                        resp = httpPostJson(GPT_VIS_API, JsonUtil.toJsonStr(body));
                    } catch (IOException e) {
                        return Map.of("error", "gpt-vis 请求异常：" + e.getMessage());
                    }
                    JsonUtil.JSONObject json = JsonUtil.parseObj(resp);
                    if (Boolean.TRUE.equals(json.get("success"))) {
                        String url = json.getStr("resultObj");
                        return Map.of("imageUrl", url,
                                "markdown", "![" + str(args, "title") + "](" + url + ")");
                    }
                    return Map.of("error", "gpt-vis 生成失败：" + resp);
                });
    }

    /** search_icon 工具：替代 icon-retrieval 技能的 curl，GET 图标检索 API 返回 SVG 图标 URL 列表。 */
    private Tool iconTool() {
        return new Tool("search_icon",
                "按关键词检索图标，返回 SVG 图标 URL 列表（可直接用于页面或信息图）。",
                List.of(
                        ToolParameter.string("text", "图标概念关键词，如 security、document、data analysis"),
                        ToolParameter.integer("top_k", "返回条数，1-20，默认 5")),
                args -> {
                    int topK = Math.max(1, Math.min(20, intArg(args, "top_k", 5)));
                    String url = ICON_API + "?text="
                            + URLEncoder.encode(str(args, "text"), StandardCharsets.UTF_8)
                            + "&topK=" + topK;
                    String resp;
                    try {
                        resp = httpGet(url);
                    } catch (IOException e) {
                        return Map.of("error", "图标检索请求异常：" + e.getMessage());
                    }
                    JsonUtil.JSONObject json = JsonUtil.parseObj(resp);
                    if (Boolean.TRUE.equals(json.get("success"))) {
                        return Map.of("icons", json.get("data"));
                    }
                    return Map.of("error", "图标检索失败：" + resp);
                });
    }

    /**
     * 拼装 system prompt：角色 + 可用技能索引（name/description 承担路由）+ 工作规则。
     * 技能正文不进 system prompt，由模型经 load_skill 按需拉取（渐进披露）。
     */
    private String buildSystemPrompt() {
        StringBuilder sb = new StringBuilder();
        sb.append("你是看板可视化图表生成助手，精通 AntV 可视化体系（G2/G6/X6/S2）及图表图片、图标生成。\n\n");
        sb.append("## 可用技能\n");
        sb.append("当用户请求与以下某个技能匹配时，必须先调用 load_skill 加载该技能的完整指令，再严格按指令工作：\n");
        for (SkillInfo info : skillRegistry.index()) {
            sb.append("- ").append(info.name()).append("：").append(info.description()).append('\n');
        }
        sb.append("\n## 工作规则\n");
        sb.append("1. 先 load_skill，再按技能指令完成任务；指令中提到的 references 链接不要试图直接读取，"
                + "需要细节文档时调用 search_references 检索。\n");
        sb.append("2. 生成图表图片用 generate_chart_image，检索图标用 search_icon，不要用 curl 或其他方式访问网络。\n");
        sb.append("3. 需要可视化代码（G2/G6/X6/S2）时，严格遵循所加载技能中的版本约束与禁止模式。\n");
        sb.append("4. 用中文回答，代码保持原文。\n");
        return sb.toString();
    }

    private static String str(Map<String, Object> args, String key) {
        Object v = args.get(key);
        return v == null ? "" : String.valueOf(v);
    }

    private static int intArg(Map<String, Object> args, String key, int def) {
        Object v = args.get(key);
        if (v instanceof Number n) {
            return n.intValue();
        }
        if (v instanceof String s) {
            try {
                return Integer.parseInt(s.trim());
            } catch (NumberFormatException ignored) {
                return def;
            }
        }
        return def;
    }

    /** POST JSON 请求并读取响应体（30s 超时）。 */
    private static String httpPostJson(String url, String jsonBody) throws IOException {
        HttpURLConnection conn = (HttpURLConnection) URI.create(url).toURL().openConnection();
        conn.setRequestMethod("POST");
        conn.setRequestProperty("Content-Type", "application/json");
        conn.setConnectTimeout(30_000);
        conn.setReadTimeout(30_000);
        conn.setDoOutput(true);
        try (OutputStream os = conn.getOutputStream()) {
            os.write(jsonBody.getBytes(StandardCharsets.UTF_8));
        }
        return readResponse(conn);
    }

    /** GET 请求并读取响应体（20s 超时）。 */
    private static String httpGet(String url) throws IOException {
        HttpURLConnection conn = (HttpURLConnection) URI.create(url).toURL().openConnection();
        conn.setRequestMethod("GET");
        conn.setConnectTimeout(20_000);
        conn.setReadTimeout(20_000);
        return readResponse(conn);
    }

    private static String readResponse(HttpURLConnection conn) throws IOException {
        InputStream is = conn.getResponseCode() < 400 ? conn.getInputStream() : conn.getErrorStream();
        if (is == null) {
            return "";
        }
        try (is) {
            return new String(is.readAllBytes(), StandardCharsets.UTF_8);
        } finally {
            conn.disconnect();
        }
    }
}
