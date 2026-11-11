package cn.kanban.entity;

import cn.jiebaba.summer.data.annotation.IdType;
import cn.jiebaba.summer.data.annotation.TableId;
import cn.jiebaba.summer.data.annotation.TableName;

import java.sql.Timestamp;

@TableName("asset")
public class Asset {
    @TableId(type = IdType.AUTO)
    public Long id;
    public Long workspaceId;
    public String name;
    public String type;
    public String contentType;
    public String storagePath;
    public Long size;
    public Long creatorId;
    public Timestamp createdAt;
    public Timestamp updatedAt;
}
