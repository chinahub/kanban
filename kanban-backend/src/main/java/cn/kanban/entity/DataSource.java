package cn.kanban.entity;

import cn.jiebaba.summer.data.annotation.IdType;
import cn.jiebaba.summer.data.annotation.TableField;
import cn.jiebaba.summer.data.annotation.TableId;
import cn.jiebaba.summer.data.annotation.TableName;
import cn.jiebaba.summer.data.support.JsonTypeHandler;

import java.sql.Timestamp;

@TableName("data_source")
public class DataSource {
    @TableId(type = IdType.AUTO)
    public Long id;
    public Long workspaceId;
    public String name;
    public String type;
    @TableField(typeHandler = JsonTypeHandler.class)
    public String config;
    public Long creatorId;
    public Timestamp createdAt;
    public Timestamp updatedAt;
}
