# kanban-backend AGENTS.md

后端模块专属约定。仅当 AI Agent 触碰本目录时加载。

## 模块职责

DataV 风格可视化大屏看板的后端服务，基于 summer-boot 4.2.0 框架（`cn.jiebaba.summer`，非 Spring Boot），提供 REST API、JWT 鉴权、PostgreSQL 数据持久化、AI 助手、快照发布分享等功能。

## 包结构

```
cn.kanban/
├── Application.java                     # @SummerBootApplication 入口
├── config/                              # JwtConfig、DataInitializer
├── controller/                          # 14 个 Controller（见下方表）
│   ├── AuthController.java              # 登录/注册/Token 刷新
│   ├── WorkspaceController.java         # 工作空间 CRUD + 切换
│   ├── ProjectController.java           # 项目 CRUD
│   ├── ProjectGroupController.java      # 项目分组 CRUD
│   ├── DataSourceController.java        # 数据源 CRUD + 连通测试
│   ├── DataSetController.java           # 数据集 CRUD
│   ├── FilterController.java            # 全局过滤器 CRUD
│   ├── GlobalVariableController.java    # 全局变量 CRUD
│   ├── AssetController.java             # 素材（图片/JS/CSS）上传与管理
│   ├── AiController.java                # AI 助手（组件改样式 + 技能对话 + LADV）
│   ├── AiConfigController.java          # AI 平台级配置 + token 用量统计（仅平台管理员）
│   ├── SkillController.java             # 技能管理（references 重建索引、embedding 探测）
│   ├── PublishController.java           # 发布/快照
│   ├── ShareController.java             # 分享链接（含密码/有效期）
│   └── HealthController.java            # /health 健康检查
├── service/                             # 接口 + Impl，每对对应一个业务域
│   ├── AuthService(.java/Impl.java)     # 认证（BCrypt + JWT）
│   ├── UserServiceImpl.java             # 用户管理
│   ├── ProjectServiceImpl.java          # 项目逻辑
│   ├── ProjectGroupServiceImpl.java     # 分组逻辑
│   ├── DataSourceServiceImpl.java       # 数据源（fetch 查询 + metadata）
│   ├── DataSetServiceImpl.java          # 数据集
│   ├── FilterServiceImpl.java           # 过滤器
│   ├── GlobalVariableServiceImpl.java   # 全局变量
│   ├── AssetServiceImpl.java            # 素材
│   ├── SnapshotServiceImpl.java         # 快照
│   ├── ShareLinkServiceImpl.java        # 分享链接
│   ├── WorkspaceServiceImpl.java        # 工作空间
│   ├── AiAssistantService.java          # AI 助手业务编排
│   ├── AiConfigService.java             # AI 配置解析（ai_config 表优先、yml 兜底）+ 加密保存
│   ├── AiUsageService.java              # AI token 用量聚合统计
│   └── LadVService.java                 # LADV 视觉生成（设计稿 → 组件布局）
├── skill/                               # AntV 可视化技能移植（LLM 自选 + 工具式 RAG）
│   ├── SkillRegistry.java               # 启动加载 skills 包（SKILL.md frontmatter + 索引）
│   ├── SkillChatService.java            # 技能对话：手动包 ToolCallingChatModel 挂 4 个工具
│   └── SkillReferenceIndexer.java       # references 切块入 pgvector（幂等 upsert）
├── collab/                              # 协同编辑 WebSocket 房间（阶段 6 简化版）
│   └── CollabEndpoint.java              # /ws/collab/{projectId}/{token}：presence + saved 广播，JWT 走路径段
├── mapper/                              # MyBatis-Plus Mapper（13 个）
├── entity/                              # 实体类（与 DB 表一一对应）
├── dto/                                 # 请求/响应 DTO（Create*/Update*/Dto* 等 ~25 个）
├── util/                                # JwtUtil、PasswordUtil、CurrentContext、CryptoUtil、DbConnectionPool
├── storage/                             # 文件存储抽象层
│   ├── StorageProvider.java             # 接口
│   └── LocalFileStorageProvider.java    # 本地文件系统实现
└── advice/                              # GlobalExceptionHandler
```

