package cn.kanban.dto;

import java.sql.Timestamp;

public class ProjectDto {
    public Long id;
    public Long groupId;
    public String name;
    public String type;
    public Integer canvasW;
    public Integer canvasH;
    public String canvasConfig;
    public String background;
    public String status;
    public String thumbnail;
    public Long creatorId;
    public Timestamp createdAt;
    public Timestamp updatedAt;

    public ProjectDto() {}

    public ProjectDto(Long id, Long groupId, String name, String type, Integer canvasW, Integer canvasH,
                      String canvasConfig, String background, String status, String thumbnail, Long creatorId,
                      Timestamp createdAt, Timestamp updatedAt) {
        this.id = id;
        this.groupId = groupId;
        this.name = name;
        this.type = type;
        this.canvasW = canvasW;
        this.canvasH = canvasH;
        this.canvasConfig = canvasConfig;
        this.background = background;
        this.status = status;
        this.thumbnail = thumbnail;
        this.creatorId = creatorId;
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
    }
}
