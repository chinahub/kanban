# kanban 平台 本地开发与实施指南

> **作用**: kanban 平台的工程实施指南。记录推进路径、当前锚点（阶段 1）的实施要点、阶段 0 验收结论与已知项。
> **上游**: 需求见 [requirements.md](../需求文档/requirements.md)；界面参考 `../../ScreenShot/`；框架要点见根目录 [`../../CLAUDE.md`](../../CLAUDE.md)。
> **维护约定**: 步骤配验收（`步骤 → 验收: [检查]`）；后续阶段按需展开，不预留空章节。

---

## 0. 现状基线（2026-07-07）

| 项 | 状态 |
| --- | --- |
| 目录 | `kanban-backend/`（后端，summer-boot 3.0.0 + JDK 25）；`kanban_web/`（前端，React 19 + Vite 8 + TS + antd 6 + zustand 5） |
| 后端已实现 | Auth(login/refresh/me) + Workspace(list/switch) + Health + Project/ProjectGroup CRUD + DataSource/DataSet/Filter/Variable/Asset + Snapshot/ShareLink + AiController（AI 助手）；13 张表（app_user/workspace/workspace_member/project_group/project/data_source/data_set/filter/global_variable/asset/snapshot/share_link/ai_call_log） |
| 后端启动 | `kanban-backend/start.bat` → `0.0.0.0:8080`，约 4.5~5.4s，40 singletons，16 routes（实测见 app.err） |
| 前端 | 已初始化：登录页 + 工作台（顶栏+工作空间切换器+看板列表+CRUD）；Vite proxy `/api`→8080 |
| 工具链 | Node v24.15.0 + npm 11.12.1；JDK `D:\jdk\jdk-25.0.2`；Maven 本地仓库 `D:\mvn_repository` |
| 数据库 | PostgreSQL（Supabase），建表脚本 `kanban-backend/src/main/resources/db/schema.sql` |

---

## 1. 总体推进路径

| 阶段 | 目标 | 对应 PRD |
| --- | --- | --- |
| **0（已完成）** | 前端地基 + 登录闭环 + 工作台空间 + 后端 Project/Group CRUD | P0 上半 |
| **1（已完成）** | 画布编辑器 MVP：画布（拖拽/缩放/对齐/标尺）+ 5 基础组件 + 属性面板（样式/数据/交互） | P0 中 |
| **1.5（已完成）** | 控制台分组：左侧分组树（全部/未分组/分组）+ 分组 CRUD + 按组筛选 + 移动看板到分组 + 拖拽排序 + 缩略图展示 | P0 下半 |
| **2（已完成）** | 数据链路：静态/API 数据源 + 数据集 + 过滤器（v1 先前端原生 `Function` 沙箱，QuickJS 后置） + 全局变量 + 本地存储（`./storage/{yyyy}/{mm}/{uuid}.{ext}`，抽象 `StorageProvider`） + 历史记录。验收：过滤器 JS 报错仅降级该组件，不影响全屏。（已启动，见 §6） | P0 末 |
| **3（已完成）** | 发布分享：快照（`snapshot` 表存 config JSON）+ 分享链接 `/s/{token}` + 访问密码。验收：发布后无登录可访问，命中密码正确拦截。 | P0 末 |
| **4（已完成）** | 全套图表 + MySQL/PG 数据源 | P1 |
| **5（部分完成）** | 编辑器 AI 助手（已完成）；移动端编辑器（待开发） | P1 |
| 6 | 看板 + 蓝图 + 协同 + 三维 | P2 |

---

## 2. 阶段 0：已完成

### 2.0 鉴权机制：手动 `authenticate` 模式

> **历史**: 早期用 `@RequireAuth` 注解 + `AuthAspect` AOP 切面做鉴权，但 aspect 里 `jp.getArgs()` 找 `WebRequest/WebResponse`，而 controller 方法签名没有这个参数 → 鉴权被跳过、`CurrentContext` 全程 null。`AuthAspect.java` 与 `RequireAuth.java` 已删除，改为 controller 手动调用。

**当前实现**：

- `AuthService.authenticate(WebRequest req, WebResponse resp) → User`：解析 `Authorization: Bearer <token>` → `jwtUtil.parse` → 校验 `typ=access` + `uid` + 用户 `ACTIVE` → 返回 User；失败 `reject(resp,401,...)` 写响应体并返回 null。
- **工作空间隔离**：`AuthService.resolveWorkspaceId(req,resp,user)` 从 `X-Workspace-Id` 头解析 wsId，校验成员关系（admin 放行），失败 `reject` 返回 null；成功 `CurrentContext.setWorkspaceId`。

**待保护接口范式**（后续所有 controller 沿用）：

```java
@GetMapping("/x")
public XxxDto foo(WebRequest req, WebResponse resp) {
    User user = authService.authenticate(req, resp);
    if (user == null) return null;
    Long wsId = authService.resolveWorkspaceId(req, resp, user);
    if (wsId == null) return null;
    // 业务逻辑
}
```

