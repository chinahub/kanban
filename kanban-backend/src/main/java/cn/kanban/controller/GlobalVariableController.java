package cn.kanban.controller;

import cn.jiebaba.summer.core.annotation.Autowired;
import cn.jiebaba.summer.web.annotation.DeleteMapping;
import cn.jiebaba.summer.web.annotation.GetMapping;
import cn.jiebaba.summer.web.annotation.PathVariable;
import cn.jiebaba.summer.web.annotation.PostMapping;
import cn.jiebaba.summer.web.annotation.PutMapping;
import cn.jiebaba.summer.web.annotation.RequestBody;
import cn.jiebaba.summer.web.annotation.RequestMapping;
import cn.jiebaba.summer.web.annotation.RestController;
import cn.jiebaba.summer.web.http.WebRequest;
import cn.jiebaba.summer.web.http.WebResponse;
import cn.kanban.dto.CreateGlobalVariableRequest;
import cn.kanban.dto.GlobalVariableDto;
import cn.kanban.dto.UpdateGlobalVariableRequest;
import cn.kanban.entity.GlobalVariable;
import cn.kanban.entity.Project;
import cn.kanban.entity.User;
import cn.kanban.service.AuthService;
import cn.kanban.service.GlobalVariableService;
import cn.kanban.service.ProjectService;

import java.util.List;
import java.util.NoSuchElementException;

@RestController
@RequestMapping("/api/projects")
public class GlobalVariableController {

    @Autowired
    private AuthService authService;

    @Autowired
    private ProjectService projectService;

    @Autowired
    private GlobalVariableService globalVariableService;

    @GetMapping("/{projectId}/variables")
    public List<GlobalVariableDto> list(@PathVariable Long projectId, WebRequest req, WebResponse resp) {
        Long wsId = requireProject(projectId, req, resp);
        if (wsId == null) return null;
        return globalVariableService.listByProject(projectId).stream().map(this::toDto).toList();
    }

    @PostMapping("/{projectId}/variables")
    public GlobalVariableDto create(@PathVariable Long projectId, @RequestBody CreateGlobalVariableRequest body,
                                    WebRequest req, WebResponse resp) {
        Long wsId = requireProject(projectId, req, resp);
        if (wsId == null) return null;
        if (body == null) throw new IllegalArgumentException("body is required");
        GlobalVariable v = globalVariableService.create(projectId, body.name(), body.value(), body.description());
        return toDto(v);
    }

    @PutMapping("/{projectId}/variables/{id}")
    public GlobalVariableDto update(@PathVariable Long projectId, @PathVariable Long id,
                                    @RequestBody UpdateGlobalVariableRequest body, WebRequest req, WebResponse resp) {
        Long wsId = requireProject(projectId, req, resp);
        if (wsId == null) return null;
        if (body == null) throw new IllegalArgumentException("body is required");
        GlobalVariable v = globalVariableService.update(id, projectId, body.name(), body.value(), body.description());
        return toDto(v);
    }

    @DeleteMapping("/{projectId}/variables/{id}")
    public void delete(@PathVariable Long projectId, @PathVariable Long id, WebRequest req, WebResponse resp) {
        Long wsId = requireProject(projectId, req, resp);
        if (wsId == null) return;
        globalVariableService.delete(id, projectId);
        resp.status(204);
    }

    private Long requireProject(Long projectId, WebRequest req, WebResponse resp) {
        User user = authService.authenticate(req, resp);
        if (user == null) return null;
        Long wsId = authService.resolveWorkspaceId(req, resp, user);
        if (wsId == null) return null;
        Project p = projectService.findById(projectId);
        if (p == null || !wsId.equals(p.workspaceId)) throw new NoSuchElementException("project not found");
        return wsId;
    }

    private GlobalVariableDto toDto(GlobalVariable v) {
        return new GlobalVariableDto(v.id, v.projectId, v.name, v.description, v.source, v.value,
                v.createdAt, v.updatedAt);
    }
}
