package cn.kanban.dto;

/** 新建字典类型请求。 */
public record CreateDictRequest(String dictType, String name, String remark, Integer sortOrder) {}