→ 验收: `curl -H "Authorization: Bearer <access>" http://localhost:8080/api/auth/me` 返回 200 + 用户 JSON；不带 token 返回 401 `Missing Bearer token`。

### 2.1 阶段 0 新增后端代码

| 类型 | 文件 |
| --- | --- |
| 实体 | `entity/Project.java`、`entity/ProjectGroup.java` |
| Mapper | `mapper/ProjectMapper.java`、`mapper/ProjectGroupMapper.java` |
| Service | `service/ProjectService(Impl).java`、`service/ProjectGroupService(Impl).java` |
| Controller | `controller/ProjectController.java`、`controller/ProjectGroupController.java` |
| DTO | `dto/ProjectDto.java`、`dto/CreateProjectRequest.java`、`dto/UpdateProjectRequest.java` |
| 配置 | `db/schema.sql` 新增 `project_group` / `project` 表 |

### 2.2 阶段 0 新增前端代码

| 类型 | 文件 |
| --- | --- |
| 页面 | `pages/Login.tsx`、`pages/Workbench.tsx`（含 `Workbench.css`） |
| 组件 | `components/GroupSidebar.tsx` |
| Store | `store/authStore.ts`、`store/workspaceStore.ts` |
| API | `api/client.ts`、`api/index.ts` |
| 路由 | `routes/ProtectedRoute.tsx` |
| 类型 | `types/index.ts` |

### 2.3 阶段 0 验收结论

- 登录：`/api/auth/login` 返回 access + refresh；`authApi.refresh` 续期；`/api/auth/me` 取当前用户。
- 工作空间：`/api/workspaces` 列出当前用户工作空间；`/api/workspaces/{id}/switch` 切上下文。
- 看板 CRUD：`/api/projects` 列表/创建/更新/删除；分组筛选（`groupId` / `ungrouped`）生效。
- 前端：登录页跳工作台；工作台顶栏显示当前用户 + 工作空间切换器；左侧分组树；右侧看板列表；CRUD 全闭环。

---

## 3. 阶段 1：画布编辑器 MVP（2026-07-02）

### 3.1 布局

- 三栏：左 240px 组件库 / 中 1fr 画布 / 右 320px 属性面板；顶 56px 工具栏；底 28px 状态栏。
- CSS Grid 实现：`grid-template-columns: 240px 1fr 320px; grid-template-rows: 56px 1fr 28px;`

### 3.2 画布与组件

- `Canvas` 子组件挂载 `react-moveable`，提供 drag/resize/rotate/8 把手。
- 标尺：`<Ruler>` 横竖各 24px，从标尺拖出参考线；双击删除。
- 网格：20×20 半透明背景（`linear-gradient`），仅视觉。
- 自适应：`fitMode ∈ {none, width, both}`；`ResizeObserver` + `PAD_X=16, PAD_TOP=16, PAD_BOTTOM=16, RULER=24, MIN=0.1, MAX=1.5`。

### 3.3 组件库（5 基础）

- 标题 / 文本 / 折线图 / 柱状图 / 饼图。
- 点击 / 拖拽到画布；从拖拽事件 `application/x-kanban-component` 拿到 type。

### 3.4 属性面板

- 选中组件：名称 / X / Y / W / H / 旋转 / 不透明度。
- 标题 / 文本：文本 / 字号 / 颜色。
- 图表：标题 / 颜色。
- 画布（未选中）：宽度 / 高度 / 背景色 / 缩放 / 适配方式 / 参考线列表。

### 3.5 键盘与历史

- `Ctrl+Z/Y` 撤销/重做（zustand `zundo` 中间件）。
- 方向键 1px（Shift = 10px）微调。
- `Ctrl+C/V/D` 复制/粘贴/副本；`Del/Backspace` 删除；`Esc` 取消选择。
- 历史持久化：编辑器订阅 + 防抖 500ms 写 `localStorage`；启动时与服务端 `updatedAt` 比较，优先取本地草稿。

### 3.6 阶段 1 文件变更

- `kanban_web/src/pages/Editor.tsx`（新增，约 670 行）+ `Editor.css`（新增）
- `kanban_web/src/components/ComponentRenderer.tsx`（新增，G2 渲染）
- `kanban_web/src/components/Ruler.tsx`（新增）
- `kanban_web/src/types/editor.ts`（新增，`CanvasConfig` / `CanvasComponent` / `GuideLine`）
- `kanban_web/src/store/editorStore.ts`（新增，zustand + zundo）
- `kanban_web/src/store/editorHistoryPersist.ts`（新增，localStorage 草稿）

### 3.7 阶段 1 验收

- 5 类组件可拖入画布；位置 / 尺寸 / 旋转 / 不透明度 全部生效。
- 撤销 / 重做准确（≥ 30 步）。
- 浏览器刷新后草稿从 `localStorage` 恢复。
- FPS 计数器持续 ≥ 30。

---

