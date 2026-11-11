package cn.kanban.entity;

import cn.jiebaba.summer.data.annotation.IdType;
import cn.jiebaba.summer.data.annotation.TableId;
import cn.jiebaba.summer.data.annotation.TableName;

import java.sql.Timestamp;

@TableName("workspace")
public class Workspace {
    @TableId(type = IdType.AUTO)
    public Long id;
    public String code;
    public String name;
    public String description;
    public Boolean isSystem;
    public Timestamp createdAt;
    public Timestamp updatedAt;
}
