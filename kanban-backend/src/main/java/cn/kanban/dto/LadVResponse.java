package cn.kanban.dto;

/**
 * LADV 智能生成响应体。
 * components 为组件数组的 JSON 字符串（已清洗校验，可直接导入画布）；
 * raw 为模型原始输出；error 非 null 表示未配置或调用失败；logId 为日志ID。
 */
public record LadVResponse(String components, String raw, Long logId, String error) {
}