## API 现状

| 域 | Controller | 主要路由 |
|---|---|---|
| 认证 | AuthController | `POST /api/auth/login`、`POST /api/auth/refresh`、`GET /api/auth/me` |
| 工作空间 | WorkspaceController | `GET /api/workspaces`、`POST /api/workspaces/{id}/switch` |
| 项目 | ProjectController | CRUD `/api/projects` |
| 项目分组 | ProjectGroupController | CRUD `/api/groups` |
| 数据源 | DataSourceController | CRUD `/api/datasources`、POST 连通测试 |
| 数据集 | DataSetController | CRUD `/api/datasets` |
| 过滤器 | FilterController | CRUD `/api/filters` |
| 全局变量 | GlobalVariableController | CRUD `/api/projects/{projectId}/variables` |
| 素材 | AssetController | 上传/列表/删除 `/api/assets` |
| AI | AiController | `POST /api/projects/{id}/ai-assist`、`POST /api/projects/{id}/skill-chat`、`POST /api/projects/{id}/ladv` |
| AI 配置/用量 | AiConfigController | `GET /api/ai/config`、`PUT /api/ai/config/{key}`、`POST /api/ai/config/{key}/test`（连通性测试）、`GET /api/ai/usage`（仅平台管理员） |
| 技能管理 | SkillController | `POST /api/ai/skills/reindex`、`GET /api/ai/skills/embed-test` |
| 发布 | PublishController | `/api/projects/{id}/publish`、`/api/projects/{id}/snapshots`、`/api/projects/{id}/share` |
| 分享 | ShareController | 创建/访问/删除分享链接 `/api/share` |
| 协同 | CollabEndpoint（WS） | WS `/ws/collab/{projectId}/{token}`（房间广播：hello/roster/saved） |
| 健康 | HealthController | `GET /health` |

## 关键运行流程

### 启动
`Application.main()` → `@SummerBootApplication` 扫描 `cn.kanban` → `DataInitializer.@PostConstruct`：
1. 执行 `schema.sql`（`src/main/resources/db/`）创建表
2. seed 三个工作空间（dev/test/prod）
3. seed admin 用户（密码 BCrypt 加密）

### 鉴权
无 AOP/注解，Controller 手动调 `AuthService.authenticate(req, resp)`：
- 解析 `Authorization: Bearer <token>`
- 校验 access token 类型 + 用户状态
- 成功返回 User；失败 `reject(401)`

### 数据源 fetch
`DataSourceService.fetch()` 支持 MySQL / PostgreSQL / HTTP API 三种连接方式，返回 `FetchResultDto`。
- DB 查询走 `DbConnectionPool`（按数据源 id 池化，配置指纹失配自动换池，借出 isValid 校验，单源并发上限 8，超限直接抛错不排队）；update/delete 会 evict 对应池
- 服务端只读守卫：SQL 去注释后必须单条 SELECT（非 SELECT/多语句 400）；驱动类名固定白名单映射

## 数据库

- DB：PostgreSQL（当前连 Supabase）
- Schema：`src/main/resources/db/schema.sql`
- 核心表：`app_user`、`workspace`、`workspace_member`、`project`、`project_group`、`data_source`、`data_set`、`filter`、`global_variable`、`asset`、`snapshot`、`share_link`、`ai_call_log`、`ai_config`

> 完整表结构定义见 PRD `docs/需求文档/requirements.md` §6。

## 配置

