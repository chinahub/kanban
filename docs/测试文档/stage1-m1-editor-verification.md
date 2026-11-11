# 阶段 1 M1 编辑器 验收报告

> **日期**: 2026-07-03（2026-07-07 更新：数据面板 8 类图 P0 收口）
> **环境**: 后端 `kanban-backend`（8080） + 前端 `kanban_web`（5173） + Chrome 最新版
> **范围**: 阶段 1（M1）画布编辑器 MVP 全量验收
> **结论**: **通过**（含 1 项 P2 待人工复测）

---

## 1. 验收清单

### 1.1 启动

- ✅ 后端 `mvn spring-boot:run` 4.8s 启动，40 singletons，15 routes。
- ✅ 前端 `npm run dev` 启动 Vite 8 + React 19，无编译错误。
- ✅ `vite.config.ts` 代理 `/api`→`http://localhost:8080` 生效。

### 1.2 登录与路由

- ✅ `POST /api/auth/login` 返回 access + refresh。
- ✅ `authApi.me()` 注入 user；`workspaceApi.list()` 列出工作空间；空列表回退到第一个。
- ✅ 未登录访问 `/editor/:id` → 跳 `/login`（`ProtectedRoute`）。
- ✅ 登录后访问 `/editor/:id` 加载对应看板；`projectApi.get` 失败提示 `加载看板失败`。

### 1.3 编辑器布局

- ✅ 三栏 240 / 1fr / 320px；顶 56px；底 28px。
- ✅ 标尺横竖各 24px；可拖出参考线；越界自动移除。
- ✅ 网格 20×20 半透明背景。
- ✅ 顶部 FPS 计数器持续显示 ≥ 30。

### 1.4 组件库

- ✅ 5 类组件（标题/文本/折线/柱状/饼图）点击 + 拖拽添加。
- ✅ 添加位置计算：拖入点在 `canvas-stage` 内的相对坐标（除以 `scale`）+ 居中。
- ✅ `+10 组件 (性能测试)` 批量添加 10 个混合组件，按 5 列 × 2 行网格摆放。

### 1.5 属性面板

- ✅ 未选中：画布属性（宽 / 高 / 背景色 / 缩放 / 适配方式 / 参考线列表）。
- ✅ 选中组件：名称 / X / Y / W / H / 旋转 / 不透明度；标题/文本额外有 文本/字号/颜色；图表额外有 标题/颜色。
- ✅ 调整不透明度 / 旋转实时反映到 `canvas-layer` 的 `style`。
- ✅ 删除选中组件：按钮 + `Del/Backspace` 键盘。

### 1.6 数据面板（2026-07-07 收口 P0）

- ✅ 8 类图（line/bar/pie/area/scatter/radar/funnel/rose）全部可进入 `data` Tab；`title` / `text` 仍显示"无需数据配置"占位。
- ✅ 静态 / 数据源模式切换；JSON 数组校验；格式化、恢复示例。
- ✅ 绑定数据集（`POST /api/datasets/{id}/refresh` 拉取）+ 过滤器（前端 `Function` 沙箱，错误降级）。
- ✅ 数据响应预览：拉取结果 + 过滤后前 5 行只读。
- ✅ `tsc -b` + `vite build` 通过；后端字段 `props.dataSetId` / `props.filterId` 不变（向后兼容）。

### 1.7 键盘与历史

- ✅ `Ctrl+Z/Y` 撤销/重做（zustand `zundo`）。
- ✅ 方向键 1px（Shift = 10px）微调。
- ✅ `Ctrl+C/V/D` 复制/粘贴/副本。
- ✅ `Del/Backspace` 删除。
- ✅ `Esc` 取消选择。
- ✅ 每次 `onChange` 落历史栈（与阶段 1 文本输入行为一致）。
- ✅ 浏览器刷新后草稿从 `localStorage` 恢复（按项目 ID 分键，防抖 500ms）。

### 1.8 自动适配

- ✅ `fitMode = none`：不自动算 scale；用户手动缩放。
- ✅ `fitMode = width`：宽度自适应（`aw = clientWidth - 2*PAD_X - RULER`）。
- ✅ `fitMode = both`：等比适配（`min(aw/w, ah/h)`）。
- ✅ `ResizeObserver` 在画布尺寸变化时实时重算。
- ✅ 已知抖动：G2 `autoFit` 与编辑器 padding 耦合，编辑器改 padding 会出现一次 FPS 抖动；ShareView 只读不抖。

### 1.9 自动保存

- ✅ 顶部"保存"按钮 → `PUT /api/projects/{id}` 写 `canvasConfig` JSON。
- ✅ 错误捕获 → `message.error('保存失败')`。
- ⚠️ 已知：保存期间未禁用编辑按钮（多用户并发会冲突，v2 协同解决）。

---

## 2. 自动化验证产物

| 文件 | 说明 |
| --- | --- |
| `../../ScreenShot/stage1-m1-browser-verification-result.json` | Playwright 跑通的步骤结果摘要（v1 抽样） |
| `../../ScreenShot/datav-editor-overview.png` | 编辑器整体截图（带 10 个批量测试组件） |
| `../../ScreenShot/datav-editor-40pct.png` | 缩放 40% 下的画布视觉 |

---

## 3. 已知限制

- **Moveable 拖拽**（P2）：自动化抓取到组件内部内容而非 Moveable 把手，需人工复测（详见 `stage1-m1-editor-issues.md` 问题 3）。
- **数据面板字段映射 / 自动更新间隔 / 受控模式**：v1 不支持，v2 接入（PRD §4.2.5 v2 计划）。
- **react-moveable 0.56 警告**：`componentWillUpdate` 弃用；下版本升级到 0.57+。
- **G2 bundle 体积**：1.4MB gzip；v2 计划按 chart type 动态 import。

---

## 4. 复测步骤（人工）

1. 启动后端 `kanban-backend/start.bat`；启动前端 `cd kanban_web && npm run dev`。
2. 打开 `http://localhost:5173`，登录默认账号（如 `admin/admin`，以 `schema.sql` 种子为准）。
3. 选工作空间 → 新建看板 → 进入编辑器。
4. 按 1.2~1.9 复测，每项打勾；FPS 持续 ≥ 30。
5. 浏览器刷新 → 草稿是否恢复。
6. （可选）开启 React DevTools Profiler 录制一次拖拽，确认 re-render 范围合理。

---

## 5. 验收结论

- **通过**：阶段 1（M1）画布编辑器 MVP 满足需求 PRD §4.2 §4.4 §4.5，达成里程碑。
- **遗留**：1 项 P2（Moveable 拖拽需人工复测）。数据面板 8 类图 P0 已于 2026-07-07 收口。
