# kanban_web AGENTS.md

前端模块专属约定。仅当 AI Agent 触碰本目录时加载。

## 模块职责

DataV 风格可视化大屏看板的前端应用，提供看板编辑器、大屏预览、工作台（项目列表）、登录/分享页，支持拖拽搭建、AI 图表生成、全局变量/过滤器、快照发布分享。

## 技术栈

| 项 | 版本/库 |
|---|---|
| 框架 | React 18 + TypeScript |
| 构建 | Vite 5 |
| UI | Ant Design 5 |
| 图表 | G2 5（`@antv/g2`）+ d3-cloud/d3-hierarchy/d3-sankey/d3-chord/d3-geo（词云/关系图/地图） |
| 3D | three（3D地球/3D平面地图/三维城市） |
| 流播放 | hls.js / mpegts.js（动态 import，按需加载） |
| 状态管理 | Zustand |
| 路由 | React Router v6 |
| HTTP | axios（`src/api/client.ts`） |

## 目录结构

```
kanban_web/
├── src/
│   ├── main.tsx                    # ReactDOM 入口
│   ├── App.tsx                     # 路由配置 + 全局 Provider
│   ├── pages/                      # 页面组件
│   │   ├── Login.tsx               # 登录页
│   │   ├── Workbench.tsx           # 工作台（项目列表 + 分组）
│   │   ├── Settings.tsx            # 系统设置（AI 配置 + Token 统计，仅平台管理员）
│   │   ├── Editor.tsx              # 看板编辑器（核心页面）
│   │   └── ShareView.tsx           # 分享查看页（密码/无密码）
│   ├── components/                 # 可复用组件
│   │   ├── ComponentRenderer.tsx   # 组件渲染引擎（G2 图表 + DOM 信息/媒体/装饰/表格 + antd 控件，控件经 setRuntimeVariable 写全局变量）
│   │   ├── widgets/                # 扩展组件实现（graphComponents 词云/关系图/矩形树图/水球、mapComponents 平面地图、mapLayers 飞线图/散点图层、threeComponents 3D、controlComponents2 扩展控件、mediaComponents2 画廊/标志墙等、pivotTable 透视表、streamPlayers 流播放）
│   │   ├── ComponentLibraryPanel.tsx # 组件库面板（分类/子分类/搜索/卡片网格，DataV 风格）
│   │   ├── componentLibrary.ts     # 组件库分类数据（图表/地图/信息/表格/控件/媒体/其他）+ THUMB_KEYS 缩略图清单（public/thumbs/{key}.png，取自 DataV）
│   │   ├── LayerPanel.tsx          # 图层面板（层级排序/显隐/锁定/重命名）
│   │   ├── HistoryPanel.tsx        # 历史记录面板（撤销/重做 + 步骤跳转）
│   │   ├── AiAssistant.tsx         # AI 助手面板（组件样式修改 + LADV 上传图生成）
│   │   ├── InteractionPanel.tsx    # 交互配置面板（事件触发 → 动作，PRD §4.10）
│   │   ├── BlueprintPanel.tsx      # 蓝图编排面板（事件源/条件/动作节点可视化编辑，PRD §4.14）
│   │   ├── PreviewModal.tsx        # 编辑器预览模态（运行态渲染，交互事件生效）
│   │   ├── RuntimeCanvas.tsx       # 运行态画布（预览/分享共用，挂载交互事件与显隐/高亮覆盖）
│   │   ├── GroupSidebar.tsx        # 分组侧边栏 + 项目列表
│   │   ├── DataPanel.tsx           # 数据源/数据集面板
│   │   ├── DataSourceDrawer.tsx    # 数据源配置抽屉
│   │   ├── VariablesDrawer.tsx     # 全局变量管理抽屉
│   │   ├── FilterDrawer.tsx        # 过滤器管理抽屉
│   │   ├── AssetDrawer.tsx         # 素材库抽屉
│   │   ├── PublishDrawer.tsx       # 发布/分享抽屉
│   │   └── Ruler.tsx               # 编辑器标尺
│   ├── store/                      # Zustand 状态管理
│   │   ├── authStore.ts            # 认证状态（token、用户信息、workspaceId）
│   │   ├── workspaceStore.ts       # 工作空间列表
│   │   ├── editorStore.ts          # 编辑器核心状态（画布、组件、选中态）
│   │   ├── variableStore.ts        # 全局变量定义
│   │   ├── filterStore.ts          # 过滤器状态
│   │   └── editorHistoryPersist.ts # 编辑器历史持久化
│   ├── api/                        # API 层
│   │   ├── client.ts               # axios 实例（拦截器：token 注入、401 处理）
│   │   └── index.ts                # 所有 API 函数（auth、project、datasource、ai 等）
│   ├── util/                       # 工具函数
│   │   ├── filterRunner.ts         # 过滤器执行引擎（runFilterAsync，Web Worker 沙箱 + 超时终止）
│   │   ├── filterWorker.ts         # 过滤器沙箱 Worker（独立线程 Function 执行，主线程 3s 超时 terminate）
│   │   ├── varInterpolate.ts       # 变量插值
│   │   ├── interactionRunner.ts    # 交互动作执行器（setVariable/toggleVisible/highlight/openUrl/gotoPage + 运行态覆盖 store + fireBlueprintEvent 蓝图传播）
│   │   ├── collabClient.ts         # 协同 WS 客户端（/ws/collab 房间：presence 过滤自身 + 保存广播，指数退避重连）
│   │   └── chartTextColor.ts       # 图表文字颜色自适应
│   ├── theme/
│   │   └── themes.ts               # 内置主题套件（暮蓝/中性灰/紫夜，editorStore.applyTheme 套用可撤销）
│   ├── types/                      # TypeScript 类型定义
│   │   ├── index.ts                # 通用类型（User、Project、DataSource 等）
│   │   └── editor.ts               # 编辑器专用类型（Component、Canvas、ComponentEvent 等）
│   └── routes/
│       └── ProtectedRoute.tsx      # 路由守卫（未登录 → /login）
├── index.html
├── package.json
├── tsconfig.json
├── vite.config.ts
└── eslint.config.js
```

