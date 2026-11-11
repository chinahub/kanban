package cn.kanban.entity;

import cn.jiebaba.summer.data.annotation.IdType;
import cn.jiebaba.summer.data.annotation.TableField;
import cn.jiebaba.summer.data.annotation.TableId;
import cn.jiebaba.summer.data.annotation.TableName;
import cn.jiebaba.summer.data.support.JsonTypeHandler;

import java.sql.Timestamp;

@TableName("snapshot")
public class Snapshot {
    @TableId(type = IdType.AUTO)
    public Long id;
    public Long projectId;
    public Integer version;
    @TableField(typeHandler = JsonTypeHandler.class)
    public String config;
    public Long createdBy;
    public Timestamp createdAt;
}