## 4. 阶段 1.5：控制台分组（2026-07-03）

- 左侧分组树：全部 / 未分组 / 自定义分组；支持嵌套。
- 分组 CRUD：新建 / 重命名 / 删除 / 拖拽排序。
- 移动看板到分组：列表行右键菜单或拖拽。
- 缩略图：列表显示项目缩略图（占位 v1）。

详见 [`../../docs/测试文档/stage1-m1-editor-issues.md`](../../docs/测试文档/stage1-m1-editor-issues.md) 中 3 个验证问题的处理。

---

## 5. 后续阶段（阶段 2+）

- **阶段 2 数据链路**：静态数据 + API 数据源 + 数据集 + 过滤器（v1 先前端原生 `Function` 沙箱，QuickJS 后置） + 全局变量 + 本地存储（`./storage/{yyyy}/{mm}/{uuid}.{ext}`，抽象 `StorageProvider`） + 历史记录。验收：过滤器 JS 报错仅降级该组件，不影响全屏。（已启动，见 §6）
- **阶段 3 发布分享**：快照（`snapshot` 表存 config JSON）+ 分享链接 `/s/{token}` + 访问密码。验收：发布后无登录可访问，命中密码正确拦截。
- **阶段 4 P1 / 阶段 5 P2**：见 PRD §9 P1/P2 清单，到时按模块展开。

---

## 6. 阶段 2：数据链路（已完成）

### 6.1 阶段 2 实施切片

#### 数据源

- 新增 `DataSourceController` + `DataSourceService(Impl)`；类型 `static` / `api` 两类。
- 配置 JSON：静态 `{ data: [...] }` / API `{ url, method, headers, dataPath? }`。
- `POST /api/datasources/{id}/fetch` 测试拉取，限定 1000 行 / 15s 超时。

#### 数据集

- 新增 `DataSetController` + `DataSetService(Impl)`。
- 在数据源之上定义 `transform`（v1 留位，QuickJS 后置执行）。
- `POST /api/datasets/{id}/refresh` 抓源 → 加工 → 写回 `data` JSONB。

#### 过滤器

- 前端 `Function` 沙箱：`runFilter(code, data)`；错误降级到原数据。
- 模板：把入参 `data` 重命名为 `name` / `value`。
- 后端 `FilterController` 管理过滤器（命名、代码）。

#### 全局变量

- 看板级（`global_variable.project_id`）；命名空间 `{{var.name}}`。
- 仅支持 `static` 来源，初始值字符串；其他来源（数据集/其他变量）v2。

### 6.2 数据面板（对应 PRD §4.2.5 数据面板 v1 重点）

> **目标**: 把 10 类图表组件（line/bar/pie/area/scatter/radar/funnel/rose）全部接入数据绑定入口（静态数据 / 数据集 / 过滤器），并把 4.4.4 右侧属性面板的 `data` Tab 从占位升级为可用的工作面板。

#### 6.2.1 支持范围

- **可绑数据的图表（v1）**：`line` / `bar` / `pie` / `area` / `scatter` / `radar` / `funnel` / `rose` 共 8 类，对应 `DATA_BOUND_CHART_TYPES`。
- **不绑数据的组件**：`title` / `text` 由 `props.text` 控制，显示占位"文本 / 标题组件无需数据配置。"。
- **未选中**：显示"选中图表组件以配置数据"。

> 修复前（旧版）：`CHART_TYPES = ['line','bar','pie']`，把 5 类新图（area/scatter/radar/funnel/rose）错误地归到"无需数据配置"占位，PRD §4.2.5 / 阶段 4 验收均指出该漏项。修复后 8 类全部支持。

#### 6.2.2 模式切换

- 顶部 `Segmented`：`静态数据` / `数据源`。
- 切换选中组件时（`useEffect` 依赖 `selected.id`），按 `props.dataSetId` 是否为空决定默认模式：未绑 → 静态；已绑 → 数据源。
- 切换模式本身不破坏已存的 `props.dataSetId`：从 `source` 切回 `static` 时清空 `dataSetId`，并把当前 `data` 重新同步到 textarea。

#### 6.2.3 静态数据

- 控件：`Input.TextArea`，等宽字体，10-22 行高；placeholder 给出示例 `[{"name":"Mon","value":120}]`。
- 校验：`JSON.parse` 成功且为数组才落库；非数组提示"数据需为 JSON 数组"；解析失败透传 `Error.message`。
- 辅助按钮：`格式化`（re-`stringify`）、`恢复示例`（写入 `defaultData`）。
- 实时：每次 `onChange` 直接 `update({ data })`，画布图表通过 `ComponentRenderer` 监听 `component.data` 立即重绘。

#### 6.2.4 数据源

