package cn.kanban.dto;

import java.sql.Timestamp;

public class AssetDto {
    public Long id;
    public String name;
    public String type;
    public String contentType;
    public String url;
    public Long size;
    public Timestamp createdAt;

    public AssetDto() {}

    public AssetDto(Long id, String name, String type, String contentType, String url, Long size, Timestamp createdAt) {
        this.id = id;
        this.name = name;
        this.type = type;
        this.contentType = contentType;
        this.url = url;
        this.size = size;
        this.createdAt = createdAt;
    }
}
