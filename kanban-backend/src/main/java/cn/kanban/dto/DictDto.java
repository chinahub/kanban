package cn.kanban.dto;

import java.util.List;

/** 字典类型视图（含全部字典项，含停用项，业务侧自行过滤）。 */
public record DictDto(Long id, String dictType, String name, String remark, Boolean isSystem,
                      Integer sortOrder, List<DictItemDto> items) {}
