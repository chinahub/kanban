package cn.kanban.dto;

import java.sql.Timestamp;

public class WorkspaceDto {
    public Long id;
    public String code;
    public String name;
    public String description;
    public Boolean isSystem;
    public Timestamp createdAt;

    public WorkspaceDto() {}
    public WorkspaceDto(Long id, String code, String name, String description, Boolean isSystem, Timestamp createdAt) {
        this.id = id;
        this.code = code;
        this.name = name;
        this.description = description;
        this.isSystem = isSystem;
        this.createdAt = createdAt;
    }
}
