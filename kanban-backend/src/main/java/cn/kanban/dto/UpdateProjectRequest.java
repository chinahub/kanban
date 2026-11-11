package cn.kanban.dto;

public record UpdateProjectRequest(String name, Integer canvasW, Integer canvasH,
                                   String canvasConfig, String background, String status,
                                   String thumbnail, Long groupId, Boolean clearGroup) {}
