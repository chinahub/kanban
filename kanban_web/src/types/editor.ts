export type ComponentType =
  | 'title' | 'text'
  | 'line' | 'bar' | 'pie' | 'area' | 'scatter' | 'radar' | 'funnel' | 'rose'
  | 'barh' | 'barGroup' | 'barStack' | 'ring' | 'lineMulti' | 'areaStack'
  | 'barPercent' | 'barhGroup' | 'barhStack' | 'lineStep'
  | 'barhPercent' | 'areaPercent' | 'scatterBubble' | 'barRange' | 'barWaterfall'
  | 'lineDual' | 'pieNest' | 'gauge' | 'dualLineBar'
  | 'flipper' | 'timer'
  | 'label' | 'countdown' | 'marquee' | 'statusCard' | 'bizTrend'
  | 'image' | 'carousel' | 'colorBlock' | 'bgBlock' | 'video' | 'audio'
  | 'borderBox' | 'decoration' | 'decorationBar' | 'tableKv' | 'tableCarousel' | 'tableProgress'
  | 'btn' | 'selectDropdown' | 'selectRadio' | 'selectCheckbox' | 'selectSwitch' | 'inputBasic' | 'inputSlider'
  | 'wordcloud' | 'relationTree' | 'relationSankey' | 'relationChord' | 'treemap' | 'yujue' | 'liquid'
  | 'mapChina' | 'mapWorld' | 'mapRegion'
  | 'mapFlight' | 'mapScatter'
  | 'doubleBar' | 'contrastBar' | 'multiStack'
  | 'selectDate' | 'inputSearch' | 'navTabs' | 'navMenu' | 'navBreadcrumb'
  | 'dataProgress' | 'dataSteps' | 'dataTimeline' | 'btnIcon' | 'icon'
  | 'gallery' | 'logoWall' | 'arrowPlot' | 'tableCarouselBar'
  | 'tablePivot' | 'streamPlayer' | 'rtmpPlayer'
  | 'earth3d' | 'map3dChina' | 'map3dWorld' | 'city3d'

export interface GuideLine {
  id: string
  orientation: 'horizontal' | 'vertical'
  position: number
}


export type FitMode = 'none' | 'width' | 'both'

export interface CanvasConfig {
  version: number
  canvas: {
    width: number
    height: number
    background: string
    scale: number
    fitMode: FitMode
    themeId?: string
  }
  /** 画布页面列表（子页面/钻取），至少一页；v2 起组件与参考线挂在页面上 */
  pages: Page[]
  /** 蓝图编排（PRD §4.14）：事件源/条件/动作节点 + 连线，随配置序列化进快照 */
  blueprint: Blueprint
}

export interface Page {
  id: string
  name: string
  components: CanvasComponent[]
  guides: GuideLine[]
}

/** 生成页面 id，格式 page_<时间戳>_<随机串> */
export const createPage = (name: string): Page => ({
  id: `page_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
  name,
  components: [],
  guides: [],
})

export interface CanvasComponent {
  id: string
  type: ComponentType
  name: string
  x: number
  y: number
  width: number
  height: number
  rotate: number
  opacity: number
  visible: boolean
  locked: boolean
  props: Record<string, unknown>
  data?: unknown[]
  events?: ComponentEvent[]
}

/** 交互事件（PRD §4.10 v1）：随 canvasConfig 序列化，快照天然继承；运行态覆盖（显隐/高亮）不持久化 */
export type EventTrigger = 'click' | 'dblclick' | 'hover' | 'viewport'

export type ComponentEventAction =
  | { type: 'setVariable'; variable: string; value: string }
  | { type: 'toggleVisible'; targetId: string }
  | { type: 'highlight'; targetId: string }
  | { type: 'openUrl'; url: string; newWindow: boolean }
  /** 跳转到子页面（钻取）；params 中的 value 支持 {{var.xxx}} 与 {{ctx.name/value/series}} 插值 */
  | { type: 'gotoPage'; pageId: string; params: Array<{ name: string; value: string }> }

export interface ComponentEvent {
  id: string
  trigger: EventTrigger
  action: ComponentEventAction
}

/** 蓝图节点类型（PRD §4.14）：事件源 / 条件 / 动作 */
export type BlueprintNodeKind = 'event' | 'condition' | 'action'

export interface BlueprintNode {
  id: string
  kind: BlueprintNodeKind
  /** kind=event：绑定组件（跨页全局唯一）与触发方式 */
  componentId?: string
  trigger?: EventTrigger
  /** kind=condition：JS 表达式，作用域 vars（变量名→值）与 ctx（点击上下文），为真才沿连线继续 */
  expression?: string
  /** kind=action：要执行的动作，复用组件交互动作定义 */
  action?: ComponentEventAction
  /** 蓝图编辑器内的画布位置 */
  x: number
  y: number
}

export interface BlueprintEdge {
  id: string
  from: string
  to: string
}

export interface Blueprint {
  nodes: BlueprintNode[]
  edges: BlueprintEdge[]
}

export const createBlueprintNode = (kind: BlueprintNodeKind, x: number, y: number): BlueprintNode => ({
  id: `bp_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
  kind,
  x: Math.round(x),
  y: Math.round(y),
})

