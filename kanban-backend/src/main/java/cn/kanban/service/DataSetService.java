package cn.kanban.service;

import cn.jiebaba.summer.data.service.IService;
import cn.kanban.entity.DataSet;

import java.util.List;

public interface DataSetService extends IService<DataSet> {
    List<DataSet> listByWorkspace(Long wsId, Long sourceId);
    DataSet findById(Long id, Long wsId);
    DataSet create(Long wsId, Long creatorId, String name, Long sourceId, String transform);
    DataSet update(Long id, Long wsId, String name, Long sourceId, String transform);
    void delete(Long id, Long wsId);
    DataSet refresh(Long id, Long wsId);
}
