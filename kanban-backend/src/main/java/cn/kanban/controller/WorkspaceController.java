package cn.kanban.controller;

import cn.kanban.dto.SwitchWorkspaceResponse;
import cn.kanban.dto.WorkspaceDto;
import cn.kanban.entity.User;
import cn.kanban.entity.Workspace;
import cn.kanban.service.WorkspaceService;
import cn.kanban.util.CurrentContext;
import cn.jiebaba.summer.core.annotation.Autowired;
import cn.jiebaba.summer.web.annotation.GetMapping;
import cn.jiebaba.summer.web.annotation.PathVariable;
import cn.jiebaba.summer.web.annotation.PostMapping;
import cn.jiebaba.summer.web.annotation.RequestMapping;
import cn.jiebaba.summer.web.annotation.RestController;
import cn.jiebaba.summer.web.http.WebRequest;
import cn.jiebaba.summer.web.http.WebResponse;

import java.util.List;

@RestController
@RequestMapping("/api/workspaces")
public class WorkspaceController {

    @Autowired
    private WorkspaceService workspaceService;

    @Autowired
    private cn.kanban.service.AuthService authService;

    @GetMapping
    public List<WorkspaceDto> list(WebRequest req, WebResponse resp) {
        User user = authService.authenticate(req, resp);
        if (user == null) return null;
        List<Workspace> ws;
        if (Boolean.TRUE.equals(user.isPlatformAdmin)) {
            ws = workspaceService.listAll();
        } else {
            ws = workspaceService.listByUserId(user.id);
        }
        return ws.stream().map(this::toDto).toList();
    }

    @PostMapping("/{id}/switch")
    public SwitchWorkspaceResponse switchWorkspace(@PathVariable Long id, WebRequest req, WebResponse resp) {
        User user = authService.authenticate(req, resp);
        if (user == null) return null;
        Workspace target = workspaceService.findById(id);
        if (target == null) throw new IllegalArgumentException("workspace not found: " + id);
        boolean isAdmin = Boolean.TRUE.equals(user.isPlatformAdmin);
        if (!isAdmin) {
            var memberships = workspaceService.listByUserId(user.id);
            boolean member = memberships.stream().anyMatch(w -> w.id.equals(id));
            if (!member) throw new IllegalArgumentException("not a member of workspace " + id);
        }
        CurrentContext.setWorkspaceId(id);
        List<Workspace> list = isAdmin ? workspaceService.listAll() : workspaceService.listByUserId(user.id);
        return new SwitchWorkspaceResponse(target.id, target.code, target.name,
                list.stream().map(this::toDto).toList());
    }

    private WorkspaceDto toDto(Workspace w) {
        return new WorkspaceDto(w.id, w.code, w.name, w.description, w.isSystem, w.createdAt);
    }
}
