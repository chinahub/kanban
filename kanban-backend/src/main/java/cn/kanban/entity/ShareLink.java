package cn.kanban.entity;

import cn.jiebaba.summer.data.annotation.IdType;
import cn.jiebaba.summer.data.annotation.TableId;
import cn.jiebaba.summer.data.annotation.TableName;

import java.sql.Timestamp;

@TableName("share_link")
public class ShareLink {
    @TableId(type = IdType.AUTO)
    public Long id;
    public Long projectId;
    public Long snapshotId;
    public String token;
    public String passwordHash;
    public Timestamp expireAt;
    public Timestamp createdAt;
}
