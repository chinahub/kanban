package cn.kanban.service;

import cn.jiebaba.summer.ai.chat.ChatModel;
import cn.jiebaba.summer.ai.chat.ChatResponse;
import cn.jiebaba.summer.ai.chat.ChatResponseMetadata;
import cn.jiebaba.summer.ai.chat.Message;
import cn.jiebaba.summer.ai.chat.Prompt;
import cn.jiebaba.summer.ai.chat.UserMessage;
import cn.jiebaba.summer.ai.chat.content.ImageUrlPart;
import cn.jiebaba.summer.ai.chat.content.TextPart;
import cn.jiebaba.summer.ai.model.openai.OpenAiCompatibleChatModel;
import cn.jiebaba.summer.core.annotation.Autowired;
import cn.jiebaba.summer.core.annotation.Service;
import cn.jiebaba.summer.core.util.JsonUtil;
import cn.kanban.dto.LadVRequest;
import cn.kanban.dto.LadVResponse;
import cn.kanban.entity.AiCallLog;
import cn.kanban.mapper.AiCallLogMapper;

import java.sql.Timestamp;
import java.time.Duration;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * LADV 智能生成（PRD §4.13）：上传大屏设计稿/截图，由视觉模型还原为画布组件布局。
 * 视觉模型独立于全局 ChatClient，配置经 AiConfigService 解析（ai_config 表优先、
 * application.yml 的 kanban.ladv.* 兜底），手动构造 OpenAI 兼容客户端，
 * 避免污染 AiAssistantService 的纯 JSON 输出装配。未配置 Key 或调用失败时返回明确错误。
 * 每次调用落 ai_call_log（source 固定为 "ladv"，含 token 用量，base64 图片不入日志）。
 */
@Service
public class LadVService {

    /** 可生成的组件类型白名单（与前端 types/editor.ts 的 ComponentType 对齐）。 */
    private static final Set<String> TYPE_WHITELIST = Set.of(
            "title", "text",
            "line", "bar", "pie", "area", "scatter", "radar", "funnel", "rose",
            "barh", "barGroup", "barStack", "ring", "lineMulti", "areaStack",
            "barPercent", "barhGroup", "barhStack", "lineStep",
            "flipper", "timer");

    /** 数据形如 {name, series, value} 的多系列图表类型。 */
    private static final Set<String> SERIES_TYPES = Set.of(
            "barGroup", "barStack", "lineMulti", "areaStack", "barPercent", "barhGroup", "barhStack");

    /** 纯 DOM 展示组件（非图表），props 约定与图表不同。 */
    private static final Set<String> TEXT_TYPES = Set.of("title", "text");

    private static final Pattern HEX_COLOR = Pattern.compile("^#?([0-9a-fA-F]{6})$");

    /** base64 长度上限（约 2MB 图片），超出直接拒绝，防止超大请求体打爆模型上下文与内存。 */
    private static final int MAX_IMAGE_CHARS = 3_000_000;

    @Autowired
    private AiConfigService aiConfigService;

    @Autowired
    private AiCallLogMapper aiCallLogMapper;