- 控件：`Select` 选择工作空间内数据集 + `数据源` 按钮打开 `DataSourceDrawer` 新建/管理。
- 绑定字段：`props.dataSetId`；`Select.allowClear` 一键解绑。
- 拉取按钮：`拉取数据` 调 `POST /api/datasets/{id}/refresh`，把 `ds.data` 解析后 `update({ data })`，画布重绘。
- 响应预览：拉取后的 `data` 实时回填到下方只读 textarea，前端 `JSON.stringify(_, null, 2)`。
- 错误：服务端异常 → `message.error(...)`；按钮 `loading` 态 + `disabled` 在未绑数据集时锁死。

#### 6.2.5 过滤器

- 控件：`Select` 选工作空间内过滤器 + `管理` 按钮打开 `FilterDrawer`。
- 绑定字段：`props.filterId`；`allowClear` 解绑。
- 执行：前端 `Function` 沙箱（`util/filterRunner.ts`），入参 `data`，`return` 数组。
- 错误降级：`runFilter` 报错仅影响该组件（`filterResult.ok === false`），其他组件不受影响；UI 通过 `Form.Item validateStatus="error"` 提示原始错误。
- 预览：成功后展示前 5 行只读 textarea。

#### 6.2.6 数据响应预览

- 静态模式：textarea 即输入框，编辑时即预览。
- 数据源模式：拉取按钮触发后，下方只读 textarea 同步展示当前 `data`。
- 过滤器模式：绑定过滤器时，下方再追加一段前 5 行过滤后结果预览。
- 全部走 `JSON.stringify(_, null, 2)`，等宽字体，`maxRows` 上限避免撑爆面板。

#### 6.2.7 验收点

- 8 类图表组件全部可进入 `data` Tab。
- 静态：JSON 数组合法→图表重绘；非法→红字提示但 textarea 不丢。
- 数据源：选数据集→点拉取→图表重绘；`dataSetId` 写入 `props`，重启画布后仍绑。
- 过滤器：选过滤器→预览前 5 行；故意写错代码→红字提示，图表仍渲染原数据。
- 跨模式：静态↔数据源切换不丢 `data`；解绑数据集后 textarea 同步到当前 `data`。

#### 6.2.8 v1 已知限制（转入 §6.3）

- 字段映射（DB/API 返回列名 ≠ `name`/`value`）：v1 用过滤器重命名，v2 接入组件级字段映射。
- 自动更新间隔：v1 手动拉取，v2 接入定时器。
- 受控模式：v1 单向（数据源→组件），v2 接入变量受控。

#### 6.2.9 文件变更

- `kanban_web/src/components/DataPanel.tsx`：重写。
- `kanban_web/src/components/DataSourceDrawer.tsx` / `FilterDrawer.tsx`：保持不变（侧拉抽屉已实现）。

### 6.3 已知限制（v1）

- 选中期间若经撤销/重做改变 `data`，画布图表会刷新但 textarea 不会（直至重新选中）。
- 字段映射（DB/API 返回列名 ≠ `name`/`value`）v1 不支持，v2 接入。
- 8 类图（line/bar/pie/area/scatter/radar/funnel/rose）已全部支持数据绑定；`title` / `text` 不需要数据（见 §6.2.1）。

### 6.4 阶段 2 剩余切片

全局变量、本地存储、历史记录持久化（均与 §6.4 同步完成）。

### 6.5 阶段 2 文件变更

后端：`entity/{DataSource,DataSet,Filter,GlobalVariable}.java`、`service/*`、`controller/*`、`dto/*`、`db/schema.sql`。
前端：`components/DataPanel.tsx`（2026-07-07 重写以支持 8 类图数据绑定）、`components/DataSourceDrawer.tsx`、`components/FilterDrawer.tsx`、`components/VariablesDrawer.tsx`、`util/filterRunner.ts`、`util/varInterpolate.ts`、`store/{filterStore,variableStore}.ts`、`api/index.ts`、`types/index.ts`、`pages/Editor.tsx`。

### 6.6 阶段 2 验收

- 数据源 CRUD + 测试拉取 + 保存。
- 数据集：选源 → 选 SQL/API → 一键 refresh → 数据落 `data` JSONB。
- 过滤器：编辑器内 Monaco 编写 → 实时预览前 5 行 → 错误降级原数据。
- 全局变量：`{{var.xx}}` 在 `title` / `text` 组件中插值正确。
- **数据面板**：8 类图表组件均可进入 `data` Tab；静态 / 数据源 / 过滤器三种绑定方式全部跑通（2026-07-07 收口 P0）。
- 后端 `mvn -o compile` 通过；前端 `tsc -b` + `vite build` 通过。

---

## 7. 阶段 3：发布分享（2026-07-05）

### 7.1 实施

- `Snapshot` 表存 config JSONB；`ShareLink` 表存 token（32 位 16 进制随机）+ 可选 `password_hash`（BCrypt）+ 可选 `expire_at`。
- `POST /api/projects/{id}/publish` 生成 `snapshot`；`POST /api/projects/{id}/share` 生成 `share_link`。
- 公开访问 `GET /api/share/{token}` 返回 `ShareMetaDto`；`POST /api/share/{token}`（带 password）返回 `ShareConfigDto`。
- 前端 `pages/ShareView.tsx` + `ShareView.css`；路由 `/s/:token` 公开。