export const defaultBlueprint = (): Blueprint => ({ nodes: [], edges: [] })

/** 规范化蓝图：字段缺失/类型不对时回退空蓝图（兼容旧快照与手改 JSON） */
export function normalizeBlueprint(raw: unknown): Blueprint {
  if (!raw || typeof raw !== 'object') return defaultBlueprint()
  const r = raw as Partial<Blueprint>
  const nodes = Array.isArray(r.nodes) ? r.nodes.filter((n) => n && typeof n.id === 'string') : []
  const ids = new Set(nodes.map((n) => n.id))
  const edges = Array.isArray(r.edges)
    ? r.edges.filter((e) => e && ids.has(e.from) && ids.has(e.to) && e.from !== e.to)
    : []
  return { nodes, edges }
}

export const defaultCanvas = (width = 1920, height = 1080): CanvasConfig => ({
  version: 2,
  canvas: {
    width,
    height,
    background: '#0b1020',
    scale: 0.4,
    fitMode: 'both',
  },
  pages: [createPage('主页面')],
  blueprint: defaultBlueprint(),
})

export const defaultData = [
  { name: 'Mon', value: 120 },
  { name: 'Tue', value: 200 },
  { name: 'Wed', value: 150 },
  { name: 'Thu', value: 80 },
  { name: 'Fri', value: 70 },
]

/** 多系列图表（分组/堆叠/多折线）的默认数据，比 defaultData 多一个 series 维度 */
export const defaultSeriesData = [
  { name: 'Mon', series: '系列 A', value: 120 },
  { name: 'Mon', series: '系列 B', value: 80 },
  { name: 'Tue', series: '系列 A', value: 200 },
  { name: 'Tue', series: '系列 B', value: 130 },
  { name: 'Wed', series: '系列 A', value: 150 },
  { name: 'Wed', series: '系列 B', value: 90 },
  { name: 'Thu', series: '系列 A', value: 80 },
  { name: 'Thu', series: '系列 B', value: 110 },
  { name: 'Fri', series: '系列 A', value: 70 },
  { name: 'Fri', series: '系列 B', value: 60 },
]

/** 数据形如 { name, series, value } 的多系列图表类型 */
export const SERIES_CHART_TYPES: ComponentType[] = ['barGroup', 'barStack', 'lineMulti', 'areaStack', 'barPercent', 'barhGroup', 'barhStack', 'barhPercent', 'areaPercent', 'lineDual', 'dualLineBar', 'doubleBar', 'contrastBar', 'multiStack']

/** 气泡图默认数据：{ name, value, size }，size 决定气泡半径 */
export const defaultBubbleData = [
  { name: 'A', value: 30, size: 12 },
  { name: 'B', value: 80, size: 24 },
  { name: 'C', value: 45, size: 16 },
  { name: 'D', value: 60, size: 32 },
  { name: 'E', value: 20, size: 10 },
]

/** 区间柱状图默认数据：{ name, min, max } */
export const defaultRangeData = [
  { name: 'Mon', min: 20, max: 80 },
  { name: 'Tue', min: 40, max: 120 },
  { name: 'Wed', min: 30, max: 100 },
  { name: 'Thu', min: 60, max: 150 },
  { name: 'Fri', min: 50, max: 110 },
]

/** 瀑布图默认数据：{ name, value }，value 为相对上一项的增量（可为负） */
export const defaultWaterfallData = [
  { name: '一月', value: 120 },
  { name: '二月', value: 80 },
  { name: '三月', value: -60 },
  { name: '四月', value: -30 },
  { name: '五月', value: 50 },
]

