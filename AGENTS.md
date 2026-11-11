# AGENTS.md

kanban 平台项目级 AI Agent 约定。本文件始终加载，控制在 200 行以内。

## 项目概述

DataV 风格的可视化大屏看板平台（对标阿里云 DataV）。支持 PC 大屏 + 移动端看板，零/低代码拖拽搭建，多数据源接入（MySQL/PG/API/静态），主题套件，快照发布分享，AI 智能生成。

| 项 | 值 |
|---|---|
| 后端框架 | Java 25 + Maven + summer-boot 4.2.0（`cn.jiebaba.summer`，非 Spring Boot） |
| 前端框架 | React 18 + TypeScript + Vite + Ant Design 5 + Zustand + G2 |
| 数据库 | PostgreSQL（当前连 Supabase） |
| JDK | `D:\jdk\jdk-25.0.4`（构建时 `JAVA_HOME` 须指向此路径） |
| Maven | `D:\maven-3.9.15`，本地仓库 `D:\mvn_repository` |
| 后端端口 | 8080 |
| summer 文档 | `E:\summer_workspace\docs\使用文档\`（orm.md、aop.md 等） |

## 目录结构

```
kanban_workspace/
├── kanban-backend/        # 后端 → kanban-backend/AGENTS.md
├── kanban_web/            # 前端 → kanban_web/AGENTS.md
├── docs/                  # 人类文档（需求/开发/测试）→ docs/README.md
├── ScreenShot/            # DataV 参考截图
└── tmp/                   # 工具脚本（非项目产物）
```

## 常用命令

```bash
# 一键启停（推荐，含后端 clean 打包 + WSL pgvector17 自动保活）
powershell -ExecutionPolicy Bypass -File scripts\dev.ps1 -Action start|stop|restart [-Service backend|frontend|all] [-NoBuild]

# 后端构建（脚本内部即此命令）
export JAVA_HOME=D:/jdk/jdk-25.0.4
cd kanban-backend && mvn clean package

# 后端启动（旧入口，等价于 dev.ps1 -Action start -Service backend -NoBuild）
cd kanban-backend && start.bat
```

编译产物：`kanban-backend/target/kanban-backend-boot.jar`（summer-pack-maven-plugin 打包，Main-Class `cn.jiebaba.summer.loader.JarLauncher`，Start-Class `cn.kanban.Application`；`start.bat` 启动此 jar）。

## 模块速览

| 模块 | 目录 | 职责 |
|------|------|------|
| kanban-backend | `kanban-backend/` | REST API、鉴权、数据库 CRUD、AI 助手、快照分享 |
| kanban_web | `kanban_web/` | 编辑器、大屏预览、工作台、分享页 |
| docs | `docs/` | PRD 需求、开发指南、测试报告 |

## 编码规范（强制）

### 文本文件编码

创建或修改任何文本文件（`.java` `.xml` `.yml` `.json` `.properties` `.md` `.ts` `.tsx` `.sh`）时必须遵守：

- **编码：UTF-8 无 BOM** — 禁止前导字节 `EF BB BF`
- **行尾：LF（`\n`）** — 禁止 CRLF（`.bat` 等必须 CRLF 的除外）
- **文件结尾：恰好一个换行符** — 最后一行保留单个 `\n`，禁止末尾多余空行
- **行内空白：禁止行尾多余空格**；缩进遵循各文件风格（Java 用 4 空格，TS/TSX 用 2 空格）

### Java 方法注释

Java 方法体超过 20 行必须在方法上方添加注释：

- **注释使用中文**（专有名词、API 名称、标识符可保留原文）
- **优先使用 JavaDoc（`/** ... */`）**；行内注释用 `//`
- 既有英文注释须翻译为中文
- 代码示例、命令、配置键名等不属于注释文案，不在此限

### 校验

提交前确认：无 BOM、LF 行尾、单换行结尾。仓库已配置 `.editorconfig` / `.gitattributes` 强制约束。

> 详细横切规则见 `.claude/rules/coding-standards.md`（path-scoped，触碰 `.java` / `.xml` / `.yml` 等文件时自动加载）。

## AI Agent 文档分层

| 层级 | 文件 | 加载时机 | 用途 |
|------|------|---------|------|
| 根宪法 | `AGENTS.md`（本文件） | 始终加载 | 项目事实 + 通用规则 |
| 模块约定 | `kanban-backend/AGENTS.md` | 触碰目录时 | 后端架构、数据库、API |
| 模块约定 | `kanban_web/AGENTS.md` | 触碰目录时 | 前端架构、状态管理、组件 |
| 路径规则 | `.claude/rules/*.md` | 匹配文件 paths 时 | 横切关注点（编码规范、Java 注释等） |
| 工作流 | `.claude/skills/*.md` | 启动时加载名字+描述，调用时加载正文 | summer-boot 开发要点等流程 |
| 人类文档 | `docs/` | 手动查阅 | PRD 需求、开发指南、测试报告 |
