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
import cn.kanban.dto.CreateDataSetRequest;
import cn.kanban.dto.DataSetDto;
import cn.kanban.dto.UpdateDataSetRequest;
import cn.kanban.entity.DataSet;
import cn.kanban.entity.User;
import cn.kanban.service.AuthService;
import cn.kanban.service.DataSetService;

import java.util.List;
import java.util.NoSuchElementException;

@RestController
@RequestMapping("/api/datasets")
public class DataSetController {

    @Autowired
    private AuthService authService;

    @Autowired
    private DataSetService dataSetService;

    @GetMapping
    public List<DataSetDto> list(@RequestParam(value = "sourceId", required = false) Long sourceId,
                                 WebRequest req, WebResponse resp) {
        User user = authService.authenticate(req, resp);
        if (user == null) return null;
        Long wsId = authService.resolveWorkspaceId(req, resp, user);
        if (wsId == null) return null;
        return dataSetService.listByWorkspace(wsId, sourceId).stream().map(this::toDto).toList();
    }

    @PostMapping
    public DataSetDto create(@RequestBody CreateDataSetRequest body, WebRequest req, WebResponse resp) {
        User user = authService.authenticate(req, resp);
        if (user == null) return null;
        Long wsId = authService.resolveWorkspaceId(req, resp, user);
        if (wsId == null) return null;
        if (body == null) throw new IllegalArgumentException("body is required");
        DataSet ds = dataSetService.create(wsId, user.id, body.name(), body.sourceId(), body.transform());
        return toDto(ds);
    }

    @GetMapping("/{id}")
    public DataSetDto get(@PathVariable Long id, WebRequest req, WebResponse resp) {
        User user = authService.authenticate(req, resp);
        if (user == null) return null;
        Long wsId = authService.resolveWorkspaceId(req, resp, user);
        if (wsId == null) return null;
        DataSet ds = dataSetService.findById(id, wsId);
        if (ds == null) throw new NoSuchElementException("data set not found");
        return toDto(ds);
    }

    @PutMapping("/{id}")
    public DataSetDto update(@PathVariable Long id, @RequestBody UpdateDataSetRequest body,
                             WebRequest req, WebResponse resp) {
        User user = authService.authenticate(req, resp);
        if (user == null) return null;
        Long wsId = authService.resolveWorkspaceId(req, resp, user);
        if (wsId == null) return null;
        if (body == null) throw new IllegalArgumentException("body is required");
        DataSet ds = dataSetService.update(id, wsId, body.name(), body.sourceId(), body.transform());
        return toDto(ds);
    }

    @DeleteMapping("/{id}")
    public void delete(@PathVariable Long id, WebRequest req, WebResponse resp) {
        User user = authService.authenticate(req, resp);
        if (user == null) return;
        Long wsId = authService.resolveWorkspaceId(req, resp, user);
        if (wsId == null) return;
        dataSetService.delete(id, wsId);
        resp.status(204);
    }

    @PostMapping("/{id}/refresh")
    public DataSetDto refresh(@PathVariable Long id, WebRequest req, WebResponse resp) {
        User user = authService.authenticate(req, resp);
        if (user == null) return null;
        Long wsId = authService.resolveWorkspaceId(req, resp, user);
        if (wsId == null) return null;
        DataSet ds = dataSetService.refresh(id, wsId);
        return toDto(ds);
    }

    private DataSetDto toDto(DataSet ds) {
        return new DataSetDto(ds.id, ds.sourceId, ds.name, ds.transform, ds.data,
                ds.lastRefreshAt, ds.creatorId, ds.createdAt, ds.updatedAt);
    }
}