/** 嵌套饼图默认数据：{ name, layer, value }，layer 区分内层/外层两环 */
export const defaultNestData = [
  { name: '类别 A', layer: '内层', value: 40 },
  { name: '类别 B', layer: '内层', value: 60 },
  { name: '子类 A1', layer: '外层', value: 25 },
  { name: '子类 A2', layer: '外层', value: 15 },
  { name: '子类 B1', layer: '外层', value: 35 },
  { name: '子类 B2', layer: '外层', value: 25 },
]

/** 键值表格默认数据：{ key, value } */
export const defaultKvData = [
  { key: '总订单量', value: '12,345' },
  { key: '活跃用户', value: '8,210' },
  { key: '转化率', value: '3.6%' },
  { key: '客单价', value: '¥ 268' },
]

/** 词云默认数据：{ name, value }，value 决定字号 */
export const defaultWordData = [
  { name: '数据可视化', value: 100 },
  { name: '大屏看板', value: 80 },
  { name: '实时监控', value: 64 },
  { name: '商业智能', value: 50 },
  { name: '数据分析', value: 44 },
  { name: '图表', value: 36 },
  { name: '仪表盘', value: 30 },
  { name: '报表', value: 24 },
  { name: '预警', value: 18 },
  { name: '钻取', value: 12 },
]

/** 树图/矩形树图默认数据：单根层级结构（数组内一个根节点） */
export const defaultTreeData = [
  {
    name: '集团',
    children: [
      { name: '事业部 A', children: [{ name: '产品 A1', value: 30 }, { name: '产品 A2', value: 20 }] },
      { name: '事业部 B', children: [{ name: '产品 B1', value: 25 }, { name: '产品 B2', value: 15 }] },
    ],
  },
]

/** 桑基图默认数据：{ source, target, value } 边列表 */
export const defaultSankeyData = [
  { source: '访问', target: '注册', value: 60 },
  { source: '访问', target: '跳出', value: 40 },
  { source: '注册', target: '付费', value: 25 },
  { source: '注册', target: '流失', value: 35 },
  { source: '付费', target: '复购', value: 15 },
]

/** 和弦图默认数据：{ from, to, value } 关系列表（内部构建矩阵） */
export const defaultChordData = [
  { from: '华东', to: '华南', value: 30 },
  { from: '华东', to: '华北', value: 20 },
  { from: '华南', to: '华北', value: 25 },
  { from: '华南', to: '西南', value: 15 },
  { from: '华北', to: '西南', value: 10 },
]

/** 飞线图默认数据：{ from, to, value }，城市名查内置经纬度表 */
export const defaultFlightData = [
  { from: '北京', to: '上海', value: 60 },
  { from: '广州', to: '成都', value: 45 },
  { from: '上海', to: '深圳', value: 50 },
  { from: '北京', to: '乌鲁木齐', value: 30 },
  { from: '成都', to: '拉萨', value: 20 },
]

/** 散点图层默认数据：{ name, value }，城市名查内置经纬度表，value 决定半径 */
export const defaultCityData = [
  { name: '北京', value: 90 },
  { name: '上海', value: 100 },
  { name: '广州', value: 70 },
  { name: '成都', value: 55 },
  { name: '武汉', value: 45 },
  { name: '西安', value: 38 },
  { name: '哈尔滨', value: 30 },
  { name: '乌鲁木齐', value: 22 },
]

/** 交叉透视表默认数据：{ row, col, value } 长表 */
export const defaultPivotData = [
  { row: '华东', col: '一月', value: 120 },
  { row: '华东', col: '二月', value: 150 },
  { row: '华南', col: '一月', value: 90 },
  { row: '华南', col: '二月', value: 110 },
  { row: '华北', col: '一月', value: 70 },
  { row: '华北', col: '二月', value: 95 },
]

/** 特殊默认数据（非 name/value 也非 name/series/value 的图表类型） */
const SPECIAL_DEFAULT_DATA: Partial<Record<ComponentType, unknown[]>> = {
  scatterBubble: defaultBubbleData,
  barRange: defaultRangeData,
  barWaterfall: defaultWaterfallData,
  pieNest: defaultNestData,
  tableKv: defaultKvData,
  wordcloud: defaultWordData,
  relationTree: defaultTreeData,
  treemap: defaultTreeData,
  relationSankey: defaultSankeyData,
  relationChord: defaultChordData,
  tablePivot: defaultPivotData,
  mapFlight: defaultFlightData,
  mapScatter: defaultCityData,
}

