# P2 阶段（v2 数据链路增强）复测报告 — 2026-08-16

## 范围

开发进度总览 P2 五项：字段映射、自动更新间隔、受控模式、过滤器沙箱升级（Web Worker）、撤销/重做 DataPanel 同步修复。

## 环境

- 后端：`kanban-backend-boot.jar` @ 8080，连 WSL 本地 PostgreSQL（kanban 库）
- 前端：Vite dev server @ 5173
- 浏览器自动化：kimi-webbridge（session `library-panel-verify`），脚本 `tmp/p2_verify.py`
- 账号 admin，工作空间 1，测试项目 `/editor/1`

## 结果汇总：11/11 通过（另 API 侧 4 项）

### P2-1 字段映射（API 侧验证）

| 用例 | 结果 |
|---|---|
| 静态数据源中文字段名（月份/销量）建库无乱码 | PASS |
| 数据集配置 `transform.renames`（月份→name、销量→value），refresh 后数据键变为 name/value | PASS |
| transform 在 DB 中以 UTF-8 正确存取 | PASS |
| 编辑时 transform 传空串，后端置 null（清空映射路径） | PASS |

前端入口：`DataSourceDrawer` 数据集弹窗（新建/编辑）三个映射输入框，编辑时从 renames 反填，列表加"映射"按钮。测试数据（数据集/数据源）验证后已删除。

### P2-2 组件数据自动更新间隔（浏览器 + API）

| 用例 | 结果 |
|---|---|
| 组件设 `dataSetId` + `autoRefreshSec=2`，5.5s 内数据集 `lastRefreshAt` 被刷新 | PASS |
| 刷新数据（映射后 name/value）注入组件 data | PASS |

不记撤销历史（zundo pause/resume）、拖拽交互中跳过当次；分享页保持快照语义。

### P2-3 过滤器受控模式（浏览器）

| 用例 | 结果 |
|---|---|
| 开启受控后 API 改代码 + reload，生效快照保持旧代码（不实时生效） | PASS |
| 手动"应用"后生效代码更新为最新 | PASS |

受控标记与快照存 localStorage（`kanban:filterControlled`）；FilterDrawer 列表显示 受控/待应用 标签 + 应用按钮；删除过滤器时清理受控状态。

### P2-4 过滤器沙箱升级 Web Worker（浏览器）

| 用例 | 结果 |
|---|---|
| 正常过滤器在 Worker 中执行，图表渲染 | PASS |
| 报错过滤器降级原始数据，图表仍渲染 | PASS |
| 死循环过滤器（`while(true){}`）3s 超时 terminate，页面不卡死、图表降级渲染 | PASS |

`runFilter` 同步 API 移除，三处消费方（ComponentRenderer / DataPanel 预览 / FilterDrawer 预览）全部走 `runFilterAsync`。`vite build` 通过，worker 正常打包。

### P2-5 撤销/重做 DataPanel 同步（浏览器）

| 用例 | 结果 |
|---|---|
| 外部（store）改 data 后静态数据 textarea 同步显示 | PASS |
| 撤销后 textarea 跟随回退 | PASS |
| （实现约束）用户正在输入的非法 JSON 不被覆盖 | 实现内保证 |

## 遗留说明

- 复测期间编辑器 localStorage 草稿（`kanban:editor:1`）被测试脚本改动（bar1 数据为映射测试数据），与此前各阶段测试一致，仅影响测试项目草稿，服务端 canvasConfig 未变。
- LADV 真实生成联调仍等视觉模型 Key，不属于 P2 范围。