    /**
     * 主流程：校验入参 → 构造视觉模型客户端 → 多模态调用 → 提取并清洗组件 JSON。
     * 任何失败都以 error 字段返回（不抛异常），并落 ai_call_log。
     */
    public LadVResponse generate(Long userId, Long projectId, LadVRequest req) {
        long start = System.currentTimeMillis();
        AiConfigService.ResolvedConfig config = aiConfigService.resolve(AiConfigService.KEY_LADV);
        if (!config.configured()) {
            return new LadVResponse(null, null, null,
                    "LADV 未配置视觉模型：请联系管理员在「系统设置 → AI 配置」中配置支持图片输入的模型");
        }
        String image = req.image() == null ? "" : req.image().trim();
        if (image.isEmpty()) {
            return new LadVResponse(null, null, null, "image is required");
        }
        if (image.length() > MAX_IMAGE_CHARS) {
            return new LadVResponse(null, null, null, "图片过大：请压缩到 2MB 以内再上传");
        }
        int canvasW = req.canvasWidth() != null && req.canvasWidth() > 0 ? req.canvasWidth() : 1920;
        int canvasH = req.canvasHeight() != null && req.canvasHeight() > 0 ? req.canvasHeight() : 1080;

        String raw = null;
        String error = null;
        List<Map<String, Object>> components = null;
        ChatResponseMetadata meta = null;
        try {
            ChatModel model = buildModel(config);
            UserMessage msg = UserMessage.of(
                    new TextPart("请按 system 指令把这张大屏设计稿还原为组件布局 JSON。"),
                    new ImageUrlPart(toDataUri(image), "high"));
            ChatResponse resp = model.call(new Prompt(List.of(
                    Message.system(buildSystemPrompt(canvasW, canvasH)), msg)));
            raw = resp.content();
            meta = resp.metadata();
            components = sanitize(extractComponents(raw), canvasW, canvasH);
            if (components.isEmpty()) {
                error = "模型未产出可用组件，请换一张更清晰的设计稿重试";
            }
        } catch (Exception e) {
            error = "LADV 调用失败：" + e.getMessage();
        }

        int duration = (int) (System.currentTimeMillis() - start);
        Long logId = log(userId, projectId, image.length(), raw, error, duration, meta);
        String componentsJson = components == null || components.isEmpty()
                ? null : JsonUtil.toJsonStr(components);
        return new LadVResponse(componentsJson, truncate(raw, 4000), logId, error);
    }

    /** 按生效配置手动构造 OpenAI 兼容视觉模型客户端（ai_config 表优先、application.yml 兜底）。 */
    private ChatModel buildModel(AiConfigService.ResolvedConfig config) {
        return new OpenAiCompatibleChatModel(config.baseUrl(), config.apiKey(), config.model(),
                Duration.ofSeconds(config.timeoutSeconds()), 0.2, config.maxTokens());
    }

    /**
     * 拼装 system prompt：描述可生成的组件 schema（22 类组件的 type/props/data 约定）
     * 与输出格式约束，引导模型只输出可清洗的 JSON。
     */
    private String buildSystemPrompt(int canvasW, int canvasH) {
        return "你是数据大屏设计助手。用户提供一张大屏设计稿/截图，你要把它还原为大屏画布的组件布局。\n"
                + "仅输出一个 JSON 对象 {\"components\":[...]}，不要输出任何解释文字，不要使用 markdown 代码块。\n\n"
                + "画布尺寸 " + canvasW + "x" + canvasH + "（像素，左上角为原点）。\n"
                + "每个组件字段：type（必填）、name（中文名称）、x、y、width、height（均为像素整数）、"
                + "props（样式属性对象）、data（数据数组，可选）。\n\n"
                + "可用 type：\n"
                + "- title（大标题）、text（说明文本）\n"
                + "- line 折线、bar 柱状、pie 饼图、area 区域、scatter 散点、radar 雷达、funnel 漏斗、rose 玫瑰\n"
                + "- barh 条形、barGroup 分组柱状、barStack 堆叠柱状、ring 环形、lineMulti 多折线、"
                + "areaStack 堆叠区域、barPercent 百分比柱状、barhGroup 分组条形、barhStack 堆叠条形、lineStep 阶梯折线\n"
                + "- flipper 数字翻牌器（展示关键指标数值）、timer 时间器\n\n"
                + "props 约定：\n"
                + "- title/text：text（文本内容）、fontSize（正整数）、color（#rrggbb）、fontWeight（400 或 700）\n"
                + "- 图表类：title（图表标题）、color（主色 #rrggbb）\n"
                + "- flipper：value（数字）、fontSize、color；timer：format（如 YYYY-MM-DD HH:mm:ss）、fontSize、color\n\n"
                + "data 约定：单系列图表 [{\"name\":\"类目\",\"value\":123}]；"
                + "多系列（分组/堆叠/多折线）[{\"name\":\"类目\",\"series\":\"系列A\",\"value\":123}]。"
                + "图中读不出真实数值时给合理的示例数据（4-8 条）。\n\n"
                + "约束：组件不得超出画布；位置/尺寸尽量贴合截图布局；组件数量 3-12 个；"
                + "深色背景大屏文字用浅色，主色从截图中提取。";
    }

