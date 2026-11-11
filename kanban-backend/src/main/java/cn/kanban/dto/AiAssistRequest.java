package cn.kanban.dto;

/**
 * AI 助手请求体：携带目标组件快照与用户自然语言指令。
 * componentProps 为组件 props 的 JSON 字符串（与 canvasConfig 传输约定一致）。
 */
public record AiAssistRequest(String componentId, String componentType, String componentProps, String instruction) {
}
