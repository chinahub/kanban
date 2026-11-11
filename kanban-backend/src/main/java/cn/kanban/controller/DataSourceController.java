package cn.kanban.controller;

import cn.jiebaba.summer.core.annotation.Autowired;
import cn.jiebaba.summer.core.util.JsonUtil;
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
import cn.kanban.dto.CreateDataSourceRequest;
import cn.kanban.dto.DataSourceDto;
import cn.kanban.dto.FetchResultDto;
import cn.kanban.dto.UpdateDataSourceRequest;
import cn.kanban.entity.DataSource;
import cn.kanban.entity.User;
import cn.kanban.service.AuthService;
import cn.kanban.service.DataSourceService;

import java.util.List;
import java.util.NoSuchElementException;

@RestController
@RequestMapping("/api/datasources")
public class DataSourceController {

    @Autowired
    private AuthService authService;

    @Autowired
    private DataSourceService dataSourceService;

    @GetMapping
    public List<DataSourceDto> list(WebRequest req, WebResponse resp) {
        User user = authService.authenticate(req, resp);
        if (user == null) return null;
        Long wsId = authService.resolveWorkspaceId(req, resp, user);
        if (wsId == null) return null;
        return dataSourceService.listByWorkspace(wsId).stream().map(this::toDto).toList();
    }

    @PostMapping
    public DataSourceDto create(@RequestBody CreateDataSourceRequest body, WebRequest req, WebResponse resp) {
        User user = authService.authenticate(req, resp);
        if (user == null) return null;
        Long wsId = authService.resolveWorkspaceId(req, resp, user);
        if (wsId == null) return null;
        if (body == null) throw new IllegalArgumentException("body is required");
        DataSource ds = dataSourceService.create(wsId, user.id, body.name(), body.type(), body.config());
        return toDto(ds);
    }

    @GetMapping("/{id}")
    public DataSourceDto get(@PathVariable Long id, WebRequest req, WebResponse resp) {
        User user = authService.authenticate(req, resp);
        if (user == null) return null;
        Long wsId = authService.resolveWorkspaceId(req, resp, user);
        if (wsId == null) return null;
        DataSource ds = dataSourceService.findById(id, wsId);
        if (ds == null) throw new NoSuchElementException("data source not found");
        return toDto(ds);
    }

    @PutMapping("/{id}")
    public DataSourceDto update(@PathVariable Long id, @RequestBody UpdateDataSourceRequest body,
                                WebRequest req, WebResponse resp) {
        User user = authService.authenticate(req, resp);
        if (user == null) return null;
        Long wsId = authService.resolveWorkspaceId(req, resp, user);
        if (wsId == null) return null;
        if (body == null) throw new IllegalArgumentException("body is required");
        DataSource ds = dataSourceService.update(id, wsId, body.name(), body.type(), body.config());
        return toDto(ds);
    }

    @DeleteMapping("/{id}")
    public void delete(@PathVariable Long id, WebRequest req, WebResponse resp) {
        User user = authService.authenticate(req, resp);
        if (user == null) return;
        Long wsId = authService.resolveWorkspaceId(req, resp, user);
        if (wsId == null) return;
        dataSourceService.delete(id, wsId);
        resp.status(204);
    }

    @PostMapping("/{id}/fetch")
    public FetchResultDto fetch(@PathVariable Long id, WebRequest req, WebResponse resp) {
        User user = authService.authenticate(req, resp);
        if (user == null) return null;
        Long wsId = authService.resolveWorkspaceId(req, resp, user);
        if (wsId == null) return null;
        DataSource ds = dataSourceService.findById(id, wsId);
        if (ds == null) throw new NoSuchElementException("data source not found");
        String data = JsonUtil.toJsonStr(dataSourceService.fetchArray(id, wsId));
        return new FetchResultDto(ds.type, data);
    }

    private DataSourceDto toDto(DataSource ds) {
        return new DataSourceDto(ds.id, ds.name, ds.type, ds.config, ds.creatorId, ds.createdAt, ds.updatedAt);
    }
}