/** 纯 DOM 展示组件（非 G2 图表），默认尺寸偏小 */
const DOM_TYPES: ComponentType[] = [
  'title', 'text', 'flipper', 'timer', 'label', 'countdown', 'marquee', 'statusCard', 'bizTrend', 'audio', 'decorationBar',
  'btn', 'selectDropdown', 'selectRadio', 'selectCheckbox', 'selectSwitch', 'inputBasic', 'inputSlider',
  'selectDate', 'inputSearch', 'navTabs', 'navMenu', 'navBreadcrumb', 'dataProgress', 'dataSteps', 'btnIcon', 'icon', 'arrowPlot',
]

export function isDomComponent(type: ComponentType): boolean {
  return DOM_TYPES.includes(type)
}

export function createComponent(
  type: ComponentType,
  index: number,
  placement?: { x: number; y: number; width: number; height: number },
): CanvasComponent {
  const defaultW = isDomComponent(type) ? 300 : 420
  const defaultH = isDomComponent(type) ? 72 : 260
  const pos = placement ?? {
    x: 120 + index * 24,
    y: 120 + index * 24,
    width: defaultW,
    height: defaultH,
  }
  const base = {
    id: `${type}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    type,
    name: componentName(type),
    x: pos.x,
    y: pos.y,
    width: pos.width,
    height: pos.height,
    rotate: 0,
    opacity: 1,
    visible: true,
    locked: false,
    props: {},
    data: SPECIAL_DEFAULT_DATA[type] ?? (SERIES_CHART_TYPES.includes(type) ? defaultSeriesData : defaultData),
  }
  if (type === 'title') return { ...base, props: { text: '数据看板标题', fontSize: 36, color: '#ffffff', fontWeight: 700 } }
  if (type === 'text') return { ...base, props: { text: '说明文本', fontSize: 18, color: '#b6c2ff' } }
  if (type === 'flipper') return { ...base, props: { value: 12345, fontSize: 36, color: '#4f8cff' } }
  if (type === 'timer') return { ...base, props: { format: 'YYYY-MM-DD HH:mm:ss', fontSize: 24, color: '#ffffff' } }
  if (type === 'gauge') return { ...base, props: { value: 66, min: 0, max: 100, color: '#4f8cff' } }
  if (type === 'label') return { ...base, props: { text: '标签', fontSize: 16, color: '#ffffff', background: '#1d39c4', borderRadius: 4 } }
  if (type === 'countdown') return { ...base, props: { targetTime: '2026-12-31 23:59:59', fontSize: 24, color: '#4f8cff' } }
  if (type === 'marquee') return { ...base, props: { text: '跑马灯滚动文本，可在样式面板修改内容', fontSize: 18, color: '#ffffff', speed: 60 } }
  if (type === 'statusCard') return { ...base, props: { label: '服务状态', status: 'online', value: '正常运行' } }
  if (type === 'bizTrend') return { ...base, props: { label: '今日销售额', value: 12345, suffix: '元', percent: 12.5, up: true } }
  if (type === 'image') return { ...base, props: { url: '', fit: 'cover' } }
  if (type === 'carousel') return { ...base, props: { urls: '', interval: 3 } }
  if (type === 'colorBlock') return { ...base, props: { color: '#12305e', borderRadius: 8 } }
  if (type === 'bgBlock') return { ...base, props: { color: 'rgba(18,48,94,0.4)', borderColor: '#2a4b8f', borderWidth: 1, borderRadius: 8 } }
  if (type === 'video') return { ...base, props: { url: '', autoplay: true, loop: true, muted: true, controls: true } }
  if (type === 'audio') return { ...base, props: { url: '', autoplay: false, loop: false, controls: true } }
  if (type === 'borderBox') return { ...base, props: { color: '#2a4b8f', style: 'corner' } }
  if (type === 'decoration') return { ...base, props: { color: '#2a4b8f', style: 'slashes' } }
  if (type === 'decorationBar') return { ...base, props: { color: '#4f8cff' } }
  if (type === 'tableKv') return { ...base, props: {} }
  if (type === 'tableCarousel') return { ...base, props: { interval: 2 } }
  if (type === 'tableProgress') return { ...base, props: { max: 100, color: '#4f8cff' } }
  if (type === 'btn') return { ...base, props: { text: '按钮', color: '#1d39c4', targetVariable: '', value: '' } }
  if (type === 'selectDropdown') return { ...base, props: { options: '选项一\n选项二\n选项三', targetVariable: '', placeholder: '请选择' } }
  if (type === 'selectRadio') return { ...base, props: { options: '选项一\n选项二\n选项三', targetVariable: '' } }
  if (type === 'selectCheckbox') return { ...base, props: { options: '选项一\n选项二\n选项三', targetVariable: '' } }
  if (type === 'selectSwitch') return { ...base, props: { targetVariable: '', onValue: '开', offValue: '关' } }
  if (type === 'inputBasic') return { ...base, props: { targetVariable: '', placeholder: '请输入' } }
  if (type === 'inputSlider') return { ...base, props: { targetVariable: '', min: 0, max: 100, defaultValue: 50 } }
  if (type === 'liquid') return { ...base, props: { value: 66, color: '#4f8cff' } }
  if (type === 'mapChina') return { ...base, props: { color: '#1d3d7a' } }
  if (type === 'mapWorld') return { ...base, props: { color: '#1d3d7a' } }
  if (type === 'mapRegion') return { ...base, props: { geoUrl: '/maps/china.json', color: '#1d3d7a' } }
  if (type === 'mapFlight') return { ...base, props: { color: '#1d3d7a', flyColor: '#4f8cff' } }
  if (type === 'mapScatter') return { ...base, props: { color: '#1d3d7a', dotColor: '#4f8cff' } }
  if (type === 'selectDate') return { ...base, props: { targetVariable: '', placeholder: '选择日期' } }
  if (type === 'inputSearch') return { ...base, props: { targetVariable: '', placeholder: '搜索' } }
  if (type === 'navTabs') return { ...base, props: { options: '页面一\n页面二\n页面三', targetVariable: '' } }
  if (type === 'navMenu') return { ...base, props: { options: '菜单一\n菜单二\n菜单三', targetVariable: '' } }
  if (type === 'navBreadcrumb') return { ...base, props: { options: '首页\n分类\n详情', targetVariable: '' } }
  if (type === 'dataProgress') return { ...base, props: { value: 66, targetVariable: '', color: '#4f8cff' } }
  if (type === 'dataSteps') return { ...base, props: { options: '步骤一\n步骤二\n步骤三', current: 1, targetVariable: '' } }
  if (type === 'dataTimeline') return { ...base, props: { options: '事件一\n事件二\n事件三' } }
  if (type === 'btnIcon') return { ...base, props: { icon: 'StarOutlined', color: '#1d39c4', targetVariable: '', value: '' } }
  if (type === 'icon') return { ...base, props: { icon: 'StarOutlined', size: 32, color: '#4f8cff' } }
  if (type === 'gallery') return { ...base, props: { urls: '', interval: 3 } }
  if (type === 'logoWall') return { ...base, props: { urls: '', columns: 4 } }
  if (type === 'arrowPlot') return { ...base, props: { color: '#4f8cff', direction: 'right' } }
  if (type === 'tableCarouselBar') return { ...base, props: { interval: 2, max: 100, color: '#4f8cff' } }
  if (type === 'tablePivot') return { ...base, props: {} }
  if (type === 'streamPlayer') return { ...base, props: { url: '', autoplay: true, muted: true } }
  if (type === 'rtmpPlayer') return { ...base, props: { url: '', autoplay: true, muted: true } }
  if (type === 'earth3d') return { ...base, props: { color: '#4f8cff' } }
  if (type === 'map3dChina') return { ...base, props: { color: '#1d3d7a' } }
  if (type === 'map3dWorld') return { ...base, props: { color: '#1d3d7a' } }
  if (type === 'city3d') return { ...base, props: { color: '#4f8cff' } }
  return { ...base, props: { title: componentName(type), color: '#4f8cff' } }
}

export function cloneComponent(component: CanvasComponent, offsetX = 24, offsetY = 24): CanvasComponent {
  return {
    ...component,
    id: `${component.type}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    name: `${component.name} 副本`,
    x: component.x + offsetX,
    y: component.y + offsetY,
    props: { ...component.props },
    data: component.data ? component.data.map((d) => (typeof d === 'object' && d !== null ? { ...d } : d)) : component.data,
  }
}

