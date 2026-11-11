package cn.kanban.dto;

import java.sql.Timestamp;

public class DataSourceDto {
    public Long id;
    public String name;
    public String type;
    public String config;
    public Long creatorId;
    public Timestamp createdAt;
    public Timestamp updatedAt;

    public DataSourceDto() {}

    public DataSourceDto(Long id, String name, String type, String config, Long creatorId,
                         Timestamp createdAt, Timestamp updatedAt) {
        this.id = id;
        this.name = name;
        this.type = type;
        this.config = config;
        this.creatorId = creatorId;
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
    }
}
