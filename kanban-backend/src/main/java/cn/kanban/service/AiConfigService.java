package cn.kanban.service;

import cn.jiebaba.summer.ai.chat.ChatModel;
import cn.jiebaba.summer.ai.chat.ChatResponse;
import cn.jiebaba.summer.ai.chat.Message;
import cn.jiebaba.summer.ai.chat.Prompt;
import cn.jiebaba.summer.ai.chat.UserMessage;
import cn.jiebaba.summer.ai.chat.content.ImageUrlPart;
import cn.jiebaba.summer.ai.chat.content.TextPart;
import cn.jiebaba.summer.ai.model.openai.OpenAiCompatibleChatModel;
import cn.jiebaba.summer.core.annotation.Autowired;
import cn.jiebaba.summer.core.annotation.Service;
import cn.jiebaba.summer.core.env.Environment;
import cn.jiebaba.summer.data.conditions.QueryWrapper;
import cn.kanban.dto.AiConfigDto;
import cn.kanban.dto.AiConfigSaveRequest;
import cn.kanban.dto.AiConfigTestResponse;
import cn.kanban.entity.AiConfig;
import cn.kanban.mapper.AiConfigMapper;
import cn.kanban.util.CryptoUtil;

import java.sql.Timestamp;
import java.time.Duration;
import java.util.List;

/**
 * AI 模型配置服务：平台级配置的读取（DB 优先、application.yml 兜底）与页面化保存。
 * api-key 一律以 CryptoUtil AES-256-GCM 密文落库，对外只输出脱敏串；
 * 每次调用现查数据库，页面保存后无需重启即可生效。
 */
@Service
public class AiConfigService {

    /** 配置键：LADV 视觉模型。 */
    public static final String KEY_LADV = "ladv";
    /** 配置键：AI 助手与技能对话共用的对话模型。 */
    public static final String KEY_ASSISTANT = "assistant";

    /** 允许的配置键集合。 */
    public static final List<String> KEYS = List.of(KEY_LADV, KEY_ASSISTANT);

    /** application.yml 中的占位 Key：等于该值视为未配置。 */
    private static final String PLACEHOLDER_API_KEY = "sk-configure-me";

    @Autowired
    private Environment environment;

    @Autowired
    private AiConfigMapper aiConfigMapper;

    /** 解析后的生效配置：DB 行与 yml 兜底逐字段合并后的结果。 */
    public record ResolvedConfig(String baseUrl, String apiKey, String model,
                                 int timeoutSeconds, int maxTokens, boolean configured) {
    }

    /**
     * 解析某个配置键的生效配置：DB 行优先，缺失字段按配置键回退到 yml
     * （ladv → kanban.ladv.*，assistant → summer.ai.*），api-key 密文即时解密。
     */
    public ResolvedConfig resolve(String key) {
        String prefix = KEY_ASSISTANT.equals(key) ? "summer.ai" : "kanban.ladv";
        String baseUrl = environment.getProperty(prefix + ".base-url", "https://api.deepseek.com/");
        String apiKey = environment.getProperty(prefix + ".api-key");
        String model = environment.getProperty(prefix + ".model",
                KEY_ASSISTANT.equals(key) ? "deepseek-chat" : "deepseek-vl");
        int timeout = environment.getProperty(prefix + ".timeout-seconds", Integer.class,
                KEY_ASSISTANT.equals(key) ? 60 : 120);
        int maxTokens = environment.getProperty(prefix + ".max-tokens", Integer.class, 4096);

        AiConfig row = findByKey(key);
        if (row != null) {
            if (row.baseUrl != null && !row.baseUrl.isBlank()) baseUrl = row.baseUrl;
            if (row.apiKeyEnc != null && !row.apiKeyEnc.isBlank()) apiKey = CryptoUtil.decrypt(row.apiKeyEnc);
            if (row.model != null && !row.model.isBlank()) model = row.model;
            if (row.timeoutSeconds != null && row.timeoutSeconds > 0) timeout = row.timeoutSeconds;
            if (row.maxTokens != null && row.maxTokens > 0) maxTokens = row.maxTokens;
        }
        boolean configured = apiKey != null && !apiKey.isBlank() && !PLACEHOLDER_API_KEY.equals(apiKey);
        return new ResolvedConfig(baseUrl, apiKey, model, timeout, maxTokens, configured);
    }

    /** 两个配置键的脱敏视图列表（设置页展示用）。 */
    public List<AiConfigDto> listViews() {
        return KEYS.stream().map(this::maskedView).toList();
    }

    /**
     * 生成某个配置键的脱敏视图：配置值取解析后的生效值，api-key 只保留前 3 后 4 位。
     */
    public AiConfigDto maskedView(String key) {
        ResolvedConfig r = resolve(key);
        AiConfig row = findByKey(key);
        String updatedAt = row != null && row.updatedAt != null ? row.updatedAt.toString() : null;
        return new AiConfigDto(key, r.baseUrl(), mask(r.apiKey()), r.model(),
                r.timeoutSeconds(), r.maxTokens(), r.configured(), updatedAt);
    }

