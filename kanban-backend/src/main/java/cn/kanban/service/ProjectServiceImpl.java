package cn.kanban.service;

import cn.jiebaba.summer.core.annotation.Autowired;
import cn.jiebaba.summer.core.annotation.Service;
import cn.jiebaba.summer.data.conditions.QueryWrapper;
import cn.jiebaba.summer.data.service.ServiceImpl;
import cn.kanban.entity.Project;
import cn.kanban.mapper.ProjectMapper;

import java.sql.Timestamp;
import java.util.List;

@Service
public class ProjectServiceImpl extends ServiceImpl<ProjectMapper, Project> implements ProjectService {

    @Autowired
    public void setMapper(ProjectMapper mapper) {
        this.baseMapper = mapper;
    }

    @Override
    public List<Project> listByWorkspace(Long wsId, Long groupId, String type, Boolean ungrouped) {
        if (wsId == null) return List.of();
        QueryWrapper<Project> qw = new QueryWrapper<Project>().eq("workspace_id", wsId);
        if (Boolean.TRUE.equals(ungrouped)) {
            qw.isNull("group_id");
        } else if (groupId != null) {
            qw.eq("group_id", groupId);
        }
        if (type != null && !type.isBlank()) {
            qw.eq("type", type);
        }
        qw.orderByDesc("updated_at");
        return list(qw);
    }

    @Override
    public Project findById(Long id) {
        return id == null ? null : getById(id);
    }

    @Override
    public Project create(Long wsId, Long creatorId, String name, String type, Long groupId) {
        Project p = new Project();
        p.workspaceId = wsId;
        p.creatorId = creatorId;
        p.name = name;
        p.type = type == null || type.isBlank() ? "PC" : type;
        p.groupId = groupId;
        // 移动端项目默认 375×667 竖屏画布，PC 保持 1920×1080
        if ("MOBILE".equals(p.type)) {
            p.canvasW = 375;
            p.canvasH = 667;
        } else {
            p.canvasW = 1920;
            p.canvasH = 1080;
        }
        p.status = "DRAFT";
        Timestamp now = new Timestamp(System.currentTimeMillis());
        p.createdAt = now;
        p.updatedAt = now;
        save(p);
        return p;
    }
}
