package cn.kanban.dto;

/** 更新字典项请求（value 不可改，改 value 会破坏存量数据关联）。 */
public record UpdateDictItemRequest(String label, Integer sortOrder, Boolean enabled,
                                    String remark, String extJson) {}
