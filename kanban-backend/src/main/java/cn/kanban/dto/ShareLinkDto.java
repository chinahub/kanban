package cn.kanban.dto;

import java.sql.Timestamp;

public class ShareLinkDto {
    public Long id;
    public String token;
    public String url;
    public boolean hasPassword;
    public Long snapshotId;
    public Timestamp createdAt;

    public ShareLinkDto() {}

    public ShareLinkDto(Long id, String token, String url, boolean hasPassword, Long snapshotId, Timestamp createdAt) {
        this.id = id;
        this.token = token;
        this.url = url;
        this.hasPassword = hasPassword;
        this.snapshotId = snapshotId;
        this.createdAt = createdAt;
    }
}
