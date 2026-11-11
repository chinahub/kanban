package cn.kanban.service;

import cn.jiebaba.summer.core.annotation.Autowired;
import cn.jiebaba.summer.core.annotation.Service;
import cn.jiebaba.summer.data.conditions.QueryWrapper;
import cn.jiebaba.summer.data.service.ServiceImpl;
import cn.kanban.entity.ProjectGroup;
import cn.kanban.mapper.ProjectGroupMapper;

import java.util.List;

@Service
public class ProjectGroupServiceImpl extends ServiceImpl<ProjectGroupMapper, ProjectGroup> implements ProjectGroupService {

    @Autowired
    public void setMapper(ProjectGroupMapper mapper) {
        this.baseMapper = mapper;
    }

    @Override
    public List<ProjectGroup> listByWorkspace(Long wsId) {
        if (wsId == null) return List.of();
        return list(new QueryWrapper<ProjectGroup>()
                .eq("workspace_id", wsId)
                .orderByAsc("sort")
                .orderByAsc("id"));
    }

    @Override
    public ProjectGroup findById(Long id) {
        return id == null ? null : getById(id);
    }
}
