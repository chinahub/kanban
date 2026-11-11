package cn.kanban.service;

import cn.jiebaba.summer.data.service.IService;
import cn.kanban.entity.Snapshot;

import java.util.List;

public interface SnapshotService extends IService<Snapshot> {
    Snapshot publish(Long projectId, Long userId);
    List<Snapshot> listByProject(Long projectId);
    Snapshot latest(Long projectId);
}
