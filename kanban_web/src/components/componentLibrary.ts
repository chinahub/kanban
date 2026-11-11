import type { ComponentType as ReactComponentType } from 'react'
import {
  AimOutlined,
  AppstoreOutlined,
  AudioOutlined,
  BarChartOutlined,
  BgColorsOutlined,
  BlockOutlined,
  BorderOutlined,
  CheckSquareOutlined,
  ClockCircleOutlined,
  CloudOutlined,
  ControlOutlined,
  DashboardOutlined,
  DeploymentUnitOutlined,
  DownSquareOutlined,
  EditOutlined,
  EnvironmentOutlined,
  FieldTimeOutlined,
  FileTextOutlined,
  FlagOutlined,
  FontSizeOutlined,
  GlobalOutlined,
  IdcardOutlined,
  InfoCircleOutlined,
  MenuOutlined,
  MinusOutlined,
  NodeIndexOutlined,
  NotificationOutlined,
  NumberOutlined,
  OrderedListOutlined,
  PictureOutlined,
  PlayCircleOutlined,
  PlaySquareOutlined,
  PoweroffOutlined,
  RiseOutlined,
  SearchOutlined,
  SendOutlined,
  SkinOutlined,
  SlidersOutlined,
  StarOutlined,
  SwapOutlined,
  TableOutlined,
  TagOutlined,
  VideoCameraOutlined,
} from '@ant-design/icons'
import type { ComponentType } from '../types/editor'

/** 图表缩略图种类（面板内联 SVG 预览用，无 DataV 缩略图的图表组件兜底） */
export type ChartThumbKind = 'bar' | 'line' | 'area' | 'pie' | 'scatter' | 'radar' | 'funnel' | 'rose'

/**
 * 已有 DataV 风格缩略图的组件 key（`public/thumbs/{key}.png`，取自 DataV 组件库）。
 * 面板优先渲染该图片，未收录的组件回落到内联 SVG / antd 图标。
 */
export const THUMB_KEYS: ReadonlySet<string> = new Set([
  // 图表-柱状图/条形图
  'bar-basic', 'bar-group', 'bar-stack', 'bar-percent', 'bar-range', 'bar-waterfall',
  'barh-basic', 'barh-group', 'barh-stack', 'barh-percent',
  // 图表-折线/区域/饼环/散点/雷达/关系/其他
  'line-basic', 'line-multi', 'line-step', 'line-dual',
  'area-basic', 'area-stack',
  'pie-basic', 'pie-ring', 'pie-rose', 'pie-nest',
  'scatter-basic', 'scatter-bubble', 'radar-basic',
  'relation-tree', 'relation-sankey', 'relation-chord',
  'funnel-basic', 'gauge', 'yujue', 'liquid',
  // 地图
  'map-china', 'map3d-china', 'map3d-world', 'earth3d',
  // 信息
  'title', 'text', 'label', 'wordcloud', 'flipper', 'timer', 'countdown',
  'marquee', 'status-card', 'biz-trend',
  // 表格（交叉透视表 Tab列表 的图在阿里内网 CDN，未收录）
  'table-progress', 'table-carousel', 'table-carousel-bar', 'table-kv',
  // 控件
  'btn-basic', 'select-dropdown', 'select-radio', 'select-checkbox', 'select-switch',
  'select-date', 'input-basic', 'input-slider', 'data-progress', 'data-steps',
  'data-timeline', 'nav-menu',
  // 媒体
  'image', 'carousel', 'gallery', 'decoration-bar', 'decoration', 'border-box',
  'color-block', 'bg-block', 'icon', 'logo-wall', 'arrow-plot', 'video', 'audio',
  'stream-player', 'rtmp-player',
  // 其他
  'treemap', 'dual-line-bar', 'multi-stack', 'double-bar', 'contrast-bar', 'multi-line',
])

/** antd 图标组件类型（仅引用，不在数据文件里写 JSX） */
export type IconComponent = ReactComponentType<{ className?: string }>

/** 组件库中的单个组件条目 */
export interface LibraryItem {
  key: string
  label: string
  /** 已接入渲染引擎的组件类型；为空表示未接入（面板中展示为"待接入"，不可添加） */
  type?: ComponentType
  /** 图表类组件的缩略图 */
  chart?: ChartThumbKind
  /** 非图表类组件的图标 */
  icon?: IconComponent
}

