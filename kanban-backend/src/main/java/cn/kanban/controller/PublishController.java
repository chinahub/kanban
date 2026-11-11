package cn.kanban.controller;

import cn.jiebaba.summer.core.annotation.Autowired;
import cn.jiebaba.summer.web.annotation.GetMapping;
import cn.jiebaba.summer.web.annotation.PathVariable;
import cn.jiebaba.summer.web.annotation.PostMapping;
import cn.jiebaba.summer.web.annotation.RequestBody;
import cn.jiebaba.summer.web.annotation.RequestMapping;
import cn.jiebaba.summer.web.annotation.RestController;
import cn.jiebaba.summer.web.http.WebRequest;
import cn.jiebaba.summer.web.http.WebResponse;
import cn.kanban.dto.CreateShareRequest;
import cn.kanban.dto.ShareLinkDto;
import cn.kanban.dto.SnapshotDto;
import cn.kanban.entity.Project;
import cn.kanban.entity.ShareLink;
import cn.kanban.entity.Snapshot;
import cn.kanban.entity.User;
import cn.kanban.service.AuthService;
import cn.kanban.service.ProjectService;
import cn.kanban.service.ShareLinkService;
import cn.kanban.service.SnapshotService;

import java.util.List;
import java.util.NoSuchElementException;

@RestController
@RequestMapping("/api/projects")
public class PublishController {

    @Autowired
    private AuthService authService;

    @Autowired
    private ProjectService projectService;

    @Autowired
    private SnapshotService snapshotService;

    @Autowired
    private ShareLinkService shareLinkService;

    @PostMapping("/{id}/publish")
    public SnapshotDto publish(@PathVariable Long id, WebRequest req, WebResponse resp) {
        User user = requireOwner(id, req, resp);
        if (user == null) return null;
        Snapshot s = snapshotService.publish(id, user.id);
        return toDto(s);
    }

    @GetMapping("/{id}/snapshots")
    public List<SnapshotDto> snapshots(@PathVariable Long id, WebRequest req, WebResponse resp) {
        if (requireOwner(id, req, resp) == null) return null;
        return snapshotService.listByProject(id).stream().map(this::toDto).toList();
    }

    @PostMapping("/{id}/share")
    public ShareLinkDto share(@PathVariable Long id, @RequestBody CreateShareRequest body,
                              WebRequest req, WebResponse resp) {
        if (requireOwner(id, req, resp) == null) return null;
        Snapshot latest = snapshotService.latest(id);
        if (latest == null) throw new IllegalArgumentException("请先发布看板再生成分享链接");
        String password = body == null ? null : body.password();
        ShareLink sl = shareLinkService.create(id, latest.id, password);
        boolean hasPassword = sl.passwordHash != null && !sl.passwordHash.isBlank();
        return new ShareLinkDto(sl.id, sl.token, "/s/" + sl.token, hasPassword, sl.snapshotId, sl.createdAt);
    }

    private User requireOwner(Long projectId, WebRequest req, WebResponse resp) {
        User user = authService.authenticate(req, resp);
        if (user == null) return null;
        Long wsId = authService.resolveWorkspaceId(req, resp, user);
        if (wsId == null) return null;
        Project p = projectService.findById(projectId);
        if (p == null || !wsId.equals(p.workspaceId)) throw new NoSuchElementException("project not found");
        return user;
    }

    private SnapshotDto toDto(Snapshot s) {
        return new SnapshotDto(s.id, s.projectId, s.version, s.createdBy, s.createdAt);
    }
}
