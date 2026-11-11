package cn.kanban.entity;

import cn.jiebaba.summer.data.annotation.IdType;
import cn.jiebaba.summer.data.annotation.TableId;
import cn.jiebaba.summer.data.annotation.TableName;

import java.sql.Timestamp;

@TableName("global_variable")
public class GlobalVariable {
    @TableId(type = IdType.AUTO)
    public Long id;
    public Long projectId;
    public String name;
    public String description;
    public String source;
    public String value;
    public Timestamp createdAt;
    public Timestamp updatedAt;
}