- 主配置：`src/main/resources/application.yml`
- Profile 切换：`--kanban.profile={dev|test|prod}` + `application-{profile}.yml`
- AI 配置：页面化优先——「系统设置 → AI 配置」（仅平台管理员）写 `ai_config` 表
  （config_key=assistant/ladv，api-key 经 CryptoUtil AES-256-GCM 加密），`AiConfigService.resolve()`
  每次调用现查、改后即时生效；application.yml 的 `summer.ai.*` 仅作兜底默认值。embedding 走本地 ONNX BGE-M3
- 技能配置：`kanban.skills.*`（dir、top-k）；技能包在 `resources/skills/visualization-skills/skills/`
- LADV 配置：视觉模型（需支持图片输入的 OpenAI 兼容端点，GLM-4V / Qwen-VL 等）在 `LadVService` 内
  按生效配置（ai_config 表 config_key=ladv，yml `kanban.ladv.*` 兜底）手动构造
  `OpenAiCompatibleChatModel`（不污染全局 ChatClient）；未配置 api-key 时 ladv 端点返回明确错误
- Token 统计：`ai_call_log` 记录 source（ladv/ai-assist/skill-chat）与 prompt/completion/total tokens，
  `GET /api/ai/usage` 聚合输出总量/按功能/按天（近 30 天）

## 可视化技能（cn.kanban.skill）

- 技能包格式 = Claude Code skills（8 个）：`skills.index` 总索引 + 每技能 `SKILL.md`（frontmatter 的 name/description 承担路由）+ `references.index` + `references/**.md`。
- 对话链路：system prompt 只放技能索引 → 模型 `load_skill` 拉取指令正文 → `search_references` 按 `metadata.skill` 过滤做 pgvector 语义检索 → `generate_chart_image` / `search_icon` 两个 Java HTTP 工具替代原 curl 技能。
- **全局 `summer.ai.tools.enabled` 保持 false**：工具只在 SkillChatService 内部手动包装，避免干扰 ai-assist 的纯 JSON 输出。
- 向量库 `kanban_skill_vectors`（pgvector，1024 维 BGE-M3）；references 入库走 `POST /api/ai/skills/reindex`（幂等 upsert）。
- 本地 embedding 资产：`D:/ai/onnxruntime.dll` + `D:/ai/bge-m3/{model.onnx,tokenizer.json}`；`start.bat` 已加 `--enable-native-access=ALL-UNNAMED`（FFM 必需）。

## 模块专属约定

- **不是 Spring Boot** — 所有注解导入 `cn.jiebaba.summer.*`，不要用 `org.springframework.*`
- `ServiceImpl` 的 `baseMapper` 需显式 `setBaseMapper(M)` setter，框架通过此方法注入
- ORM 列名匹配 = lowercase 字符串比较，entity 字段名须是 DB 列名的驼峰形式
- 时间戳必须用 `java.sql.Timestamp`，布尔用 `Boolean`（包装类型）
- WebRequest 用 `header(String)` 而非 `getHeader`；`WebResponse.body()` 后必须 `return null`
- 无 `@Profile`、无 AOP execution 表达式、无事务传播机制
- `@RestController` + `@RequestMapping` + `@GetMapping/@PostMapping`，返回对象自动 JSON 序列化
- summer 框架详细文档：`E:\summer_workspace\docs\使用文档\`

> summer-boot 开发要点完整版见 `.claude/skills/summer-boot-dev.md`。

## 依赖

- summer-boot 4.2.0（`cn.jiebaba.summer`；4.0 起 web/data/security 模块并入 summer-boot、core 独立为 summer-core，包名不变；3.2 起支持 `--key=value` 命令行参数与 Profile，参数绑定失败由 `HandlerException` 承载，项目 GlobalExceptionHandler 映射为 400）
- JWT：`JwtUtil` 手写 HMAC-SHA256 实现（无 jjwt 依赖）
- BCrypt：summer 内置 `cn.jiebaba.summer.security.crypto.BCryptPasswordEncoder`（无 spring-security-crypto 依赖）
- PostgreSQL JDBC 42.7.12
