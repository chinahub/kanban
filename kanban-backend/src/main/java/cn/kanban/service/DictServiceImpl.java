package cn.kanban.service;

import cn.jiebaba.summer.core.annotation.Autowired;
import cn.jiebaba.summer.core.annotation.Service;
import cn.jiebaba.summer.data.conditions.QueryWrapper;
import cn.jiebaba.summer.data.service.ServiceImpl;
import cn.kanban.entity.SysDict;
import cn.kanban.entity.SysDictData;
import cn.kanban.mapper.SysDictDataMapper;
import cn.kanban.mapper.SysDictMapper;

import java.sql.Timestamp;
import java.util.List;
import java.util.NoSuchElementException;

@Service
public class DictServiceImpl extends ServiceImpl<SysDictMapper, SysDict> implements DictService {

    private SysDictDataMapper dictDataMapper;

    @Autowired
    public void setDictMapper(SysDictMapper dictMapper) {
        this.baseMapper = dictMapper;
    }

    @Autowired
    public void setDictDataMapper(SysDictDataMapper dictDataMapper) {
        this.dictDataMapper = dictDataMapper;
    }

    @Override
    public List<SysDict> listDicts() {
        return list(new QueryWrapper<SysDict>().orderByAsc("sort_order").orderByAsc("id"));
    }

    @Override
    public List<SysDictData> listItems() {
        return dictDataMapper.selectList(
                new QueryWrapper<SysDictData>().orderByAsc("dict_type").orderByAsc("sort_order").orderByAsc("id"));
    }

    @Override
    public SysDict createDict(String dictType, String name, String remark, Integer sortOrder) {
        if (dictType == null || dictType.isBlank()) throw new IllegalArgumentException("dictType is required");
        if (name == null || name.isBlank()) throw new IllegalArgumentException("name is required");
        String type = dictType.trim();
        long exists = count(new QueryWrapper<SysDict>().eq("dict_type", type));
        if (exists > 0) throw new IllegalArgumentException("字典类型已存在：" + type);
        SysDict d = new SysDict();
        d.dictType = type;
        d.name = name.trim();
        d.remark = remark;
        d.isSystem = false;
        d.sortOrder = sortOrder == null ? 0 : sortOrder;
        Timestamp now = new Timestamp(System.currentTimeMillis());
        d.createdAt = now;
        d.updatedAt = now;
        save(d);
        return d;
    }

    @Override
    public SysDict updateDict(Long id, String name, String remark, Integer sortOrder) {
        SysDict d = getById(id);
        if (d == null) throw new NoSuchElementException("dict not found");
        if (name != null) {
            String n = name.trim();
            if (n.isBlank()) throw new IllegalArgumentException("name must not be blank");
            d.name = n;
        }
        if (remark != null) d.remark = remark;
        if (sortOrder != null) d.sortOrder = sortOrder;
        d.updatedAt = new Timestamp(System.currentTimeMillis());
        updateById(d);
        return d;
    }

    @Override
    public void deleteDict(Long id) {
        SysDict d = getById(id);
        if (d == null) throw new NoSuchElementException("dict not found");
        if (Boolean.TRUE.equals(d.isSystem)) {
            throw new IllegalArgumentException("系统内置字典不允许删除：" + d.dictType);
        }
        // 级联删除该类型下全部字典项
        for (SysDictData item : dictDataMapper.selectList(
                new QueryWrapper<SysDictData>().eq("dict_type", d.dictType))) {
            dictDataMapper.deleteById(item.id);
        }
        removeById(id);
    }

    @Override
    public SysDictData createItem(Long dictId, String value, String label, Integer sortOrder,
                                  Boolean enabled, String remark, String extJson) {
        SysDict d = getById(dictId);
        if (d == null) throw new NoSuchElementException("dict not found");
        if (value == null || value.isBlank()) throw new IllegalArgumentException("value is required");
        if (label == null || label.isBlank()) throw new IllegalArgumentException("label is required");
        String v = value.trim();
        long exists = countItems(d.dictType, v);
        if (exists > 0) throw new IllegalArgumentException("字典项值已存在：" + v);
        SysDictData item = new SysDictData();
        item.dictType = d.dictType;
        item.value = v;
        item.label = label.trim();
        item.sortOrder = sortOrder == null ? 0 : sortOrder;
        item.enabled = enabled == null || enabled;
        item.remark = remark;
        item.extJson = extJson;
        Timestamp now = new Timestamp(System.currentTimeMillis());
        item.createdAt = now;
        item.updatedAt = now;
        dictDataMapper.insert(item);
        return item;
    }

    @Override
    public SysDictData updateItem(Long dictId, Long itemId, String label, Integer sortOrder,
                                  Boolean enabled, String remark, String extJson) {
        SysDictData item = findItem(dictId, itemId);
        if (label != null) {
            String l = label.trim();
            if (l.isBlank()) throw new IllegalArgumentException("label must not be blank");
            item.label = l;
        }
        if (sortOrder != null) item.sortOrder = sortOrder;
        if (enabled != null) item.enabled = enabled;
        if (remark != null) item.remark = remark;
        if (extJson != null) item.extJson = extJson;
        item.updatedAt = new Timestamp(System.currentTimeMillis());
        dictDataMapper.updateById(item);
        return item;
    }

    @Override
    public void deleteItem(Long dictId, Long itemId) {
        SysDictData item = findItem(dictId, itemId);
        dictDataMapper.deleteById(item.id);
    }

    /** 直接保存字典类型实体（仅启动 seed 用，绕过唯一性等业务校验）。 */
    @Override
    public void createSeedDict(SysDict dict) {
        save(dict);
    }

    /** 直接保存字典项实体（仅启动 seed 用，绕过唯一性等业务校验）。 */
    @Override
    public void createSeedItem(SysDictData item) {
        dictDataMapper.insert(item);
    }

    /** 按 (dictType, value) 统计字典项数量，用于 value 唯一校验。 */
    private long countItems(String dictType, String value) {
        Long c = dictDataMapper.selectCount(new QueryWrapper<SysDictData>()
                .eq("dict_type", dictType).eq("value", value));
        return c == null ? 0 : c;
    }

    /** 定位字典项并校验归属（避免跨类型操作他人字典项）。 */
    private SysDictData findItem(Long dictId, Long itemId) {
        SysDict d = getById(dictId);
        if (d == null) throw new NoSuchElementException("dict not found");
        SysDictData item = dictDataMapper.selectById(itemId);
        if (item == null || !d.dictType.equals(item.dictType)) {
            throw new NoSuchElementException("dict item not found");
        }
        return item;
    }
}
