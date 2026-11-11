package cn.kanban.dto;

public class FetchResultDto {
    public String type;
    public String data;

    public FetchResultDto() {}

    public FetchResultDto(String type, String data) {
        this.type = type;
        this.data = data;
    }
}
