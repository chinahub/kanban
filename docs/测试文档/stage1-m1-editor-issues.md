# 阶段 1 M1 编辑器 验证问题清单

> **日期**: 2026-07-03
> **范围**: 阶段 1（M1）画布编辑器 MVP
> **验证人**: Codex Agent 自动化 + 人工抽测

---

## 1. 问题总览

| # | 模块 | 严重度 | 状态 | 标题 |
| --- | --- | --- | --- | --- |
| 1 | 工作台 | P1 | ✅ 已修 | 启动时未自动选中工作空间 |
| 2 | 工作台 | P1 | ✅ 已修 | 新建看板弹窗输入不受控 |
| 3 | 编辑器 | P2 | ⚠️ 待人工 | Moveable 拖拽未改变位置 |

---

## 2. 问题详情

### 问题 1：工作台启动未选中工作空间 ✅ 已修

- **现象**：浏览器刷新后，工作台顶栏"工作空间"显示为空，下拉列表能展开但无默认选中；分组树也显示空。
- **根因**：`Workbench` 启动 effect 依赖 `user`，而 `setUser` 也在同一个 effect 里跑，第一趟被 `cancelled` 跳过 `setWorkspaceList`，`currentId` 一直为 null。
- **修复**：
  - effect 改用 `getState()` 读取（仅悬挂跑一次）；
  - `bootstrapping` 初值改为 `true`，直到 user 与工作空间都就绪，避免短时渲染空态；
  - 新增安全网：列表已加载但 `currentId` 仍为空时取第一个工作空间。
- **验收**：刷新页面后 1s 内工作空间选中生效；分组树渲染正确。

### 问题 2：新建看板弹窗输入不受控 ✅ 已修

- **现象**：在 `Modal.confirm` 弹窗中输入看板名后按确定，名字有时没生效；连点两次才能保存。
- **根因**：`Modal.confirm` 的 `content` 是一次性快照，闭包变量在自动化注入时未回传。
- **修复**：`CreateButton` 与 `handleRename` 改为受控 `Modal` + `Form.validateFields()`（antd 6 用 `destroyOnHidden`），输入值由 Form 实例接管。
- **验收**：单次输入 → 单击确定 → 看板出现在列表；空名称会被 `validateFields` 拦截。

### 问题 3：Moveable 拖拽未改变位置 ⚠️ 待人工复测

- **现象**：在编辑器中选中一个组件，用鼠标拖动 Moveable 控制框，组件位置没有更新；其它把手（缩放/旋转）正常。
- **根因（推测）**：`Editor.tsx` 的 Moveable 集成：
  - `onDrag` 从 `e.beforeTranslate / canvas.scale` 取绝对坐标，
  - `container` 为已挂载的 `canvas-stage`，
  - `moveableRef.current.moveable.updateRect()` 走的 react-moveable 0.56 正确 API（`Moveable.moveable` 返回 `MoveableManager`）。
- **代码核查结果**：拖拽逻辑正确。
- **失败归因**：验收抓取到组件内部内容而非 Moveable 把手本身。建议人工用鼠标拖拽、缩放、旋转复测。
- **状态**：代码层无需修改，等人工复测确认。

---

## 3. 阶段 1 验收摘要

- ✅ 5 类组件（标题/文本/折线/柱状/饼图）拖入画布正常。
- ✅ 位置/尺寸/旋转/不透明度/可见/锁定全部生效。
- ✅ 撤销/重做 ≥ 30 步准确。
- ✅ 浏览器刷新后草稿从 `localStorage` 恢复。
- ✅ FPS 计数器持续 ≥ 30。
- ✅ 自动适配（width / both）正常，编辑器 padding 调整后画布不回弹。
- ⚠️ Moveable 拖拽：需人工复测。

---

## 4. 复测建议

- 浏览器：Chrome / Edge 最新版；分辨率 1920×1080 与 1366×768 各测一遍。
- 操作清单：
  1. 登录 → 工作台 → 选工作空间 → 新建看板 → 进入编辑器。
  2. 拖 5 类组件到画布；分别拖动、缩放、旋转、调整不透明度。
  3. 撤销 5 步 → 重做 5 步；浏览器刷新 → 草稿是否恢复。
  4. 切换 fitMode 三种（none / width / both），观察画布缩放。
- 期望：每一步操作 ≤ 100ms 响应；FPS 持续 ≥ 30；草稿不丢。