### 7.2 文件变更

后端：`entity/{Snapshot,ShareLink}.java`、`service/*`、`controller/{Publish,Share}Controller.java`、`dto/*`、`db/schema.sql`。
前端：`components/PublishDrawer.tsx`、`pages/ShareView.tsx` + `ShareView.css`、`pages/Editor.tsx`、`App.tsx`、`api/index.ts`、`types/index.ts`。

### 7.3 阶段 3 验收

- 后端 `mvn -o compile` 通过；前端 `tsc -b` + `vite build` 通过。
- 运行时联调（发布→生成链接→无登录访问 `/s/{token}`→密码门拦截/放行→只读大屏覆盖）建议人工复测：后端需重新打包重启；分享页公开访问无需登录。

---

## 8. 阶段 4：全套图表 + MySQL/PG 数据源（2026-07-05）

补齐图表库与数据库数据源（P1 / PRD §4.5 §4.6.1）。

### 8.1 全套图表

- 在原 5 类（title/text/line/bar/pie）基础上新增 5 类 G2 图表：区域图 area、散点图 scatter、雷达图 radar、漏斗图 funnel、玫瑰图 rose，共 10 类组件。
- `ComponentRenderer` 按类型分发渲染（area=area+line 描边、scatter=point、radar=polar 坐标+area/line/point、funnel=interval+symmetryY、rose=polar+interval）；样式 Tab 标题/颜色面板对全部图表类型生效。
- 编辑器组件库列表、批量测试（BATCH_TYPES）、属性面板条件同步扩展。
- **数据面板 8 类全部支持数据绑定**（见 §6.2 数据面板）。

### 8.2 MySQL/PG 数据源

- `data_source.type` 扩展 `mysql` / `postgres`；`DataSourceServiceImpl.fetchArray` 增 DB 分支：`Class.forName` 加载驱动 → JDBC `executeQuery` → `ResultSet` 逐行转 `JSONObject`（数值/布尔保留类型，其余 toString） → 返回 `JSONArray`；`setMaxRows(1000)` + `setQueryTimeout(15)` 限流。
- **出参加密**（PRD §7.1）：新增 `util/CryptoUtil`（AES-256-GCM，密文 base64(iv(12)||ct||tag(16))，密钥取 `KANBAN_AES_KEY` 环境变量 base64 32 字节，未设回退固定生硬密钥），DB 源明文 `password` 在 create/update 时加密为 `passwordEnc` 存储、原 `password` 字段移除；update 时空密码保留既有 `passwordEnc`；fetchArray 时解密；后端返回的 config 不含明文密码。
- `pom.xml` 增 `com.mysql:mysql-connector-j:8.0.33`（PostgreSQL 驱动本地已在依赖中）。
- 前端 `DataSourceDrawer` 增 MySQL/PostgreSQL 配置表单（主机/端口/数据库/用户名/密码/SQL 查询），类型切换至自动填充默认端口；编辑时密码留空表示不修改；"测试"按钮即执行查询并预览前 5 行。

### 8.3 文件变更

- 后端：`util/CryptoUtil.java`（新增）、`service/DataSourceServiceImpl.java`、`pom.xml`。
- 前端：`types/editor.ts`、`types/index.ts`、`api/index.ts`、`components/ComponentRenderer.tsx`、`components/DataSourceDrawer.tsx`、`pages/Editor.tsx`。
- **2026-07-07 补充**：`components/DataPanel.tsx` 重写以支持 8 类图数据绑定（见 §6.2）。

### 8.4 已知限制（v1）

- SQL 查询需返回 `name` 与 `value` 两列（字段映射 后续，PRD §4.6.2）。
- 仅支持单条 SELECT，无连接池（每次 fetch 新建连接，适合低频数据吞吐）；暂未做密钥轮换/工作空间级密钥。
- DB 源数据需经数据集 refresh 抓取到 `component.data` 后图表前才会使用；运行时分享页不实时拉 DB。
- 词云/玫瑰/热力/K 线 3D/关系图 等需额外库或定制，后置。
- 数据面板字段映射、自动更新间隔、受控模式为 v2 计划（见 §6.2.8）。

### 8.5 验收

- 后端 `mvn -o compile` 通过；前端 `tsc -b` + `vite build` 通过（仅 react-moveable 已知警告 + bundle 体积警告）。
- 运行时联调（建 MySQL/PG 数据源→填连接/SQL→测试预览→建数据集→刷新→看板绑定渲染）建议人工复测：后端需重新打包重启；MySQL 驱动需 jar 打入。
- 8 类图（line/bar/pie/area/scatter/radar/funnel/rose）数据面板：均能进入 `data` Tab；静态/数据源/过滤器三种绑定均生效。

---

## 9. 阶段 5（部分）：编辑器 AI 助手（自然语言改组件）（2026-07-07）

