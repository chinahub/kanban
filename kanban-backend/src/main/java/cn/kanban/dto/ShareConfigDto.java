package cn.kanban.dto;

import java.util.List;

public class ShareConfigDto {
    public String config;
    public List<GlobalVariableDto> variables;

    public ShareConfigDto() {}

    public ShareConfigDto(String config) {
        this.config = config;
    }

    public ShareConfigDto(String config, List<GlobalVariableDto> variables) {
        this.config = config;
        this.variables = variables;
    }
}
