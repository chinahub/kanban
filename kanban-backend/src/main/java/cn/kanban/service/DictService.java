package cn.kanban.service;

import cn.kanban.entity.SysDict;
import cn.kanban.entity.SysDictData;

import java.util.List;

/** 数据字典服务：字典类型与字典项的维护（业务查询为主，管理接口挂在 DictController）。 */
public interface DictService {

    /** 全部字典类型（按 sort_order、id 升序）。 */
    List<SysDict> listDicts();

    /** 全部字典项（按 dict_type、sort_order 升序）。 */
    List<SysDictData> listItems();

    /** 新建字典类型（dictType 编码唯一）。 */
    SysDict createDict(String dictType, String name, String remark, Integer sortOrder);

    /** 更新字典类型名称/备注/排序（编码不可改）。 */
    SysDict updateDict(Long id, String name, String remark, Integer sortOrder);

    /** 删除字典类型及其全部字典项（isSystem 内置字典拒删）。 */
    void deleteDict(Long id);

    /** 新建字典项（同类型下 value 唯一）。 */
    SysDictData createItem(Long dictId, String value, String label, Integer sortOrder,
                           Boolean enabled, String remark, String extJson);

    /** 更新字典项（value 不可改）。 */
    SysDictData updateItem(Long dictId, Long itemId, String label, Integer sortOrder,
                           Boolean enabled, String remark, String extJson);

    /** 删除字典项。 */
    void deleteItem(Long dictId, Long itemId);

    /** 直接保存字典类型实体（仅启动 seed 用，绕过唯一性等业务校验）。 */
    void createSeedDict(SysDict dict);

    /** 直接保存字典项实体（仅启动 seed 用，绕过唯一性等业务校验）。 */
    void createSeedItem(SysDictData item);
}
