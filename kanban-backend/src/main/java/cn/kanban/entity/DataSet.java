package cn.kanban.entity;

import cn.jiebaba.summer.data.annotation.IdType;
import cn.jiebaba.summer.data.annotation.TableField;
import cn.jiebaba.summer.data.annotation.TableId;
import cn.jiebaba.summer.data.annotation.TableName;
import cn.jiebaba.summer.data.support.JsonTypeHandler;

import java.sql.Timestamp;

@TableName("data_set")
public class DataSet {
    @TableId(type = IdType.AUTO)
    public Long id;
    public Long workspaceId;
    public Long sourceId;
    public String name;
    @TableField(typeHandler = JsonTypeHandler.class)
    public String transform;
    @TableField(typeHandler = JsonTypeHandler.class)
    public String data;
    public Timestamp lastRefreshAt;
    public Long creatorId;
    public Timestamp createdAt;
    public Timestamp updatedAt;
}
