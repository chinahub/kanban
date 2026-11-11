package cn.kanban.dto;

public class ShareMetaDto {
    public Long projectId;
    public String projectName;
    public Integer canvasW;
    public Integer canvasH;
    public boolean requirePassword;

    public ShareMetaDto() {}

    public ShareMetaDto(Long projectId, String projectName, Integer canvasW, Integer canvasH, boolean requirePassword) {
        this.projectId = projectId;
        this.projectName = projectName;
        this.canvasW = canvasW;
        this.canvasH = canvasH;
        this.requirePassword = requirePassword;
    }
}
