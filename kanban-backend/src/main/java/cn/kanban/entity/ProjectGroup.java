package cn.kanban.entity;

import cn.jiebaba.summer.data.annotation.IdType;
import cn.jiebaba.summer.data.annotation.TableId;
import cn.jiebaba.summer.data.annotation.TableName;

import java.sql.Timestamp;

@TableName("project_group")
public class ProjectGroup {
    @TableId(type = IdType.AUTO)
    public Long id;
    public Long workspaceId;
    public Long parentId;
    public String name;
    public Integer sort;
    public Timestamp createdAt;
}
