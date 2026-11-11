# kanban 平台 需求规格说明书（PRD）

> \*\*版本\*\*: v1.4（关键策略已锁定）
> \*\*日期\*\*: 2026-07-21
> \*\*参考\*\*: \[DataV 控制台](https://datav.aliyun.com/v/console/268343)
> \*\*技术栈\*\*: `kanban-backend` = summer-boot + JDK 25 + MySQL/PostgreSQL；`kanban\_web` = React 19 + TypeScript + Vite 8 + antd 6 + zustand 5

\---

## 1\. 项目概述

### 1.1 背景与目标

参考阿里 DataV 面向企业的零/低代码数据可视化大屏搭建平台。本项目对标其能力，自建一套可内置私有化部署的可视化看板平台，核心目标：

* **零/低代码搭建**：用户通过拖拽 + 配置即可产出 PC 大屏与移动端看板。
* **丰富的可视化组件**：图表、地图、控件、媒体、装饰等开箱即用。
* **多源数据接入**：静态数据、HTTP API、MySQL、PostgreSQL；支持过滤器与全局变量做数据加工。
* **所见即所得 + 多端适配**：编辑器与运行时一致，支持多分辨率多屏适配。
* **主题与模板复用**：套件一键切换；模板市场加速搭建。
* **安全发布**：支持快照、分享链接、访问密码、Token、IP 白名单。
* **多工作空间**：天然支持 dev / test / prod 多环境隔离。
* **AI 加持**：LADV 智能生成 + 编辑器 AI 助手（MiniMax 多模态大模型）。

### 1.2 范围

* **v1 包含**：控制台、PC 端大屏编辑器、移动端编辑器、组件库、数据源（MySQL/PG/API/静态/CSV）、数据集、过滤器、全局变量、历史记录、发布与分享、LADV 智能生成、主题套件、多工作空间。
* **v1 不包含**：三维城市编辑器、模板市场付费交易、可视化学院内容、计费与配额。

### 1.3 角色

|角色|说明|
|-|-|
|平台管理员|维护组件库、套件、系统配置、用户与权限|
|数据分析师|维护数据源、数据集、过滤器|
|看板开发者|使用模板/组件构建看板并发布|
|终端查看者|通过分享链接访问运行时大屏|

\---

## 2\. 术语

|术语|释义|
|-|-|
|看板（Dashboard）|一个完整的数据可视化页面（大屏/移动端/三维）|
|组件（Widget）|看板中的单个可视化元素（图、文本、控件、装饰）|
|模板（Template）|预置可复用的看板样式|
|套件（Theme Kit）|主题/配色/装饰素材组合（如深空蓝）|
|数据源（Data Source）|看板数据的来源（MySQL/PG/API/静态 JSON/CSV）|
|数据集（Dataset）|数据源上的查询/封装，对外提供字段映射|
|过滤器（Filter）|对原始数据做 JS 转换的函数（前端执行）|
|全局变量（Global Variable）|看板级共享的状态，可在组件间联动|
|快照（Snapshot）|看板某一时刻的发布版本，绑定到分享链接|
|区块（Block）|一组可复用的组件组合|
|组件包（Package）|一组组件的发布单元|
|加载占位|组件未就绪时的占位|
|LADV|DataV 智能生成大屏（上传图样/手绘 → AI 生成）|
|蓝图（Blueprint）|可视化交互编排（v2）|
|工作空间（Workspace）|资源与成员的隔离单元，类比"环境/店铺"|

\---

## 3\. 总体架构

### 3.1 分层

```
+----------------------------------------------------------+
| kanban\_web (React 19 + TS + Vite 8 + antd 6 + zustand 5) |
|  +- 控制台（Workbench）                                  |
|  +- 大屏编辑器（Editor） PC / Mobile                     |
|  +- 运行时（ShareView / Preview）                        |
|  +- 组件渲染层 + G2 / ECharts                           |
+----------------------------------------------------------+
| kanban-backend (summer-boot 3.0.0 + JDK 25)              |
|  +- Auth（login/refresh/me） + JWT                       |
|  +- Workspace（list/switch）                             |
|  +- Project / Group / Variable / Filter / DataSource...  |
|  +- DataSet（refresh：抓源 → 加工 → 缓存）                |
|  +- Snapshot / ShareLink（公开访问 / 密码）               |
|  +- Asset（本地存储）/ CryptoUtil（AES-GCM）              |
+----------------------------------------------------------+
| PostgreSQL (Supabase) / MySQL 8（schema 隔离前缀 kanban\_）|
+----------------------------------------------------------+
```

### 3.2 模块映射

|后端模块|前端模块|说明|
|-|-|-|
|`AuthController`|`Login.tsx` + `authStore`|Bearer Token（access/refresh）|
|`WorkspaceController`|`Workbench.tsx` + `workspaceStore`|多工作空间切换|
|`ProjectController` / `GroupController`|`Workbench.tsx` / `GroupSidebar`|看板分组树 + 看板 CRUD|
|`Editor` 端|`pages/Editor.tsx`|画布编辑|
|`DataSourceController`|`DataSourceDrawer`|数据源 CRUD + 测试|
|`DataSetController`|`DataSourceDrawer` 数据集 Tab|数据集 CRUD + refresh|
|`FilterController`|`FilterDrawer`|JS 过滤器（前端 Function 沙箱）|
|`GlobalVariableController`|`VariablesDrawer`|看板级全局变量（`{{var.xx}}` 引用）|
|`AssetController`|`AssetDrawer`|资源上传到本地存储|
|`PublishController`|`PublishDrawer`|快照（snapshot）发布|
|`ShareController`|`pages/ShareView`|公开访问 `/s/{token}`，可选密码|

\---

## 4\. 功能需求

### 4.1 控制台（Workbench）

* **多工作空间**：登录后默认进入"上次使用工作空间"；列表为空时回退到第一个。
* **看板分组树**：左侧全部 / 未分组 / 自定义分组；分组 CRUD（新建/重命名/删除/拖拽排序）；支持嵌套（`parent\_id`）。
* **看板列表**：网格/列表视图切换；按创建/更新时间排序；按名称搜索；按标签筛选（v2）。
* **看板 CRUD**：新建（受控 `Modal` + `Form.validateFields`）、重命名、删除、复制（v2）、移动到分组。
* **进入编辑器**：列表行点击 → `/editor/{projectId}`。

### 4.2 PC 端大屏编辑器（Editor）

#### 4.2.1 画布

* 三栏布局：左侧 56px 图标栏 + 240px 可折叠面板（图层/组件库/历史记录切换为内联面板，资源/全局变量/过滤器从图标栏开抽屉）/ 中间画布 / 右侧 320px 属性面板；顶部 56px 工具栏；底部 28px 状态栏。
* **画布自适应**：`fitMode ∈ {none, width, both}`；根据 `el.clientWidth / Height` 与 `PAD\_X=16 / PAD\_TOP=16 / PAD\_BOTTOM=16 / RULER=24` 计算 `scale`（`MIN=0.1, MAX=1.5`），`ResizeObserver` 实时重算。
* **标尺**：横/竖标尺（24px），从标尺拖出参考线；双击参考线删除；越界自动移除。
* **网格**：20×20 半透明网格背景，仅视觉。
* **拖拽与缩放**：`react-moveable` 提供 drag/resize/rotate/snap；8 把手；元素 guides（其他组件的 bbox）；缩略图指南（`verticalGuidelines / horizontalGuidelines`）。
* **键盘**：方向键微调 1px（Shift = 10px）、`Ctrl+Z/Y` 撤销/重做（zustand `zundo`）、`Ctrl+C/V/D` 复制粘贴/副本、`Del/Backspace` 删除、`Esc` 取消选择。
* **历史记录**：本地 `localStorage` 按项目 ID 持久化（防抖 500ms），启动时与 `serverTs` 比较，优先取本地未保存草稿。
* **历史记录面板**：左侧图标栏"历史记录"打开（`HistoryPanel.tsx`）；顶部撤销/重做按钮，下方步骤列表（当前位置高亮），点击任意步骤直接跳转到该状态；`Ctrl+Z/Y` 快捷键保留。

#### 4.2.2 顶部工具栏

返回 / 看板名 / AI / 发布 / 保存（资源/全局变量/过滤器/历史记录入口在左侧图标栏，撤销/重做为快捷键 `Ctrl+Z/Y`）。

#### 4.2.3 左侧组件库

|组件|类型|备注|
|-|-|-|
|标题|`title`|文本/字号/颜色|
|文本|`text`|文本/字号/颜色|
|折线图|`line`|G2 line + point；name/value|
|柱状图|`bar`|G2 interval；name/value|
|饼图|`pie`|G2 polar + stackY|
|区域图|`area`|G2 area + line|
|散点图|`scatter`|G2 point|
|雷达图|`radar`|G2 polar + area/line/point|
|漏斗图|`funnel`|G2 interval + symmetryY|
|玫瑰图|`rose`|G2 polar + interval|

**批量添加**：`+10 组件 (性能测试)` 按钮一键生成 10 个组件用于压测。

#### 4.2.4 图层面板

位于左侧图标栏"图层"面板（`components/LayerPanel.tsx`），管理画布组件的层级与状态。

* **列表顺序**：顶部 = 最上层（`components` 数组倒序展示；数组末尾 = 最上层。画布/分享页均按数组顺序渲染，无独立 z-index）。
* **行结构**：类型图标 + 名称 + 显隐开关 + 锁定开关；空列表显示占位文案。
* **选中**：单击行选中并高亮；隐藏组件允许选中（便于在右侧属性面板改属性），但画布不显示 Moveable 把手。
* **重命名**：双击名称行内编辑，Enter/失焦提交，Esc 取消。
* **层级调整**：

  * 拖拽行排序（HTML5 drag \& drop）：拖到目标行上方，目标行上边框显示插入指示线。
  * 右键菜单：置顶 / 上移一层 / 下移一层 / 置底 / 复制 / 删除，均按行直接生效（不依赖选中态）。
* **显隐**：眼睛图标切换 `visible`；隐藏后画布与分享页均不渲染。
* **锁定**：锁图标切换 `locked`；锁定后**完全不可选**——画布点击穿透（`pointer-events: none`，落击到下层组件或取消选中）、图层面板行不可选且无右键菜单，仅行内眼睛/锁图标可点（用于解锁）；锁定当前选中项时自动清除选中态。
* **历史**：以上操作均为单次 store 提交 = 一步撤销/重做，并纳入 localStorage 草稿持久化。
* **v2 计划**：多选（Ctrl+点选）与成组/解组、层级快捷键（`Ctrl+]` / `Ctrl+\[`）。

#### 4.2.5 右侧属性面板

未选中时显示**画布属性**：

* 宽度 / 高度（320-20000 × 240-10000）
* 背景色
* 缩放（0.1-1.5，步进 0.05）
* 适配方式（自定义 / 自适应宽度 / 等比适配）
* 参考线列表

选中组件时显示**组件属性**：

* `style` Tab：名称、位置 X/Y、尺寸 W/H、旋转、不透明度、可见、锁定、对齐、文本/字号/颜色、标题/颜色
* `data` Tab：详见 §4.2.6
* `interaction` Tab：占位（v2 接入事件/动作）

#### 4.2.6 数据面板（v1 重点）

* **模式切换**：静态数据 / 数据源

  * 静态：JSON 数组（元素形如 `{ "name": "Mon", "value": 120 }`），textarea 编辑，格式化和恢复示例
  * 数据源：选择数据集 → 拉取数据 → 注入图表；"拉取数据"按钮（`POST /api/datasets/{id}/refresh`）
* **过滤器**：从工作空间已存在过滤器中选择；前端 `Function` 沙箱执行，错误降级到原始数据，仅影响该组件。
* **数据响应预览**：前 5 行只读。
* **支持类型**：v1 已实现 10 类图全部支持，**所有图表组件**都可以绑定静态数据 / 数据集 / 过滤器。
* **v2 计划**：字段映射（DB/API 返回列名 ≠ `name/value`）、自动更新间隔、受控模式。

### 4.3 移动端编辑器（v2）

触控优化：把手放大、单指拖拽、组件库抽屉化。

### 4.4 运行时（ShareView / Preview）

* 公开访问 `/s/{token}`，无需登录。
* 服务端：未过期 + 密码正确 → 返回快照 `config` JSON；前端只读渲染。
* 客户端组件渲染：`ComponentRenderer` 复用 G2，禁用 Moveable/历史。
* 多分辨率适配：默认按 `canvasW × canvasH` 居中等比缩放。

### 4.5 组件库

* **图表（基于 G2 5）**：折/柱/饼/区域/散点/雷达/漏斗/玫瑰。
* **文本**：数字翻牌器、自定义背景块、多行/单行文本、通用标题、跑马灯、滚动列表、置顶列表。
* **媒体**：单张图片、视频、iframe、轮播图、装饰条/光效。
* **控件**：时间器、日期、下拉、Tab、按钮、搜索框、进度条、滑块、分页器。
* **装饰**：边框、底图、装饰图、标牌、动态素材。
* **容器**：多列/多行/格子/轮播/Tab/分页容器。
* 每个组件：`configSchema` + `defaultProps` + `render` + `dataAdapter` + `eventAdapter`（v2）。

### 4.6 数据准备

#### 4.6.1 数据源

* **类型**：RDS for MySQL / PostgreSQL / API(HTTP) / 静态 JSON / CSV。
* **字段**：类型、网络（内网/VPC/区域）、名称、域名、端口、用户名、密码、数据库、认证方式、VPC 开关。
* **测试连接、保存**。
* **出参加密**（PRD §7.1）：`password` 在 `create/update` 时加密为 `passwordEnc` 存储，原 `password` 字段移除；前端永远拿不到明文密码；编辑时密码留空表示不修改。
* **数据源列表与测试预览**：前端 `DataSourceDrawer` 列表 + "测试"按钮触发 `POST /api/datasources/{id}/fetch`，返回前 5 行。

#### 4.6.2 数据集

* 在数据源之上定义 SQL 或 API 路径 + 字段映射 + 缓存 TTL，对外公开给组件使用。
* v1 字段映射**后续**：DB 源数据需经数据集 `refresh` 抓到 `component.data` 后图表才会用；运行时分享页不实时拉 DB。
* `POST /api/datasets/{id}/refresh` 重新抓源并加工。

#### 4.6.3 过滤器

* JS 转换函数（**前端执行**，Web Worker / QuickJS 沙箱后置）。
* 入参 `data`（原始数组），`return` 结构化数组。
* 提供 Monaco 代码编辑器、数据响应结果预览、受控模式、自动更新、命名、可复用。
* 错误降级：过滤器报错仅降级该组件，不影响整屏。

### 4.7 全局变量

* 字段：名称、描述、来源（静态/数据集/其他变量，v1 仅静态）、初始值、过滤器（可选）、数据响应结果、受控模式、自动更新频率、清理未使用。
* 在组件中通过 `{{var.xx}}` 引用；用于跨组件联动。
* v1 仅支持静态值；数据集/其他变量来源 v2。

### 4.8 资源管理

* 资源表 `asset`：类型 image/video/audio/font/file，本地存储路径 `storage/{yyyy}/{mm}/{uuid}.{ext}`，抽象 `StorageProvider`。
* 拖拽上传到画布；引用计数防止误删（v2）。
* v1 上传接口 `POST /api/assets/upload` 已实现。

### 4.9 主题与样式

* 套件（暮蓝/中性灰/紫色）一键套用；
* 组件样式由 JSON Schema 驱动的样式表单一键美化。

### 4.10 交互与事件

* 事件：点击、悬停、进入视口、双击。
* 动作：设全局变量、显示/隐藏/高亮其他组件、跳转 URL、打开新窗口、轮播切换、Tab 切换。
* v1 通过组件级 `interaction` Tab 配置；v2 引入蓝图（节点编排）。

### 4.11 发布与分享

* **发布**：`POST /api/projects/{id}/publish` 生成 `snapshot` 表记录，存 config JSONB 与 `version`（自增）。
* **分享**：`POST /api/projects/{id}/share` 生成 `share\_link`（32 位十六进制 token + 可选 `password\_hash` BCrypt + 可选 `expire\_at`）。
* **公开访问**：`GET /api/share/{token}` 返回 `ShareMetaDto`；`POST /api/share/{token}`（带 password）返回 `ShareConfigDto`（即快照 config）。
* 验证：发布后无登录可访问，密码正确拦截 / 放行，只读大屏覆盖。

### 4.12 大屏嵌入

* v2 计划：将已发布的其它大屏作为 iframe/SDK 形式嵌入当前大屏，传递全局变量做交互。

### 4.13 LADV 智能生成

* 上传参考图（截图）或手绘草 → 调用 MiniMax 多模态大模型识别版式与组件关系 → 生成可编辑大屏。
* v1 已提供基础设施（AiClient / AiChatService / AiChatSession / AiChatMessage），`ai\_call\_log` 落库。
* 用户可"立即生成"或"重新上传"。

### 4.14 蓝图（v2）

* 可视化交互编排：节点（事件源、动作、变量、条件）+ 连线。

\---

## 5\. 非功能需求

### 5.1 性能

* 50 个组件、5 个数据源、并发 5 用户编辑，P95 < 1.5s 打开 / 1s 切换 tab。
* 运行时 50 个组件 + 8 端点请求 P95 < 2s 首屏。
* DB 查询：单条 SELECT，`setMaxRows(1000)` + `setQueryTimeout(15)` 限流。

### 5.2 兼容性

* Chrome / Edge / Safari 最新两个大版本。
* 分辨率：1920×1080 起，至 7680×2160；移动端 375-768。

### 5.3 安全

* 工作空间隔离；管理员放行；JWT（access 短，refresh 长）；BCrypt 密码哈希；AES-256/GCM 加密数据源密码；Token 持有 鉴权。
* 字段级权限（v2）。
* 审计：关键写操作入审计表（v2）。

### 5.4 国际化

* v1 中文为主，预留 i18n 资源位。
* v2 接入中英双语。

### 5.5 可观测性

* 后端：关键路径埋点（`ai\_call\_log`、`snapshot`、`share\_link`）。
* 前端：错误边界 + 上报（v2）。

\---

## 6\. 验收标准（v1）

* 控制台：登录 → 切换工作空间 → 新建/重命名/删除/移动看板 → 进入编辑器，路径通畅。
* 编辑器：拖拽 5 基础 + 5 新增图表共 10 类；位置/尺寸/旋转/不透明度/可见/锁定 全部生效；图层面板排序/显隐/锁定/重命名/右键操作准确且可撤销；历史记录面板步骤跳转准确；本地草稿在刷新后能恢复；`Ctrl+S` 保存。
* 数据：静态 / API / MySQL / PG 4 类数据源都能拉数；数据集 refresh 后图表自动重绘；过滤器执行 / 错误降级正确；全局变量 `{{var.xx}}` 在文本中插值正确。
* 发布：发布后无登录可访问，密码正确拦截 / 放行；过期 token 拦截；分享页只读。
* 性能：50 个组件下编辑器交互 ≥ 30 FPS。

\---

## 7\. 后续规划

|阶段|目标|优先级|
|-|-|-|
|**5**|移动端编辑器 + AI 助手|P1|
|**6**|看板 + 蓝图 + 协同 + 三维|P2|

### 7.1 阶段 5（P1）

* 移动端编辑器：触控优化；底部抽屉组件库；缩放/拖拽手势。
* AI 助手：在编辑器内"自然语言改组件"——"把这一列改成渐变色""调小字号"。

### 7.2 阶段 6（P2）

* 看板：复用大屏能力做子页面（路由 / 钻取）。
* 蓝图：可视化事件 / 动作编排。
* 协同：多用户同时编辑 + CRDT 或 OT 合并。
* 三维：3D 城市 / 3D 地球 / 飞线 / 散点层。

\---

## 8\. 附录

### 8.1 环境变量

|变量|用途|示例|
|-|-|-|
|`KANBAN\_AES\_KEY`|数据源密码 AES-256/GCM 密钥（base64 32 字节）|`b64(32B)`|
|`MINIMAX\_API\_KEY`|MiniMax API Key|`sk-...`|
|`KANBAN\_AI\_BASE\_URL`|AI 接入点|`https://api.MiniMax.chat/v1/chat/completions`|
|`KANBAN\_AI\_MODEL`|视觉模型|`MiniMax-VL-01`|
|`KANBAN\_AI\_TIMEOUT\_SEC`|AI 超时|`60`|

### 8.2 数据库表清单

|表|说明|
|-|-|
|`app\_user`|用户|
|`workspace` / `workspace\_member`|工作空间 / 成员|
|`project\_group` / `project`|看板分组 / 看板项目|
|`data\_source` / `data\_set` / `filter`|数据源 / 数据集 / 过滤器|
|`global\_variable`|项目级全局变量|
|`asset`|资源（本地存储）|
|`snapshot` / `share\_link`|快照 / 分享链接|

### 8.3 已知限制（v1）

* DB 源数据必须经数据集 `refresh` 后才进图表（无实时拉取）。
* 每次 fetch 新建连接（无连接池）；适合低频数据吞吐。
* 出参加密为单密钥（未做密钥轮换 / 工作空间级密钥）。
* 数据集字段映射**后续**（v1 期望 `name` / `value` 两列）。
* 过滤为单条 SELECT，不支持 JOIN。
* AI 辅助只读，不会改组件 / 写库。
* 历史记录仅前端 `localStorage`（按项目分键），无服务端版本管理。

\---

## 9\. 修订记录

|版本|日期|作者|变更|
|-|-|-|-|
|v1.0|2026-06-15|—|初稿|
|v1.1|2026-06-29|—|锁定关键策略：编辑器 MVP、数据链路、发布分享、套件与多工作空间|
|v1.2|2026-07-21|—|新增图层面板需求（§4.2.4）：层级排序、显隐、锁定、重命名、右键菜单；原 §4.2.4/§4.2.5 顺延|
|v1.3|2026-07-21|—|编辑器左栏改为 56px 图标栏 + 240px 可折叠面板；变量/资源/过滤器入口移至图标栏|
|v1.4|2026-07-21|—|图标栏定为图层/组件库/资源/全局变量/过滤器/历史记录；新增历史记录面板（步骤列表+跳转），顶栏移除撤销/重做按钮|

\---

*本文档由 Codex 于 2026-07-07 根据代码与可见产品形态重建；原版本因编码损坏已被替换，备份在 `requirements.md.triple-mojibake.2026-07-07.bak`。*

