-- kanban schema (PostgreSQL)
-- 目标库：postgres 公共 schema 下的 kanban_* 表（避免与 postgres 原生 user 等保留字冲突）

CREATE TABLE IF NOT EXISTS app_user (
    id            BIGSERIAL PRIMARY KEY,
    username      VARCHAR(64)  NOT NULL UNIQUE,
    email         VARCHAR(128) UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    display_name  VARCHAR(128),
    status        VARCHAR(16)  NOT NULL DEFAULT 'ACTIVE',
    is_platform_admin BOOLEAN   NOT NULL DEFAULT FALSE,
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at    TIMESTAMPTZ  NOT NULL DEFAULT CURRENT_TIMESTAMP
);
COMMENT ON TABLE app_user IS '用户表';
COMMENT ON COLUMN app_user.id IS '用户ID';
COMMENT ON COLUMN app_user.username IS '登录用户名';
COMMENT ON COLUMN app_user.email IS '邮箱地址';
COMMENT ON COLUMN app_user.password_hash IS '密码哈希';
COMMENT ON COLUMN app_user.display_name IS '展示名称';
COMMENT ON COLUMN app_user.status IS '用户状态：ACTIVE/INACTIVE';
COMMENT ON COLUMN app_user.is_platform_admin IS '是否平台管理员';
COMMENT ON COLUMN app_user.created_at IS '创建时间';
COMMENT ON COLUMN app_user.updated_at IS '更新时间';

CREATE TABLE IF NOT EXISTS workspace (
    id          BIGSERIAL PRIMARY KEY,
    code        VARCHAR(32)  NOT NULL UNIQUE,
    name        VARCHAR(128) NOT NULL,
    description TEXT,
    is_system   BOOLEAN      NOT NULL DEFAULT FALSE,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMPTZ  NOT NULL DEFAULT CURRENT_TIMESTAMP
);
COMMENT ON TABLE workspace IS '工作空间表';
COMMENT ON COLUMN workspace.id IS '工作空间ID';
COMMENT ON COLUMN workspace.code IS '工作空间编码';
COMMENT ON COLUMN workspace.name IS '工作空间名称';
COMMENT ON COLUMN workspace.description IS '工作空间描述';
COMMENT ON COLUMN workspace.is_system IS '是否系统预置工作空间';
COMMENT ON COLUMN workspace.created_at IS '创建时间';
COMMENT ON COLUMN workspace.updated_at IS '更新时间';

CREATE TABLE IF NOT EXISTS workspace_member (
    workspace_id BIGINT NOT NULL REFERENCES workspace(id) ON DELETE CASCADE,
    user_id      BIGINT NOT NULL REFERENCES app_user(id)  ON DELETE CASCADE,
    role         VARCHAR(16) NOT NULL DEFAULT 'MEMBER',
    joined_at    TIMESTAMPTZ  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (workspace_id, user_id)
);
COMMENT ON TABLE workspace_member IS '工作空间成员表';
COMMENT ON COLUMN workspace_member.workspace_id IS '工作空间ID';
COMMENT ON COLUMN workspace_member.user_id IS '用户ID';
COMMENT ON COLUMN workspace_member.role IS '成员角色：OWNER/ADMIN/MEMBER';
COMMENT ON COLUMN workspace_member.joined_at IS '加入时间';

CREATE INDEX IF NOT EXISTS idx_workspace_member_user ON workspace_member(user_id);

