package cn.kanban.service;

import cn.jiebaba.summer.core.annotation.Autowired;
import cn.jiebaba.summer.core.annotation.Service;
import cn.jiebaba.summer.data.conditions.QueryWrapper;
import cn.jiebaba.summer.data.service.ServiceImpl;
import cn.kanban.entity.Filter;
import cn.kanban.mapper.FilterMapper;

import java.sql.Timestamp;
import java.util.List;
import java.util.NoSuchElementException;

@Service
public class FilterServiceImpl extends ServiceImpl<FilterMapper, Filter> implements FilterService {

    @Autowired
    public void setMapper(FilterMapper mapper) {
        this.baseMapper = mapper;
    }

    @Override
    public List<Filter> listByWorkspace(Long wsId) {
        if (wsId == null) return List.of();
        return list(new QueryWrapper<Filter>().eq("workspace_id", wsId).orderByDesc("updated_at"));
    }

    @Override
    public Filter findById(Long id, Long wsId) {
        if (id == null) return null;
        Filter f = getById(id);
        if (f != null && wsId != null && !wsId.equals(f.workspaceId)) return null;
        return f;
    }

    @Override
    public Filter create(Long wsId, Long creatorId, String name, String code) {
        if (name == null || name.isBlank()) throw new IllegalArgumentException("name is required");
        Filter f = new Filter();
        f.workspaceId = wsId;
        f.creatorId = creatorId;
        f.name = name.trim();
        f.code = code == null ? "" : code;
        Timestamp now = new Timestamp(System.currentTimeMillis());
        f.createdAt = now;
        f.updatedAt = now;
        save(f);
        return f;
    }

    @Override
    public Filter update(Long id, Long wsId, String name, String code) {
        Filter f = findById(id, wsId);
        if (f == null) throw new NoSuchElementException("filter not found");
        if (name != null) {
            if (name.isBlank()) throw new IllegalArgumentException("name must not be blank");
            f.name = name.trim();
        }
        if (code != null) f.code = code;
        f.updatedAt = new Timestamp(System.currentTimeMillis());
        updateById(f);
        return f;
    }

    @Override
    public void delete(Long id, Long wsId) {
        Filter f = findById(id, wsId);
        if (f == null) throw new NoSuchElementException("filter not found");
        removeById(id);
    }
}