    /** 兼容裸 base64 与 data URI 两种入参，统一转 data URI。 */
    private String toDataUri(String image) {
        if (image.startsWith("data:")) return image;
        return "data:image/png;base64," + image;
    }

    /**
     * 从模型输出中提取 components 数组：兼容 ```json 代码块、裸 JSON 对象、裸 JSON 数组。
     * 提取失败返回空列表。
     */
    @SuppressWarnings("unchecked")
    private List<Map<String, Object>> extractComponents(String content) {
        if (content == null || content.isBlank()) return List.of();
        String s = content.trim();
        if (s.startsWith("```")) {
            int nl = s.indexOf('\n');
            if (nl >= 0) s = s.substring(nl + 1);
            if (s.endsWith("```")) s = s.substring(0, s.length() - 3);
            s = s.trim();
        }
        try {
            int objStart = s.indexOf('{');
            int arrStart = s.indexOf('[');
            if (objStart >= 0 && (arrStart < 0 || objStart < arrStart)) {
                int objEnd = s.lastIndexOf('}');
                if (objEnd <= objStart) return List.of();
                Object parsed = JsonUtil.parse(s.substring(objStart, objEnd + 1));
                if (parsed instanceof Map<?, ?> m && m.get("components") instanceof List<?> l) {
                    return (List<Map<String, Object>>) l;
                }
                return List.of();
            }
            if (arrStart >= 0) {
                int arrEnd = s.lastIndexOf(']');
                if (arrEnd <= arrStart) return List.of();
                Object parsed = JsonUtil.parse(s.substring(arrStart, arrEnd + 1));
                if (parsed instanceof List<?> l) return (List<Map<String, Object>>) l;
            }
        } catch (Exception ignored) {
            // 落入空列表，由上层给出明确错误
        }
        return List.of();
    }

    /**
     * 清洗模型产出的组件：type 白名单过滤、坐标/尺寸按画布 clamp、
     * props 按键名白名单与类型修正、data 缺失时补示例数据、生成完整组件字段（id/rotate 等）。
     */
    private List<Map<String, Object>> sanitize(List<Map<String, Object>> raw, int canvasW, int canvasH) {
        List<Map<String, Object>> out = new ArrayList<>();
        long ts = System.currentTimeMillis();
        int i = 0;
        for (Map<String, Object> item : raw) {
            if (item == null) continue;
            String type = str(item.get("type"));
            if (!TYPE_WHITELIST.contains(type)) continue;
            i++;

            int w = clamp(toInt(item.get("width"), 420), 20, canvasW);
            int h = clamp(toInt(item.get("height"), 260), 20, canvasH);
            int x = clamp(toInt(item.get("x"), 0), 0, Math.max(0, canvasW - w));
            int y = clamp(toInt(item.get("y"), 0), 0, Math.max(0, canvasH - h));

            Map<String, Object> c = new LinkedHashMap<>();
            c.put("id", type + "_" + ts + "_" + i);
            c.put("type", type);
            c.put("name", strOr(item.get("name"), defaultName(type)));
            c.put("x", x);
            c.put("y", y);
            c.put("width", w);
            c.put("height", h);
            c.put("rotate", 0);
            c.put("opacity", 1);
            c.put("visible", true);
            c.put("locked", false);
            c.put("props", sanitizeProps(type, item.get("props")));
            Object data = item.get("data");
            c.put("data", data instanceof List<?> l && !l.isEmpty() ? l : defaultData(type));
            out.add(c);
        }
        return out;
    }

