package cn.kanban.service;

import cn.jiebaba.summer.data.service.IService;
import cn.kanban.entity.Filter;

import java.util.List;

public interface FilterService extends IService<Filter> {
    List<Filter> listByWorkspace(Long wsId);
    Filter findById(Long id, Long wsId);
    Filter create(Long wsId, Long creatorId, String name, String code);
    Filter update(Long id, Long wsId, String name, String code);
    void delete(Long id, Long wsId);
}
