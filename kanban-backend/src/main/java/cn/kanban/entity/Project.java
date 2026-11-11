package cn.kanban.entity;

import cn.jiebaba.summer.data.annotation.IdType;
import cn.jiebaba.summer.data.annotation.TableField;
import cn.jiebaba.summer.data.annotation.TableId;
import cn.jiebaba.summer.data.annotation.TableName;
import cn.jiebaba.summer.data.support.JsonTypeHandler;

import java.sql.Timestamp;

@TableName("project")
public class Project {
    @TableId(type = IdType.AUTO)
    public Long id;
    public Long workspaceId;
    public Long groupId;
    public String name;
    public String type;
    public Integer canvasW;
    public Integer canvasH;
    @TableField(typeHandler = JsonTypeHandler.class)
    public String canvasConfig;
    public String background;
    public String status;
    public String thumbnail;
    public Long creatorId;
    public Timestamp createdAt;
    public Timestamp updatedAt;
}
