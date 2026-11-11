package cn.kanban.service;

import cn.jiebaba.summer.core.util.JsonUtil.JSONArray;
import cn.jiebaba.summer.data.service.IService;
import cn.kanban.entity.DataSource;

import java.util.List;

public interface DataSourceService extends IService<DataSource> {
    List<DataSource> listByWorkspace(Long wsId);
    DataSource findById(Long id, Long wsId);
    DataSource create(Long wsId, Long creatorId, String name, String type, String config);
    DataSource update(Long id, Long wsId, String name, String type, String config);
    void delete(Long id, Long wsId);
    JSONArray fetchArray(Long id, Long wsId);
}
