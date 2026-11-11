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
import cn.kanban.dto.CreateFilterRequest;
import cn.kanban.dto.FilterDto;
import cn.kanban.dto.UpdateFilterRequest;
import cn.kanban.entity.Filter;
import cn.kanban.entity.User;
import cn.kanban.service.AuthService;
import cn.kanban.service.FilterService;

import java.util.List;
import java.util.NoSuchElementException;

@RestController
@RequestMapping("/api/filters")
public class FilterController {

    @Autowired
    private AuthService authService;

    @Autowired
    private FilterService filterService;

    @GetMapping
    public List<FilterDto> list(WebRequest req, WebResponse resp) {
        User user = authService.authenticate(req, resp);
        if (user == null) return null;
        Long wsId = authService.resolveWorkspaceId(req, resp, user);
        if (wsId == null) return null;
        return filterService.listByWorkspace(wsId).stream().map(this::toDto).toList();
    }

    @PostMapping
    public FilterDto create(@RequestBody CreateFilterRequest body, WebRequest req, WebResponse resp) {
        User user = authService.authenticate(req, resp);
        if (user == null) return null;
        Long wsId = authService.resolveWorkspaceId(req, resp, user);
        if (wsId == null) return null;
        if (body == null) throw new IllegalArgumentException("body is required");
        Filter f = filterService.create(wsId, user.id, body.name(), body.code());
        return toDto(f);
    }

    @GetMapping("/{id}")
    public FilterDto get(@PathVariable Long id, WebRequest req, WebResponse resp) {
        User user = authService.authenticate(req, resp);
        if (user == null) return null;
        Long wsId = authService.resolveWorkspaceId(req, resp, user);
        if (wsId == null) return null;
        Filter f = filterService.findById(id, wsId);
        if (f == null) throw new NoSuchElementException("filter not found");
        return toDto(f);
    }

    @PutMapping("/{id}")
    public FilterDto update(@PathVariable Long id, @RequestBody UpdateFilterRequest body,
                            WebRequest req, WebResponse resp) {
        User user = authService.authenticate(req, resp);
        if (user == null) return null;
        Long wsId = authService.resolveWorkspaceId(req, resp, user);
        if (wsId == null) return null;
        if (body == null) throw new IllegalArgumentException("body is required");
        Filter f = filterService.update(id, wsId, body.name(), body.code());
        return toDto(f);
    }

    @DeleteMapping("/{id}")
    public void delete(@PathVariable Long id, WebRequest req, WebResponse resp) {
        User user = authService.authenticate(req, resp);
        if (user == null) return;
        Long wsId = authService.resolveWorkspaceId(req, resp, user);
        if (wsId == null) return;
        filterService.delete(id, wsId);
        resp.status(204);
    }

    private FilterDto toDto(Filter f) {
        return new FilterDto(f.id, f.name, f.code, f.creatorId, f.createdAt, f.updatedAt);
    }
}
