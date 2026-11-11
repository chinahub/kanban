package cn.kanban.controller;

import cn.jiebaba.summer.core.annotation.Autowired;
import cn.jiebaba.summer.web.annotation.DeleteMapping;
import cn.jiebaba.summer.web.annotation.GetMapping;
import cn.jiebaba.summer.web.annotation.PathVariable;
import cn.jiebaba.summer.web.annotation.PostMapping;
import cn.jiebaba.summer.web.annotation.RequestMapping;
import cn.jiebaba.summer.web.annotation.RestController;
import cn.jiebaba.summer.web.http.WebRequest;
import cn.jiebaba.summer.web.http.WebResponse;
import cn.kanban.dto.AssetDto;
import cn.kanban.entity.Asset;
import cn.kanban.entity.User;
import cn.kanban.service.AssetService;
import cn.kanban.service.AuthService;
import cn.kanban.storage.StorageProvider;

import java.util.List;
import java.util.NoSuchElementException;

@RestController
@RequestMapping("/api/assets")
public class AssetController {

    @Autowired
    private AuthService authService;

    @Autowired
    private AssetService assetService;

    @Autowired
    private StorageProvider storageProvider;

    @GetMapping
    public List<AssetDto> list(WebRequest req, WebResponse resp) {
        User user = authService.authenticate(req, resp);
        if (user == null) return null;
        Long wsId = authService.resolveWorkspaceId(req, resp, user);
        if (wsId == null) return null;
        return assetService.listByWorkspace(wsId).stream().map(this::toDto).toList();
    }

    // 文件上传：原始字节 body（summer 无 multipart 解析，故前端直接把文件内容作为请求体发送）。
    // 文件名经 name 查询参数，Content-Type 经请求头。
    @PostMapping("/upload")
    public AssetDto upload(WebRequest req, WebResponse resp) {
        User user = authService.authenticate(req, resp);
        if (user == null) return null;
        Long wsId = authService.resolveWorkspaceId(req, resp, user);
        if (wsId == null) return null;
        String name = req.query("name");
        if (name == null || name.isBlank()) throw new IllegalArgumentException("name is required");
        byte[] data = req.bodyBytes();
        if (data == null || data.length == 0) throw new IllegalArgumentException("file is empty");
        String contentType = req.contentType();
        if (contentType != null) {
            int semi = contentType.indexOf(';');
            if (semi >= 0) contentType = contentType.substring(0, semi).trim();
        }
        Asset a = assetService.create(wsId, user.id, name.trim(), contentType, data);
        return toDto(a);
    }

    // 公开访问（预览用 <img> 等），不鉴权
    @GetMapping("/{id}/raw")
    public void raw(@PathVariable Long id, WebRequest req, WebResponse resp) {
        Asset a = assetService.getById(id);
        if (a == null) {
            resp.status(404);
            return;
        }
        byte[] bytes = storageProvider.read(a.storagePath);
        resp.contentType(a.contentType != null ? a.contentType : "application/octet-stream").body(bytes);
    }

    @DeleteMapping("/{id}")
    public void delete(@PathVariable Long id, WebRequest req, WebResponse resp) {
        User user = authService.authenticate(req, resp);
        if (user == null) return;
        Long wsId = authService.resolveWorkspaceId(req, resp, user);
        if (wsId == null) return;
        assetService.delete(id, wsId);
        resp.status(204);
    }

    private AssetDto toDto(Asset a) {
        return new AssetDto(a.id, a.name, a.type, a.contentType, "/api/assets/" + a.id + "/raw",
                a.size, a.createdAt);
    }
}
