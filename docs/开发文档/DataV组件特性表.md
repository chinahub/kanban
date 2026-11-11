# DataV 组件特性表

> 本文件由 `tmp/datav_analyze.py table` 于 2026-07-27 15:53 生成，请勿手改。
> 数据源：`tmp/datav-analysis/comPackages-raw.json`（重新采集后执行同一命令刷新）。
> 技术栈列：无标注 = 已下载 bundle 实测；带"（推断）" = 按名称前缀/包推断。

## 1. 组件表字段设计（自定义组件注册 schema）

| 字段 | 说明 | 取值/规范 |
|---|---|---|
| `name` | 组件代码名，全局唯一标识 | kebab-case（如 `ml-gauge`）或 `@scope/name` |
| `displayName` | 面板显示名 | 中文，如 仪表盘 |
| `package` | 所属组件包 | 官方 9 包之一；自定义组件建议独立包名 |
| `version` | 组件自身语义化版本 | `x.y.z`，独立于编辑器版本演进 |
| `c1` / `c2` | 一级/二级分类 | 一级：图表/地图/信息/表格/控件/媒体/其他；二级如 柱状图/条形图 |
| `stack` | 渲染技术栈 | G2Plot 2.x / ECharts 3.x / ECharts-GL / GI 地图 / DOM 系 |
| `comType` | 组件类型 | `UI` 独立组件；`子组件` 依附父组件（如地图图层） |
| `dataPanel` | 是否接数据源 | 图表/地图/表格=是，信息=部分，其余=否（推断） |
| `theme` / `i18n` | 主题适配 / 国际化 | 对应官方 `supportTheme` / `supportI18n` 标签 |
| `quickStyle` | 快捷样式预设数 | 0 = 不支持；>0 提供黑白主题等预设 |
| `level` | 权限等级 | 免费 / 高级 / 尊享 |
| `thumbnail` | 面板卡片缩略图 | OSS 图片 URL |

组件类生命周期约定（bundle 实测）：`init / initChart / render / resize / data / mergeConfig / destroy`，
主题组件另有 `getColorableConfig / getThemableConfig / compatibleCfg`（旧配置兼容）。

## 2. 总体特性统计

组件总数：**189**（9 个组件包）

### 一级分类分布

| 一级分类 | 组件数 |
|---|---|
| 图表 | 100 |
| 控件 | 32 |
| 媒体 | 19 |
| 地图 | 18 |
| 信息 | 14 |
| 表格 | 5 |
| ECharts | 1 |

### 技术栈分布

| 技术栈 | 组件数 |
|---|---|
| DOM/jQuery（推断） | 44 |
| G2Plot 2.x（推断） | 31 |
| ECharts 3.x | 27 |
| 3D 引擎（推断） | 24 |
| animejs 动画（推断） | 17 |
| DOM 控件 | 12 |
| DOM 交互（推断） | 11 |
| DOM（推断） | 9 |
| Hanabi（推断） | 3 |
| DOM/jQuery | 3 |
| ECharts-GL | 2 |
| G2Plot 2.x | 2 |
| GI 地图（推断） | 2 |
| DOM/jQuery+animejs | 1 |
| GI 地图（高德） | 1 |

### 其他维度

| 维度 | 分布 |
|---|---|
| 权限等级 | 免费 93，高级 65，尊享 31 |
| 组件类型 | UI 167，子组件 22 |
| 主题适配 | 101/189 |
| 国际化 | 148/189 |
| 快捷样式 | 74/189 |

## 3. 完整组件表

