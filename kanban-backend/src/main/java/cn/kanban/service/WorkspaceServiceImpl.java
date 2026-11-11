package cn.kanban.service;

import cn.kanban.entity.Workspace;
import cn.kanban.entity.WorkspaceMember;
import cn.kanban.mapper.WorkspaceMapper;
import cn.kanban.mapper.WorkspaceMemberMapper;
import cn.jiebaba.summer.core.annotation.Autowired;
import cn.jiebaba.summer.core.annotation.Service;
import cn.jiebaba.summer.data.conditions.QueryWrapper;
import cn.jiebaba.summer.data.service.ServiceImpl;

import java.util.List;

@Service
public class WorkspaceServiceImpl extends ServiceImpl<WorkspaceMapper, Workspace> implements WorkspaceService {

    private final WorkspaceMemberMapper memberMapper;

    public WorkspaceServiceImpl(WorkspaceMemberMapper memberMapper) {
        this.memberMapper = memberMapper;
    }

    @Autowired
    public void setMapper(WorkspaceMapper mapper) {
        this.baseMapper = mapper;
    }

    @Override
    public Workspace findById(Long id) {
        return id == null ? null : getById(id);
    }

    @Override
    public Workspace findByCode(String code) {
        if (code == null) return null;
        return getOne(new QueryWrapper<Workspace>().eq("code", code));
    }

    @Override
    public List<Workspace> listAll() {
        return list(new QueryWrapper<Workspace>().orderByAsc("id"));
    }

    @Override
    public List<Workspace> listByUserId(Long userId) {
        if (userId == null) return List.of();
        QueryWrapper<WorkspaceMember> qw = new QueryWrapper<WorkspaceMember>().eq("user_id", userId);
        List<WorkspaceMember> members = memberMapper.selectList(qw);
        if (members.isEmpty()) return List.of();
        List<Long> ids = members.stream().map(m -> m.workspaceId).toList();
        return list(new QueryWrapper<Workspace>().in("id", ids).orderByAsc("id"));
    }

    @Override
    public Workspace create(String code, String name, String description, boolean system) {
        Workspace w = new Workspace();
        w.code = code;
        w.name = name;
        w.description = description;
        w.isSystem = system;
        w.createdAt = new java.sql.Timestamp(System.currentTimeMillis());
        w.updatedAt = w.createdAt;
        save(w);
        return w;
    }
}
