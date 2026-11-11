# P0 回归复测报告（2026-08-16）

> 范围：开发进度总览 P0 全部条目 + 本轮新功能（交互 Tab / 主题套件 / 移动端项目 / LADV）的运行时验证。
> 环境：后端 8080（连本地 WSL docker pgvector17 `kanban` 库）、前端 dev server 5173、
> 浏览器自动化 kimi-webbridge（session `library-panel-verify`），脚本在 `tmp/f_verify_*.py`。
> 结果：**全部通过（API 12 项 + 浏览器 30+ 项）**。

## 1. 数据链路（阶段 3 复测）

| 项 | 方法 | 结果 |
| --- | --- | --- |
| 数据源 fetch - static | API 建源 + `POST /datasources/{id}/fetch` | ✅ 2 行 |
| 数据源 fetch - api | 指向 `GET localhost:8080/health` | ✅ 1 行（对象包装为数组） |
| 数据源 fetch - mysql | WSL docker mysql8 `kanban_test.sales` | ✅ 3 行 |
| 数据源 fetch - pg | 本地 kanban 库 `VALUES` 查询 | ✅ 2 行 |
| 数据集 refresh → 组件注入 → 图表重绘 | API 建数据集（绑 mysql 源）+ refresh；浏览器 store 注入 bar1 | ✅ 3 行注入，G2 canvas 重绘 |
| 过滤器正常执行 | `return data.filter(d => d.value > 150)` 绑定 bar1 | ✅ 图表正常渲染 |
| 过滤器报错降级 | `throw new Error("boom")` 绑定 bar1 | ✅ 降级原始数据，仅影响该组件 |

## 2. 发布与分享（阶段 4 复测）

| 项 | 方法 | 结果 |
| --- | --- | --- |
| 无密码分享链接免登录访问 | 浏览器直接开 `/s/{token}` | ✅ |
| 密码错误拦截 | access 带错误密码 | ✅ 403「访问密码错误」 |
| 密码正确放行 | access 带正确密码 | ✅ 200 + config |
| 过期链接拦截 | DB 改 `expire_at` 到过去 | ✅ meta/access 均 404「分享链接已失效或过期」 |

## 3. 分享页 `{{var.xx}}` 插值（A1 修复验证）

- 原问题：ShareView 从不加载全局变量，插值失效。
- 修复：`POST /api/share/{token}` 返回 `variables`（按项目实时查 `global_variable`），前端灌入 `useVariableStore`。
- 验证：项目 1 建变量 `title=实时变量值ABC`，文本组件 `标题：{{var.title}}` → 发布 → 分享页渲染「标题：实时变量值ABC」。✅
- 备注：变量取**实时值**、组件配置取**快照**，与快照冻结语义有轻微偏差，属可接受取舍。

## 4. Moveable 拖拽/缩放/旋转（测试文档问题 #3）

- 拖拽：合成鼠标事件拖动 txt1，x/y 正确变化 ✅
- 缩放：拖东边控制点，width 正确变化 ✅
- 旋转：拖 `.moveable-rotation-control`，rotate 正确变化 ✅
- **顺带发现并修复真实 bug**：`editorStore.endInteraction` 调 zundo `_handleSet` 时压入的是裸 config（未按 partialize 包成 `{config}`），导致拖拽/缩放/旋转的撤销条目损坏（undo 合并裸键到 store 顶层，config 不变，表现为撤销无效）。修复后三种交互均可单步撤销还原。✅

## 5. 性能

- 93 个组件（基线 43 + 批量 50）：FPS 稳定 60（要求 ≥ 30）。✅

## 6. 新功能验证

| 功能 | 验证 | 结果 |
| --- | --- | --- |
| 交互 Tab | 预览模态内：点击文本 → `setVariable` 联动插值文本更新；点击开关 → `toggleVisible` 隐藏/恢复图表；关闭预览后变量还原 | ✅ |
| 交互 - 分享页 | 分享页内 setVariable / toggleVisible 同样生效 | ✅ |
| 主题套件 | 套用「紫夜」：背景 #150826 + 全部组件主色 #9254de + themeId 落盘；单步撤销完整还原 | ✅ |
| 移动端项目 | API 创建 MOBILE 项目画布 375×667；编辑器打开 footer 显示 375×667 | ✅ |
| LADV 未配 Key | `POST /api/projects/{id}/ladv` 返回明确错误「LADV 未配置视觉模型…」 | ✅ |
| LADV 真实生成 | 待用户提供视觉模型 Key（GLM-4V / Qwen-VL 等 OpenAI 兼容端点）后联调 | ⏳ |

## 截图

`ScreenShot/测试截图/stage-p0-regression-20260816/`：预览交互、分享页交互、93 组件 FPS、移动动画布。

## 遗留

- LADV 真实模型联调（等 Key）。
- 移动端触控优化（v2）。
- 旧 localStorage 草稿里修复前的坏撤销条目：首次 undo 时会做一次无害的裸键合并，之后正常；如需彻底干净可清 `kanban:editor:{projectId}` 草稿。
