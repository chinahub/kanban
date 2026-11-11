# DataV 组件分析工具

> 用途：通过 Playwright 复用本机 Chrome 登录阿里云 DataV 编辑器，采集官方组件库清单、网络请求与组件 bundle 代码结构，为 kanban 组件库建设提供对标数据。
> 脚本位置：`tmp/datav_analyze.py`（工具脚本，非项目产物）；产物目录：`tmp/datav-analysis/`。

## 环境准备

```bash
# 一次性：创建虚拟环境并安装 playwright（已建好，位于 tmp/pw-venv）
cd tmp
python -m venv pw-venv
./pw-venv/Scripts/python.exe -m pip install playwright
# 不需要 playwright install（脚本调用本机已装的 Chrome，channel="chrome"）
```

要求：本机装有 Chrome（`C:\Program Files\Google\Chrome\Application\chrome.exe`），Python 3.10+。

## 使用方法

```bash
cd tmp

# 1. 全量采集：组件清单 + 请求日志 + 截图 + 登录态导出
./pw-venv/Scripts/python.exe datav_analyze.py collect

# 2. 下载并分析单个组件 bundle（依赖/Cube 模块/生命周期方法）
./pw-venv/Scripts/python.exe datav_analyze.py bundle ml-gauge@5.0.15
./pw-venv/Scripts/python.exe datav_analyze.py bundle @xhzy-anime/double-barchart@0.0.4

# 3. 创建/重建 Chrome 配置副本（通常不用手动跑，collect 会自动做）
./pw-venv/Scripts/python.exe datav_analyze.py init-profile --refresh
```

`collect` 可选参数：`--editor-url <url>`（默认 `https://datav.aliyun.com/v/editor/146885`）、`--wait-login <分钟>`（默认 10）、`--headless`、`--chrome-user-data <路径>`。

## 工作原理

1. **配置副本**：Chrome 136+ 禁止对默认配置目录开启远程调试（报 `DevTools remote debugging requires a non-default data directory`）。脚本把登录所需关键配置（`Local State`、`Default/Network`（Cookie）、`Local Storage`、`Session Storage`、`IndexedDB`、`Extension State`、`Preferences` 等，共约 55MB，跳过数 G 缓存）复制到 `tmp/chrome-profile`，再用 `launch_persistent_context` 启动。Cookie 解密依赖本机同一 Windows 用户的 DPAPI，复制后仍可用。
2. **登录态**：阿里云登录 Cookie 是**会话级**，Chrome 完全关闭后失效。副本中无登录态时，`collect` 弹出窗口等待手动登录（扫码/账号密码），成功后导出全量 Cookie 到 `cookies.json`；后续运行自动注入该文件，实现免登录。Cookie 过期后需重新手动登录一次。
3. **组件清单**：编辑器加载时请求 `GET /api/v4/resources/comPackages?workspaceId=<id>&i18n=zh_CN`，脚本监听该响应并整理为 `official-components.json`（9 个包、189 个组件的 name/displayName/version/categories/thumbnail/quickStyles）。面板分类由组件的 `category` 标签（如 `DataV-6:regular_column`）在客户端归组。
4. **组件 bundle**：画布组件按 `name@version` 从 npm 风格 CDN 加载：`https://resource.datav.aliyun.com/resources/com/<name>/<version>?m=1&combine=true&env=editor`，单文件打包组件本体与全部 npm 依赖，模块格式为 Cube（阿里自研 AMD 风格）。`bundle` 子命令无需登录即可下载分析。

## 产物说明（tmp/datav-analysis/）

| 文件 | 内容 |
|---|---|
| `official-components.json` | 结构化组件清单（对标数据，扩充组件库时直接使用） |
| `comPackages-raw.json` | 组件包接口原始响应 |
| `requests.json` | 编辑器全量网络请求日志 |
| `editor.png` | 编辑器截图 |
| `cookies.json` | 导出的登录态（含敏感信息，勿提交/外传） |
| `bundles/` | 下载过的组件 bundle 及分析 |
| `ANALYSIS.md` | 首次分析的调查报告（架构结论） |

## 关键结论（首次分析，详见 ANALYSIS.md）

- 官方组件库 9 包 189 组件；面板七个一级分类（图表/地图/信息/表格/控件/媒体/其他）与 `DataV-6:*` category 标签一一对应
- 图表类组件基于 `@antv/g2plot@2.4.31`（G2 v4 系）+ lodash + d3-format；DOM/媒体类基于 jQuery + bcore 事件
- 组件类生命周期：`init / initChart / render / resize / data / mergeConfig / compatibleCfg / getColorableConfig / getThemableConfig / destroy`
- 每个组件独立语义化版本，支持 `quickStyle` 快捷样式预设（黑/白主题变体）

## 注意事项

- 运行 `collect` 前需完全退出本机 Chrome（首次创建副本时要复制配置，运行中的 Chrome 会锁文件）
- 脚本运行期间不要操作弹出的 Chrome 窗口
- `chrome-profile/` 与 `cookies.json` 含登录态，仅本机使用，不要提交到任何仓库（`tmp/` 非项目产物目录）

## 修订记录

| 版本 | 日期 | 说明 |
|---|---|---|
| v1.0 | 2026-07-27 | 初版：整合采集流程为 `datav_analyze.py`（collect / bundle / init-profile 三个子命令） |
