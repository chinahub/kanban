package cn.kanban.dto;

/** 更新字典类型请求（dictType 编码不可改，改编码会破坏存量数据关联）。 */
public record UpdateDictRequest(String name, String remark, Integer sortOrder) {}
