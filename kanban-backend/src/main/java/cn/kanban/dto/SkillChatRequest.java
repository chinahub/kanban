package cn.kanban.dto;

/**
 * 技能对话请求体：单条自然语言消息（如"帮我用 G2 画一个柱状图"）。
 */
public record SkillChatRequest(String message) {
}
