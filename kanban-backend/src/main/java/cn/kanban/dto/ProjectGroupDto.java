package cn.kanban.dto;

import java.sql.Timestamp;

public class ProjectGroupDto {
    public Long id;
    public Long parentId;
    public String name;
    public Integer sort;
    public Timestamp createdAt;

    public ProjectGroupDto() {}

    public ProjectGroupDto(Long id, Long parentId, String name, Integer sort, Timestamp createdAt) {
        this.id = id;
        this.parentId = parentId;
        this.name = name;
        this.sort = sort;
        this.createdAt = createdAt;
    }
}