## 核心模式

### 状态管理（Zustand）

每个 domain 一个独立 store，通过 `useXxxStore()` hook 访问：

| Store | 职责 | 关键字段 |
|-------|------|---------|
| `authStore` | 登录 token、用户信息、当前 workspaceId | `token`, `user`, `workspaceId`, `login()`, `logout()` |
| `workspaceStore` | 工作空间列表 | `workspaces`, `fetchWorkspaces()` |
| `editorStore` | 编辑器画布状态 | `components[]`, `selectedId`, `canvasConfig`, `addComponent()`, `updateComponent()` |
| `variableStore` | 全局变量 | `variables[]`, `addVariable()`, `updateVariable()` |
| `filterStore` | 全局过滤器（含受控模式：受控标记 + 生效代码快照存 localStorage，渲染取 `useEffectiveFilterCode`） | `filters[]`, `controlled[]`, `applied{}`, `setControlled()`, `applyCode()` |
| `editorHistoryPersist` | 编辑器操作历史 | `history[]`, `undo()`, `redo()` |

### API 层

`client.ts` 创建 axios 实例，拦截器自动：
- 注入 `Authorization: Bearer <token>`（从 `authStore` 读取）
- 处理 401 → 尝试 refresh token → 失败跳 `/login`
- 注入 `X-Workspace-Id` 头（从 `authStore.workspaceId` 读取）

### 组件模式

- 抽屉组件（`*Drawer`）：配置型表单，接收 `open`/`onClose`/`onSave` props
- `ComponentRenderer`：渲染引擎，根据 `component.type` 查找 G2 图表注册表，动态渲染图表
- 路由守卫：`ProtectedRoute` 包裹需要登录的页面，未登录重定向 `/login`

## 页面路由

| 路径 | 页面 | 说明 |
|------|------|------|
| `/login` | Login | 账号密码登录 |
| `/workbench` | Workbench | 项目列表 + 分组管理 |
| `/editor/:projectId` | Editor | 看板编辑器 |
| `/settings` | Settings | 系统设置（AI 配置 / Token 统计，仅平台管理员可见入口） |
| `/share/:token` | ShareView | 分享查看页（可设密码） |

## 模块专属约定

- 缩进：2 空格（TS/TSX）
- 组件用函数组件 + Hooks，不写 class 组件
- Store 用 Zustand，每个 store 文件只导出一个 `useXxxStore`
- API 调用统一在组件中通过 `api/` 的封装函数调用，不直接使用 axios
- G2 图表用法见 `docs/开发文档/G2使用文档.md`
- 编辑器类型定义见 `src/types/editor.ts`

## 依赖

- 后端 API：`kanban-backend`（端口 8080，Vite proxy 转发 `/api` 与 `/ws`（协同 WebSocket，ws:true））
- 本机 8080 被系统服务占用时：后端 `java -Dserver.port=8081 -jar target\kanban-backend-boot.jar` + 前端 `VITE_BACKEND_PORT=8081 npm run dev`
- 无其他外部模块依赖
