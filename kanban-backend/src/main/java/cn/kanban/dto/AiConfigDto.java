package cn.kanban.dto;

/**
 * AI 模型配置脱敏视图（GET /api/ai/config 响应）。
 * apiKey 为脱敏串（仅保留前 3 后 4 位，未配置为空串），永不返回明文；
 * configured 表示当前生效配置（DB 或 yml 兜底）中已有可用 Key。
 */
public record AiConfigDto(String key, String baseUrl, String apiKey, String model,
                          Integer timeoutSeconds, Integer maxTokens, boolean configured,
                          String updatedAt) {
}
