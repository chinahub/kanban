package cn.kanban.entity;

import cn.jiebaba.summer.data.annotation.IdType;
import cn.jiebaba.summer.data.annotation.TableId;
import cn.jiebaba.summer.data.annotation.TableName;

import java.sql.Timestamp;

/**
 * AI 调用日志实体，对应 ai_call_log 表。
 * 记录每次 AI 助手调用的用户、看板、组件、指令、模型返回与耗时，用于可观测性（PRD §5.5）。
 */
@TableName("ai_call_log")
public class AiCallLog {
    @TableId(type = IdType.AUTO)
    public Long id;
    public Long userId;
    public Long projectId;
    public String componentId;
    public String componentType;
    public String instruction;
    public String requestPayload;
    public String responseRaw;
    public String status;
    public String error;
    public Integer durationMs;
    public String source;
    public Long promptTokens;
    public Long completionTokens;
    public Long totalTokens;
    public Timestamp createdAt;
}
