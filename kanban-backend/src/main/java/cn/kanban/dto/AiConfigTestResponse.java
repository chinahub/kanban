package cn.kanban.dto;

/**
 * AI 模型连通性测试结果（POST /api/ai/config/{key}/test 响应）。
 * success 表示是否成功拿到模型响应；message 为人类可读结果（失败时含原因）；
 * latencyMs 为调用耗时毫秒。
 */
public record AiConfigTestResponse(boolean success, String message, long latencyMs) {
}
