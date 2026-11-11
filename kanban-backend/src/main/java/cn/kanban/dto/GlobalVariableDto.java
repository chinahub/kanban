package cn.kanban.dto;

import java.sql.Timestamp;

public class GlobalVariableDto {
    public Long id;
    public Long projectId;
    public String name;
    public String description;
    public String source;
    public String value;
    public Timestamp createdAt;
    public Timestamp updatedAt;

    public GlobalVariableDto() {}

    public GlobalVariableDto(Long id, Long projectId, String name, String description, String source,
                             String value, Timestamp createdAt, Timestamp updatedAt) {
        this.id = id;
        this.projectId = projectId;
        this.name = name;
        this.description = description;
        this.source = source;
        this.value = value;
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
    }
}
