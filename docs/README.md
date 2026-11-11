# kanban 平台 文档总览

本目录汇总 kanban 平台的产品、需求、开发与测试文档。

---

## 目录结构

```
docs/
├── README.md                    # 本文件（文档总览）
├── 需求文档/
│   └── requirements.md          # PRD：项目概述、术语、架构、功能/非功能需求、验收、规划
├── 开发文档/
│   ├── 开发进度总览.md            # 开发进度总览：阶段进度勾选 + P0/P1/P2 待办（风格参考 summer roadmap）
│   ├── development.md           # 工程实施指南：现状基线、阶段 0-4 复盘、阶段 5/6 规划
│   ├── G2使用文档.md              # G2 5 图表库在项目中的使用约定与 10 类图写法
│   ├── DataV组件分析工具.md       # DataV 官方组件库对标分析工具（tmp/datav_analyze.py）使用与结论
│   └── DataV组件特性表.md         # 189 个 DataV 组件特性表 + 自定义组件注册 schema（脚本生成，勿手改）
└── 测试文档/
    ├── stage1-m1-editor-issues.md          # 阶段 1 M1 编辑器验证问题清单
    └── stage1-m1-editor-verification.md    # 阶段 1 M1 编辑器验收报告
```

---

## 快速开始

1. **看产品形态**：先读 [`需求文档/requirements.md`](./需求文档/requirements.md) §1（项目概述）+ §4（功能需求）。
2. **看开发推进**：[`开发文档/开发进度总览.md`](./开发文档/开发进度总览.md)（当前进度与待办）+ [`开发文档/development.md`](./开发文档/development.md) §0（现状基线）+ §1（推进路径）。
3. **写图表组件**：[`开发文档/G2使用文档.md`](./开发文档/G2使用文档.md) §4（10 类图写法）。
4. **看历史验收**：[`测试文档/stage1-m1-editor-issues.md`](./测试文档/stage1-m1-editor-issues.md) + [`测试文档/stage1-m1-editor-verification.md`](./测试文档/stage1-m1-editor-verification.md)。

---

## 文档维护

- 编码：UTF-8 无 BOM；行尾 LF；单文件结尾恰好一个换行。
- 命名：中文目录与文件名，方便与团队语言一致。
- 修订：每个文档底部"修订记录"小节记录版本与日期。
- 备份：被替换的原档以 `.triple-mojibake.2026-07-07.bak` 后缀保留在原路径下。

---

## AI Agent 使用

本项目遵循 Anthropic 官方"七种自定义方式"五层文档分层结构，AI Agent 可高效理解项目：

| 层级 | 文件 | 用途 |
|------|------|------|
| 根宪法 | [`AGENTS.md`](../AGENTS.md) | 项目事实 + 编码规范（始终加载） |
| 模块约定 | [`kanban-backend/AGENTS.md`](../kanban-backend/AGENTS.md) | 后端架构、API、数据库 |
| 模块约定 | [`kanban_web/AGENTS.md`](../kanban_web/AGENTS.md) | 前端架构、状态管理、组件 |
| 路径规则 | [`.claude/rules/`](../.claude/rules/) | 横切关注点（编码规范、Java 注释） |
| 工作流 | [`.claude/skills/`](../.claude/skills/) | summer-boot 开发要点等流程 |

### 对于 AI Agent 开发者

- 编辑 Java 代码时注意：[`summer-boot-dev skill`](../.claude/skills/summer-boot-dev.md) 汇总了框架关键差异
- 所有代码文件遵守：[`coding-standards rule`](../.claude/rules/coding-standards.md)（UTF-8 无 BOM、LF 行尾）
- Java 注释标准：[`java-comments rule`](../.claude/rules/java-comments.md)（中文注释、超 20 行方法必须注释）
- summer 框架官方文档：`E:\summer_workspace\docs\使用文档\`

---

## 维护人

- 需求：产品 + Codex 共建
- 开发：后端 `kanban-backend/`、前端 `kanban_web/`
- 测试：自动化（Playwright）+ 人工抽测
- AI 文档结构：见上方 "AI Agent 使用" 章节，遵循五层分层
