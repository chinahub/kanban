package cn.kanban.service;

import cn.jiebaba.summer.ai.chat.ChatClient;
import cn.jiebaba.summer.ai.chat.ChatResponse;
import cn.jiebaba.summer.ai.chat.ChatResponseMetadata;
import cn.jiebaba.summer.ai.model.openai.OpenAiCompatibleChatModel;
import cn.jiebaba.summer.core.annotation.Autowired;
import cn.jiebaba.summer.core.annotation.Service;
import cn.jiebaba.summer.core.util.JsonUtil;
import cn.jiebaba.summer.core.util.JsonUtil.JSONObject;
import cn.kanban.dto.AiAssistRequest;
import cn.kanban.dto.AiAssistResponse;
import cn.kanban.entity.AiCallLog;
import cn.kanban.mapper.AiCallLogMapper;

import java.sql.Timestamp;
import java.time.Duration;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * AI 助手核心服务：把"自然语言改组件"转化为可应用的属性变更（PRD §7.1 阶段5）。
 * 大模型调用配置经 AiConfigService 解析（ai_config 表优先、application.yml 的 summer.ai.* 兜底），
 * 每次调用手动构造 OpenAI 兼容客户端；未配置 Key 或调用失败时降级为本地规则匹配；
 * 两种路径均落 ai_call_log（source 为 "ai-assist"，AI 路径含 token 用量）。
 */
@Service
public class AiAssistantService {

    private static final Pattern HEX_COLOR = Pattern.compile("#([0-9a-fA-F]{6})");
    private static final Pattern FONT_SIZE_NUM = Pattern.compile("(?:字号|到|为|成)\\s*(\\d+)");

    private static final Map<String, String> COLOR_WORDS = Map.ofEntries(
            Map.entry("红", "ff0000"), Map.entry("蓝", "1890ff"), Map.entry("绿", "52c41a"),
            Map.entry("黄", "fadb14"), Map.entry("紫", "722ed1"), Map.entry("橙", "fa8c16"),
            Map.entry("白", "ffffff"), Map.entry("黑", "000000"), Map.entry("粉", "eb2f96"),
            Map.entry("青", "13c2c2"), Map.entry("灰", "8c8c8c"), Map.entry("金", "d4b106"));

    private static final String SYSTEM_PROMPT =
            "你是看板可视化组件的样式助手。用户用自然语言描述对某个组件的修改意图，"
                    + "你需要输出需要变更的属性 JSON 对象。\n"
                    + "仅输出一个 JSON 对象，不要包含任何解释文字，不要使用 markdown 代码块。\n"
                    + "示例输出：{\"color\":\"#ff0000\",\"fontSize\":32}\n\n"
                    + "组件类型与可修改属性：\n"
                    + "- title（标题）、text（文本）：text（文本内容，字符串）、fontSize（字号，正整数）、"
                    + "color（颜色 #rrggbb）、fontWeight（字重，正整数，常规 400 粗体 700）\n"
                    + "- line（折线图）、bar（柱状图）、pie（饼图）、area（区域图）、scatter（散点图）、"
                    + "radar（雷达图）、funnel（漏斗图）、rose（玫瑰图）：title（图表标题，字符串）、color（主色 #rrggbb）\n\n"
                    + "约束：\n"
                    + "- 颜色必须为 #rrggbb 六位十六进制。\n"
                    + "- 数值属性必须为正整数。\n"
                    + "- 只包含需要修改的属性，未提及的不要输出。\n"
                    + "- 若无法理解用户意图，输出 {}。";

    @Autowired
    private AiConfigService aiConfigService;

    @Autowired
    private AiCallLogMapper aiCallLogMapper;

