package cn.kanban.service;

import cn.jiebaba.summer.core.annotation.Autowired;
import cn.jiebaba.summer.core.annotation.Service;
import cn.jiebaba.summer.data.conditions.QueryWrapper;
import cn.jiebaba.summer.data.service.ServiceImpl;
import cn.kanban.entity.Project;
import cn.kanban.entity.Snapshot;
import cn.kanban.mapper.SnapshotMapper;

import java.sql.Timestamp;
import java.util.List;
import java.util.NoSuchElementException;

@Service
public class SnapshotServiceImpl extends ServiceImpl<SnapshotMapper, Snapshot> implements SnapshotService {

    @Autowired
    private ProjectService projectService;

    @Autowired
    public void setMapper(SnapshotMapper mapper) {
        this.baseMapper = mapper;
    }

    @Override
    public Snapshot publish(Long projectId, Long userId) {
        Project p = projectService.findById(projectId);
        if (p == null) throw new NoSuchElementException("project not found");
        int version = 1;
        List<Snapshot> existing = list(new QueryWrapper<Snapshot>()
                .eq("project_id", projectId).orderByDesc("version"));
        if (!existing.isEmpty() && existing.get(0).version != null) {
            version = existing.get(0).version + 1;
        }
        Snapshot s = new Snapshot();
        s.projectId = projectId;
        s.version = version;
        s.config = p.canvasConfig;
        s.createdBy = userId;
        s.createdAt = new Timestamp(System.currentTimeMillis());
        save(s);
        p.status = "PUBLISHED";
        p.updatedAt = new Timestamp(System.currentTimeMillis());
        projectService.updateById(p);
        return s;
    }

    @Override
    public List<Snapshot> listByProject(Long projectId) {
        if (projectId == null) return List.of();
        return list(new QueryWrapper<Snapshot>()
                .eq("project_id", projectId).orderByDesc("version"));
    }

    @Override
    public Snapshot latest(Long projectId) {
        if (projectId == null) return null;
        List<Snapshot> list = listByProject(projectId);
        return list.isEmpty() ? null : list.get(0);
    }
}