| 组件 | name | 版本 | 所属包 | 一级 | 二级 | 技术栈 | 类型 | 数据 | 主题 | i18n | 快样 | 等级 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 三维折线图 | `line-3d` | 1.0.3 | 3D组件包 | 图表 | 折线图 | DOM/jQuery（推断） | UI | 是 | — | ✓ | 3 | 高级 |
| 3D 柱状图 | `ml-bar-3d` | 0.2.0 | 3D组件包 | 图表 | 柱状图 | ECharts-GL | UI | 是 | ✓ | ✓ | 5 | 高级 |
| od飞线层 | `@datav-3d/datav-3dplane-od-flyingline` | 2.0.12 | 3D组件包 | 地图 | — | 3D 引擎（推断） | 子组件 | 是 | ✓ | — | — | 尊享 |
| 动态轨迹线层 | `@datav-3d/datav-engine-flyinglines` | 1.0.3 | 3D组件包 | 地图 | — | 3D 引擎（推断） | 子组件 | 是 | ✓ | — | — | 高级 |
| 区域热力层 | `@datav-3d/datav-3dplane-area` | 2.0.27 | 3D组件包 | 地图 | — | 3D 引擎（推断） | 子组件 | 是 | ✓ | — | — | 尊享 |
| 呼吸气泡层 | `@datav-3d/datav-3dplane-bubbles` | 2.0.16 | 3D组件包 | 地图 | — | 3D 引擎（推断） | 子组件 | 是 | ✓ | — | — | 尊享 |
| 图标散点层 | `@datav-3d/datav-3dplane-scatter-image` | 2.0.22 | 3D组件包 | 地图 | — | 3D 引擎（推断） | 子组件 | 是 | ✓ | — | — | 尊享 |
| 图片说明 | `@datav-3d/datav-engine-illustration` | 0.0.25 | 3D组件包 | 地图 | — | 3D 引擎（推断） | 子组件 | 是 | — | — | — | 尊享 |
| 地理围栏 | `@datav-3d/datav-engine-geofence` | 1.0.1 | 3D组件包 | 地图 | — | 3D 引擎（推断） | 子组件 | 是 | ✓ | — | — | 高级 |
| 巡航标记 | `@datav-3d/datav-engine-cruiser-marker` | 0.0.15 | 3D组件包 | 地图 | — | 3D 引擎（推断） | 子组件 | 是 | — | — | — | 尊享 |
| 文字标签 | `@datav-3d/datav-engine-sprite-text` | 0.0.8 | 3D组件包 | 地图 | — | 3D 引擎（推断） | 子组件 | 是 | ✓ | — | — | 高级 |
| 柱状层 | `@datav-3d/datav-3dplane-bar` | 2.0.19 | 3D组件包 | 地图 | — | 3D 引擎（推断） | 子组件 | 是 | ✓ | — | — | 尊享 |
| 热力层 | `@datav-3d/datav-engine-heatmap` | 0.0.21 | 3D组件包 | 地图 | — | 3D 引擎（推断） | 子组件 | 是 | — | — | — | 尊享 |
| 粒子 | `@datav-3d/datav-engine-particle` | 0.0.20 | 3D组件包 | 地图 | — | 3D 引擎（推断） | 子组件 | 是 | ✓ | — | — | 免费 |
| 蜂窝热力层 | `@datav-3d/datav-3dplane-honeycomb` | 2.0.23 | 3D组件包 | 地图 | — | 3D 引擎（推断） | 子组件 | 是 | ✓ | — | — | 尊享 |
| 雷达扫描 | `@datav-3d/datav-engine-radar` | 0.0.13 | 3D组件包 | 地图 | — | 3D 引擎（推断） | 子组件 | 是 | — | — | — | 尊享 |
| 3D平面地图 | `@datav-3d-v3/datav-3dplane` | 3.3.19 | 3D组件包 | 地图 | 地图 | 3D 引擎（推断） | UI | 是 | — | ✓ | 6 | 尊享 |
| 业务指标趋势 | `indicator-trend` | 0.0.22 | DataV 官方库 | 信息 | 信息 | DOM/jQuery（推断） | UI | 部分 | ✓ | ✓ | 3 | 免费 |
| 二维码 | `qrcode` | 0.0.9 | DataV 官方库 | 信息 | 信息 | DOM/jQuery（推断） | UI | 部分 | ✓ | ✓ | — | 免费 |
| 倒计时 | `countdown` | 0.1.0 | DataV 官方库 | 信息 | 信息 | DOM/jQuery（推断） | UI | 部分 | — | ✓ | 5 | 免费 |
| 多行文本 | `paragraph` | 2.0.4 | DataV 官方库 | 信息 | 信息 | DOM/jQuery（推断） | UI | 部分 | — | ✓ | — | 免费 |
| 数字翻牌器 | `number-title-flop` | 2.3.3 | DataV 官方库 | 信息 | 信息 | DOM/jQuery（推断） | UI | 部分 | ✓ | ✓ | 10 | 免费 |
| 文字标签 | `text-label` | 1.2.13 | DataV 官方库 | 信息 | 信息 | DOM/jQuery（推断） | UI | 部分 | — | ✓ | — | 免费 |
| 时间器 | `timer` | 2.1.0 | DataV 官方库 | 信息 | 信息 | DOM/jQuery（推断） | UI | 部分 | — | ✓ | 9 | 免费 |
| 状态卡片 | `status-card` | 3.0.0 | DataV 官方库 | 信息 | 信息 | DOM/jQuery（推断） | UI | 部分 | — | ✓ | 5 | 免费 |
| 跑马灯 | `marquee` | 1.0.1 | DataV 官方库 | 信息 | 信息 | DOM/jQuery（推断） | UI | 部分 | — | ✓ | — | 免费 |
| 转盘抽奖 | `@lottery/turntable-lottery` | 0.0.13 | DataV 官方库 | 信息 | 信息 | DOM（推断） | UI | 部分 | — | ✓ | — | 免费 |
| 通用标题 | `main-title` | 2.0.4 | DataV 官方库 | 信息 | 信息 | DOM/jQuery | UI | 部分 | — | ✓ | 10 | 免费 |
| 锦鲤翻牌器 | `@lottery/single-lottery` | 1.0.1 | DataV 官方库 | 信息 | 信息 | DOM（推断） | UI | 部分 | — | ✓ | — | 免费 |
| 锦鲤翻牌器列表 | `@lottery/lottery-list` | 1.0.1 | DataV 官方库 | 信息 | 信息 | DOM（推断） | UI | 部分 | — | ✓ | — | 免费 |
| 抽奖轮播图 | `@lottery/carousel-img` | 1.0.4 | DataV 官方库 | 图表 | — | DOM（推断） | UI | 是 | — | ✓ | — | 高级 |
| 词云 | `ml-g-cloud` | 5.1.18 | DataV 官方库 | 图表 | 信息 | G2Plot 2.x | UI | 是 | ✓ | ✓ | 5 | 免费 |
| 关系网络 | `force-image` | 1.2.14 | DataV 官方库 | 图表 | 关系图 | DOM/jQuery（推断） | UI | 是 | — | ✓ | — | 免费 |
| 旭日图 | `ml-sunburst` | 5.2.8 | DataV 官方库 | 图表 | 关系图 | G2Plot 2.x（推断） | UI | 是 | ✓ | ✓ | 5 | 免费 |
| 流程图 | `flowsheet` | 0.0.10 | DataV 官方库 | 图表 | 关系图 | DOM/jQuery（推断） | UI | 是 | ✓ | ✓ | — | 免费 |
| 水波图 | `water-wave` | 5.0.4 | DataV 官方库 | 图表 | 其他 | DOM/jQuery（推断） | UI | 是 | ✓ | ✓ | 7 | 免费 |
| 二维图标层 | `@datav-3dplane-v4/datav-3d-plane-scatter-image` | 1.0.3 | DataV 官方库 | 图表 | 分析图表 | 3D 引擎（推断） | 子组件 | 是 | — | ✓ | — | 尊享 |
| 动态轨迹层 | `@datav-3dplane-v4/datav-3d-plane-map-line` | 1.0.4 | DataV 官方库 | 图表 | 分析图表 | 3D 引擎（推断） | 子组件 | 是 | — | ✓ | — | 尊享 |
| 区域热力层 | `@datav-3dplane-v4/datav-3d-plane-map-areaheat` | 1.0.27 | DataV 官方库 | 图表 | 分析图表 | 3D 引擎（推断） | 子组件 | 是 | — | — | 5 | 尊享 |
| 单点柱状图 | `@datav-3dplane-v4/datav-3dplane-map-bar` | 0.0.25 | DataV 官方库 | 图表 | 分析图表 | 3D 引擎（推断） | 子组件 | 是 | — | — | 8 | 尊享 |
| 呼吸气泡图 | `@datav-3dplane-v4/datav-3dplane-map-bubble` | 0.0.22 | DataV 官方库 | 图表 | 分析图表 | 3D 引擎（推断） | 子组件 | 是 | — | — | 8 | 尊享 |
| 柱状热力层 | `@datav-3dplane-v4/datav-3d-plane-map-grid` | 1.0.10 | DataV 官方库 | 图表 | 分析图表 | 3D 引擎（推断） | 子组件 | 是 | — | ✓ | 8 | 尊享 |
| 标签层 | `@datav-3dplane-v4/datav-3d-plane-map-label` | 1.0.5 | DataV 官方库 | 图表 | 分析图表 | 3D 引擎（推断） | 子组件 | 是 | — | — | — | 尊享 |
| 玉珏图 | `arc-bar` | 5.5.1 | DataV 官方库 | 图表 | 分析图表 | DOM/jQuery（推断） | UI | 是 | ✓ | ✓ | 9 | 免费 |
| 矩形树图 | `ml-treemap` | 0.0.6 | DataV 官方库 | 图表 | 分析图表 | GI 地图（推断） | UI | 是 | ✓ | ✓ | — | 免费 |
| 飞线层 | `@datav-3dplane-v4/datav-3d-plane-map-odline` | 1.0.21 | DataV 官方库 | 图表 | 分析图表 | 3D 引擎（推断） | 子组件 | 是 | — | — | 8 | 尊享 |
| 区域图 | `ml-area-basic` | 5.1.16 | DataV 官方库 | 图表 | 区域图 | G2Plot 2.x（推断） | UI | 是 | ✓ | ✓ | 8 | 免费 |
| 子弹图 | `ml-bullet` | 5.1.17 | DataV 官方库 | 图表 | 子弹图 | G2Plot 2.x（推断） | UI | 是 | ✓ | ✓ | 7 | 免费 |
| 三维折线图 | `line-3d` | 1.0.3 | DataV 官方库 | 图表 | 折线图 | DOM/jQuery（推断） | UI | 是 | — | ✓ | 3 | 高级 |
| 区域翻牌器 | `ml-area-counter` | 3.1.10 | DataV 官方库 | 图表 | 折线图 | G2Plot 2.x（推断） | UI | 是 | — | ✓ | — | 免费 |
| 双轴折线图 | `ml-line-double` | 3.0.27 | DataV 官方库 | 图表 | 折线图 | G2Plot 2.x（推断） | UI | 是 | — | ✓ | — | 免费 |
| 折线图 | `ml-line-basic` | 5.6.6 | DataV 官方库 | 图表 | 折线图 | G2Plot 2.x（推断） | UI | 是 | ✓ | ✓ | 8 | 免费 |
| 折线柱状图 | `ml-bar-with-line` | 5.0.23 | DataV 官方库 | 图表 | 折线图 | G2Plot 2.x（推断） | UI | 是 | ✓ | — | — | 免费 |
| 双11气泡图 | `@double11-2017/double11-2017-single-bubble` | 0.2.5 | DataV 官方库 | 图表 | 散点图 | DOM（推断） | UI | 是 | — | ✓ | — | 免费 |
| 基本散点图 | `ml-scatterplot` | 4.1.8 | DataV 官方库 | 图表 | 散点图 | G2Plot 2.x（推断） | UI | 是 | ✓ | ✓ | — | 免费 |
| 气泡图 | `ml-bubble` | 5.4.6 | DataV 官方库 | 图表 | 散点图 | G2Plot 2.x（推断） | UI | 是 | ✓ | ✓ | 7 | 免费 |
| 分组柱状图 | `ml-bar-hori-group` | 3.2.4 | DataV 官方库 | 图表 | 条形图 | G2Plot 2.x（推断） | UI | 是 | ✓ | ✓ | — | 免费 |
| 双11轮播列表柱状图 | `@double11-2017/double11-2017-table-bar` | 1.2.8 | DataV 官方库 | 图表 | 条形图 | DOM（推断） | UI | 是 | — | ✓ | — | 免费 |
| 对称条形图 | `ml-bidirectional-bar` | 5.1.16 | DataV 官方库 | 图表 | 条形图 | G2Plot 2.x（推断） | UI | 是 | ✓ | ✓ | 8 | 免费 |
| 条形图 | `ml-bar-hori-basic` | 5.5.13 | DataV 官方库 | 图表 | 条形图 | G2Plot 2.x（推断） | UI | 是 | ✓ | ✓ | 9 | 免费 |
| 百分比条形图 | `ml-hori-bar-percentage` | 5.4.15 | DataV 官方库 | 图表 | 条形图 | G2Plot 2.x（推断） | UI | 是 | ✓ | ✓ | 8 | 免费 |
| 3D 柱状图 | `ml-bar-3d` | 0.2.0 | DataV 官方库 | 图表 | 柱状图 | ECharts-GL | UI | 是 | ✓ | ✓ | 5 | 高级 |
| 区间柱状图 | `ml-bar-range` | 5.4.12 | DataV 官方库 | 图表 | 柱状图 | G2Plot 2.x（推断） | UI | 是 | ✓ | ✓ | 9 | 免费 |
| 斑马柱状图 | `ml-bar-zebra` | 3.1.6 | DataV 官方库 | 图表 | 柱状图 | G2Plot 2.x（推断） | UI | 是 | ✓ | ✓ | — | 免费 |
| 柱状图 | `bar-basic` | 5.9.10 | DataV 官方库 | 图表 | 柱状图 | DOM/jQuery（推断） | UI | 是 | ✓ | ✓ | 9 | 免费 |
| 梯形柱状图 | `ml-bar-trapezoid` | 3.1.10 | DataV 官方库 | 图表 | 柱状图 | G2Plot 2.x（推断） | UI | 是 | — | ✓ | — | 免费 |
| 瀑布图 | `ml-bar-waterfull` | 5.2.17 | DataV 官方库 | 图表 | 柱状图 | G2Plot 2.x（推断） | UI | 是 | ✓ | ✓ | 8 | 免费 |
| 百分比柱状图 | `ml-bar-percent` | 5.4.11 | DataV 官方库 | 图表 | 柱状图 | G2Plot 2.x（推断） | UI | 是 | ✓ | ✓ | 8 | 免费 |
| 漏斗图 | `ml-funnel` | 5.2.1 | DataV 官方库 | 图表 | 漏斗图 | G2Plot 2.x（推断） | UI | 是 | ✓ | ✓ | 7 | 免费 |
| 热力图 | `ml-heatmap` | 5.4.2 | DataV 官方库 | 图表 | 热力图 | GI 地图（推断） | UI | 是 | ✓ | ✓ | 8 | 免费 |
| 双11雷达图 | `@double11-2017/double11-2017-radar` | 0.3.2 | DataV 官方库 | 图表 | 雷达图 | DOM（推断） | UI | 是 | — | ✓ | — | 免费 |
| 雷达图 | `ml-radar-basic` | 5.4.0 | DataV 官方库 | 图表 | 雷达图 | G2Plot 2.x（推断） | UI | 是 | ✓ | ✓ | 9 | 免费 |
| 3D 环图 | `echarts-pie-3d` | 0.2.9 | DataV 官方库 | 图表 | 饼环图 | DOM/jQuery（推断） | UI | 是 | ✓ | ✓ | 5 | 高级 |
| 仪表盘 | `ml-gauge` | 5.0.15 | DataV 官方库 | 图表 | 饼环图 | G2Plot 2.x | UI | 是 | ✓ | ✓ | 6 | 免费 |
| 分类玫瑰图 | `ml-pie-rose` | 5.5.2 | DataV 官方库 | 图表 | 饼环图 | G2Plot 2.x（推断） | UI | 是 | ✓ | ✓ | 8 | 免费 |
| 单值百分比饼图 | `pie-percent` | 1.3.0 | DataV 官方库 | 图表 | 饼环图 | DOM/jQuery（推断） | UI | 是 | ✓ | ✓ | 4 | 免费 |
| 多维度饼图 | `ml-pie-multi-radius` | 3.0.15 | DataV 官方库 | 图表 | 饼环图 | G2Plot 2.x（推断） | UI | 是 | — | ✓ | — | 免费 |
| 带图饼图 | `ml-pie-image` | 3.1.3 | DataV 官方库 | 图表 | 饼环图 | G2Plot 2.x（推断） | UI | 是 | ✓ | ✓ | — | 免费 |
| 指标占比饼图 | `ml-pie-one-value` | 1.2.22 | DataV 官方库 | 图表 | 饼环图 | G2Plot 2.x（推断） | UI | 是 | — | ✓ | — | 免费 |
| 标注对比饼图 | `ml-pie-comparison` | 3.0.12 | DataV 官方库 | 图表 | 饼环图 | G2Plot 2.x（推断） | UI | 是 | — | ✓ | — | 免费 |
| 轮播饼图 | `pie-ranking` | 1.4.29 | DataV 官方库 | 图表 | 饼环图 | DOM/jQuery（推断） | UI | 是 | — | ✓ | — | 免费 |
| 进度环图 | `ring-progress` | 5.0.6 | DataV 官方库 | 图表 | 饼环图 | DOM/jQuery（推断） | UI | 是 | ✓ | ✓ | 9 | 免费 |
| 饼图 | `ml-pie-basic` | 5.8.1 | DataV 官方库 | 图表 | 饼环图 | G2Plot 2.x（推断） | UI | 是 | ✓ | ✓ | 9 | 免费 |
| 3D地球 | `@double11-2017/map3d-earth` | 0.1.27 | DataV 官方库 | 地图 | 地图 | DOM（推断） | UI | 是 | — | ✓ | — | 免费 |
| 3D平面地图 4.0 | `@datav-3dplane-v4/datav-3d-plane-map` | 4.1.18 | DataV 官方库 | 地图 | 地图 | 3D 引擎（推断） | UI | 是 | — | ✓ | 6 | 尊享 |
| 基础平面地图 4.0 | `datav-gi-2dmap` | 4.3.28 | DataV 官方库 | 地图 | 地图 | GI 地图（高德） | UI | 是 | ✓ | ✓ | — | 免费 |
| RTMP 视频流播放器 | `rtmp-player` | 1.2.13 | DataV 官方库 | 媒体 | 媒体 | DOM/jQuery（推断） | UI | 否 | — | ✓ | — | 高级 |
| 单张图片 | `main-img` | 1.5.2 | DataV 官方库 | 媒体 | 媒体 | DOM/jQuery（推断） | UI | 否 | — | ✓ | — | 免费 |
| 图标 | `icon` | 0.0.19 | DataV 官方库 | 媒体 | 媒体 | DOM/jQuery（推断） | UI | 否 | ✓ | ✓ | — | 免费 |
| 图片轮播画廊 | `ml-swiper` | 1.1.6 | DataV 官方库 | 媒体 | 媒体 | G2Plot 2.x（推断） | UI | 否 | — | ✓ | — | 免费 |
| 标志墙 | `logo-wall` | 0.2.2 | DataV 官方库 | 媒体 | 媒体 | DOM/jQuery | UI | 否 | — | ✓ | 5 | 免费 |
| 模型查看器 | `datav-model-viewer` | 1.3.28 | DataV 官方库 | 媒体 | 媒体 | DOM/jQuery（推断） | UI | 否 | — | ✓ | — | 高级 |
| 箭头标绘 | `arrow-plotting` | 0.2.0 | DataV 官方库 | 媒体 | 媒体 | DOM/jQuery（推断） | UI | 否 | ✓ | ✓ | 3 | 免费 |
| 自定义背景块 | `bg-box` | 2.2.2 | DataV 官方库 | 媒体 | 媒体 | DOM/jQuery（推断） | UI | 否 | ✓ | ✓ | 5 | 免费 |
| 色块 | `@double11-2017/main-color-block` | 0.1.2 | DataV 官方库 | 媒体 | 媒体 | DOM（推断） | UI | 否 | ✓ | ✓ | — | 免费 |
| 萤石云播放器 | `ez-player` | 1.4.0 | DataV 官方库 | 媒体 | 媒体 | DOM/jQuery（推断） | UI | 否 | — | ✓ | — | 高级 |
| 装饰 | `decoration` | 1.3.9 | DataV 官方库 | 媒体 | 媒体 | DOM/jQuery（推断） | UI | 否 | — | ✓ | — | 免费 |
| 装饰条 | `strip-decoration` | 0.0.7 | DataV 官方库 | 媒体 | 媒体 | DOM/jQuery（推断） | UI | 否 | ✓ | ✓ | — | 免费 |
| 视频 | `video` | 2.6.0 | DataV 官方库 | 媒体 | 媒体 | DOM/jQuery | UI | 否 | — | ✓ | — | 免费 |
| 轮播图 | `slider` | 1.6.7 | DataV 官方库 | 媒体 | 媒体 | DOM/jQuery（推断） | UI | 否 | — | ✓ | — | 免费 |
| 边框 | `datav-box` | 1.3.11 | DataV 官方库 | 媒体 | 媒体 | DOM/jQuery（推断） | UI | 否 | — | ✓ | — | 免费 |
| 阿里云流播放器 | `aliplayer` | 1.2.6 | DataV 官方库 | 媒体 | 媒体 | DOM/jQuery（推断） | UI | 否 | — | ✓ | — | 高级 |
| 阿里云流播放器(License版) | `aliplayer-license` | 1.0.0 | DataV 官方库 | 媒体 | 媒体 | DOM/jQuery（推断） | UI | 否 | — | ✓ | — | 高级 |
| 音频 | `ml-audio` | 0.0.1 | DataV 官方库 | 媒体 | 媒体 | G2Plot 2.x（推断） | UI | 否 | — | ✓ | — | 高级 |
| 全屏切换 | `full-screen` | 0.1.17 | DataV 官方库 | 控件 | 按钮类 | DOM/jQuery（推断） | UI | 否 | — | ✓ | — | 免费 |
| 开关 | `@datav-form/switch` | 1.0.0 | DataV 官方库 | 控件 | 按钮类 | DOM 控件 | UI | 否 | ✓ | ✓ | 6 | 免费 |
| 按钮 | `@datav-form/interact-button` | 1.0.0 | DataV 官方库 | 控件 | 按钮类 | DOM 控件 | UI | 否 | — | ✓ | 7 | 免费 |
| iframe | `iframe` | 1.4.2 | DataV 官方库 | 控件 | 数据类 | DOM/jQuery（推断） | UI | 否 | — | ✓ | — | 免费 |
| 事件仪表盘 | `event-dashboard` | 0.1.13 | DataV 官方库 | 控件 | 数据类 | DOM/jQuery（推断） | UI | 否 | — | ✓ | 7 | 免费 |
| 时间轴 | `ml-event-line` | 0.6.0 | DataV 官方库 | 控件 | 数据类 | G2Plot 2.x（推断） | UI | 否 | ✓ | ✓ | 9 | 免费 |
| 轮播页面 | `carousel-iframe` | 1.1.6 | DataV 官方库 | 控件 | 数据类 | DOM/jQuery（推断） | UI | 否 | — | ✓ | — | 免费 |
| 进度条 | `percentage-bar` | 1.3.0 | DataV 官方库 | 控件 | 数据类 | DOM/jQuery（推断） | UI | 否 | ✓ | ✓ | 9 | 免费 |
| 自定义路径 | `custom-path` | 0.0.3 | DataV 官方库 | 控件 | 自定义 | DOM/jQuery（推断） | UI | 否 | ✓ | ✓ | 7 | 高级 |
| 输入框 | `@datav-form/input` | 1.0.2 | DataV 官方库 | 控件 | 输入类 | DOM 控件 | UI | 否 | ✓ | ✓ | 3 | 免费 |
| Tab列表 | `tab-list` | 3.4.7 | DataV 官方库 | 控件 | 选择类 | DOM/jQuery（推断） | UI | 否 | ✓ | ✓ | 13 | 免费 |
| 下拉框选择器 | `@datav-form/selector` | 2.3.1 | DataV 官方库 | 控件 | 选择类 | DOM 控件 | UI | 否 | ✓ | ✓ | 2 | 免费 |
| 单选框 | `@datav-form/radio` | 1.1.2 | DataV 官方库 | 控件 | 选择类 | DOM 控件 | UI | 否 | ✓ | ✓ | 7 | 免费 |
| 地理搜索框 | `ml-search-input` | 0.3.2 | DataV 官方库 | 控件 | 选择类 | G2Plot 2.x（推断） | UI | 否 | ✓ | ✓ | — | 免费 |
| 时间选择器 | `@datav-form/time-picker` | 2.2.2 | DataV 官方库 | 控件 | 选择类 | DOM 控件 | UI | 否 | ✓ | ✓ | — | 免费 |
| 交叉透视表 | `pivot-sheet` | 1.1.3 | DataV 官方库 | 表格 | 表格 | DOM/jQuery（推断） | UI | 是 | ✓ | ✓ | 5 | 高级 |
| 轮播列表 | `carousel-table` | 1.10.9 | DataV 官方库 | 表格 | 表格 | DOM/jQuery+animejs | UI | 是 | ✓ | ✓ | 6 | 免费 |
| 轮播列表柱状图 | `ml-table-bar` | 2.6.4 | DataV 官方库 | 表格 | 表格 | G2Plot 2.x（推断） | UI | 是 | — | ✓ | 7 | 免费 |
| 进度条表格 | `progress-table` | 1.3.2 | DataV 官方库 | 表格 | 表格 | DOM/jQuery（推断） | UI | 是 | ✓ | ✓ | 7 | 免费 |
| 键值表格 | `key-value-table` | 1.2.12 | DataV 官方库 | 表格 | 表格 | DOM/jQuery（推断） | UI | 是 | ✓ | ✓ | 7 | 免费 |
| ECharts 弦图 | `@echarts/ml-echarts-chord` | 2.0.13 | ECharts | ECharts | — | ECharts 3.x | UI | 否 | — | ✓ | — | 高级 |
| ECharts 仪表盘 | `@echarts/ml-echarts-gauge` | 2.0.15 | ECharts | 图表 | — | ECharts 3.x | UI | 是 | — | ✓ | — | 高级 |
| ECharts 桑基图 | `@echarts/echarts-sankey` | 0.0.23 | ECharts | 图表 | — | ECharts 3.x | UI | 是 | — | ✓ | — | 高级 |
| ECharts 网络图 | `@echarts/ml-echarts-net` | 2.0.15 | ECharts | 图表 | 关系图 | ECharts 3.x | UI | 是 | — | ✓ | — | 高级 |
| ECharts 24时折线图 | `@echarts/echarts-line-24time` | 0.0.24 | ECharts | 图表 | 折线图 | ECharts 3.x | UI | 是 | — | ✓ | — | 高级 |
| ECharts K线图 | `@echarts/ml-echarts-candlestick-sh-2015` | 2.0.17 | ECharts | 图表 | 折线图 | ECharts 3.x | UI | 是 | — | ✓ | — | 高级 |
| ECharts 基本折线图 | `@echarts/echarts-line-category` | 0.1.6 | ECharts | 图表 | 折线图 | ECharts 3.x | UI | 是 | — | ✓ | — | 高级 |
| ECharts 堆叠折线图 | `@echarts/echarts-line-stack` | 0.0.18 | ECharts | 图表 | 折线图 | ECharts 3.x | UI | 是 | — | ✓ | — | 高级 |
| ECharts 瀑布图 | `@echarts/echarts-line-rainfall` | 0.0.16 | ECharts | 图表 | 折线图 | ECharts 3.x | UI | 是 | — | ✓ | — | 高级 |
| ECharts 连续折线图 | `@echarts/echarts-line-continue` | 0.0.18 | ECharts | 图表 | 折线图 | ECharts 3.x | UI | 是 | — | ✓ | — | 高级 |
| ECharts 阶梯折线图 | `@echarts/echarts-line-step` | 2.0.19 | ECharts | 图表 | 折线图 | ECharts 3.x | UI | 是 | — | ✓ | — | 高级 |
| ECharts 颜色分段折线图 | `@echarts/echarts-line-visualmap` | 0.0.17 | ECharts | 图表 | 折线图 | ECharts 3.x | UI | 是 | — | ✓ | — | 高级 |
| ECharts 单轴气泡图 | `@echarts/echarts-bubble` | 0.0.18 | ECharts | 图表 | 散点图 | ECharts 3.x | UI | 是 | — | ✓ | — | 高级 |
| ECharts 大规模散点图 | `@echarts/ml-echarts-scatter-large` | 2.0.14 | ECharts | 图表 | 散点图 | ECharts 3.x | UI | 是 | — | ✓ | — | 高级 |
| ECharts 堆叠条形图 | `@echarts/echarts-bar-horizontal-stack` | 0.0.19 | ECharts | 图表 | 条形图 | ECharts 3.x | UI | 是 | — | ✓ | — | 高级 |
| ECharts 正负条形图 | `@echarts/echarts-bar-horizontal-zero` | 0.0.19 | ECharts | 图表 | 条形图 | ECharts 3.x | UI | 是 | — | ✓ | — | 高级 |
| ECharts 堆叠柱状图 | `@echarts/ml-echarts-bar-stack` | 2.0.14 | ECharts | 图表 | 柱状图 | ECharts 3.x | UI | 是 | — | ✓ | — | 高级 |
| ECharts 极坐标堆叠柱图 | `@echarts/echarts-bar-polar-stack` | 0.0.21 | ECharts | 图表 | 柱状图 | ECharts 3.x | UI | 是 | — | ✓ | — | 高级 |
| ECharts 柱状图 | `@echarts/ml-echarts-bar-animation-delay` | 2.0.11 | ECharts | 图表 | 柱状图 | ECharts 3.x | UI | 是 | — | ✓ | — | 高级 |
| ECharts 标注气泡柱状图 | `@echarts/ml-echarts-bar1` | 2.0.11 | ECharts | 图表 | 柱状图 | ECharts 3.x | UI | 是 | — | ✓ | — | 高级 |
| ECharts 象形柱图 | `@echarts/ml-echarts-pictorialBar-velocity` | 2.0.14 | ECharts | 图表 | 柱状图 | ECharts 3.x | UI | 是 | — | ✓ | — | 高级 |
| ECharts 阶梯瀑布图 | `@echarts/ml-echarts-bar-waterfall2` | 2.0.13 | ECharts | 图表 | 柱状图 | ECharts 3.x | UI | 是 | — | ✓ | — | 高级 |
| ECharts 漏斗图 | `@echarts/ml-echarts-funnel` | 2.0.16 | ECharts | 图表 | 漏斗图 | ECharts 3.x | UI | 是 | ✓ | ✓ | — | 高级 |
| ECharts 日历图 | `@echarts/ml-echarts-calendar-effectscatter` | 2.0.14 | ECharts | 图表 | 热力图 | ECharts 3.x | UI | 是 | — | ✓ | — | 高级 |
| ECharts 热力图 | `@echarts/ml-echarts-heatmap-cartesian` | 2.0.13 | ECharts | 图表 | 热力图 | ECharts 3.x | UI | 是 | — | ✓ | — | 高级 |
| ECharts 雷达图 | `@echarts/echarts-radar` | 0.0.18 | ECharts | 图表 | 雷达图 | ECharts 3.x | UI | 是 | — | ✓ | — | 高级 |
| ECharts 玫瑰图 | `@echarts/ml-echarts-pie-custom` | 2.0.10 | ECharts | 图表 | 饼环图 | ECharts 3.x | UI | 是 | — | ✓ | — | 高级 |
| 双数据对比河流图 | `@shukeshi.hanabi/streamCompare` | 0.0.15 | Hanabi数据分析组件包 | 图表 | — | Hanabi（推断） | UI | 是 | — | — | — | 高级 |
| 指标面积图 | `@shukeshi.hanabi/areaLine2` | 0.0.12 | Hanabi数据分析组件包 | 图表 | — | Hanabi（推断） | UI | 是 | ✓ | — | — | 高级 |
| 省份排名分面图 | `@shukeshi.hanabi/provinceRank` | 0.0.6 | Hanabi数据分析组件包 | 图表 | — | Hanabi（推断） | UI | 是 | ✓ | — | — | 高级 |
| 开关 | `@datav-form/switch` | 1.0.0 | 交互组件包 | 控件 | 按钮类 | DOM 控件 | UI | 否 | ✓ | ✓ | 6 | 免费 |
| 按钮 | `@datav-form/interact-button` | 1.0.0 | 交互组件包 | 控件 | 按钮类 | DOM 控件 | UI | 否 | — | ✓ | 7 | 免费 |
| 输入框 | `@datav-form/input` | 1.0.2 | 交互组件包 | 控件 | 输入类 | DOM 控件 | UI | 否 | ✓ | ✓ | 3 | 免费 |
| 下拉框选择器 | `@datav-form/selector` | 2.3.1 | 交互组件包 | 控件 | 选择类 | DOM 控件 | UI | 否 | ✓ | ✓ | 2 | 免费 |
| 单选框 | `@datav-form/radio` | 1.1.2 | 交互组件包 | 控件 | 选择类 | DOM 控件 | UI | 否 | ✓ | ✓ | 7 | 免费 |
| 时间选择器 | `@datav-form/time-picker` | 2.2.2 | 交互组件包 | 控件 | 选择类 | DOM 控件 | UI | 否 | ✓ | ✓ | — | 免费 |
| 词云 | `@xhzy-anime/wordcloud` | 0.0.1 | 新华智云动画组件包 | 信息 | — | animejs 动画（推断） | UI | 部分 | ✓ | — | — | 高级 |
| 单折线图 | `@xhzy-anime/single-linechart` | 0.0.3 | 新华智云动画组件包 | 图表 | 折线图 | animejs 动画（推断） | UI | 是 | ✓ | — | — | 高级 |
| 双折线图 | `@xhzy-anime/double-linechart` | 0.0.2 | 新华智云动画组件包 | 图表 | 折线图 | animejs 动画（推断） | UI | 是 | ✓ | — | — | 高级 |
| 双折线图(移动轴) | `@xhzy-anime/axis-linechart` | 0.0.6 | 新华智云动画组件包 | 图表 | 折线图 | animejs 动画（推断） | UI | 是 | ✓ | — | — | 高级 |
| 多折线图 | `@xhzy-anime/multiple-linechart` | 0.0.2 | 新华智云动画组件包 | 图表 | 折线图 | animejs 动画（推断） | UI | 是 | ✓ | — | — | 高级 |
| 手绘多折线图 | `@xhzy-anime/multiple-linechart-handpaint` | 0.0.2 | 新华智云动画组件包 | 图表 | 折线图 | animejs 动画（推断） | UI | 是 | ✓ | — | — | 高级 |
| 散点图 | `@xhzy-anime/scatter_basic` | 0.0.2 | 新华智云动画组件包 | 图表 | 散点图 | animejs 动画（推断） | UI | 是 | ✓ | — | — | 高级 |
| 单柱状图 | `@xhzy-anime/single-barchart` | 0.0.3 | 新华智云动画组件包 | 图表 | 柱状图 | animejs 动画（推断） | UI | 是 | ✓ | — | — | 高级 |
| 双y轴折线图柱状图 | `@xhzy-anime/point-barchart` | 0.0.2 | 新华智云动画组件包 | 图表 | 柱状图 | animejs 动画（推断） | UI | 是 | ✓ | — | — | 高级 |
| 双y轴柱状图 | `@xhzy-anime/double-barchart_2axis` | 0.0.4 | 新华智云动画组件包 | 图表 | 柱状图 | animejs 动画（推断） | UI | 是 | ✓ | — | — | 高级 |
| 双柱状图 | `@xhzy-anime/double-barchart` | 0.0.4 | 新华智云动画组件包 | 图表 | 柱状图 | animejs 动画（推断） | UI | 是 | ✓ | — | — | 高级 |
| 双轴折线柱状图 | `@xhzy-anime/line_barchart` | 0.0.2 | 新华智云动画组件包 | 图表 | 柱状图 | animejs 动画（推断） | UI | 是 | ✓ | — | — | 高级 |
| 多堆叠图 | `@xhzy-anime/multiple-barchart-stack` | 0.0.2 | 新华智云动画组件包 | 图表 | 柱状图 | animejs 动画（推断） | UI | 是 | ✓ | — | — | 高级 |
| 多柱状图 | `@xhzy-anime/multiple-barchart` | 0.0.2 | 新华智云动画组件包 | 图表 | 柱状图 | animejs 动画（推断） | UI | 是 | ✓ | — | — | 高级 |
| 对比柱状图 | `@xhzy-anime/double-barchart-verticle` | 0.0.2 | 新华智云动画组件包 | 图表 | 柱状图 | animejs 动画（推断） | UI | 是 | ✓ | — | — | 高级 |
| 基本饼图 | `@xhzy-anime/single-piechart` | 0.0.2 | 新华智云动画组件包 | 图表 | 饼环图 | animejs 动画（推断） | UI | 是 | ✓ | — | — | 高级 |
| 时间轴对比饼图 | `@xhzy-anime/compare-piechart` | 0.0.1 | 新华智云动画组件包 | 图表 | 饼环图 | animejs 动画（推断） | UI | 是 | ✓ | — | — | 高级 |
| 翠鸟艺术家三维场景 | `@cuiniao/cuiniao-3d` | 1.1.0 | 翠鸟艺术家 | 媒体 | 媒体 | DOM/jQuery（推断） | UI | 否 | — | — | — | 高级 |
| 分页 | `@datav-interact-professional/pagination` | 1.4.2 | 高级交互组件包 | 控件 | — | DOM 交互（推断） | UI | 否 | ✓ | ✓ | 7 | 尊享 |
| 导航菜单栏 | `@datav-interact-professional/navigation-menu-selector` | 1.3.0 | 高级交互组件包 | 控件 | — | DOM 交互（推断） | UI | 否 | ✓ | ✓ | 5 | 尊享 |
| 步骤条 | `@datav-interact-professional/steps` | 1.0.5 | 高级交互组件包 | 控件 | — | DOM 交互（推断） | UI | 否 | ✓ | ✓ | 9 | 尊享 |
| 气泡卡片 | `@datav-interact-professional/popover` | 1.1.3 | 高级交互组件包 | 控件 | 按钮类 | DOM 交互（推断） | UI | 否 | ✓ | ✓ | — | 尊享 |
| 数字输入框 | `@datav-interact-professional/input-number` | 1.2.0 | 高级交互组件包 | 控件 | 输入类 | DOM 交互（推断） | UI | 否 | ✓ | ✓ | 2 | 尊享 |
| 滑动范围选择器 | `@datav-interact-professional/range-slider-bar` | 0.0.11 | 高级交互组件包 | 控件 | 输入类 | DOM 交互（推断） | UI | 否 | ✓ | ✓ | 7 | 尊享 |
| 滑动选择条 | `@datav-interact-professional/slider-bar` | 1.3.1 | 高级交互组件包 | 控件 | 输入类 | DOM 交互（推断） | UI | 否 | ✓ | ✓ | 10 | 尊享 |
| 多选下拉框 | `@datav-interact-professional/dropdown-multi-selector` | 2.2.1 | 高级交互组件包 | 控件 | 选择类 | DOM 交互（推断） | UI | 否 | ✓ | ✓ | 8 | 尊享 |
| 多选框 | `@datav-interact-professional/checkbox` | 1.5.2 | 高级交互组件包 | 控件 | 选择类 | DOM 交互（推断） | UI | 否 | ✓ | ✓ | 10 | 尊享 |
| 时间范围选择器 | `@datav-interact-professional/range-time-picker` | 2.3.3 | 高级交互组件包 | 控件 | 选择类 | DOM 交互（推断） | UI | 否 | — | ✓ | 7 | 尊享 |
| 级联选择器 | `@datav-interact-professional/cascader` | 2.2.2 | 高级交互组件包 | 控件 | 选择类 | DOM 交互（推断） | UI | 否 | ✓ | ✓ | 9 | 尊享 |

## 4. 自定义组件指引

- **命名**：`name` 用 kebab-case；与官方区分建议加 scope（如 `@kanban/xxx`）
- **分类**：实现 `category` 标签数组，面板按标签归组，一个组件可属多个分类
- **技术选型**：图表优先 G2 系（官方用 g2plot 2.x，kanban 用 `@antv/g2` v5）；
  纯展示/DOM 类用原生 DOM 即可（官方 DOM 组件多为 jQuery，历史包袱，不必跟随）
- **接口约定**：实现 `init / render / resize / data / mergeConfig / destroy` 生命周期；
  需要主题适配时提供 `getThemableConfig`（把主题令牌映射为组件配置）
- **快捷样式**：可选，为一个组件提供多套预设配置 + 缩略图（黑/白主题变体）
- **缩略图**：官方用 OSS 图片；kanban 面板用内联 SVG（`ComponentLibraryPanel` 的 `ChartThumb`）

