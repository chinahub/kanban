package cn.kanban.controller;

import cn.jiebaba.summer.core.annotation.Autowired;
import cn.jiebaba.summer.web.annotation.DeleteMapping;
import cn.jiebaba.summer.web.annotation.GetMapping;
import cn.jiebaba.summer.web.annotation.PathVariable;
import cn.jiebaba.summer.web.annotation.PostMapping;
import cn.jiebaba.summer.web.annotation.PutMapping;
import cn.jiebaba.summer.web.annotation.RequestBody;
import cn.jiebaba.summer.web.annotation.RequestMapping;
import cn.jiebaba.summer.web.annotation.RequestParam;
import cn.jiebaba.summer.web.annotation.RestController;
import cn.jiebaba.summer.web.http.WebRequest;
import cn.jiebaba.summer.web.http.WebResponse;
import cn.kanban.dto.CreateProjectRequest;
import cn.kanban.dto.ProjectDto;
import cn.kanban.dto.UpdateProjectRequest;
import cn.kanban.entity.Project;
import cn.kanban.entity.User;
import cn.kanban.service.AuthService;
import cn.kanban.service.ProjectService;

import java.sql.Timestamp;
import java.util.List;
import java.util.NoSuchElementException;

@RestController
@RequestMapping("/api/projects")
public class ProjectController {

    @Autowired
    private AuthService authService;

    @Autowired
    private ProjectService projectService;

    @GetMapping
    public List<ProjectDto> list(@RequestParam(value = "groupId", required = false) Long groupId,
                                 @RequestParam(value = "type", required = false) String type,
                                 @RequestParam(value = "ungrouped", required = false) Boolean ungrouped,
                                 WebRequest req, WebResponse resp) {
        User user = authService.authenticate(req, resp);
        if (user == null) return null;
        Long wsId = authService.resolveWorkspaceId(req, resp, user);
        if (wsId == null) return null;
        return projectService.listByWorkspace(wsId, groupId, type, ungrouped).stream()
                .map(this::toDto).toList();
    }

    @PostMapping
    public ProjectDto create(@RequestBody CreateProjectRequest body, WebRequest req, WebResponse resp) {
        User user = authService.authenticate(req, resp);
        if (user == null) return null;
        Long wsId = authService.resolveWorkspaceId(req, resp, user);
        if (wsId == null) return null;
        if (body == null || body.name() == null || body.name().isBlank()) {
            throw new IllegalArgumentException("name is required");
        }
        Project p = projectService.create(wsId, user.id, body.name().trim(), body.type(), body.groupId());
        return toDto(p);
    }

    @GetMapping("/{id}")
    public ProjectDto get(@PathVariable Long id, WebRequest req, WebResponse resp) {
        User user = authService.authenticate(req, resp);
        if (user == null) return null;
        Long wsId = authService.resolveWorkspaceId(req, resp, user);
        if (wsId == null) return null;
        Project p = projectService.findById(id);
        ensureInWorkspace(p, wsId);
        return toDto(p);
    }

    @PutMapping("/{id}")
    public ProjectDto update(@PathVariable Long id, @RequestBody UpdateProjectRequest body,
                             WebRequest req, WebResponse resp) {
        User user = authService.authenticate(req, resp);
        if (user == null) return null;
        Long wsId = authService.resolveWorkspaceId(req, resp, user);
        if (wsId == null) return null;
        Project p = projectService.findById(id);
        ensureInWorkspace(p, wsId);
        if (body == null) throw new IllegalArgumentException("body is required");
        if (body.name() != null) {
            if (body.name().isBlank()) throw new IllegalArgumentException("name must not be blank");
            p.name = body.name().trim();
        }
        if (body.canvasW() != null) p.canvasW = body.canvasW();
        if (body.canvasH() != null) p.canvasH = body.canvasH();
        if (body.canvasConfig() != null) p.canvasConfig = body.canvasConfig();
        if (body.background() != null) p.background = body.background();
        if (body.status() != null) p.status = body.status();
        if (body.thumbnail() != null) p.thumbnail = body.thumbnail();
        if (body.groupId() != null) p.groupId = body.groupId();
        if (Boolean.TRUE.equals(body.clearGroup())) p.groupId = null;
        p.updatedAt = new Timestamp(System.currentTimeMillis());
        projectService.updateById(p);
        return toDto(p);
    }

    @DeleteMapping("/{id}")
    public void delete(@PathVariable Long id, WebRequest req, WebResponse resp) {
        User user = authService.authenticate(req, resp);
        if (user == null) return;
        Long wsId = authService.resolveWorkspaceId(req, resp, user);
        if (wsId == null) return;
        Project p = projectService.findById(id);
        ensureInWorkspace(p, wsId);
        projectService.removeById(id);
        resp.status(204);
    }

    private void ensureInWorkspace(Project p, Long wsId) {
        if (p == null) throw new NoSuchElementException("project not found");
        if (!wsId.equals(p.workspaceId)) throw new NoSuchElementException("project not found");
    }

    private ProjectDto toDto(Project p) {
        return new ProjectDto(p.id, p.groupId, p.name, p.type, p.canvasW, p.canvasH,
                p.canvasConfig, p.background, p.status, p.thumbnail, p.creatorId, p.createdAt, p.updatedAt);
    }
}
