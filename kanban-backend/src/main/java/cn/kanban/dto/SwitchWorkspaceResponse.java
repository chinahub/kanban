package cn.kanban.dto;

import java.util.List;

public class SwitchWorkspaceResponse {
    public Long id;
    public String code;
    public String name;
    public List<WorkspaceDto> workspaces;

    public SwitchWorkspaceResponse() {}
    public SwitchWorkspaceResponse(Long id, String code, String name, List<WorkspaceDto> workspaces) {
        this.id = id;
        this.code = code;
        this.name = name;
        this.workspaces = workspaces;
    }
}
