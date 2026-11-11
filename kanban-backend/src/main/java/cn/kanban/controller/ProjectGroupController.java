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
import cn.kanban.dto.CreateGroupRequest;
import cn.kanban.dto.ProjectGroupDto;
import cn.kanban.dto.UpdateGroupRequest;
import cn.kanban.entity.ProjectGroup;
import cn.kanban.entity.User;
import cn.kanban.service.AuthService;
import cn.kanban.service.ProjectGroupService;

import java.sql.Timestamp;
import java.util.List;
import java.util.NoSuchElementException;

@RestController
@RequestMapping("/api/groups")
public class ProjectGroupController {

    @Autowired
    private AuthService authService;

    @Autowired
    private ProjectGroupService groupService;

    @GetMapping
    public List<ProjectGroupDto> list(WebRequest req, WebResponse resp) {
        User user = authService.authenticate(req, resp);
        if (user == null) return null;
        Long wsId = authService.resolveWorkspaceId(req, resp, user);
        if (wsId == null) return null;
        return groupService.listByWorkspace(wsId).stream().map(this::toDto).toList();
    }

    @PostMapping
    public ProjectGroupDto create(@RequestBody CreateGroupRequest body, WebRequest req, WebResponse resp) {
        User user = authService.authenticate(req, resp);
        if (user == null) return null;
        Long wsId = authService.resolveWorkspaceId(req, resp, user);
        if (wsId == null) return null;
        if (body == null || body.name() == null || body.name().isBlank()) {
            throw new IllegalArgumentException("name is required");
        }
        ProjectGroup g = new ProjectGroup();
        g.workspaceId = wsId;
        g.parentId = body.parentId();
        g.name = body.name().trim();
        g.sort = body.sort() == null ? 0 : body.sort();
        g.createdAt = new Timestamp(System.currentTimeMillis());
        groupService.save(g);
        return toDto(g);
    }

    @PutMapping("/{id}")
    public ProjectGroupDto update(@PathVariable Long id, @RequestBody UpdateGroupRequest body,
                                  WebRequest req, WebResponse resp) {
        User user = authService.authenticate(req, resp);
        if (user == null) return null;
        Long wsId = authService.resolveWorkspaceId(req, resp, user);
        if (wsId == null) return null;
        ProjectGroup g = groupService.findById(id);
        ensureInWorkspace(g, wsId);
        if (body == null) throw new IllegalArgumentException("body is required");
        if (body.name() != null) {
            if (body.name().isBlank()) throw new IllegalArgumentException("name must not be blank");
            g.name = body.name().trim();
        }
        if (body.parentId() != null) g.parentId = body.parentId();
        if (body.sort() != null) g.sort = body.sort();
        groupService.updateById(g);
        return toDto(g);
    }

    @DeleteMapping("/{id}")
    public void delete(@PathVariable Long id, WebRequest req, WebResponse resp) {
        User user = authService.authenticate(req, resp);
        if (user == null) return;
        Long wsId = authService.resolveWorkspaceId(req, resp, user);
        if (wsId == null) return;
        ProjectGroup g = groupService.findById(id);
        ensureInWorkspace(g, wsId);
        groupService.removeById(id);
        resp.status(204);
    }

    private void ensureInWorkspace(ProjectGroup g, Long wsId) {
        if (g == null) throw new NoSuchElementException("group not found");
        if (!wsId.equals(g.workspaceId)) throw new NoSuchElementException("group not found");
    }

    private ProjectGroupDto toDto(ProjectGroup g) {
        return new ProjectGroupDto(g.id, g.parentId, g.name, g.sort, g.createdAt);
    }
}
