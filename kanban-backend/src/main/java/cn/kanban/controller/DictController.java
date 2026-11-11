package cn.kanban.controller;

import cn.jiebaba.summer.core.annotation.Autowired;
import cn.jiebaba.summer.core.json.Json;
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
import cn.kanban.dto.CreateDictItemRequest;
import cn.kanban.dto.CreateDictRequest;
import cn.kanban.dto.DictDto;
import cn.kanban.dto.DictItemDto;
import cn.kanban.dto.UpdateDictItemRequest;
import cn.kanban.dto.UpdateDictRequest;
import cn.kanban.entity.SysDict;
import cn.kanban.entity.SysDictData;
import cn.kanban.entity.User;
import cn.kanban.service.AuthService;
import cn.kanban.service.DictService;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * 数据字典接口（系统级，全局共享）。
 * 查询对所有登录用户开放；类型/字典项的写操作仅平台管理员。
 */
@RestController
@RequestMapping("/api/dicts")
public class DictController {

    @Autowired
    private AuthService authService;

    @Autowired
    private DictService dictService;

    /** 全量字典（类型 + 全部字典项，含停用项；业务侧按 enabled 过滤）。 */
    @GetMapping
    public List<DictDto> list(WebRequest req, WebResponse resp) {
        if (requireAuth(req, resp) == null) return null;
        List<SysDictData> allItems = dictService.listItems();
        return dictService.listDicts().stream()
                .map(d -> toDto(d, allItems.stream()
                        .filter(i -> d.dictType.equals(i.dictType))
                        .map(this::toItemDto)
                        .toList()))
                .toList();
    }

    /** 新建字典类型（管理员）。 */
    @PostMapping
    public DictDto create(@RequestBody CreateDictRequest body, WebRequest req, WebResponse resp) {
        if (requirePlatformAdmin(req, resp) == null) return null;
        if (body == null) throw new IllegalArgumentException("body is required");
        SysDict d = dictService.createDict(body.dictType(), body.name(), body.remark(), body.sortOrder());
        return toDto(d, List.of());
    }

    /** 更新字典类型（管理员，编码不可改）。 */
    @PutMapping("/{id}")
    public DictDto update(@PathVariable Long id, @RequestBody UpdateDictRequest body,
                          WebRequest req, WebResponse resp) {
        if (requirePlatformAdmin(req, resp) == null) return null;
        if (body == null) throw new IllegalArgumentException("body is required");
        SysDict d = dictService.updateDict(id, body.name(), body.remark(), body.sortOrder());
        return toDto(d, dictService.listItems().stream()
                .filter(i -> d.dictType.equals(i.dictType))
                .map(this::toItemDto)
                .toList());
    }

    /** 删除字典类型（管理员；内置字典拒删，级联删除字典项）。 */
    @DeleteMapping("/{id}")
    public void delete(@PathVariable Long id, WebRequest req, WebResponse resp) {
        if (requirePlatformAdmin(req, resp) == null) return;
        dictService.deleteDict(id);
        resp.status(204);
    }

    /** 新建字典项（管理员）。 */
    @PostMapping("/{id}/items")
    public DictItemDto createItem(@PathVariable Long id, @RequestBody CreateDictItemRequest body,
                                  WebRequest req, WebResponse resp) {
        if (requirePlatformAdmin(req, resp) == null) return null;
        if (body == null) throw new IllegalArgumentException("body is required");
        SysDictData item = dictService.createItem(id, body.value(), body.label(), body.sortOrder(),
                body.enabled(), body.remark(), body.extJson());
        return toItemDto(item);
    }

    /** 更新字典项（管理员，value 不可改）。 */
    @PutMapping("/{id}/items/{itemId}")
    public DictItemDto updateItem(@PathVariable Long id, @PathVariable Long itemId,
                                  @RequestBody UpdateDictItemRequest body,
                                  WebRequest req, WebResponse resp) {
        if (requirePlatformAdmin(req, resp) == null) return null;
        if (body == null) throw new IllegalArgumentException("body is required");
        SysDictData item = dictService.updateItem(id, itemId, body.label(), body.sortOrder(),
                body.enabled(), body.remark(), body.extJson());
        return toItemDto(item);
    }

    /** 删除字典项（管理员）。 */
    @DeleteMapping("/{id}/items/{itemId}")
    public void deleteItem(@PathVariable Long id, @PathVariable Long itemId,
                           WebRequest req, WebResponse resp) {
        if (requirePlatformAdmin(req, resp) == null) return;
        dictService.deleteItem(id, itemId);
        resp.status(204);
    }

    /** 登录校验（字典查询对所有登录用户开放）；失败时写 401 响应体并返回 null。 */
    private User requireAuth(WebRequest req, WebResponse resp) {
        return authService.authenticate(req, resp);
    }

    /** 鉴权并校验平台管理员身份；失败时写 401/403 响应体并返回 null。 */
    private User requirePlatformAdmin(WebRequest req, WebResponse resp) {
        User user = authService.authenticate(req, resp);
        if (user == null) return null;
        if (!Boolean.TRUE.equals(user.isPlatformAdmin)) {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("status", 403);
            m.put("error", "Forbidden");
            m.put("message", "平台管理员才能维护数据字典");
            resp.status(403).contentType("application/json;charset=UTF-8").body(Json.stringify(m));
            return null;
        }
        return user;
    }

    private DictDto toDto(SysDict d, List<DictItemDto> items) {
        return new DictDto(d.id, d.dictType, d.name, d.remark, d.isSystem, d.sortOrder, items);
    }

    private DictItemDto toItemDto(SysDictData i) {
        return new DictItemDto(i.id, i.value, i.label, i.sortOrder, i.enabled, i.remark, i.extJson);
    }
}
