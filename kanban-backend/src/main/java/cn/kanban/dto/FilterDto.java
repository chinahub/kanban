package cn.kanban.dto;

import java.sql.Timestamp;

public class FilterDto {
    public Long id;
    public String name;
    public String code;
    public Long creatorId;
    public Timestamp createdAt;
    public Timestamp updatedAt;

    public FilterDto() {}

    public FilterDto(Long id, String name, String code, Long creatorId,
                     Timestamp createdAt, Timestamp updatedAt) {
        this.id = id;
        this.name = name;
        this.code = code;
        this.creatorId = creatorId;
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
    }
}