    /** props 清洗：按键名白名单保留，颜色规范为 #rrggbb，数值转整数。 */
    private Map<String, Object> sanitizeProps(String type, Object propsRaw) {
        Map<String, Object> src = propsRaw instanceof Map<?, ?> m ? new LinkedHashMap<>((Map<String, Object>) m) : new LinkedHashMap<>();
        Map<String, Object> out = new LinkedHashMap<>();
        String color = normalizeColor(str(src.get("color")));
        if (TEXT_TYPES.contains(type)) {
            out.put("text", strOr(src.get("text"), "title".equals(type) ? "数据看板标题" : "说明文本"));
            out.put("fontSize", Math.max(8, toInt(src.get("fontSize"), "title".equals(type) ? 36 : 18)));
            out.put("color", color != null ? color : "#ffffff");
            if ("title".equals(type)) out.put("fontWeight", toInt(src.get("fontWeight"), 700));
        } else if ("flipper".equals(type)) {
            Object v = src.get("value");
            out.put("value", v instanceof Number n ? n : toInt(v, 12345));
            out.put("fontSize", Math.max(8, toInt(src.get("fontSize"), 36)));
            out.put("color", color != null ? color : "#4f8cff");
        } else if ("timer".equals(type)) {
            out.put("format", strOr(src.get("format"), "YYYY-MM-DD HH:mm:ss"));
            out.put("fontSize", Math.max(8, toInt(src.get("fontSize"), 24)));
            out.put("color", color != null ? color : "#ffffff");
        } else {
            out.put("title", strOr(src.get("title"), defaultName(type)));
            out.put("color", color != null ? color : "#4f8cff");
        }
        return out;
    }

    private List<Map<String, Object>> defaultData(String type) {
        String[] names = {"Mon", "Tue", "Wed", "Thu", "Fri"};
        int[] values = {120, 200, 150, 80, 70};
        List<Map<String, Object>> out = new ArrayList<>();
        for (int i = 0; i < names.length; i++) {
            Map<String, Object> d = new LinkedHashMap<>();
            d.put("name", names[i]);
            if (SERIES_TYPES.contains(type)) d.put("series", i % 2 == 0 ? "系列 A" : "系列 B");
            d.put("value", values[i]);
            out.add(d);
        }
        return out;
    }

    private String defaultName(String type) {
        return switch (type) {
            case "title" -> "标题";
            case "text" -> "文本";
            case "line" -> "折线图";
            case "bar" -> "柱状图";
            case "pie" -> "饼图";
            case "area" -> "区域图";
            case "scatter" -> "散点图";
            case "radar" -> "雷达图";
            case "funnel" -> "漏斗图";
            case "rose" -> "玫瑰图";
            case "barh" -> "条形图";
            case "barGroup" -> "分组柱状图";
            case "barStack" -> "堆叠柱状图";
            case "ring" -> "环形图";
            case "lineMulti" -> "多折线图";
            case "areaStack" -> "堆叠区域图";
            case "barPercent" -> "百分比柱状图";
            case "barhGroup" -> "分组条形图";
            case "barhStack" -> "堆叠条形图";
            case "lineStep" -> "阶梯折线图";
            case "flipper" -> "数字翻牌器";
            case "timer" -> "时间器";
            default -> type;
        };
    }

    private String normalizeColor(String s) {
        if (s == null) return null;
        Matcher m = HEX_COLOR.matcher(s.trim());
        return m.matches() ? "#" + m.group(1).toLowerCase() : null;
    }

    private static String str(Object o) {
        return o == null ? null : String.valueOf(o);
    }

    private static String strOr(Object o, String def) {
        String s = str(o);
        return s == null || s.isBlank() ? def : s;
    }

    private static int toInt(Object o, int def) {
        if (o instanceof Number n) return n.intValue();
        if (o != null) {
            try {
                return (int) Math.round(Double.parseDouble(String.valueOf(o).trim()));
            } catch (NumberFormatException ignored) {
                return def;
            }
        }
        return def;
    }

    private static int clamp(int v, int min, int max) {
        return Math.max(min, Math.min(max, v));
    }

    /**
     * 落库一条 LADV 调用日志；base64 图片体不入库，只记录长度。日志失败不影响主流程。
     */
    private Long log(Long userId, Long projectId, int imageChars, String raw, String error, int duration,
                     ChatResponseMetadata meta) {
        try {
            AiCallLog rec = new AiCallLog();
            rec.userId = userId;
            rec.projectId = projectId;
            rec.componentId = null;
            rec.componentType = "ladv";
            rec.instruction = "ladv-generate";
            rec.requestPayload = "image base64 chars: " + imageChars;
            rec.responseRaw = truncate(raw, 4000);
            rec.status = error == null ? "OK" : "ERROR";
            rec.error = error;
            rec.durationMs = duration;
            rec.source = "ladv";
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
