package cn.kanban.dto;

import java.sql.Timestamp;

public class DataSetDto {
    public Long id;
    public Long sourceId;
    public String name;
    public String transform;
    public String data;
    public Timestamp lastRefreshAt;
    public Long creatorId;
    public Timestamp createdAt;
    public Timestamp updatedAt;

    public DataSetDto() {}

    public DataSetDto(Long id, Long sourceId, String name, String transform, String data,
                      Timestamp lastRefreshAt, Long creatorId,
                      Timestamp createdAt, Timestamp updatedAt) {
        this.id = id;
        this.sourceId = sourceId;
        this.name = name;
        this.transform = transform;
        this.data = data;
        this.lastRefreshAt = lastRefreshAt;
        this.creatorId = creatorId;
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
    }
}
