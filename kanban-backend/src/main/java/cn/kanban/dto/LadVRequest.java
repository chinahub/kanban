package cn.kanban.dto;

/**
 * LADV 智能生成请求体。
 * image 为 base64 数据 URI（data:image/png;base64,...）或裸 base64；
 * canvasWidth/canvasHeight 为目标画布尺寸，供模型按画布布局。
 */
public record LadVRequest(String image, Integer canvasWidth, Integer canvasHeight) {
}
