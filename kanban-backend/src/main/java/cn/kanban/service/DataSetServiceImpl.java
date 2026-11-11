package cn.kanban.service;

import cn.jiebaba.summer.core.annotation.Autowired;
import cn.jiebaba.summer.core.annotation.Service;
import cn.jiebaba.summer.core.util.JsonUtil;
import cn.jiebaba.summer.core.util.JsonUtil.JSONArray;
import cn.jiebaba.summer.core.util.JsonUtil.JSONObject;
import cn.jiebaba.summer.data.conditions.QueryWrapper;
import cn.jiebaba.summer.data.service.ServiceImpl;
import cn.kanban.entity.DataSet;
import cn.kanban.entity.DataSource;
import cn.kanban.mapper.DataSetMapper;

import java.sql.Timestamp;
import java.util.Iterator;
import java.util.List;
import java.util.Map;
import java.util.NoSuchElementException;

@Service
public class DataSetServiceImpl extends ServiceImpl<DataSetMapper, DataSet> implements DataSetService {

    private final DataSourceService dataSourceService;

    @Autowired
    public DataSetServiceImpl(DataSourceService dataSourceService) {
        this.dataSourceService = dataSourceService;
    }

    @Autowired
    public void setMapper(DataSetMapper mapper) {
        this.baseMapper = mapper;
    }

    @Override
    public List<DataSet> listByWorkspace(Long wsId, Long sourceId) {
        if (wsId == null) return List.of();
        QueryWrapper<DataSet> qw = new QueryWrapper<DataSet>().eq("workspace_id", wsId);
        if (sourceId != null) qw.eq("source_id", sourceId);
        return list(qw.orderByDesc("updated_at"));
    }

    @Override
    public DataSet findById(Long id, Long wsId) {
        if (id == null) return null;
        DataSet ds = getById(id);
        if (ds != null && wsId != null && !wsId.equals(ds.workspaceId)) return null;
        return ds;
    }

    @Override
    public DataSet create(Long wsId, Long creatorId, String name, Long sourceId, String transform) {
        if (name == null || name.isBlank()) throw new IllegalArgumentException("name is required");
        if (sourceId == null) throw new IllegalArgumentException("sourceId is required");
        DataSource src = dataSourceService.findById(sourceId, wsId);
        if (src == null) throw new NoSuchElementException("data source not found");
        DataSet ds = new DataSet();
        ds.workspaceId = wsId;
        ds.creatorId = creatorId;
        ds.name = name.trim();
        ds.sourceId = sourceId;
        ds.transform = (transform == null || transform.isBlank()) ? null : transform;
        Timestamp now = new Timestamp(System.currentTimeMillis());
        ds.createdAt = now;
        ds.updatedAt = now;
        save(ds);
        return ds;
    }

    @Override
    public DataSet update(Long id, Long wsId, String name, Long sourceId, String transform) {
        DataSet ds = findById(id, wsId);
        if (ds == null) throw new NoSuchElementException("data set not found");
        if (name != null) {
            if (name.isBlank()) throw new IllegalArgumentException("name must not be blank");
            ds.name = name.trim();
        }
        if (sourceId != null) {
            DataSource src = dataSourceService.findById(sourceId, wsId);
            if (src == null) throw new NoSuchElementException("data source not found");
            ds.sourceId = sourceId;
        }
        if (transform != null) ds.transform = transform.isBlank() ? null : transform;
        ds.updatedAt = new Timestamp(System.currentTimeMillis());
        updateById(ds);
        return ds;
    }

    @Override
    public void delete(Long id, Long wsId) {
        DataSet ds = findById(id, wsId);
        if (ds == null) throw new NoSuchElementException("data set not found");
        removeById(id);
    }

    @Override
    public DataSet refresh(Long id, Long wsId) {
        DataSet ds = findById(id, wsId);
        if (ds == null) throw new NoSuchElementException("data set not found");
        if (ds.sourceId == null) throw new IllegalStateException("data set has no source");

        JSONArray dataArr = dataSourceService.fetchArray(ds.sourceId, wsId);

        if (ds.transform != null && !ds.transform.isBlank()) {
            JSONObject tx = JsonUtil.parseObj(ds.transform);
            JSONObject renames = tx.getJSONObject("renames");
            if (renames != null && !renames.isEmpty()) {
                dataArr = applyRenames(dataArr, renames);
            }
        }

        ds.data = JsonUtil.toJsonStr(dataArr);
        ds.lastRefreshAt = new Timestamp(System.currentTimeMillis());
        ds.updatedAt = ds.lastRefreshAt;
        updateById(ds);
        return ds;
    }

    private JSONArray applyRenames(JSONArray src, JSONObject renames) {
        JSONArray out = new JSONArray();
        for (int i = 0; i < src.size(); i++) {
            Object item = src.get(i);
            if (!(item instanceof JSONObject jo)) {
                out.add(item);
                continue;
            }
            JSONObject copy = new JSONObject();
            copy.putAll(jo);
            Iterator<Map.Entry<String, Object>> it = renames.entrySet().iterator();
            while (it.hasNext()) {
                Map.Entry<String, Object> e = it.next();
                if (copy.containsKey(e.getKey())) {
                    copy.put(e.getValue().toString(), copy.remove(e.getKey()));
                }
            }
            out.add(copy);
        }
        return out;
    }
}
