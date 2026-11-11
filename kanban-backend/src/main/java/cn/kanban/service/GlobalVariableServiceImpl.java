package cn.kanban.service;

import cn.jiebaba.summer.core.annotation.Autowired;
import cn.jiebaba.summer.core.annotation.Service;
import cn.jiebaba.summer.data.conditions.QueryWrapper;
import cn.jiebaba.summer.data.service.ServiceImpl;
import cn.kanban.entity.GlobalVariable;
import cn.kanban.mapper.GlobalVariableMapper;

import java.sql.Timestamp;
import java.util.List;
import java.util.NoSuchElementException;

@Service
public class GlobalVariableServiceImpl extends ServiceImpl<GlobalVariableMapper, GlobalVariable> implements GlobalVariableService {

    @Autowired
    public void setMapper(GlobalVariableMapper mapper) {
        this.baseMapper = mapper;
    }

    @Override
    public List<GlobalVariable> listByProject(Long projectId) {
        if (projectId == null) return List.of();
        return list(new QueryWrapper<GlobalVariable>().eq("project_id", projectId).orderByAsc("name"));
    }

    @Override
    public GlobalVariable findById(Long id, Long projectId) {
        if (id == null) return null;
        GlobalVariable v = getById(id);
        if (v != null && projectId != null && !projectId.equals(v.projectId)) return null;
        return v;
    }

    @Override
    public GlobalVariable create(Long projectId, String name, String value, String description) {
        if (name == null || name.isBlank()) throw new IllegalArgumentException("name is required");
        long exists = count(new QueryWrapper<GlobalVariable>().eq("project_id", projectId).eq("name", name.trim()));
        if (exists > 0) throw new IllegalArgumentException("变量名已存在：" + name.trim());
        GlobalVariable v = new GlobalVariable();
        v.projectId = projectId;
        v.name = name.trim();
        v.description = description;
        v.source = "static";
        v.value = value == null ? "" : value;
        Timestamp now = new Timestamp(System.currentTimeMillis());
        v.createdAt = now;
        v.updatedAt = now;
        save(v);
        return v;
    }

    @Override
    public GlobalVariable update(Long id, Long projectId, String name, String value, String description) {
        GlobalVariable v = findById(id, projectId);
        if (v == null) throw new NoSuchElementException("variable not found");
        if (name != null) {
            String n = name.trim();
            if (n.isBlank()) throw new IllegalArgumentException("name must not be blank");
            if (!n.equals(v.name)) {
                long exists = count(new QueryWrapper<GlobalVariable>().eq("project_id", projectId).eq("name", n));
                if (exists > 0) throw new IllegalArgumentException("变量名已存在：" + n);
                v.name = n;
            }
        }
        if (description != null) v.description = description;
        if (value != null) v.value = value;
        v.updatedAt = new Timestamp(System.currentTimeMillis());
        updateById(v);
        return v;
    }

    @Override
    public void delete(Long id, Long projectId) {
        GlobalVariable v = findById(id, projectId);
        if (v == null) throw new NoSuchElementException("variable not found");
        removeById(id);
    }
}
