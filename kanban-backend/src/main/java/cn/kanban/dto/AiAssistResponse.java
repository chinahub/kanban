package cn.kanban.dto;

/**
 * AI 助手响应体。
 * changes 为需要合并到组件 props 的 JSON 字符串；source 标识来源（ai/local）；
 * raw 为模型原始输出（local 时为 "local"）；error 非 null 表示降级或失败；logId 为日志ID。
 */
public record AiAssistResponse(String changes, String source, String raw, Long logId, String error) {
}
