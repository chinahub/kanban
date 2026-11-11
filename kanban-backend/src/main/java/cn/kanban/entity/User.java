package cn.kanban.entity;

import cn.jiebaba.summer.data.annotation.IdType;
import cn.jiebaba.summer.data.annotation.TableId;
import cn.jiebaba.summer.data.annotation.TableName;

import java.sql.Timestamp;

@TableName("app_user")
public class User {
    @TableId(type = IdType.AUTO)
    public Long id;
    public String username;
    public String email;
    public String passwordHash;
    public String displayName;
    public String status;
    public Boolean isPlatformAdmin;
    public Timestamp createdAt;
    public Timestamp updatedAt;
}