    /**
     * 保存某个配置键：按 config_key upsert；apiKey 留空或含掩码星号时保留原密文，
     * 否则重新加密写入。返回保存后的脱敏视图。
     */
    public AiConfigDto save(String key, AiConfigSaveRequest req, Long userId) {
        AiConfig row = findByKey(key);
        boolean isNew = row == null;
        if (isNew) {
            row = new AiConfig();
            row.configKey = key;
        }
        row.baseUrl = trim(req.baseUrl());
        row.model = trim(req.model());
        row.timeoutSeconds = req.timeoutSeconds();
        row.maxTokens = req.maxTokens();
        String apiKey = trim(req.apiKey());
        if (apiKey != null && !apiKey.contains("*")) {
            row.apiKeyEnc = CryptoUtil.encrypt(apiKey);
        }
        row.updatedBy = userId;
        row.updatedAt = new Timestamp(System.currentTimeMillis());
        if (isNew) {
            aiConfigMapper.insert(row);
        } else {
            aiConfigMapper.updateById(row);
        }
        return maskedView(key);
    }

    /** 1x1 像素 PNG 数据 URI（视觉模型连通性探测用，同时验证图片输入能力）。 */
    private static final String TINY_IMAGE_DATA_URI = "data:image/png;base64,"
            + "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";

    /**
     * 用表单内容（无需先保存）探测模型连通性：入参字段优先，留空/掩码字段回退到当前生效配置；
     * 视觉模型附带 1x1 测试图以验证图片输入能力。结果以 success/message 返回，不抛异常。
     */
    public AiConfigTestResponse testConnection(String key, AiConfigSaveRequest req) {
        ResolvedConfig base = resolve(key);
        String baseUrl = req != null && trim(req.baseUrl()) != null ? trim(req.baseUrl()) : base.baseUrl();
        String apiKey = req != null ? trim(req.apiKey()) : null;
        if (apiKey == null || apiKey.contains("*")) apiKey = base.apiKey();
        String model = req != null && trim(req.model()) != null ? trim(req.model()) : base.model();
        int timeout = req != null && req.timeoutSeconds() != null && req.timeoutSeconds() > 0
                ? Math.min(req.timeoutSeconds(), 60) : Math.min(base.timeoutSeconds(), 60);
        if (apiKey == null || apiKey.isBlank() || PLACEHOLDER_API_KEY.equals(apiKey)) {
            return new AiConfigTestResponse(false, "未配置 API Key，请先填写", 0);
        }
        long start = System.currentTimeMillis();
        try {
            ChatModel chatModel = new OpenAiCompatibleChatModel(baseUrl, apiKey, model,
                    Duration.ofSeconds(timeout), 0.2, 256);
            UserMessage user = KEY_LADV.equals(key)
                    ? UserMessage.of(new TextPart("这是一张连通性测试图片，请直接回复 OK。"),
                            new ImageUrlPart(TINY_IMAGE_DATA_URI, "low"))
                    : new UserMessage("连通性测试，请直接回复 OK。");
            ChatResponse resp = chatModel.call(new Prompt(List.of(
                    Message.system("你是连通性测试助手，只回复 OK。"), user)));
            long latency = System.currentTimeMillis() - start;
            String reply = resp.content() == null ? "" : resp.content().trim();
            String msg = "连接成功，模型响应正常";
            if (!reply.isEmpty()) {
                msg += "（回复：" + (reply.length() <= 50 ? reply : reply.substring(0, 50)) + "）";
            }
            return new AiConfigTestResponse(true, msg, latency);
        } catch (Exception e) {
            long latency = System.currentTimeMillis() - start;
            String detail = e.getMessage() == null ? e.getClass().getSimpleName() : e.getMessage();
            if (detail.length() > 300) detail = detail.substring(0, 300);
            return new AiConfigTestResponse(false, "连接失败：" + detail, latency);
        }
    }

    private AiConfig findByKey(String key) {
        List<AiConfig> rows = aiConfigMapper.selectList(
                new QueryWrapper<AiConfig>().eq("config_key", key));
        return rows.isEmpty() ? null : rows.get(0);
    }

    /** 脱敏：长度大于 7 时保留前 3 后 4，中间以 *** 替代；过短则整体掩码。 */
    private static String mask(String apiKey) {
        if (apiKey == null || apiKey.isBlank()) return "";
        String k = apiKey.trim();
        if (k.length() <= 7) return "***";
        return k.substring(0, 3) + "***" + k.substring(k.length() - 4);
    }

    private static String trim(String s) {
        if (s == null) return null;
        String t = s.trim();
        return t.isEmpty() ? null : t;
    }
}
