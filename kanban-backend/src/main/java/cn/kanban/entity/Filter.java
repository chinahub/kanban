package cn.kanban.entity;

import cn.jiebaba.summer.data.annotation.IdType;
import cn.jiebaba.summer.data.annotation.TableId;
import cn.jiebaba.summer.data.annotation.TableName;

import java.sql.Timestamp;

@TableName("filter")
public class Filter {
    @TableId(type = IdType.AUTO)
    public Long id;
    public Long workspaceId;
    public String name;
    public String code;
    public Long creatorId;
    public Timestamp createdAt;
    public Timestamp updatedAt;
}
