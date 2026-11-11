package cn.kanban.dto;

/**
 * AI 模型配置保存请求（PUT /api/ai/config/{key}）。
 * apiKey 留空或与脱敏占位一致表示不修改原有 Key；其余字段整体覆盖。
 */
public record AiConfigSaveRequest(String baseUrl, String apiKey, String model,
                                  Integer timeoutSeconds, Integer maxTokens) {
}