实现 PRD §7.1 阶段 5 中的“编辑器内 AI 助手”：选中组件 → 自然语言指令 → 后端调用大模型（MiniMax）→ 返回属性变更 JSON → 前端应用并支持撤销。移动端编辑器仍待开发。

### 9.1 后端

- 新增表 `ai_call_log`（schema.sql）：记录每次调用的用户、看板、组件、指令、请求摘要、模型原始返回、状态、耗时，用于可观测性（PRD §5.5）。
- `config/AiSettings`（record）+ `config/AiConfig`（`@Configuration`）：读取 `kanban.ai.*`，优先环境变量 `MINIMAX_API_KEY` / `KANBAN_AI_BASE_URL` / `KANBAN_AI_MODEL` / `KANBAN_AI_TIMEOUT_SEC`（PRD §8.1），未配置 Key 时 `configured()=false`。
- `service/AiClient`（`@Service`）：用 JDK `HttpClient` 调用 OpenAI 兼容的 chat completions 接口，发送 system+user 消息，解析 `choices[0].message.content`；超时/状态码/解析异常向上抛。
- `service/AiAssistantService`（`@Service`）：核心编排。
  - 已配置 Key → 调 `AiClient`，system 提示词约束“仅输出属性 JSON 对象”；`extractJson` 兼容 markdown 代码块，`sanitize` 按组件类型只保留允许的键并规范颜色/数值。
  - 未配置 Key 或调用失败 → 降级 `localFallback` 本地规则：颜色（关键词/十六进制）、字号（调大/调小/设为 N）、加粗/变细、文本与标题内容修改。
  - 全程 `ai_call_log` 落库（日志失败不影响主流程）。
  - AI 只读不改库（PRD §8.3），变更由前端应用。
- `controller/AiController`：`POST /api/projects/{id}/ai-assist`，沿用 `requireOwner` 鉴权（authenticate + workspace + 看板归属校验）。请求体 `AiAssistRequest(componentId, componentType, componentProps, instruction)`，响应 `AiAssistResponse(changes, source, raw, logId, error)`。
- `application.yml` 新增 `kanban.ai` 配置块（base-url/api-key/model/timeout-sec）。

### 9.2 前端

- `types/index.ts` 新增 `AiAssistResponse`；`api/index.ts` 新增 `aiApi.assist`。
- `components/AiAssistant.tsx`：右抽屉，感知当前选中组件；指令输入框（Enter 发送）+ 快捷示例 chips；调用后端并自动 `updateComponentProps` 应用变更（走 store temporal，可 Ctrl+Z 撤销）；展示本次会话记录（来源 Tag：AI/本地规则/失败 + 变更明细）。
- `pages/Editor.tsx`：顶栏新增「AI」按钮（RobotOutlined）打开抽屉。

### 9.3 验收

- 后端 `mvn -o compile` 通过（110 源文件）；前端 `tsc -b` + `vite build` 通过（仅 react-moveable 已知警告 + bundle 体积警告）。
- 运行时联调（选中组件 → 输入“把颜色改成红色” → 属性面板/图表即时变化 → Ctrl+Z 撤销）建议人工复测：后端需 `mvn package` 重新打包重启；配置 `MINIMAX_API_KEY` 走真实 AI，未配置则走本地规则降级。
- 调用日志（ai_call_log）可在库中按 user_id/project_id 查询核对。

### 9.4 已知限制 / 后续

- 本地规则仅覆盖颜色、字号、字重、文本/标题内容等常见意图；复杂表述（如渐变、布局）需配置大模型 Key。
- LADV 智能生成（上传图样 → 生成整屏，PRD §4.13）未实现，后续可复用 `AiClient`。
- 移动端编辑器（触控/抽屉组件库/手势）仍待开发。

## 10. 后续规划

- **阶段 5 移动端编辑器 + AI 助手**（P1）
  - AI 助手：在编辑器内"自然语言改组件"——**已完成**（见 §9）。
  - 移动端：触控优化、抽屉式组件库、缩放/拖拽手势——待开发。
- **阶段 6 看板 + 蓝图 + 协同 + 三维**（P2）——**已完成（2026-09-06，协同为简化版），见 §11**

