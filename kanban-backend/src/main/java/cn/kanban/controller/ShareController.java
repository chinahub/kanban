package cn.kanban.controller;

import cn.jiebaba.summer.core.annotation.Autowired;
import cn.jiebaba.summer.web.annotation.GetMapping;
import cn.jiebaba.summer.web.annotation.PathVariable;
import cn.jiebaba.summer.web.annotation.PostMapping;
import cn.jiebaba.summer.web.annotation.RequestBody;
import cn.jiebaba.summer.web.annotation.RequestMapping;
import cn.jiebaba.summer.web.annotation.RestController;
import cn.jiebaba.summer.web.http.WebResponse;
import cn.jiebaba.summer.core.json.Json;
import cn.kanban.dto.GlobalVariableDto;
import cn.kanban.dto.ShareAccessRequest;
import cn.kanban.dto.ShareConfigDto;
import cn.kanban.dto.ShareMetaDto;
import cn.kanban.entity.GlobalVariable;
import cn.kanban.entity.Project;
import cn.kanban.entity.ShareLink;
import cn.kanban.entity.Snapshot;
import cn.kanban.service.GlobalVariableService;
import cn.kanban.service.ProjectService;
import cn.kanban.service.ShareLinkService;
import cn.kanban.service.SnapshotService;
import cn.kanban.util.PasswordUtil;

import java.sql.Timestamp;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.NoSuchElementException;

@RestController
@RequestMapping("/api/share")
public class ShareController {

    @Autowired
    private ShareLinkService shareLinkService;

    @Autowired
    private SnapshotService snapshotService;

    @Autowired
    private ProjectService projectService;

    @Autowired
    private GlobalVariableService globalVariableService;

    @GetMapping("/{token}")
    public ShareMetaDto meta(@PathVariable String token) {
        ShareLink sl = resolve(token);
        Project p = projectService.findById(sl.projectId);
        if (p == null) throw new NoSuchElementException("project not found");
        boolean requirePassword = sl.passwordHash != null && !sl.passwordHash.isBlank();
        return new ShareMetaDto(p.id, p.name, p.canvasW, p.canvasH, requirePassword);
    }

    @PostMapping("/{token}")
    public ShareConfigDto access(@PathVariable String token, @RequestBody ShareAccessRequest body, WebResponse resp) {
        ShareLink sl = resolve(token);
        if (sl.passwordHash != null && !sl.passwordHash.isBlank()) {
            String pwd = body == null ? null : body.password();
            if (!PasswordUtil.matches(pwd == null ? "" : pwd, sl.passwordHash)) {
                Map<String, Object> m = new LinkedHashMap<>();
                m.put("status", 403);
                m.put("error", "Forbidden");
                m.put("message", "访问密码错误");
                resp.status(403).contentType("application/json;charset=UTF-8").body(Json.stringify(m));
                return null;
            }
        }
        Snapshot s = sl.snapshotId == null ? null : snapshotService.getById(sl.snapshotId);
        if (s == null) throw new NoSuchElementException("snapshot not found");
        // 组件配置取快照，全局变量取实时值（分享页 {{var.xx}} 插值用）
        List<GlobalVariableDto> variables = globalVariableService.listByProject(sl.projectId).stream()
                .map(this::toDto).toList();
        return new ShareConfigDto(s.config, variables);
    }

    private GlobalVariableDto toDto(GlobalVariable v) {
        return new GlobalVariableDto(v.id, v.projectId, v.name, v.description, v.source, v.value,
                v.createdAt, v.updatedAt);
    }

    private ShareLink resolve(String token) {
        ShareLink sl = shareLinkService.findByToken(token);
        if (sl == null) throw new NoSuchElementException("分享链接不存在");
        if (sl.expireAt != null && sl.expireAt.before(new Timestamp(System.currentTimeMillis()))) {
            throw new NoSuchElementException("分享链接已失效或过期");
        }
        return sl;
    }
}
