package cn.kanban.dto;

/**
 * 技能对话响应体。
 * content 为模型最终回答（可能含图表代码、图片 URL 等）；error 非 null 表示调用失败。
 */
public record SkillChatResponse(String content, String error) {
}