    /**
     * 处理一次自然语言改组件请求：调用大模型或本地降级，返回可应用的属性变更。
     * 大模型调用失败时自动降级本地规则，并记录 error；全程落 ai_call_log。
     */
    public AiAssistResponse assist(Long userId, Long projectId, AiAssistRequest req) {
        long start = System.currentTimeMillis();
        String type = req.componentType() == null ? "" : req.componentType().trim();
        String instruction = req.instruction() == null ? "" : req.instruction().trim();
        JSONObject currentProps = parseProps(req.componentProps());

        String source;
        String raw;
        Map<String, Object> changes;
        String error = null;

        AiConfigService.ResolvedConfig config = aiConfigService.resolve(AiConfigService.KEY_ASSISTANT);
        ChatResponseMetadata meta = null;
        if (config.configured()) {
            try {
                ChatClient client = ChatClient.create(new OpenAiCompatibleChatModel(
                        config.baseUrl(), config.apiKey(), config.model(),
                        Duration.ofSeconds(config.timeoutSeconds()), 0.2, config.maxTokens()));
                ChatResponse resp = client.prompt(SYSTEM_PROMPT)
                        .user(buildUserContent(type, currentProps, instruction))
                        .call();
                String content = resp.content();
                meta = resp.metadata();
                source = "ai";
                raw = content;
                changes = sanitize(type, extractJson(content));
            } catch (Exception e) {
                error = "AI 调用失败：" + e.getMessage() + "（已降级本地规则）";
                source = "local";
                raw = "local";
                changes = localFallback(type, currentProps, instruction);
            }
        } else {
            source = "local";
            raw = "local";
            changes = localFallback(type, currentProps, instruction);
        }

        int duration = (int) (System.currentTimeMillis() - start);
        Long logId = log(userId, projectId, req, type, instruction, raw, error, duration, meta);
        JSONObject changesJson = new JSONObject();
        changesJson.putAll(changes);
        return new AiAssistResponse(JsonUtil.toJsonStr(changesJson), source, raw, logId, error);
    }

    private String buildUserContent(String type, JSONObject props, String instruction) {
        return "组件类型：" + type + "\n当前属性："
                + (props == null ? "{}" : JsonUtil.toJsonStr(props))
                + "\n用户指令：" + instruction;
    }

    private JSONObject parseProps(String json) {
        if (json == null || json.isBlank()) return new JSONObject();
        try {
            return JsonUtil.parseObj(json);
        } catch (Exception e) {
            return new JSONObject();
        }
    }

    /**
     * 从模型返回文本中提取首个 JSON 对象；兼容 markdown 代码块包裹。
     */
    private JSONObject extractJson(String content) {
        if (content == null || content.isBlank()) return new JSONObject();
        String s = content.trim();
        if (s.startsWith("```")) {
            int nl = s.indexOf('\n');
            if (nl >= 0) s = s.substring(nl + 1);
            if (s.endsWith("```")) s = s.substring(0, s.length() - 3);
            s = s.trim();
        }
        int start = s.indexOf('{');
        int end = s.lastIndexOf('}');
        if (start < 0 || end <= start) return new JSONObject();
        try {
            return JsonUtil.parseObj(s.substring(start, end + 1));
        } catch (Exception e) {
            return new JSONObject();
        }
    }

    /**
     * 清洗模型输出：按组件类型只保留允许的属性键，并规范颜色与数值类型。
     */
    private Map<String, Object> sanitize(String type, JSONObject json) {
        Map<String, Object> out = new LinkedHashMap<>();
        if (json == null) return out;
        boolean isText = "title".equals(type) || "text".equals(type);
        String color = normalizeColor(json.getStr("color"));
        if (color != null) out.put("color", color);
        if (isText) {
            String text = json.getStr("text");
            if (text != null) out.put("text", text);
            Integer fs = toInt(json.getStr("fontSize"));
            if (fs != null && fs > 0) out.put("fontSize", fs);
            Integer fw = toInt(json.getStr("fontWeight"));
            if (fw != null && fw > 0) out.put("fontWeight", fw);
        } else {
            String title = json.getStr("title");
            if (title != null) out.put("title", title);
        }
        return out;
    }

    /**
     * 本地降级规则匹配：无大模型 Key 或调用失败时，用关键词与正则识别常见改样式意图。
     * 支持颜色（关键词/十六进制）、字号（调大/调小/设为 N）、加粗/变细、文本与标题内容修改。
     */
    private Map<String, Object> localFallback(String type, JSONObject props, String instruction) {
        Map<String, Object> out = new LinkedHashMap<>();
        if (instruction == null || instruction.isBlank()) return out;
        boolean isText = "title".equals(type) || "text".equals(type);

        String color = matchColor(instruction);
        if (color != null) out.put("color", color);

        if (isText) {
            Integer fs = matchFontSize(instruction, props);
            if (fs != null) out.put("fontSize", fs);
            if (instruction.contains("加粗")) {
                out.put("fontWeight", 700);
            } else if (containsAny(instruction, "变细", "取消加粗", "不加粗", "常规")) {
                out.put("fontWeight", 400);
            }
            String text = matchContent(instruction, true);
            if (text != null) out.put("text", text);
        } else {
            String title = matchContent(instruction, false);
            if (title != null) out.put("title", title);
        }
        return out;
    }

    private String matchColor(String instruction) {
        if (instruction == null) return null;
        Matcher m = HEX_COLOR.matcher(instruction);
        if (m.find()) return "#" + m.group(1).toLowerCase();
        for (Map.Entry<String, String> e : COLOR_WORDS.entrySet()) {
            if (instruction.contains(e.getKey())) return "#" + e.getValue();
        }
        return null;
    }

