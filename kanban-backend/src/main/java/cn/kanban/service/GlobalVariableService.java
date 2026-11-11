package cn.kanban.service;

import cn.jiebaba.summer.data.service.IService;
import cn.kanban.entity.GlobalVariable;

import java.util.List;

public interface GlobalVariableService extends IService<GlobalVariable> {
    List<GlobalVariable> listByProject(Long projectId);
    GlobalVariable findById(Long id, Long projectId);
    GlobalVariable create(Long projectId, String name, String value, String description);
    GlobalVariable update(Long id, Long projectId, String name, String value, String description);
    void delete(Long id, Long projectId);
}
