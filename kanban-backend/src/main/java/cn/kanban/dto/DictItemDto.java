package cn.kanban.dto;

/** 字典项视图。 */
public record DictItemDto(Long id, String value, String label, Integer sortOrder, Boolean enabled,
                          String remark, String extJson) {}
