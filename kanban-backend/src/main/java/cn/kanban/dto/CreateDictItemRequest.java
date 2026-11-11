package cn.kanban.dto;

/** 新建字典项请求。 */
public record CreateDictItemRequest(String value, String label, Integer sortOrder, Boolean enabled,
                                    String remark, String extJson) {}
