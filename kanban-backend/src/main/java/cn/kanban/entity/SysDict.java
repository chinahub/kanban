package cn.kanban.entity;

import cn.jiebaba.summer.data.annotation.IdType;
import cn.jiebaba.summer.data.annotation.TableId;
import cn.jiebaba.summer.data.annotation.TableName;

import java.sql.Timestamp;

/** 数据字典类型（系统级，全局共享）。 */
@TableName("sys_dict")
public class SysDict {
    @TableId(type = IdType.AUTO)
    public Long id;
    public String dictType;
    public String name;
    public String remark;
    public Boolean isSystem;
    public Integer sortOrder;
    public Timestamp createdAt;
    public Timestamp updatedAt;
}
