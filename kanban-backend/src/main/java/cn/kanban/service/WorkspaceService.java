package cn.kanban.service;

import cn.kanban.entity.Workspace;
import cn.jiebaba.summer.data.service.IService;

import java.util.List;

public interface WorkspaceService extends IService<Workspace> {
    Workspace findById(Long id);
    Workspace findByCode(String code);
    List<Workspace> listAll();
    List<Workspace> listByUserId(Long userId);
    Workspace create(String code, String name, String description, boolean system);
}
