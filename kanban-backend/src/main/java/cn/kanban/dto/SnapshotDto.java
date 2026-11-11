package cn.kanban.dto;

import java.sql.Timestamp;

public class SnapshotDto {
    public Long id;
    public Long projectId;
    public Integer version;
    public Long createdBy;
    public Timestamp createdAt;

    public SnapshotDto() {}

    public SnapshotDto(Long id, Long projectId, Integer version, Long createdBy, Timestamp createdAt) {
        this.id = id;
        this.projectId = projectId;
        this.version = version;
        this.createdBy = createdBy;
        this.createdAt = createdAt;
    }
}
