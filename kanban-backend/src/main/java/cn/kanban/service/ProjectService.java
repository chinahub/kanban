package cn.kanban.service;

import cn.jiebaba.summer.data.service.IService;
import cn.kanban.entity.Project;

import java.util.List;

public interface ProjectService extends IService<Project> {
    List<Project> listByWorkspace(Long wsId, Long groupId, String type, Boolean ungrouped);
    Project findById(Long id);
    Project create(Long wsId, Long creatorId, String name, String type, Long groupId);
}
