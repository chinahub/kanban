package cn.kanban.entity;

import cn.jiebaba.summer.data.annotation.IdType;
import cn.jiebaba.summer.data.annotation.TableId;
import cn.jiebaba.summer.data.annotation.TableName;

import java.sql.Timestamp;

@TableName("workspace_member")
public class WorkspaceMember {
    @TableId(type = IdType.AUTO)
    public Long id;
    public Long workspaceId;
    public Long userId;
    public String role;
    public Timestamp joinedAt;
}