function componentName(type: ComponentType) {
  return ({
    title: '标题', text: '文本', line: '折线图', bar: '柱状图', pie: '饼图', area: '区域图',
    scatter: '散点图', radar: '雷达图', funnel: '漏斗图', rose: '玫瑰图',
    barh: '条形图', barGroup: '分组柱状图', barStack: '堆叠柱状图',
    ring: '环形图', lineMulti: '多折线图', areaStack: '堆叠区域图',
    barPercent: '百分比柱状图', barhGroup: '分组条形图', barhStack: '堆叠条形图', lineStep: '阶梯折线图',
    barhPercent: '百分比条形图', areaPercent: '百分比区域图', scatterBubble: '气泡图',
    barRange: '区间柱状图', barWaterfall: '瀑布图', lineDual: '双轴折线图',
    pieNest: '嵌套饼图', gauge: '仪表盘', dualLineBar: '双轴折线柱状图',
    flipper: '数字翻牌器', timer: '时间器',
    label: '文字标签', countdown: '倒计时', marquee: '跑马灯', statusCard: '状态卡片',
    bizTrend: '业务指标趋势', image: '单张图片', carousel: '轮播图', colorBlock: '色块',
    bgBlock: '自定义背景块', video: '视频', audio: '音频',
    borderBox: '边框', decoration: '装饰', decorationBar: '装饰条',
    tableKv: '键值表格', tableCarousel: '轮播列表', tableProgress: '进度条表格',
    btn: '按钮', selectDropdown: '下拉选择器', selectRadio: '单选框', selectCheckbox: '复选框',
    selectSwitch: '开关', inputBasic: '输入框', inputSlider: '滑块',
    wordcloud: '词云', relationTree: '树图', relationSankey: '桑基图', relationChord: '和弦图',
    treemap: '矩形树图', yujue: '玉珏图', liquid: '水球图',
    mapChina: '中国地图', mapWorld: '世界地图', mapRegion: '自定义区域地图',
    mapFlight: '飞线图', mapScatter: '散点图层',
    doubleBar: '双柱状图', contrastBar: '对比柱状图', multiStack: '多维叠图',
    selectDate: '日期选择器', inputSearch: '搜索框', navTabs: 'Tab列表', navMenu: '菜单',
    navBreadcrumb: '面包屑', dataProgress: '进度条', dataSteps: '步骤条', dataTimeline: '时间轴',
    btnIcon: '图标按钮', icon: '图标',
    gallery: '图片轮播画廊', logoWall: '标志墙', arrowPlot: '箭头标绘', tableCarouselBar: '轮播列表柱状图',
    tablePivot: '交叉透视表', streamPlayer: '流播放器', rtmpPlayer: 'RTMP视频流播放器',
    earth3d: '3D地球', map3dChina: '3D平面中国地图', map3dWorld: '3D平面世界地图', city3d: '三维城市',
  } as const)[type]
}

