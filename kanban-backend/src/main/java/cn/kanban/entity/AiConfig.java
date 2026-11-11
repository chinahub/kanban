package cn.kanban.entity;

import cn.jiebaba.summer.data.annotation.IdType;
import cn.jiebaba.summer.data.annotation.TableId;
import cn.jiebaba.summer.data.annotation.TableName;

import java.sql.Timestamp;

/**
 * AI 模型配置实体，对应 ai_config 表（平台级，页面化维护）。
 * configKey 取值：ladv（LADV 视觉模型）/ assistant（AI 助手与技能对话共用的对话模型）；
 * apiKeyEnc 为 CryptoUtil AES-256-GCM 密文，任何响应都不得输出明文。
 */
@TableName("ai_config")
public class AiConfig {
    @TableId(type = IdType.AUTO)
    public Long id;
    public String configKey;
    public String baseUrl;
    public String apiKeyEnc;
    public String model;
    public Integer timeoutSeconds;
    public Integer maxTokens;
    public Long updatedBy;
    public Timestamp updatedAt;
}