    private String normalizeColor(String s) {
        if (s == null) return null;
        String t = s.trim();
        Matcher m = Pattern.compile("^#?([0-9a-fA-F]{6})$").matcher(t);
        if (m.matches()) return "#" + m.group(1).toLowerCase();
        for (Map.Entry<String, String> e : COLOR_WORDS.entrySet()) {
            if (t.contains(e.getKey())) return "#" + e.getValue();
        }
        return null;
    }

    /**
     * 识别字号修改意图：优先取"字号/到/为/成 N"中的显式数字，其次按调大/调小按比例缩放。
     */
    private Integer matchFontSize(String instruction, JSONObject props) {
        if (instruction == null) return null;
        int current = 18;
        if (props != null) {
            Integer c = toInt(props.getStr("fontSize"));
            if (c != null && c > 0) current = c;
        }
        Matcher m = FONT_SIZE_NUM.matcher(instruction);
        if (m.find()) {
            Integer v = toInt(m.group(1));
            if (v != null && v > 0) return v;
        }
        boolean bigger = containsAny(instruction, "调大", "增大", "放大", "大一点");
        boolean smaller = containsAny(instruction, "调小", "减小", "缩小", "小一点");
        if (bigger) return Math.max(8, (int) Math.round(current * 1.25));
        if (smaller) return Math.max(8, (int) Math.round(current * 0.8));
        return null;
    }

    /**
     * 识别文本/标题内容修改：在指令中定位"改为/改成/设为"等标记，取其后内容并去除引号。
     * isText 为 true 时可识别文本类组件的内容（文本/文字/标题等表述均映射到 text）。
     */
    private String matchContent(String instruction, boolean isText) {
        if (instruction == null) return null;
        if (isText) {
            if (!containsAny(instruction, "文本", "文字", "内容", "标题", "改成", "改为", "设为", "换成")) return null;
        } else if (!instruction.contains("标题")) {
            return null;
        }
        String[] markers = {"改为", "改成", "设为", "修改为", "换成"};
        for (String mk : markers) {
            int idx = instruction.indexOf(mk);
            if (idx >= 0) {
                String after = stripQuotes(instruction.substring(idx + mk.length()).trim());
                if (!after.isEmpty()) return after;
            }
        }
        return null;
    }

    private static String stripQuotes(String s) {
        if (s.length() >= 2) {
            char f = s.charAt(0);
            char l = s.charAt(s.length() - 1);
            if (isQuote(f) && isQuote(l)) return s.substring(1, s.length() - 1).trim();
        }
        return s;
    }

    private static boolean isQuote(char c) {
        return c == '"' || c == '\'' || c == '\u201c' || c == '\u201d' || c == '\u2018' || c == '\u2019';
    }

    private static boolean containsAny(String s, String... keys) {
        for (String k : keys) {
            if (s.contains(k)) return true;
        }
        return false;
    }

    private static Integer toInt(Object o) {
        if (o == null) return null;
        if (o instanceof Number n) return n.intValue();
        if (o instanceof String s) {
            try {
                return Integer.parseInt(s.trim());
            } catch (NumberFormatException ignored) {
                return null;
            }
        }
        return null;
    }

    /**
     * 落库一条 AI 调用日志；日志写入失败不影响主流程，返回日志ID（可能为 null）。
     */
    private Long log(Long userId, Long projectId, AiAssistRequest req, String type, String instruction,
                     String raw, String error, int duration, ChatResponseMetadata meta) {
        try {
            AiCallLog rec = new AiCallLog();
            rec.userId = userId;
            rec.projectId = projectId;
            rec.componentId = req.componentId();
            rec.componentType = type;
            rec.instruction = instruction;
            rec.requestPayload = truncate(buildUserContent(type, parseProps(req.componentProps()), instruction), 2000);
            rec.responseRaw = truncate(raw, 4000);
            rec.status = error == null ? "OK" : "ERROR";
            rec.error = error;
            rec.durationMs = duration;
            rec.source = "ai-assist";
            if (meta != null) {
                rec.promptTokens = meta.promptTokens();
                rec.completionTokens = meta.completionTokens();
                rec.totalTokens = meta.totalTokens();
            }
            rec.createdAt = new Timestamp(System.currentTimeMillis());
            aiCallLogMapper.insert(rec);
            return rec.id;
        } catch (Exception e) {
            return null;
        }
    }

    private static String truncate(String s, int max) {
        if (s == null) return null;
        return s.length() <= max ? s : s.substring(0, max);
    }
}