export function parseCanvasConfig(raw: string | null, width: number, height: number): CanvasConfig {
  if (!raw) return defaultCanvas(width, height)
  try {
    const parsed = JSON.parse(raw) as Partial<CanvasConfig> & {
      /** v1 遗留：组件/参考线挂在配置顶层，迁移为默认第一页 */
      components?: CanvasComponent[]
      guides?: GuideLine[]
    }
    const base = defaultCanvas(width, height)
    const { components: legacyComponents, guides: legacyGuides, ...rest } = parsed
    const pages: Page[] = Array.isArray(rest.pages) && rest.pages.length > 0
      ? rest.pages.map((p, i) => ({
          id: p.id || `page_legacy_${i}`,
          name: p.name || `页面 ${i + 1}`,
          components: Array.isArray(p.components) ? p.components : [],
          guides: Array.isArray(p.guides) ? p.guides : [],
        }))
      : [{
          id: 'page_main',
          name: '主页面',
          components: Array.isArray(legacyComponents) ? legacyComponents : [],
          guides: Array.isArray(legacyGuides) ? legacyGuides : [],
        }]
    return {
      ...base,
      ...rest,
      version: 2,
      canvas: { ...base.canvas, ...rest.canvas },
      pages,
      blueprint: normalizeBlueprint(rest.blueprint),
    }
  } catch {
    return defaultCanvas(width, height)
  }
}