/** 二级分类（如 图表 → 柱状图） */
export interface LibrarySub {
  key: string
  label: string
  items: LibraryItem[]
}

/** 一级分类（图表/地图/信息/表格/控件/媒体/其他） */
export interface LibraryCategory {
  key: string
  label: string
  icon: IconComponent
  subs: LibrarySub[]
}

/**
 * 组件库分类数据，对齐 DataV 官方组件库结构（图表/地图/信息/表格/控件/媒体/其他）。
 * 已接入：全部图表变体（含百分比/区间/瀑布/双轴/气泡/嵌套饼/仪表盘/玉珏/水球）、
 * 关系图（树图/桑基图/和弦图）、地图（中国/世界/自定义区域/3D平面/3D地球/三维城市）、
 * 信息类、表格类（含交叉透视表/轮播列表柱状图）、控件类（含日期/搜索/步骤/时间轴/导航）、
 * 媒体类（含画廊/标志墙/箭头标绘/流播放器）、其他（矩形树图/多维叠图/双柱状/对比柱状）。
 * 二维码与模型查看器不提供。
 */
export const LIBRARY: LibraryCategory[] = [
  {
    key: 'chart',
    label: '图表',
    icon: BarChartOutlined,
    subs: [
      {
        key: 'bar',
        label: '柱状图',
        items: [
          { key: 'bar-basic', label: '基础柱状图', type: 'bar', chart: 'bar' },
          { key: 'bar-group', label: '分组柱状图', type: 'barGroup', chart: 'bar' },
          { key: 'bar-stack', label: '堆叠柱状图', type: 'barStack', chart: 'bar' },
          { key: 'bar-percent', label: '百分比柱状图', type: 'barPercent', chart: 'bar' },
          { key: 'bar-range', label: '区间柱状图', type: 'barRange', chart: 'bar' },
          { key: 'bar-waterfall', label: '瀑布图', type: 'barWaterfall', chart: 'bar' },
        ],
      },
      {
        key: 'barh',
        label: '条形图',
        items: [
          { key: 'barh-basic', label: '基础条形图', type: 'barh', chart: 'bar' },
          { key: 'barh-group', label: '分组条形图', type: 'barhGroup', chart: 'bar' },
          { key: 'barh-stack', label: '堆叠条形图', type: 'barhStack', chart: 'bar' },
          { key: 'barh-percent', label: '百分比条形图', type: 'barhPercent', chart: 'bar' },
        ],
      },
      {
        key: 'line',
        label: '折线图',
        items: [
          { key: 'line-basic', label: '基础折线图', type: 'line', chart: 'line' },
          { key: 'line-multi', label: '多折线图', type: 'lineMulti', chart: 'line' },
          { key: 'line-step', label: '阶梯折线图', type: 'lineStep', chart: 'line' },
          { key: 'line-dual', label: '双轴折线图', type: 'lineDual', chart: 'line' },
        ],
      },
      {
        key: 'area',
        label: '区域图',
        items: [
          { key: 'area-basic', label: '基础区域图', type: 'area', chart: 'area' },
          { key: 'area-stack', label: '堆叠区域图', type: 'areaStack', chart: 'area' },
          { key: 'area-percent', label: '百分比区域图', type: 'areaPercent', chart: 'area' },
        ],
      },
      {
        key: 'pie',
        label: '饼环图',
        items: [
          { key: 'pie-basic', label: '基础饼图', type: 'pie', chart: 'pie' },
          { key: 'pie-ring', label: '环形图', type: 'ring', chart: 'pie' },
          { key: 'pie-rose', label: '玫瑰图', type: 'rose', chart: 'rose' },
          { key: 'pie-nest', label: '嵌套饼图', type: 'pieNest', chart: 'pie' },
        ],
      },
      {
        key: 'scatter',
        label: '散点图',
        items: [
          { key: 'scatter-basic', label: '基础散点图', type: 'scatter', chart: 'scatter' },
          { key: 'scatter-bubble', label: '气泡图', type: 'scatterBubble', chart: 'scatter' },
        ],
      },
      {
        key: 'radar',
        label: '雷达图',
        items: [{ key: 'radar-basic', label: '基础雷达图', type: 'radar', chart: 'radar' }],
      },
      {
        key: 'relation',
        label: '关系图',
        items: [
          { key: 'relation-tree', label: '树图', type: 'relationTree', icon: NodeIndexOutlined },
          { key: 'relation-sankey', label: '桑基图', type: 'relationSankey', icon: SwapOutlined },
          { key: 'relation-chord', label: '和弦图', type: 'relationChord', icon: DeploymentUnitOutlined },
        ],
      },
      {
        key: 'other',
        label: '其他',
        items: [
          { key: 'funnel-basic', label: '漏斗图', type: 'funnel', chart: 'funnel' },
          { key: 'gauge', label: '仪表盘', type: 'gauge', icon: DashboardOutlined },
          { key: 'yujue', label: '玉珏图', type: 'yujue', chart: 'pie' },
          { key: 'liquid', label: '水球图', type: 'liquid', chart: 'pie' },
        ],
      },
    ],
  },
  {
    key: 'map',
    label: '地图',
    icon: GlobalOutlined,
    subs: [
      {
        key: 'basic',
        label: '基础平面地图',
        items: [
          { key: 'map-china', label: '中国地图', type: 'mapChina', icon: EnvironmentOutlined },
          { key: 'map-world', label: '世界地图', type: 'mapWorld', icon: GlobalOutlined },
          { key: 'map-region', label: '自定义区域地图', type: 'mapRegion', icon: EnvironmentOutlined },
        ],
      },
      {
        key: 'layers',
        label: '地图图层',
        items: [
          { key: 'map-flight', label: '飞线图', type: 'mapFlight', icon: SendOutlined },
          { key: 'map-scatter', label: '散点图层', type: 'mapScatter', icon: AimOutlined },
        ],
      },
      {
        key: 'flat3d',
        label: '3D平面地图',
        items: [
          { key: 'map3d-china', label: '3D平面中国地图', type: 'map3dChina', icon: EnvironmentOutlined },
          { key: 'map3d-world', label: '3D平面世界地图', type: 'map3dWorld', icon: GlobalOutlined },
        ],
      },
      {
        key: 'map3d',
        label: '3D地图',
        items: [
          { key: 'earth3d', label: '3D地球', type: 'earth3d', icon: GlobalOutlined },
          { key: 'city3d', label: '三维城市', type: 'city3d', icon: DeploymentUnitOutlined },
        ],
      },
    ],
  },
  {
    key: 'info',
    label: '信息',
    icon: InfoCircleOutlined,
    subs: [
      {
        key: 'all',
        label: '全部',
        items: [
          { key: 'title', label: '通用标题', type: 'title', icon: FontSizeOutlined },
          { key: 'text', label: '多行文本', type: 'text', icon: FileTextOutlined },
          { key: 'label', label: '文字标签', type: 'label', icon: TagOutlined },
          { key: 'wordcloud', label: '词云', type: 'wordcloud', icon: CloudOutlined },
          { key: 'flipper', label: '数字翻牌器', type: 'flipper', icon: NumberOutlined },
          { key: 'timer', label: '时间器', type: 'timer', icon: ClockCircleOutlined },
          { key: 'countdown', label: '倒计时', type: 'countdown', icon: FieldTimeOutlined },
          { key: 'marquee', label: '跑马灯', type: 'marquee', icon: NotificationOutlined },
          { key: 'status-card', label: '状态卡片', type: 'statusCard', icon: IdcardOutlined },
          { key: 'biz-trend', label: '业务指标趋势', type: 'bizTrend', icon: RiseOutlined },
        ],
      },
    ],
  },
  {
    key: 'table',
    label: '表格',
    icon: TableOutlined,
    subs: [
      {
        key: 'all',
        label: '全部',
        items: [
          { key: 'table-progress', label: '进度条表格', type: 'tableProgress', icon: TableOutlined },
          { key: 'table-carousel', label: '轮播列表', type: 'tableCarousel', icon: OrderedListOutlined },
          { key: 'table-pivot', label: '交叉透视表', type: 'tablePivot', icon: TableOutlined },
          { key: 'table-carousel-bar', label: '轮播列表柱状图', type: 'tableCarouselBar', icon: BarChartOutlined },
          { key: 'table-kv', label: '键值表格', type: 'tableKv', icon: TableOutlined },
        ],
      },
    ],
  },
  {
    key: 'control',
    label: '控件',
    icon: ControlOutlined,
    subs: [
      {
        key: 'button',
        label: '按钮类',
        items: [
          { key: 'btn-basic', label: '按钮', type: 'btn', icon: PoweroffOutlined },
          { key: 'btn-icon', label: '图标按钮', type: 'btnIcon', icon: PoweroffOutlined },
        ],
      },
      {
        key: 'select',
        label: '选择类',
        items: [
          { key: 'select-dropdown', label: '下拉选择器', type: 'selectDropdown', icon: DownSquareOutlined },
          { key: 'select-radio', label: '单选框', type: 'selectRadio', icon: CheckSquareOutlined },
          { key: 'select-checkbox', label: '复选框', type: 'selectCheckbox', icon: CheckSquareOutlined },
          { key: 'select-switch', label: '开关', type: 'selectSwitch', icon: ControlOutlined },
          { key: 'select-date', label: '日期选择器', type: 'selectDate', icon: ClockCircleOutlined },
        ],
      },
      {
        key: 'input',
        label: '输入类',
        items: [
          { key: 'input-basic', label: '输入框', type: 'inputBasic', icon: EditOutlined },
          { key: 'input-search', label: '搜索框', type: 'inputSearch', icon: SearchOutlined },
          { key: 'input-slider', label: '滑块', type: 'inputSlider', icon: SlidersOutlined },
        ],
      },
      {
        key: 'data',
        label: '数据类',
        items: [
          { key: 'data-progress', label: '进度条', type: 'dataProgress', icon: MinusOutlined },
          { key: 'data-steps', label: '步骤条', type: 'dataSteps', icon: OrderedListOutlined },
          { key: 'data-timeline', label: '时间轴', type: 'dataTimeline', icon: FieldTimeOutlined },
        ],
      },
      {
        key: 'nav',
        label: '导航类',
        items: [
          { key: 'nav-tabs', label: 'Tab列表', type: 'navTabs', icon: MenuOutlined },
          { key: 'nav-menu', label: '菜单', type: 'navMenu', icon: MenuOutlined },
          { key: 'nav-breadcrumb', label: '面包屑', type: 'navBreadcrumb', icon: MenuOutlined },
        ],
      },
    ],
  },
  {
    key: 'media',
    label: '媒体',
    icon: PlaySquareOutlined,
    subs: [
      {
        key: 'all',
        label: '全部',
        items: [
          { key: 'image', label: '单张图片', type: 'image', icon: PictureOutlined },
          { key: 'carousel', label: '轮播图', type: 'carousel', icon: PictureOutlined },
          { key: 'gallery', label: '图片轮播画廊', type: 'gallery', icon: PictureOutlined },
          { key: 'decoration-bar', label: '装饰条', type: 'decorationBar', icon: MinusOutlined },
          { key: 'decoration', label: '装饰', type: 'decoration', icon: SkinOutlined },
          { key: 'border-box', label: '边框', type: 'borderBox', icon: BorderOutlined },
          { key: 'color-block', label: '色块', type: 'colorBlock', icon: BgColorsOutlined },
          { key: 'bg-block', label: '自定义背景块', type: 'bgBlock', icon: BlockOutlined },
          { key: 'icon', label: '图标', type: 'icon', icon: StarOutlined },
          { key: 'logo-wall', label: '标志墙', type: 'logoWall', icon: FlagOutlined },
          { key: 'arrow-plot', label: '箭头标绘', type: 'arrowPlot', icon: NodeIndexOutlined },
          { key: 'video', label: '视频', type: 'video', icon: VideoCameraOutlined },
          { key: 'audio', label: '音频', type: 'audio', icon: AudioOutlined },
          { key: 'stream-player', label: '流播放器', type: 'streamPlayer', icon: PlayCircleOutlined },
          { key: 'rtmp-player', label: 'RTMP视频流播放器', type: 'rtmpPlayer', icon: VideoCameraOutlined },
        ],
      },
    ],
  },
  {
    key: 'misc',
    label: '其他',
    icon: AppstoreOutlined,
    subs: [
      {
        key: 'all',
        label: '全部',
        items: [
          { key: 'treemap', label: '矩形树图', type: 'treemap', icon: BlockOutlined },
          { key: 'dual-line-bar', label: '双轴折线柱状图', type: 'dualLineBar', chart: 'bar' },
          { key: 'multi-stack', label: '多维叠图', type: 'multiStack', chart: 'area' },
          { key: 'double-bar', label: '双柱状图', type: 'doubleBar', chart: 'bar' },
          { key: 'contrast-bar', label: '对比柱状图', type: 'contrastBar', chart: 'bar' },
          { key: 'multi-line', label: '多折线图', type: 'lineMulti', chart: 'line' },
        ],
      },
    ],
  },
]
