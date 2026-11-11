package cn.kanban.entity;

import cn.jiebaba.summer.data.annotation.IdType;
import cn.jiebaba.summer.data.annotation.TableId;
import cn.jiebaba.summer.data.annotation.TableName;

import java.sql.Timestamp;

/** 数据字典项（逻辑关联 sys_dict.dict_type）。 */
@TableName("sys_dict_data")
public class SysDictData {
    @TableId(type = IdType.AUTO)
    public Long id;
    public String dictType;
    public String value;
    public String label;
    public Integer sortOrder;
    public Boolean enabled;
    public String remark;
    public String extJson;
    public Timestamp createdAt;
    public Timestamp updatedAt;
}