详细需求见 [requirements.md §7](../需求文档/requirements.md#7-后续规划)。

---

## 11. 阶段 6：看板 + 蓝图 + 协同 + 三维（2026-09-06）

> 子页面/钻取为先前会话完成（`types/editor.ts` Page/gotoPage、编辑器 PageBar、RuntimeCanvas 切页），本轮补记；蓝图/图层/协同为本轮实现。

### 11.1 蓝图编排（PRD §4.14）

- **模型**：`CanvasConfig.blueprint = { nodes, edges }`；节点 `kind ∈ event|condition|action`，事件源绑 `componentId+trigger`，条件为 JS 表达式，动作为 `ComponentEventAction`（复用交互动作集）。`normalizeBlueprint` 兼容旧快照（缺失回退空蓝图）。
- **编辑器**：左侧图标栏「蓝图」→ `BlueprintPanel` 抽屉。SVG 连线 + 绝对定位节点画布：工具栏加节点、拖头部移动（pointerup 一次性提交 = 单步撤销）、out 端口拉到 in 端口建连线、右侧配置表单（跨页面组件/页面/变量下拉）、Delete 删选中、Esc 取消。
- **运行态**：`interactionRunner.fireBlueprintEvent`——组件触发时从绑定事件源沿连线 BFS 传播；条件节点 `new Function('vars','ctx', …)` 求值为真才继续（空表达式恒真、异常按假）；动作节点复用 `executeAction`。每节点单次传播内至多执行一次（防环/菱形去重）。`RuntimeCanvas` 挂 click/dblclick/hover/viewport 四类触发，预览模态与分享页共用。
- **验收（浏览器实测）**：编辑器搭 事件源(散点图层·点击) → 条件(恒真) → 动作(gotoPage 页面2, 携 `{{ctx.name}}` 参数) → 预览点击地图切到页面 2；发布后分享页同链路复测通过；旧配置/快照加载正常。
- **文件**：`types/editor.ts`、`store/editorStore.ts`（blueprint 增删改，单步撤销）、`util/interactionRunner.ts`、`components/RuntimeCanvas.tsx`、`components/BlueprintPanel.tsx/.css`、`pages/Editor.tsx`（图标栏入口）。

### 11.2 地图图层：飞线图 / 散点图层

- `widgets/mapLayers.tsx`：`mapFlight` 飞线图（二次贝塞尔弧线 + 流动光点，rAF 动画，底图元素 useMemo 固定引用避免整图每帧重绘掉帧）、`mapScatter` 散点图层（值决定半径，运行态点击上报 `clickCtx` 支持钻取）。
- 城市定位：内置 42 城经纬度表（`CITY_COORDS`），数据可带 `lon/lat`（飞线为 `fromLon/fromLat/toLon/toLat`）优先；底图 GeoJSON 默认 `/maps/china.json`，可配 `props.geoUrl`。
- 已注册：组件库「地图 → 地图图层」、ComponentRenderer、LayerPanel 图标、DataPanel 数据绑定、样式面板属性（底图色/飞线色/散点色/GeoJSON 地址）。
- **验收**：编辑器添加两组件渲染正常（FPS 满帧）；预览/分享页渲染与点击上报正常。
- **文件**：`widgets/mapLayers.tsx`（新增）、`widgets/mapComponents.tsx`（导出 rewindCollection）、`types/editor.ts`、`ComponentRenderer.tsx`、`componentLibrary.ts`、`LayerPanel.tsx`、`DataPanel.tsx`、`pages/Editor.tsx`。

### 11.3 协同编辑（简化版：presence + 保存广播）

- **决策**：完整 CRDT/OT 为数周级工作量，本期不做；协同 = 在线成员可见 + 保存广播 + 冲突「重新加载」提醒，**合并策略 = 后保存者胜**（记入已知限制）。
- **后端**：`collab/CollabEndpoint`（summer 原生 `@WebSocketEndpoint("/ws/collab/{projectId}/{token}")`，JWT 走路径段——会话对象不暴露查询串/请求头）。onOpen 校验 token（解析→用户 ACTIVE）后入房、发 `hello{you}`、广播 `roster`；`onMessage` 仅中继 `{type:'saved'}` 并附操作者身份；onClose/onError 摘除并重播 roster。零新依赖。
- **前端**：`util/collabClient.ts`——连接房间、从 `hello` 记自身 id 过滤 roster（编辑器直开时 authStore.user 未恢复也可正确去重）、指数退避重连（2s/4s/…，5 次放弃）。`Editor.tsx`：顶栏成员 Tag、保存成功后 `sendSaved()`、收到他人 saved 弹 antd notification「重新加载」按钮（取服务端配置覆盖本地并清草稿）。
- **Vite**：`/ws` 代理 `ws:true`；`VITE_BACKEND_PORT` 可覆盖代理目标（默认 8080）。**注意**：本机 8080 被 Nahimic 音频驱动（系统服务）绑定占用时，`start.bat` 会启动失败——后端加 `-Dserver.port=8081` 并以 `VITE_BACKEND_PORT=8081 npm run dev` 启动前端即可。
- **验收（浏览器实测）**：admin 打开编辑器 → tester（SQL 造的测试号，id=2）WS 入房 → admin 顶栏出现「测试协作」Tag、roster 双向到达；admin 保存 → tester WS 收到 `{"type":"saved",user:{id:1,name:"Platform Admin"}}`；非法 token 被端点 1008 拒绝（日志 `malformed token`）。
- **文件**：`kanban-backend/src/main/java/cn/kanban/collab/CollabEndpoint.java`（新增）、`kanban_web/src/util/collabClient.ts`（新增）、`pages/Editor.tsx`、`vite.config.ts`。

### 11.4 基线修复

- `tsc -b` 此前存在 6 处 v1.5 遗留错误（缺 `@types/three`、词云 useEffect 清理返回值、和弦 ribbon 返回类型、FLV `play()` Promise 类型、IconDisplay scale 可空），全部修复；`tsc -b` + `vite build` + `mvn package` 全绿。

### 11.5 验收汇总（2026-09-06 浏览器实测）

- 登录 → 工作台 → 新建看板「阶段6验证」→ 编辑器（蓝图入口/页面条正常）。
- 飞线图 + 散点图层上画布渲染正常；样式面板属性齐全。
- 蓝图编辑器：加节点/拖连线/配置表单/选中态正常；预览点击钻取到页面 2；分享页同链路通过。
- 保存 → 服务端 config 含 2 页面 + blueprint(3 节点 2 连线)；发布 + 分享链接 → 免登录 `/s/{token}` 渲染 + 钻取可用。
- 协同：双用户 presence、保存广播、非法 token 拒绝均验证。
- 编码规范：本轮全部新增/修改文件 UTF-8 无 BOM / LF / 末尾单换行 / 无行尾空格。

---

## 12. 阶段 5 收口：移动端编辑器（2026-09-07）

PRD §4.3 触控优化（把手放大、单指拖拽、组件库抽屉化）。检测：`useIsMobile`（matchMedia `max-width: 768px`，监听变更动态切换）。

- **窄屏栅格**：`.editor-page.mobile` 两列（图标栏 + 画布），右栏移除；通栏行改 `grid-column: 1 / -1`。
- **底部抽屉化**：组件库/图层/历史 → `Drawer placement="bottom" height="55%"`（从组件库添加组件后自动收起，露出画布）；选中组件 → 属性抽屉 `height="62%"` 且 `mask={false}`（不挡画布，已选组件仍可拖拽，点空白/关闭取消选中）。桌面端渲染逻辑不变。
- **顶栏适配**：窄屏隐藏看板名与协作者标签，AI/预览/发布/保存改图标按钮（否则 375px 下保存按钮溢出屏幕）。
- **触控 CSS**（`@media (pointer: coarse)`）：Moveable 把手 14→20px（margin 同步 -10px）；画布与组件层 `touch-action: none`，防止单指拖拽被浏览器滚动劫持。
- **验收（375×667 视口实测）**：移动形态类名/栅格生效；组件库抽屉搜索+点卡片添加成功且抽屉自动收起；点选组件属性抽屉弹出（无遮罩）；原生 touch 指针序列拖拽 (168,168)→(606,468)，位移与画布缩放换算吻合；恢复 1280×720 后桌面三栏形态回归正常。
- **文件**：`pages/Editor.tsx`（useIsMobile + 抽屉化 + 顶栏适配）、`pages/Editor.css`（移动栅格 + 触控样式）。

> 至此 PRD 路线图阶段 0–6 全部完成。剩余为 PRD §8.3 已知限制（暂不处理）与 v2 明确排除项。

---

## 13. 性能与安全收口（2026-09-08）

### 13.1 数据源连接池（PRD §8.3 已知限制收口）

- `util/DbConnectionPool`：静态轻量池，按数据源 id 建条目（`ConcurrentHashMap` + 条目锁串行化）。
  - 配置指纹（type|url|user|password）失配自动关闲置换池，update/delete 显式 `evict`；evict 置 closed 标记，在用连接归还时兜底关闭
  - 借出逐个 `isValid(2s)` 校验剔除死连；单源并发上限 8（超限抛错不排队）、空闲上限 4、池总数 64 自动修剪空池；JVM 关闭钩子回收
- `DataSourceServiceImpl.fetchDb` 改借出/归还（broken 标记：RuntimeException/SQLException 均按坏连接关闭不回池）
- 运行时验证：`pg_stat_activity` 证实同一物理连接（backend_start 不变）跨多次 fetch 复用；旧实现每次 fetch 新建

### 13.2 数据源 SQL 守卫与驱动白名单

- `validateReadOnlyQuery`：SQL 去行/块注释后必须以 SELECT 开头、除结尾分号外不允许分号（多语句 400「不支持多条语句」）——把 PRD「fetch 仅单条 SELECT」从约定升级为服务端强制；数据源 SQL 仍为看板作者整条编写（非参数化模板），已记入已知限制说明
- 驱动类名由 if-else 字符串改为 `DRIVERS` 固定白名单 Map（不再用外部输入直接反射加载）

### 13.3 前端代码分割（vite 8 / rolldown advancedChunks）

- `vite.config.ts` 按库拆 vendor chunk：`vendor-g2`（1.3MB）/`vendor-antd`（1.2MB）/`vendor-react`（232kB）/d3 归并主包；业务主包 **3,260kB → 533kB（gzip 995 → 166kB）**
- 收益：业务代码迭代不再使图表/UI 库 chunk 的浏览器缓存失效；three/hls/mpegts 此前已是动态导入独立 chunk
