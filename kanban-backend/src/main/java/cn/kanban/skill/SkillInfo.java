package cn.kanban.skill;

/**
 * 技能元信息：SKILL.md frontmatter 中的 name 与 description。
 * description 承担"何时触发该技能"的路由职责，展示给模型做技能选择。
 */
public record SkillInfo(String name, String description) {
}