-- 看板分组与看板（阶段0：Project/Group CRUD）
CREATE TABLE IF NOT EXISTS project_group (
    id           BIGSERIAL PRIMARY KEY,
    workspace_id BIGINT NOT NULL REFERENCES workspace(id) ON DELETE CASCADE,
    parent_id    BIGINT,
    name         VARCHAR(128) NOT NULL,
    sort         INT NOT NULL DEFAULT 0,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
COMMENT ON TABLE project_group IS '看板分组表';
COMMENT ON COLUMN project_group.id IS '分组ID';
COMMENT ON COLUMN project_group.workspace_id IS '所属工作空间ID';
COMMENT ON COLUMN project_group.parent_id IS '父分组ID，NULL表示顶层分组';
COMMENT ON COLUMN project_group.name IS '分组名称';
COMMENT ON COLUMN project_group.sort IS '排序值，越小越靠前';
COMMENT ON COLUMN project_group.created_at IS '创建时间';

CREATE INDEX IF NOT EXISTS idx_project_group_ws ON project_group(workspace_id);

CREATE TABLE IF NOT EXISTS project (
    id            BIGSERIAL PRIMARY KEY,
    workspace_id  BIGINT NOT NULL REFERENCES workspace(id) ON DELETE CASCADE,
    group_id      BIGINT REFERENCES project_group(id) ON DELETE SET NULL,
    name          VARCHAR(128) NOT NULL,
    type          VARCHAR(16) NOT NULL DEFAULT 'PC',
    canvas_w      INT NOT NULL DEFAULT 1920,
    canvas_h      INT NOT NULL DEFAULT 1080,
    canvas_config JSONB,
    background    VARCHAR(64),
    status        VARCHAR(16) NOT NULL DEFAULT 'DRAFT',
    thumbnail     TEXT,
    creator_id    BIGINT NOT NULL REFERENCES app_user(id),
    created_at    TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
COMMENT ON TABLE project IS '看板项目表';
COMMENT ON COLUMN project.id IS '看板ID';
COMMENT ON COLUMN project.workspace_id IS '所属工作空间ID';
COMMENT ON COLUMN project.group_id IS '所属分组ID，分组删除时置空';
COMMENT ON COLUMN project.name IS '看板名称';
COMMENT ON COLUMN project.type IS '看板类型：PC/MOBILE/CITY3D';
COMMENT ON COLUMN project.canvas_w IS '画布宽度，单位像素';
COMMENT ON COLUMN project.canvas_h IS '画布高度，单位像素';
COMMENT ON COLUMN project.canvas_config IS '画布配置JSON，阶段1编辑器填充';
COMMENT ON COLUMN project.background IS '画布背景配置';
COMMENT ON COLUMN project.status IS '看板状态：DRAFT/PUBLISHED/TRASHED';
COMMENT ON COLUMN project.thumbnail IS '缩略图地址或内容';
COMMENT ON COLUMN project.creator_id IS '创建者用户ID';
COMMENT ON COLUMN project.created_at IS '创建时间';
COMMENT ON COLUMN project.updated_at IS '更新时间';

CREATE INDEX IF NOT EXISTS idx_project_ws ON project(workspace_id);

-- 阶段2 数据源：存储数据来源配置（static 静态数据 / api 接口）
CREATE TABLE IF NOT EXISTS data_source (
    id            BIGSERIAL PRIMARY KEY,
    workspace_id  BIGINT NOT NULL REFERENCES workspace(id) ON DELETE CASCADE,
    name          VARCHAR(128) NOT NULL,
    type          VARCHAR(16)  NOT NULL,
    config        JSONB        NOT NULL,
    creator_id    BIGINT       NOT NULL REFERENCES app_user(id),
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at    TIMESTAMPTZ  NOT NULL DEFAULT CURRENT_TIMESTAMP
);
COMMENT ON TABLE data_source IS '数据源表';
COMMENT ON COLUMN data_source.id IS '数据源ID';
COMMENT ON COLUMN data_source.workspace_id IS '所属工作空间ID';
COMMENT ON COLUMN data_source.name IS '数据源名称';
COMMENT ON COLUMN data_source.type IS '数据源类型：static/api';
COMMENT ON COLUMN data_source.config IS '类型相关配置JSONB：static={data:[...]}；api={url,method,headers,dataPath}';
COMMENT ON COLUMN data_source.creator_id IS '创建者用户ID';
COMMENT ON COLUMN data_source.created_at IS '创建时间';
COMMENT ON COLUMN data_source.updated_at IS '更新时间';

CREATE INDEX IF NOT EXISTS idx_data_source_ws ON data_source(workspace_id);

-- 阶段2 数据集：引用数据源 + 转换 + 缓存拉取结果
CREATE TABLE IF NOT EXISTS data_set (
    id              BIGSERIAL PRIMARY KEY,
    workspace_id    BIGINT NOT NULL REFERENCES workspace(id) ON DELETE CASCADE,
    source_id       BIGINT REFERENCES data_source(id) ON DELETE SET NULL,
    name            VARCHAR(128) NOT NULL,
    transform       JSONB,
    data            JSONB,
    last_refresh_at TIMESTAMPTZ,
    creator_id      BIGINT NOT NULL REFERENCES app_user(id),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
COMMENT ON TABLE data_set IS '数据集表';
COMMENT ON COLUMN data_set.id IS '数据集ID';
COMMENT ON COLUMN data_set.workspace_id IS '所属工作空间ID';
COMMENT ON COLUMN data_set.source_id IS '引用的数据源ID，源删除时置空';
COMMENT ON COLUMN data_set.name IS '数据集名称';
COMMENT ON COLUMN data_set.transform IS '转换配置JSONB：{renames:{old:new}}';
COMMENT ON COLUMN data_set.data IS '数据内容JSONB数组，refresh 后填充';
COMMENT ON COLUMN data_set.last_refresh_at IS '最近 refresh 时间';
COMMENT ON COLUMN data_set.creator_id IS '创建者用户ID';
COMMENT ON COLUMN data_set.created_at IS '创建时间';
COMMENT ON COLUMN data_set.updated_at IS '更新时间';

CREATE INDEX IF NOT EXISTS idx_data_set_ws ON data_set(workspace_id);
CREATE INDEX IF NOT EXISTS idx_data_set_source ON data_set(source_id);

-- 阶段2 过滤器：前端执行的 JS 转换函数（命名、可复用）
CREATE TABLE IF NOT EXISTS filter (
    id            BIGSERIAL PRIMARY KEY,
    workspace_id  BIGINT NOT NULL REFERENCES workspace(id) ON DELETE CASCADE,
    name          VARCHAR(128) NOT NULL,
    code          TEXT NOT NULL,
    creator_id    BIGINT NOT NULL REFERENCES app_user(id),
    created_at    TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
COMMENT ON TABLE filter IS '过滤器表（前端执行的 JS 转换函数）';
COMMENT ON COLUMN filter.id IS '过滤器ID';
COMMENT ON COLUMN filter.workspace_id IS '所属工作空间ID';
COMMENT ON COLUMN filter.name IS '过滤器名称';
COMMENT ON COLUMN filter.code IS 'JS 转换函数体，入参 data，返回结构化数组';
COMMENT ON COLUMN filter.creator_id IS '创建者用户ID';
COMMENT ON COLUMN filter.created_at IS '创建时间';
COMMENT ON COLUMN filter.updated_at IS '更新时间';

CREATE INDEX IF NOT EXISTS idx_filter_ws ON filter(workspace_id);

-- 阶段2 全局变量：项目级，组件通过 {{var.xx}} 引用（PRD §4.7）
CREATE TABLE IF NOT EXISTS global_variable (
    id            BIGSERIAL PRIMARY KEY,
    project_id    BIGINT NOT NULL REFERENCES project(id) ON DELETE CASCADE,
    name          VARCHAR(64)  NOT NULL,
    description   VARCHAR(255),
    source        VARCHAR(16)  NOT NULL DEFAULT 'static',
    value         TEXT,
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at    TIMESTAMPTZ  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (project_id, name)
);
COMMENT ON TABLE global_variable IS '全局变量表（项目级，跨组件联动）';
COMMENT ON COLUMN global_variable.project_id IS '所属看板ID';
COMMENT ON COLUMN global_variable.name IS '变量名，{{var.name}} 引用';
COMMENT ON COLUMN global_variable.description IS '描述';
COMMENT ON COLUMN global_variable.source IS '来源：static（v1 仅静态值），数据集/其他变量后置';
COMMENT ON COLUMN global_variable.value IS '静态初始值（字符串）';
CREATE INDEX IF NOT EXISTS idx_global_variable_project ON global_variable(project_id);

-- 阶段2 资源：本地文件存储（PRD §4.13 / P0 ⑨）
CREATE TABLE IF NOT EXISTS asset (
    id            BIGSERIAL PRIMARY KEY,
    workspace_id  BIGINT NOT NULL REFERENCES workspace(id) ON DELETE CASCADE,
    name          VARCHAR(255) NOT NULL,
    type          VARCHAR(32),
    content_type  VARCHAR(128),
    storage_path  VARCHAR(512),
    size          BIGINT,
    creator_id    BIGINT NOT NULL REFERENCES app_user(id),
    created_at    TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
COMMENT ON TABLE asset IS '资源表（本地文件存储）';
COMMENT ON COLUMN asset.type IS '资源类型：image/video/audio/font/file';
COMMENT ON COLUMN asset.storage_path IS 'StorageProvider 内部相对路径，如 2026/07/uuid.png';
CREATE INDEX IF NOT EXISTS idx_asset_ws ON asset(workspace_id);

-- 阶段3 发布分享：快照 + 分享链接（PRD §4.16 / P0 ⑩）
CREATE TABLE IF NOT EXISTS snapshot (
    id          BIGSERIAL PRIMARY KEY,
    project_id  BIGINT NOT NULL REFERENCES project(id) ON DELETE CASCADE,
    version     INT NOT NULL,
    config      JSONB,
    created_by  BIGINT REFERENCES app_user(id),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
COMMENT ON TABLE snapshot IS '看板发布快照表（某一时刻的发布版本）';
COMMENT ON COLUMN snapshot.project_id IS '所属看板ID';
COMMENT ON COLUMN snapshot.version IS '快照版本号，发布时自增';
COMMENT ON COLUMN snapshot.config IS '快照画布配置JSONB';
COMMENT ON COLUMN snapshot.created_by IS '发布者用户ID';
CREATE INDEX IF NOT EXISTS idx_snapshot_project ON snapshot(project_id);

CREATE TABLE IF NOT EXISTS share_link (
    id            BIGSERIAL PRIMARY KEY,
    project_id    BIGINT NOT NULL REFERENCES project(id) ON DELETE CASCADE,
    snapshot_id   BIGINT REFERENCES snapshot(id) ON DELETE CASCADE,
    token         VARCHAR(64) NOT NULL UNIQUE,
    password_hash VARCHAR(255),
    expire_at     TIMESTAMPTZ,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
COMMENT ON TABLE share_link IS '分享链接表（公开访问令牌）';
COMMENT ON COLUMN share_link.project_id IS '所属看板ID';
COMMENT ON COLUMN share_link.snapshot_id IS '绑定的快照ID';
COMMENT ON COLUMN share_link.token IS '访问令牌，32位十六进制随机串';
COMMENT ON COLUMN share_link.password_hash IS '访问密码哈希（BCrypt），NULL表示无需密码';
COMMENT ON COLUMN share_link.expire_at IS '过期时间，NULL表示永不过期';
CREATE INDEX IF NOT EXISTS idx_share_link_token ON share_link(token);

-- 阶段5 AI 助手：调用日志（PRD §4.13 / §5.5 可观测性）
CREATE TABLE IF NOT EXISTS ai_call_log (
    id              BIGSERIAL PRIMARY KEY,
    user_id         BIGINT NOT NULL REFERENCES app_user(id),
    project_id      BIGINT REFERENCES project(id) ON DELETE CASCADE,
    component_id    VARCHAR(64),
    component_type  VARCHAR(32),
    instruction     TEXT,
    request_payload TEXT,
    response_raw    TEXT,
    status          VARCHAR(16) NOT NULL DEFAULT 'OK',
    error           TEXT,
    duration_ms     INT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
COMMENT ON TABLE ai_call_log IS 'AI 调用日志表';
COMMENT ON COLUMN ai_call_log.id IS '日志ID';
COMMENT ON COLUMN ai_call_log.user_id IS '调用者用户ID';
COMMENT ON COLUMN ai_call_log.project_id IS '关联看板ID';
COMMENT ON COLUMN ai_call_log.component_id IS '目标组件ID';
COMMENT ON COLUMN ai_call_log.component_type IS '目标组件类型';
COMMENT ON COLUMN ai_call_log.instruction IS '用户自然语言指令';
COMMENT ON COLUMN ai_call_log.request_payload IS '发送给模型的请求摘要';
COMMENT ON COLUMN ai_call_log.response_raw IS '模型原始返回内容';
COMMENT ON COLUMN ai_call_log.status IS '状态：OK/ERROR';
COMMENT ON COLUMN ai_call_log.error IS '错误信息';
COMMENT ON COLUMN ai_call_log.duration_ms IS '耗时毫秒';
COMMENT ON COLUMN ai_call_log.created_at IS '调用时间';
CREATE INDEX IF NOT EXISTS idx_ai_call_log_user ON ai_call_log(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_call_log_project ON ai_call_log(project_id);

-- AI 模型配置（平台级，页面化维护；api_key_enc 为 CryptoUtil AES-256-GCM 密文，application.yml 仅兜底）
CREATE TABLE IF NOT EXISTS ai_config (
    id              BIGSERIAL PRIMARY KEY,
    config_key      VARCHAR(32) NOT NULL UNIQUE,
    base_url        VARCHAR(255),
    api_key_enc     TEXT,
    model           VARCHAR(128),
    timeout_seconds INT,
    max_tokens      INT,
    updated_by      BIGINT REFERENCES app_user(id),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
COMMENT ON TABLE ai_config IS 'AI 模型配置表（平台级，页面化维护，application.yml 仅作兜底默认值）';
COMMENT ON COLUMN ai_config.config_key IS '配置键：ladv（视觉模型）/ assistant（对话模型）';
COMMENT ON COLUMN ai_config.api_key_enc IS 'API Key 密文（CryptoUtil AES-256-GCM）';
COMMENT ON COLUMN ai_config.updated_by IS '最后修改人用户ID';

-- AI 调用日志：token 用量与功能来源（Token 消耗统计）
ALTER TABLE ai_call_log ADD COLUMN IF NOT EXISTS source VARCHAR(32);
ALTER TABLE ai_call_log ADD COLUMN IF NOT EXISTS prompt_tokens BIGINT;
ALTER TABLE ai_call_log ADD COLUMN IF NOT EXISTS completion_tokens BIGINT;
ALTER TABLE ai_call_log ADD COLUMN IF NOT EXISTS total_tokens BIGINT;
COMMENT ON COLUMN ai_call_log.source IS '功能来源：ladv / ai-assist / skill-chat';
COMMENT ON COLUMN ai_call_log.prompt_tokens IS '输入 token 数';
COMMENT ON COLUMN ai_call_log.completion_tokens IS '输出 token 数';
COMMENT ON COLUMN ai_call_log.total_tokens IS '总 token 数';
-- 历史数据回填（幂等）：ladv 依据固定 instruction 识别，其余归为 ai-assist
UPDATE ai_call_log SET source = 'ladv' WHERE source IS NULL AND instruction = 'ladv-generate';
UPDATE ai_call_log SET source = 'ai-assist' WHERE source IS NULL;
CREATE INDEX IF NOT EXISTS idx_ai_call_log_created ON ai_call_log(created_at);
CREATE INDEX IF NOT EXISTS idx_ai_call_log_source ON ai_call_log(source);

-- 数据字典类型表（系统级，全局共享，不带 workspace_id；is_system 为内置字典，禁止删除）
CREATE TABLE IF NOT EXISTS sys_dict (
    id          BIGSERIAL PRIMARY KEY,
    dict_type   VARCHAR(64) NOT NULL UNIQUE,
    name        VARCHAR(64) NOT NULL,
    remark      VARCHAR(255),
    is_system   BOOLEAN NOT NULL DEFAULT FALSE,
    sort_order  INT NOT NULL DEFAULT 0,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
COMMENT ON TABLE sys_dict IS '数据字典类型表（系统级，全局共享）';
COMMENT ON COLUMN sys_dict.dict_type IS '类型编码：project_status / project_type / data_source_type / status_card_status 等';
COMMENT ON COLUMN sys_dict.name IS '字典名称（中文，如：看板状态）';
COMMENT ON COLUMN sys_dict.remark IS '备注';
COMMENT ON COLUMN sys_dict.is_system IS '是否系统内置（内置字典禁止删除，防止误删导致页面兜底失效）';
COMMENT ON COLUMN sys_dict.sort_order IS '显示排序（升序）';

-- 数据字典数据表（字典项，逻辑关联 sys_dict.dict_type，value 与前端历史数据保持一致）
CREATE TABLE IF NOT EXISTS sys_dict_data (
    id          BIGSERIAL PRIMARY KEY,
    dict_type   VARCHAR(64) NOT NULL,
    value       VARCHAR(128) NOT NULL,
    label       VARCHAR(128) NOT NULL,
    sort_order  INT NOT NULL DEFAULT 0,
    enabled     BOOLEAN NOT NULL DEFAULT TRUE,
    remark      VARCHAR(255),
    ext_json    TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
COMMENT ON TABLE sys_dict_data IS '数据字典数据表（字典项，逻辑关联 sys_dict.dict_type）';
COMMENT ON COLUMN sys_dict_data.dict_type IS '所属字典类型编码（逻辑关联 sys_dict.dict_type）';
COMMENT ON COLUMN sys_dict_data.value IS '字典项值（与前端画布 JSON / 数据库存量数据保持一致，如 DRAFT / online / mysql）';
COMMENT ON COLUMN sys_dict_data.label IS '字典项显示名';
COMMENT ON COLUMN sys_dict_data.enabled IS '是否启用（停用项管理页可见，业务下拉不展示）';
COMMENT ON COLUMN sys_dict_data.ext_json IS '扩展属性 JSON：{"color":"green"} / {"defaultPort":3306} / {"disabled":true}';
CREATE UNIQUE INDEX IF NOT EXISTS uk_sys_dict_data_type_value ON sys_dict_data(dict_type, value);
CREATE INDEX IF NOT EXISTS idx_sys_dict_data_type ON sys_dict_data(dict_type, sort_order);
