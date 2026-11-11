package cn.kanban.service;

import cn.jiebaba.summer.data.service.IService;
import cn.kanban.entity.ProjectGroup;

import java.util.List;

public interface ProjectGroupService extends IService<ProjectGroup> {
    List<ProjectGroup> listByWorkspace(Long wsId);
    ProjectGroup findById(Long id);
}
