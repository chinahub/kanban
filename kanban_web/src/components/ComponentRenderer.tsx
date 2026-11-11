import { memo, useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { Chart } from '@antv/g2'
import { Button, Checkbox, Input, Radio, Select, Slider, Switch } from 'antd'
import type { CanvasComponent } from '../types/editor'
import { useEffectiveFilterCode } from '../store/filterStore'
import { useVariableStore } from '../store/variableStore'
import { useDictStore } from '../store/dictStore'
import { parseExt } from '../hooks/useDict'
import { interpolateVars } from '../util/varInterpolate'
import { runFilterAsync } from '../util/filterRunner'
import { setRuntimeVariable, useInteractionStore } from '../util/interactionRunner'
import { INTERACTION_EVENT } from '../store/editorStore'
import { chartTextColor } from '../util/chartTextColor'
import { defaultNestData } from '../types/editor'
import { WordCloud, RelationTree, RelationSankey, RelationChord, TreeMap, Liquid } from './widgets/graphComponents'
import { MapChina, MapWorld, MapRegion } from './widgets/mapComponents'
import { FlylineMap, ScatterMap } from './widgets/mapLayers'
import {
  SelectDate, InputSearch, NavTabs, NavMenu, NavBreadcrumb,
  DataProgress, DataSteps, DataTimeline, BtnIcon, IconDisplay,
} from './widgets/controlComponents2'
import { Gallery, LogoWall, ArrowPlot, TableCarouselBar } from './widgets/mediaComponents2'
import { TablePivot } from './widgets/pivotTable'
import { StreamPlayer, RtmpPlayer } from './widgets/streamPlayers'
import { Earth3D, Map3DChina, Map3DWorld, City3D } from './widgets/threeComponents'

interface ComponentRendererProps {
  component: CanvasComponent
  scale?: number
  /** 画布背景色，用于图表文字颜色自适应明暗 */
  background?: string
  /** 运行态（预览/分享）为 true：控件可交互；编辑器内为 false，控件不响应鼠标以免吞掉选择点击 */
  interactive?: boolean
}

function ComponentRendererBase({ component, scale = 1, background, interactive = false }: ComponentRendererProps) {
  const variables = useVariableStore((s) => s.variables)
  if (component.type === 'title' || component.type === 'text') {
    const display = interpolateVars(String(component.props.text ?? component.name), variables)
    return (
      <div
        style={{
          width: '100%',
          height: '100%',
          color: String(component.props.color ?? '#fff'),
          fontSize: Number(component.props.fontSize ?? 18) * scale,
          fontWeight: Number(component.props.fontWeight ?? 400),
          display: 'flex',
          alignItems: 'center',
          overflow: 'hidden',
          whiteSpace: 'pre-wrap',
        }}
      >
        {display}
      </div>
    )
  }
  if (component.type === 'flipper') {
    return <Flipper component={component} scale={scale} />
  }
  if (component.type === 'timer') {
    return <Timer component={component} scale={scale} />
  }
  if (component.type === 'gauge') {
    return <Gauge component={component} scale={scale} />
  }
  if (component.type === 'pieNest') {
    return <PieNest component={component} scale={scale} />
  }
  if (component.type === 'label') {
    return <Label component={component} scale={scale} />
  }
  if (component.type === 'countdown') {
    return <Countdown component={component} scale={scale} />
  }
  if (component.type === 'marquee') {
    return <Marquee component={component} scale={scale} />
  }
  if (component.type === 'statusCard') {
    return <StatusCard component={component} scale={scale} />
  }
  if (component.type === 'bizTrend') {
    return <BizTrend component={component} scale={scale} />
  }
  if (component.type === 'image') {
    return <ImageBox component={component} scale={scale} />
  }
  if (component.type === 'carousel') {
    return <Carousel component={component} scale={scale} />
  }
  if (component.type === 'colorBlock') {
    return (
      <div style={{ width: '100%', height: '100%', background: String(component.props.color ?? '#12305e'), borderRadius: Number(component.props.borderRadius ?? 8) }} />
    )
  }
  if (component.type === 'bgBlock') {
    const bw = Number(component.props.borderWidth ?? 1)
    return (
      <div
        style={{
          width: '100%',
          height: '100%',
          background: String(component.props.color ?? 'rgba(18,48,94,0.4)'),
          border: bw > 0 ? `${bw}px solid ${String(component.props.borderColor ?? '#2a4b8f')}` : 'none',
          borderRadius: Number(component.props.borderRadius ?? 8),
          boxSizing: 'border-box',
        }}
      />
    )
  }
  if (component.type === 'video' || component.type === 'audio') {
    return <MediaPlayer component={component} scale={scale} />
  }
  if (component.type === 'borderBox') {
    return <BorderBox component={component} scale={scale} />
  }
  if (component.type === 'decoration') {
    return <Decoration component={component} scale={scale} />
  }
  if (component.type === 'decorationBar') {
    return <DecorationBar component={component} scale={scale} />
  }
  if (component.type === 'tableKv') {
    return <TableKv component={component} scale={scale} />
  }
  if (component.type === 'tableCarousel') {
    return <TableCarousel component={component} scale={scale} />
  }
  if (component.type === 'tableProgress') {
    return <TableProgress component={component} scale={scale} />
  }
  if (CONTROL_TYPES.includes(component.type)) {
    return <Control component={component} scale={scale} interactive={interactive} />
  }
  // P-E 扩展组件（widgets/ 目录，d3/SVG/antd/three.js 实现）
  if (component.type === 'wordcloud') return <WordCloud component={component} scale={scale} />
  if (component.type === 'relationTree') return <RelationTree component={component} scale={scale} />
  if (component.type === 'relationSankey') return <RelationSankey component={component} scale={scale} />
  if (component.type === 'relationChord') return <RelationChord component={component} scale={scale} />
  if (component.type === 'treemap') return <TreeMap component={component} scale={scale} />
  if (component.type === 'liquid') return <Liquid component={component} scale={scale} />
  if (component.type === 'mapChina') return <MapChina component={component} scale={scale} interactive={interactive} />
  if (component.type === 'mapWorld') return <MapWorld component={component} scale={scale} interactive={interactive} />
  if (component.type === 'mapRegion') return <MapRegion component={component} scale={scale} interactive={interactive} />
  if (component.type === 'mapFlight') return <FlylineMap component={component} scale={scale} interactive={interactive} />
  if (component.type === 'mapScatter') return <ScatterMap component={component} scale={scale} interactive={interactive} />
  if (component.type === 'selectDate') return <SelectDate component={component} scale={scale} interactive={interactive} />
  if (component.type === 'inputSearch') return <InputSearch component={component} scale={scale} interactive={interactive} />
  if (component.type === 'navTabs') return <NavTabs component={component} scale={scale} interactive={interactive} />
  if (component.type === 'navMenu') return <NavMenu component={component} scale={scale} interactive={interactive} />
  if (component.type === 'navBreadcrumb') return <NavBreadcrumb component={component} scale={scale} interactive={interactive} />
  if (component.type === 'dataProgress') return <DataProgress component={component} scale={scale} interactive={interactive} />
  if (component.type === 'dataSteps') return <DataSteps component={component} scale={scale} interactive={interactive} />
  if (component.type === 'dataTimeline') return <DataTimeline component={component} scale={scale} interactive={interactive} />
  if (component.type === 'btnIcon') return <BtnIcon component={component} scale={scale} interactive={interactive} />
  if (component.type === 'icon') return <IconDisplay component={component} scale={scale} interactive={interactive} />
  if (component.type === 'gallery') return <Gallery component={component} scale={scale} />
  if (component.type === 'logoWall') return <LogoWall component={component} scale={scale} />
  if (component.type === 'arrowPlot') return <ArrowPlot component={component} scale={scale} />
  if (component.type === 'tableCarouselBar') return <TableCarouselBar component={component} scale={scale} />
  if (component.type === 'tablePivot') return <TablePivot component={component} scale={scale} />
  if (component.type === 'streamPlayer') return <StreamPlayer component={component} scale={scale} />
  if (component.type === 'rtmpPlayer') return <RtmpPlayer component={component} scale={scale} />
  if (component.type === 'earth3d') return <Earth3D component={component} scale={scale} />
  if (component.type === 'map3dChina') return <Map3DChina component={component} scale={scale} />
  if (component.type === 'map3dWorld') return <Map3DWorld component={component} scale={scale} />
  if (component.type === 'city3d') return <City3D component={component} scale={scale} />
  return <G2Chart component={component} scale={scale} background={background} interactive={interactive} />
}

/** 数字翻牌器：props.value 变化时滚动过渡到新值 */
function Flipper({ component, scale = 1 }: ComponentRendererProps) {
  const target = Number(component.props.value ?? 0)
  const [display, setDisplay] = useState(target)
  const prevRef = useRef(target)

  useEffect(() => {
    const from = prevRef.current
    const to = target
    prevRef.current = to
    if (from === to) {
      setDisplay(to)
      return
    }
    // rAF 线性滚动，800ms 内从旧值过渡到新值
    const start = performance.now()
    let raf = 0
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / 800)
      setDisplay(from + (to - from) * p)
      if (p < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [target])

  // 按目标值的小数位格式化，滚动过程中不引入额外精度
  const decimals = (String(target).split('.')[1] ?? '').length
  const text = display.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        color: String(component.props.color ?? '#4f8cff'),
        fontSize: Number(component.props.fontSize ?? 36) * scale,
        fontWeight: 700,
        fontFamily: 'monospace',
        display: 'flex',
        alignItems: 'center',
        overflow: 'hidden',
        whiteSpace: 'nowrap',
      }}
    >
      {text}
    </div>
  )
}

/** 时间器：每秒刷新当前时间，格式由 props.format 令牌控制（YYYY MM DD HH mm ss） */
function Timer({ component, scale = 1 }: ComponentRendererProps) {
  const [, setTick] = useState(0)
  useEffect(() => {
    const t = setInterval(() => setTick((x) => x + 1), 1000)
    return () => clearInterval(t)
  }, [])

  const now = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  const text = String(component.props.format ?? 'YYYY-MM-DD HH:mm:ss')
    .replace('YYYY', String(now.getFullYear()))
    .replace('MM', pad(now.getMonth() + 1))
    .replace('DD', pad(now.getDate()))
    .replace('HH', pad(now.getHours()))
    .replace('mm', pad(now.getMinutes()))
    .replace('ss', pad(now.getSeconds()))
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        color: String(component.props.color ?? '#fff'),
        fontSize: Number(component.props.fontSize ?? 24) * scale,
        fontFamily: 'monospace',
        display: 'flex',
        alignItems: 'center',
        overflow: 'hidden',
        whiteSpace: 'nowrap',
      }}
    >
      {text}
    </div>
  )
}

const ComponentRenderer = memo(ComponentRendererBase)
export default ComponentRenderer

/** 调色板（嵌套饼图分片用） */
const NEST_PALETTE = ['#4f8cff', '#5ad8a6', '#f6bd16', '#f5576c', '#945fb9', '#1e9493', '#6e9eff', '#ff9d4d']

/** 仪表盘：SVG 半圆环 + 进度弧 + 数值（props.value/min/max 驱动，不绑数据） */
function Gauge({ component, scale = 1 }: ComponentRendererProps) {
  const value = Number(component.props.value ?? 66)
  const min = Number(component.props.min ?? 0)
  const max = Number(component.props.max ?? 100)
  const ratio = max > min ? Math.min(1, Math.max(0, (value - min) / (max - min))) : 0
  const color = String(component.props.color ?? '#4f8cff')
  const r = 80
  const half = Math.PI * r
  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
      <svg viewBox="0 0 200 120" style={{ width: '90%', maxHeight: '75%' }}>
        <path d={`M ${100 - r} 100 A ${r} ${r} 0 0 1 ${100 + r} 100`} fill="none" stroke="#2a3550" strokeWidth={14} strokeLinecap="round" />
        <path
          d={`M ${100 - r} 100 A ${r} ${r} 0 0 1 ${100 + r} 100`}
          fill="none"
          stroke={color}
          strokeWidth={14}
          strokeLinecap="round"
          strokeDasharray={`${ratio * half} ${half}`}
        />
        <text x={100} y={92} textAnchor="middle" fill={color} fontSize={30} fontWeight={700}>
          {value}
        </text>
        <text x={100 - r} y={118} textAnchor="middle" fill="#7f8db3" fontSize={11}>{min}</text>
        <text x={100 + r} y={118} textAnchor="middle" fill="#7f8db3" fontSize={11}>{max}</text>
      </svg>
      <div style={{ color: '#dbeafe', fontSize: 13 * scale }}>{String(component.props.title ?? component.name)}</div>
    </div>
  )
}

/** 嵌套饼图：双环 donut，data 形如 { name, layer: '内层'|'外层', value }（SVG 实现，避开 G2 多坐标系复杂度） */
function PieNest({ component, scale = 1 }: ComponentRendererProps) {
  const data = (component.data?.length ? component.data : defaultNestData) as { name: string; layer?: string; value: number }[]
  const inner = data.filter((d) => d.layer !== '外层')
  const outer = data.filter((d) => d.layer === '外层')
  // 每环一组扇区：stroke-dasharray 分段画在圆周上
  const ring = (rows: { name: string; value: number }[], radius: number, width: number, paletteOffset: number) => {
    const total = rows.reduce((s, d) => s + (Number(d.value) || 0), 0) || 1
    const c = 2 * Math.PI * radius
    let acc = 0
    return rows.map((d, i) => {
      const frac = (Number(d.value) || 0) / total
      const el = (
        <circle
          key={i}
          cx={110}
          cy={110}
          r={radius}
          fill="none"
          stroke={NEST_PALETTE[(paletteOffset + i) % NEST_PALETTE.length]}
          strokeWidth={width}
          strokeDasharray={`${Math.max(0, frac * c - 2)} ${c - Math.max(0, frac * c - 2)}`}
          strokeDashoffset={-acc * c + c / 4}
        >
          <title>{`${d.name}: ${d.value}`}</title>
        </circle>
      )
      acc += frac
      return el
    })
  }
  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
      <div style={{ color: '#dbeafe', fontSize: 13 * scale }}>{String(component.props.title ?? component.name)}</div>
      <svg viewBox="0 0 220 220" style={{ width: '90%', maxHeight: '85%' }}>
        {ring(outer, 96, 22, inner.length)}
        {ring(inner, 68, 22, 0)}
      </svg>
    </div>
  )
}

/** 文字标签：带背景色的小标签（props.text/fontSize/color/background/borderRadius） */
function Label({ component, scale = 1 }: ComponentRendererProps) {
  const variables = useVariableStore((s) => s.variables)
  const display = interpolateVars(String(component.props.text ?? component.name), variables)
  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', overflow: 'hidden' }}>
      <span
        style={{
          background: String(component.props.background ?? '#1d39c4'),
          color: String(component.props.color ?? '#ffffff'),
          fontSize: Number(component.props.fontSize ?? 16) * scale,
          borderRadius: Number(component.props.borderRadius ?? 4),
          padding: `${2 * scale}px ${10 * scale}px`,
          whiteSpace: 'nowrap',
        }}
      >
        {display}
      </span>
    </div>
  )
}

/** 倒计时：到 props.targetTime（YYYY-MM-DD HH:mm:ss）的剩余时间，每秒刷新 */
function Countdown({ component, scale = 1 }: ComponentRendererProps) {
  const [, setTick] = useState(0)
  useEffect(() => {
    const t = setInterval(() => setTick((x) => x + 1), 1000)
    return () => clearInterval(t)
  }, [])

  const target = new Date(String(component.props.targetTime ?? '').replace(' ', 'T')).getTime()
  const remain = Math.max(0, Math.floor((target - Date.now()) / 1000))
  const pad = (n: number) => String(n).padStart(2, '0')
  const days = Math.floor(remain / 86400)
  const text = Number.isNaN(target)
    ? '请配置目标时间'
    : `${days > 0 ? `${days} 天 ` : ''}${pad(Math.floor((remain % 86400) / 3600))}:${pad(Math.floor((remain % 3600) / 60))}:${pad(remain % 60)}`
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        color: String(component.props.color ?? '#4f8cff'),
        fontSize: Number(component.props.fontSize ?? 24) * scale,
        fontFamily: 'monospace',
        fontWeight: 700,
        display: 'flex',
        alignItems: 'center',
        overflow: 'hidden',
        whiteSpace: 'nowrap',
      }}
    >
      {text}
    </div>
  )
}

/** 跑马灯：文本横向无缝滚动，props.speed 为滚动速度（px/s，按画布缩放前计） */
function Marquee({ component, scale = 1 }: ComponentRendererProps) {
  const variables = useVariableStore((s) => s.variables)
  const text = interpolateVars(String(component.props.text ?? ''), variables)
  const fontSize = Number(component.props.fontSize ?? 18) * scale
  const speed = Number(component.props.speed ?? 60) * scale
  // 估算文本宽度（中文约 1em/字，英文约 0.55em/字），推算一轮时长
  const estWidth = [...text].reduce((w, ch) => w + (ch.charCodeAt(0) > 255 ? fontSize : fontSize * 0.55), 0) + fontSize * 2
  const duration = Math.max(2, estWidth / Math.max(10, speed))
  return (
    <div style={{ width: '100%', height: '100%', overflow: 'hidden', display: 'flex', alignItems: 'center' }}>
      <style>{'@keyframes kanban-marquee{from{transform:translateX(0)}to{transform:translateX(-50%)}}'}</style>
      <div
        style={{
          display: 'inline-block',
          whiteSpace: 'nowrap',
          animation: `kanban-marquee ${duration}s linear infinite`,
          color: String(component.props.color ?? '#ffffff'),
          fontSize,
        }}
      >
        <span style={{ paddingRight: fontSize * 2 }}>{text}</span>
        <span style={{ paddingRight: fontSize * 2 }}>{text}</span>
      </div>
    </div>
  )
}

// 状态卡片颜色的内置兜底（正常路径由 sys_dict 的 status_card_status 下发 ext.color 覆盖）
const STATUS_COLORS: Record<string, string> = { online: '#52c41a', warning: '#faad14', offline: '#ff4d4f' }

/**
 * 状态卡片颜色映射：只读字典缓存做覆盖增强，不主动请求——
 * 分享页等未登录场景 dicts 为 null，直接走内置兜底，保证渲染零闪烁零劣化。
 */
function useStatusCardColors(): Record<string, string> {
  const dicts = useDictStore((s) => s.dicts)
  return useMemo(() => {
    const merged: Record<string, string> = { ...STATUS_COLORS }
    const items = dicts?.find((d) => d.dictType === 'status_card_status')?.items ?? []
    for (const i of items) {
      if (!i.enabled) continue
      const color = parseExt(i.extJson).color
      if (typeof color === 'string') merged[i.value] = color
    }
    return merged
  }, [dicts])
}

/** 状态卡片：状态点 + 名称 + 说明（props.label/status/value） */
function StatusCard({ component, scale = 1 }: ComponentRendererProps) {
  const statusColors = useStatusCardColors()
  const status = String(component.props.status ?? 'online')
  const color = statusColors[status] ?? STATUS_COLORS.online
  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', gap: 8 * scale, overflow: 'hidden', whiteSpace: 'nowrap' }}>
      <span style={{ width: 10 * scale, height: 10 * scale, borderRadius: '50%', background: color, boxShadow: `0 0 ${6 * scale}px ${color}`, flex: 'none' }} />
      <span style={{ color: '#dbeafe', fontSize: 16 * scale }}>{String(component.props.label ?? '状态')}</span>
      <span style={{ color, fontSize: 14 * scale }}>{String(component.props.value ?? '')}</span>
    </div>
  )
}

/** 业务指标趋势：指标名 + 大数值 + 涨跌箭头百分比（涨红跌绿） */
function BizTrend({ component, scale = 1 }: ComponentRendererProps) {
  const up = Boolean(component.props.up ?? true)
  const percent = Number(component.props.percent ?? 0)
  const trendColor = up ? '#f5576c' : '#52c41a'
  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', gap: 12 * scale, overflow: 'hidden', whiteSpace: 'nowrap' }}>
      <span style={{ color: '#7f8db3', fontSize: 14 * scale }}>{String(component.props.label ?? '')}</span>
      <span style={{ color: '#ffffff', fontSize: 24 * scale, fontWeight: 700, fontFamily: 'monospace' }}>
        {Number(component.props.value ?? 0).toLocaleString('en-US')}
        <small style={{ fontSize: 12 * scale, fontWeight: 400, marginLeft: 2 * scale }}>{String(component.props.suffix ?? '')}</small>
      </span>
      <span style={{ color: trendColor, fontSize: 14 * scale }}>
        {up ? '▲' : '▼'} {Math.abs(percent)}%
      </span>
    </div>
  )
}

/** 资源未配置时的占位框 */
function EmptyHolder({ hint, scale = 1 }: { hint: string; scale?: number }) {
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        border: '1px dashed #2a3550',
        borderRadius: 4,
        color: '#7f8db3',
        fontSize: 13 * scale,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxSizing: 'border-box',
      }}
    >
      {hint}
    </div>
  )
}

/** 单张图片：props.url + fit（cover/contain/fill），空地址显示占位 */
function ImageBox({ component }: ComponentRendererProps) {
  const url = String(component.props.url ?? '')
  if (!url) return <EmptyHolder hint="请在样式面板配置图片地址" />
  return (
    <img
      src={url}
      alt={component.name}
      style={{ width: '100%', height: '100%', objectFit: (component.props.fit as 'cover' | 'contain' | 'fill') ?? 'cover', display: 'block' }}
    />
  )
}

/** 轮播图：props.urls 每行一个地址，按 interval 秒淡入淡出轮播 */
function Carousel({ component }: ComponentRendererProps) {
  const urls = String(component.props.urls ?? '').split('\n').map((s) => s.trim()).filter(Boolean)
  const [index, setIndex] = useState(0)
  const interval = Math.max(1, Number(component.props.interval ?? 3))
  useEffect(() => {
    if (urls.length < 2) return
    const t = setInterval(() => setIndex((i) => (i + 1) % urls.length), interval * 1000)
    return () => clearInterval(t)
  }, [urls.length, interval])
  if (urls.length === 0) return <EmptyHolder hint="请在样式面板配置图片地址（每行一个）" />
  const current = urls[index % urls.length]
  return (
    <div style={{ width: '100%', height: '100%', position: 'relative', overflow: 'hidden' }}>
      <img
        key={current}
        src={current}
        alt={component.name}
        style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', transition: 'opacity 0.5s' }}
      />
      {urls.length > 1 && (
        <div style={{ position: 'absolute', bottom: 6, right: 8, display: 'flex', gap: 4 }}>
          {urls.map((u, i) => (
            <span key={u} style={{ width: 6, height: 6, borderRadius: '50%', background: i === index % urls.length ? '#4f8cff' : 'rgba(255,255,255,0.35)' }} />
          ))}
        </div>
      )}
    </div>
  )
}

/** 视频/音频：原生标签，空地址显示占位，媒体加载失败时显示错误提示 */
function MediaPlayer({ component, scale = 1 }: ComponentRendererProps) {
  const url = String(component.props.url ?? '')
  const kind = component.type === 'video' ? '视频' : '音频'
  const [loadFailed, setLoadFailed] = useState(false)
  // 地址或媒体类型变化时重置错误状态，之后可重新尝试加载
  useEffect(() => {
    setLoadFailed(false)
  }, [url, component.type])
  if (!url) return <EmptyHolder hint={`请在样式面板配置${kind}地址`} />
  if (loadFailed) {
    return (
      <div
        style={{
          width: '100%',
          height: '100%',
          background: '#000',
          color: '#ff7d7d',
          fontSize: 13 * scale,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 6 * scale,
          boxSizing: 'border-box',
          padding: 8,
          textAlign: 'center',
        }}
      >
        <span>{kind}加载失败，请检查地址是否可正常访问</span>
        <span style={{ color: '#7f8db3' }}>
          短视频平台的临时链接有时效或 IP 绑定，过期后无法播放，建议改用素材库上传或稳定直链
        </span>
      </div>
    )
  }
  if (component.type === 'video') {
    return (
      <video
        src={url}
        style={{ width: '100%', height: '100%', objectFit: 'contain', background: '#000' }}
        autoPlay={Boolean(component.props.autoplay)}
        loop={Boolean(component.props.loop)}
        muted={Boolean(component.props.muted)}
        controls={Boolean(component.props.controls ?? true)}
        onError={() => setLoadFailed(true)}
      />
    )
  }
  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center' }}>
      <audio
        src={url}
        style={{ width: '100%' }}
        autoPlay={Boolean(component.props.autoplay)}
        loop={Boolean(component.props.loop)}
        controls={Boolean(component.props.controls ?? true)}
        onError={() => setLoadFailed(true)}
      />
    </div>
  )
}

/** 边框：DataV 风格科技边框，style 支持 corner（四角）/frame（整框）/double（双线框） */
function BorderBox({ component }: ComponentRendererProps) {
  const color = String(component.props.color ?? '#2a4b8f')
  const style = String(component.props.style ?? 'corner')
  const stroke = { stroke: color, fill: 'none', vectorEffect: 'non-scaling-stroke' as const }
  const L = 14 // 角括号边长（viewBox 100 坐标系）
  return (
    <svg viewBox="0 0 100 100" preserveAspectRatio="none" style={{ width: '100%', height: '100%', display: 'block' }}>
      {(style === 'frame' || style === 'double') && (
        <rect x={1} y={1} width={98} height={98} strokeWidth={1} {...stroke} opacity={0.6} />
      )}
      {style === 'double' && <rect x={4} y={4} width={92} height={92} strokeWidth={1} {...stroke} opacity={0.35} />}
      {/* 四角括号 */}
      <path d={`M 1 ${L} L 1 1 L ${L} 1`} strokeWidth={2} {...stroke} />
      <path d={`M ${100 - L} 1 L 99 1 L 99 ${L}`} strokeWidth={2} {...stroke} />
      <path d={`M 99 ${100 - L} L 99 99 L ${100 - L} 99`} strokeWidth={2} {...stroke} />
      <path d={`M ${L} 99 L 1 99 L 1 ${100 - L}`} strokeWidth={2} {...stroke} />
    </svg>
  )
}

/** 装饰：几何纹理，style 支持 slashes（斜线）/dots（点阵） */
function Decoration({ component }: ComponentRendererProps) {
  const color = String(component.props.color ?? '#2a4b8f')
  const style = String(component.props.style ?? 'slashes')
  const items: React.ReactNode[] = []
  if (style === 'dots') {
    for (let x = 4; x < 100; x += 8) {
      for (let y = 4; y < 100; y += 8) {
        items.push(<circle key={`${x}-${y}`} cx={x} cy={y} r={1.2} fill={color} opacity={0.7} />)
      }
    }
  } else {
    for (let i = -10; i < 20; i++) {
      items.push(<line key={i} x1={i * 10} y1={100} x2={i * 10 + 30} y2={0} stroke={color} strokeWidth={1} opacity={0.5} vectorEffect="non-scaling-stroke" />)
    }
  }
  return (
    <svg viewBox="0 0 100 100" preserveAspectRatio="none" style={{ width: '100%', height: '100%', display: 'block' }}>
      {items}
    </svg>
  )
}

/** 装饰条：两端渐隐的横线 + 中央菱形 */
function DecorationBar({ component }: ComponentRendererProps) {
  const color = String(component.props.color ?? '#4f8cff')
  const gid = `decbar-${component.id}`
  return (
    <svg viewBox="0 0 200 12" preserveAspectRatio="none" style={{ width: '100%', height: '100%', display: 'block' }}>
      <defs>
        <linearGradient id={`${gid}-l`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor={color} stopOpacity={0} />
          <stop offset="1" stopColor={color} />
        </linearGradient>
        <linearGradient id={`${gid}-r`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor={color} />
          <stop offset="1" stopColor={color} stopOpacity={0} />
        </linearGradient>
      </defs>
      <rect x={0} y={5} width={90} height={2} fill={`url(#${gid}-l)`} />
      <rect x={110} y={5} width={90} height={2} fill={`url(#${gid}-r)`} />
      <polygon points="100,1 105,6 100,11 95,6" fill={color} />
    </svg>
  )
}

type TableRow = Record<string, unknown>

const tableCellBase: React.CSSProperties = { padding: '6px 10px', borderBottom: '1px solid rgba(42,53,80,0.6)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }

/** 键值表格：data 形如 { key, value }（兼容 name/value），两列等宽展示 */
function TableKv({ component, scale = 1 }: ComponentRendererProps) {
  const rows = (component.data?.length ? component.data : []) as TableRow[]
  const fontSize = 13 * scale
  return (
    <div style={{ width: '100%', height: '100%', overflow: 'hidden', fontSize }}>
      {rows.map((r, i) => (
        <div key={i} style={{ display: 'flex', background: i % 2 ? 'rgba(42,53,80,0.25)' : 'transparent' }}>
          <span style={{ ...tableCellBase, flex: 1, color: '#7f8db3' }}>{String(r.key ?? r.name ?? '')}</span>
          <span style={{ ...tableCellBase, flex: 1, color: '#dbeafe', textAlign: 'right' }}>{String(r.value ?? '')}</span>
        </div>
      ))}
    </div>
  )
}

/** 轮播列表：data 形如 { name, value }，每隔 interval 秒把首行移到最后实现纵向滚动 */
function TableCarousel({ component, scale = 1 }: ComponentRendererProps) {
  const rows = (component.data?.length ? component.data : []) as TableRow[]
  const [offset, setOffset] = useState(0)
  const interval = Math.max(1, Number(component.props.interval ?? 2))
  useEffect(() => {
    if (rows.length < 2) return
    const t = setInterval(() => setOffset((o) => o + 1), interval * 1000)
    return () => clearInterval(t)
  }, [rows.length, interval])
  const ordered = rows.length ? [...rows.slice(offset % rows.length), ...rows.slice(0, offset % rows.length)] : []
  const fontSize = 13 * scale
  return (
    <div style={{ width: '100%', height: '100%', overflow: 'hidden', fontSize }}>
      <div style={{ display: 'flex', borderBottom: '1px solid #2a3550' }}>
        <span style={{ ...tableCellBase, width: '3em', color: '#7f8db3' }}>#</span>
        <span style={{ ...tableCellBase, flex: 1, color: '#7f8db3' }}>名称</span>
        <span style={{ ...tableCellBase, width: '5em', color: '#7f8db3', textAlign: 'right' }}>数值</span>
      </div>
      {ordered.map((r, i) => (
        <div key={`${offset % rows.length}-${i}`} style={{ display: 'flex', background: i % 2 ? 'rgba(42,53,80,0.25)' : 'transparent' }}>
          <span style={{ ...tableCellBase, width: '3em', color: '#4f8cff' }}>{((offset + i) % rows.length) + 1}</span>
          <span style={{ ...tableCellBase, flex: 1, color: '#dbeafe' }}>{String(r.name ?? r.key ?? '')}</span>
          <span style={{ ...tableCellBase, width: '5em', color: '#dbeafe', textAlign: 'right' }}>{String(r.value ?? '')}</span>
        </div>
      ))}
    </div>
  )
}

/** 进度条表格：data 形如 { name, value }，行内进度条（value/max） */
function TableProgress({ component, scale = 1 }: ComponentRendererProps) {
  const rows = (component.data?.length ? component.data : []) as TableRow[]
  const max = Number(component.props.max ?? 100) || 100
  const color = String(component.props.color ?? '#4f8cff')
  const fontSize = 13 * scale
  return (
    <div style={{ width: '100%', height: '100%', overflow: 'hidden', fontSize }}>
      {rows.map((r, i) => {
        const value = Number(r.value) || 0
        const pct = Math.min(100, Math.max(0, (value / max) * 100))
        return (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 * scale, padding: '6px 10px', borderBottom: '1px solid rgba(42,53,80,0.6)' }}>
            <span style={{ width: '6em', color: '#dbeafe', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{String(r.name ?? '')}</span>
            <span style={{ flex: 1, height: 8 * scale, background: 'rgba(42,53,80,0.6)', borderRadius: 4 * scale, overflow: 'hidden' }}>
              <span style={{ display: 'block', width: `${pct}%`, height: '100%', background: color, borderRadius: 4 * scale, transition: 'width 0.5s' }} />
            </span>
            <span style={{ width: '4em', color: '#7f8db3', textAlign: 'right' }}>{value}</span>
          </div>
        )
      })}
    </div>
  )
}

/** 控件类组件（写全局变量联动的交互组件） */
const CONTROL_TYPES = ['btn', 'selectDropdown', 'selectRadio', 'selectCheckbox', 'selectSwitch', 'inputBasic', 'inputSlider']

/** 控件选项解析：props.options 每行一个 */
function parseOptions(raw: unknown): string[] {
  return String(raw ?? '').split('\n').map((s) => s.trim()).filter(Boolean)
}

/** 控件：值写入 props.targetVariable 指定的全局变量，并随变量值回显；编辑器内 pointerEvents 关闭 */
function Control({ component, scale = 1, interactive = false }: ComponentRendererProps) {
  const variables = useVariableStore((s) => s.variables)
  const target = String(component.props.targetVariable ?? '')
  const current = target ? variables.find((v) => v.name === target)?.value : undefined
  const set = (v: string) => setRuntimeVariable(target, v)
  const wrap = (node: ReactNode) => (
    <div
      className="kanban-ctrl"
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        overflow: 'hidden',
        pointerEvents: interactive ? undefined : 'none',
        fontSize: 14 * scale,
        color: '#dbeafe',
      }}
    >
      <style>{'.kanban-ctrl .ant-radio-wrapper,.kanban-ctrl .ant-checkbox-wrapper{color:#dbeafe}'}</style>
      {node}
    </div>
  )

  switch (component.type) {
    case 'btn':
      return wrap(
        <Button
          type="primary"
          block
          style={{ background: String(component.props.color ?? '#1d39c4') }}
          onClick={() => set(String(component.props.value ?? ''))}
        >
          {String(component.props.text ?? '按钮')}
        </Button>,
      )
    case 'selectDropdown': {
      const opts = parseOptions(component.props.options)
      return wrap(
        <Select
          style={{ width: '100%' }}
          placeholder={String(component.props.placeholder ?? '请选择')}
          value={current || undefined}
          onChange={(v) => set(String(v))}
          options={opts.map((o) => ({ value: o, label: o }))}
        />,
      )
    }
    case 'selectRadio': {
      const opts = parseOptions(component.props.options)
      return wrap(
        <Radio.Group
          value={current}
          onChange={(e) => set(String(e.target.value))}
          options={opts.map((o) => ({ value: o, label: o }))}
        />,
      )
    }
    case 'selectCheckbox': {
      const opts = parseOptions(component.props.options)
      return wrap(
        <Checkbox.Group
          value={current ? current.split(',').filter(Boolean) : []}
          onChange={(vals) => set(vals.map(String).join(','))}
          options={opts.map((o) => ({ value: o, label: o }))}
        />,
      )
    }
    case 'selectSwitch': {
      const onValue = String(component.props.onValue ?? '开')
      const offValue = String(component.props.offValue ?? '关')
      return wrap(
        <>
          <Switch checked={current === onValue} onChange={(c) => set(c ? onValue : offValue)} />
          <span style={{ color: '#dbeafe', marginLeft: 8 * scale }}>{current ?? offValue}</span>
        </>,
      )
    }
    case 'inputBasic':
      return wrap(
        <Input
          placeholder={String(component.props.placeholder ?? '请输入')}
          value={current ?? ''}
          onChange={(e) => set(e.target.value)}
        />,
      )
    case 'inputSlider':
      return wrap(
        <Slider
          style={{ flex: 1 }}
          min={Number(component.props.min ?? 0)}
          max={Number(component.props.max ?? 100)}
          value={Number(current ?? component.props.defaultValue ?? 50)}
          onChange={(v) => set(String(v))}
        />,
      )
    default:
      return null
  }
}

function G2Chart({ component, scale = 1, background, interactive = false }: ComponentRendererProps) {
  const ref = useRef<HTMLDivElement | null>(null)
  const filterId = (component.props.filterId as number | undefined) ?? undefined
  const filterCode = useEffectiveFilterCode(filterId)
  // 图例/坐标轴/标题文字颜色随画布背景明暗自适应
  const textColor = chartTextColor(background)
  // 容器尺寸稳定后递增，触发图表整体重建（forceFit 与进行中的 render 竞争会导致图形丢失）
  const [resizeTick, setResizeTick] = useState(0)
  // 挂载后是否已做过一次兜底重建（防止每次 effect 重跑都再排一次）
  const mountRebuilt = useRef(false)

  // 过滤器在 Web Worker 沙箱异步执行（P2-4）；报错降级到原始数据，仅影响该组件
  const [filteredData, setFilteredData] = useState<{ name: string; value: number }[] | null>(null)
  useEffect(() => {
    let cancelled = false
    const rawData = (component.data?.length ? component.data : [{ name: 'A', value: 1 }]) as {
      name: string
      value: number
    }[]
    if (!filterCode) {
      setFilteredData(rawData)
      return
    }
    void runFilterAsync(filterCode, rawData).then((res) => {
      if (cancelled) return
      setFilteredData(res.ok && res.data ? (res.data as { name: string; value: number }[]) : rawData)
    })
    return () => {
      cancelled = true
    }
  }, [component.data, filterCode])

  useEffect(() => {
    if (!ref.current) return
    if (filteredData == null) return // 过滤器结果未返回，暂不建图
    const container = ref.current
    const chart = new Chart({ container, autoFit: true })
    // 特殊数据结构的图表类型先做归一化（区间/瀑布/双轴拆分）
    type Row = Record<string, unknown>
    let chartData: unknown[] = filteredData
    if (component.type === 'barRange') {
      chartData = (filteredData as Row[]).map((d) => ({
        name: String(d.name),
        min: Number(d.min) || 0,
        max: Number(d.max) || 0,
      }))
    }
    if (component.type === 'barWaterfall') {
      // value 视为增量，累计出每根柱子的 [起点, 终点] 区间
      let acc = 0
      chartData = (filteredData as Row[]).map((d) => {
        const delta = Number(d.value) || 0
        const start = acc
        acc += delta
        return { name: String(d.name), start: Math.min(start, acc), end: Math.max(start, acc), dir: delta >= 0 ? '上升' : '下降' }
      })
    }
    if (component.type === 'contrastBar') {
      // 第二个系列取负值，形成正负对比（蝴蝶图）
      const rows = filteredData as Row[]
      const seriesNames = [...new Set(rows.map((d) => String(d.series)))]
      chartData = rows.map((d) => ({
        ...d,
        value: String(d.series) === seriesNames[0] ? Number(d.value) || 0 : -(Number(d.value) || 0),
      }))
    }
    chart.data(chartData)
    if (component.type === 'line') {
      chart.line().encode('x', 'name').encode('y', 'value').style('stroke', String(component.props.color ?? '#4f8cff'))
      chart.point().encode('x', 'name').encode('y', 'value').style('fill', String(component.props.color ?? '#4f8cff'))
    }
    if (component.type === 'bar') {
      chart.interval().encode('x', 'name').encode('y', 'value').style('fill', String(component.props.color ?? '#4f8cff'))
    }
    if (component.type === 'pie') {
      chart.coordinate({ type: 'theta', outerRadius: 0.8 })
      chart.interval().transform({ type: 'stackY' }).encode('y', 'value').encode('color', 'name').legend('color', false)
    }
    if (component.type === 'area') {
      chart.area().encode('x', 'name').encode('y', 'value').style('fill', String(component.props.color ?? '#4f8cff')).style('fillOpacity', 0.35)
      chart.line().encode('x', 'name').encode('y', 'value').style('stroke', String(component.props.color ?? '#4f8cff'))
    }
    if (component.type === 'scatter') {
      chart.point().encode('x', 'name').encode('y', 'value').style('fill', String(component.props.color ?? '#4f8cff')).style('fillOpacity', 0.7)
    }
    if (component.type === 'radar') {
      chart.coordinate({ type: 'polar' })
      chart.area().encode('x', 'name').encode('y', 'value').style('fill', String(component.props.color ?? '#4f8cff')).style('fillOpacity', 0.25)
      chart.line().encode('x', 'name').encode('y', 'value').style('stroke', String(component.props.color ?? '#4f8cff'))
      chart.point().encode('x', 'name').encode('y', 'value').style('fill', String(component.props.color ?? '#4f8cff'))
    }
    if (component.type === 'funnel') {
      chart.interval().encode('x', 'name').encode('y', 'value').encode('color', 'name').legend('color', { itemLabelFill: textColor }).transform({ type: 'symmetryY' }).style('fillOpacity', 0.8)
    }
    if (component.type === 'rose') {
      chart.coordinate({ type: 'polar' })
      chart.interval().encode('x', 'name').encode('y', 'value').encode('color', 'name').legend('color', { itemLabelFill: textColor }).style('fillOpacity', 0.8)
    }
    if (component.type === 'barh') {
      chart.coordinate({ transform: [{ type: 'transpose' }] })
      chart.interval().encode('x', 'name').encode('y', 'value').style('fill', String(component.props.color ?? '#4f8cff'))
    }
    if (component.type === 'barGroup') {
      chart.interval().encode('x', 'name').encode('y', 'value').encode('color', 'series')
        .transform({ type: 'dodgeX' }).legend('color', { itemLabelFill: textColor })
    }
    if (component.type === 'barStack') {
      chart.interval().encode('x', 'name').encode('y', 'value').encode('color', 'series')
        .transform({ type: 'stackY' }).legend('color', { itemLabelFill: textColor })
    }
    if (component.type === 'ring') {
      chart.coordinate({ type: 'theta', outerRadius: 0.8, innerRadius: 0.5 })
      chart.interval().transform({ type: 'stackY' }).encode('y', 'value').encode('color', 'name')
        .legend('color', { itemLabelFill: textColor })
    }
    if (component.type === 'lineMulti') {
      chart.line().encode('x', 'name').encode('y', 'value').encode('color', 'series')
        .legend('color', { itemLabelFill: textColor })
      chart.point().encode('x', 'name').encode('y', 'value').encode('color', 'series').legend('color', false)
    }
    if (component.type === 'areaStack') {
      chart.area().encode('x', 'name').encode('y', 'value').encode('color', 'series')
        .transform({ type: 'stackY' }).style('fillOpacity', 0.35).legend('color', { itemLabelFill: textColor })
      chart.line().encode('x', 'name').encode('y', 'value').encode('color', 'series')
        .transform({ type: 'stackY' }).legend('color', false)
    }
    if (component.type === 'barPercent') {
      chart.interval().encode('x', 'name').encode('y', 'value').encode('color', 'series')
        .transform({ type: 'stackY' }).transform({ type: 'normalizeY' })
        .legend('color', { itemLabelFill: textColor })
    }
    if (component.type === 'barhGroup') {
      chart.coordinate({ transform: [{ type: 'transpose' }] })
      chart.interval().encode('x', 'name').encode('y', 'value').encode('color', 'series')
        .transform({ type: 'dodgeX' }).legend('color', { itemLabelFill: textColor })
    }
    if (component.type === 'barhStack') {
      chart.coordinate({ transform: [{ type: 'transpose' }] })
      chart.interval().encode('x', 'name').encode('y', 'value').encode('color', 'series')
        .transform({ type: 'stackY' }).legend('color', { itemLabelFill: textColor })
    }
    if (component.type === 'lineStep') {
      chart.line().encode('x', 'name').encode('y', 'value').encode('shape', 'hv')
        .style('stroke', String(component.props.color ?? '#4f8cff'))
      chart.point().encode('x', 'name').encode('y', 'value').style('fill', String(component.props.color ?? '#4f8cff'))
    }
    if (component.type === 'barhPercent') {
      chart.coordinate({ transform: [{ type: 'transpose' }] })
      chart.interval().encode('x', 'name').encode('y', 'value').encode('color', 'series')
        .transform({ type: 'stackY' }).transform({ type: 'normalizeY' })
        .legend('color', { itemLabelFill: textColor })
    }
    if (component.type === 'areaPercent') {
      chart.area().encode('x', 'name').encode('y', 'value').encode('color', 'series')
        .transform({ type: 'stackY' }).transform({ type: 'normalizeY' })
        .style('fillOpacity', 0.35).legend('color', { itemLabelFill: textColor })
      chart.line().encode('x', 'name').encode('y', 'value').encode('color', 'series')
        .transform({ type: 'stackY' }).transform({ type: 'normalizeY' })
        .legend('color', false)
    }
    if (component.type === 'scatterBubble') {
      chart.point().encode('x', 'name').encode('y', 'value').encode('size', 'size')
        .encode('shape', 'point')
        .scale('size', { range: [6, 30] })
        .legend('size', false)
        .style('fill', String(component.props.color ?? '#4f8cff')).style('fillOpacity', 0.65)
    }
    if (component.type === 'barRange') {
      chart.interval().encode('x', 'name').encode('y', ['min', 'max']).style('fill', String(component.props.color ?? '#4f8cff'))
    }
    if (component.type === 'barWaterfall') {
      chart.interval().encode('x', 'name').encode('y', ['start', 'end']).encode('color', 'dir')
        .scale('color', { domain: ['上升', '下降'], range: ['#4f8cff', '#f5576c'] })
        .legend('color', { itemLabelFill: textColor })
    }
    if (component.type === 'lineDual') {
      // 双轴：各系列独立 y 轴刻度（point 会再造一根轴，只画线保持干净）
      chart.line().encode('x', 'name').encode('y', 'value').encode('color', 'series')
        .scale('y', { independent: true }).legend('color', { itemLabelFill: textColor })
    }
    if (component.type === 'dualLineBar') {
      // 第一个系列画柱、第二个系列画线（独立 y 轴）；柱用图表级数据，线用 mark 级数据
      const rows = filteredData as Row[]
      const seriesNames = [...new Set(rows.map((d) => String(d.series)))]
      const barRows = rows.filter((d) => String(d.series) === seriesNames[0])
      const lineRows = rows.filter((d) => String(d.series) === (seriesNames[1] ?? seriesNames[0]))
      chart.data(barRows)
      chart.interval().encode('x', 'name').encode('y', 'value')
        .style('fill', String(component.props.color ?? '#4f8cff'))
      chart.line().data(lineRows).encode('x', 'name').encode('y', 'value')
        .scale('y', { independent: true }).style('stroke', '#f6bd16')
      chart.point().data(lineRows).encode('x', 'name').encode('y', 'value')
        .scale('y', { independent: true }).axis('y', false).style('fill', '#f6bd16')
    }
    if (component.type === 'doubleBar') {
      // 双柱状图：两系列并排（同 barGroup，语义上是 DataV 的双柱）
      chart.interval().encode('x', 'name').encode('y', 'value').encode('color', 'series')
        .transform({ type: 'dodgeX' }).legend('color', { itemLabelFill: textColor })
    }
    if (component.type === 'contrastBar') {
      // 对比柱状图：数据已归一化为正负值
      chart.interval().encode('x', 'name').encode('y', 'value').encode('color', 'series')
        .legend('color', { itemLabelFill: textColor })
    }
    if (component.type === 'multiStack') {
      // 多维叠图：多系列堆叠区域
      chart.area().encode('x', 'name').encode('y', 'value').encode('color', 'series')
        .transform({ type: 'stackY' }).style('fillOpacity', 0.35).legend('color', { itemLabelFill: textColor })
      chart.line().encode('x', 'name').encode('y', 'value').encode('color', 'series')
        .transform({ type: 'stackY' }).legend('color', false)
    }
    if (component.type === 'yujue') {
      // 玉珏图：radial 坐标系本身就是转置后的极坐标（类目→半径、数值→角度），勿再加 transpose
      chart.coordinate({ type: 'radial', innerRadius: 0.15 })
      chart.interval().encode('x', 'name').encode('y', 'value').encode('color', 'name')
        .legend('color', { itemLabelFill: textColor }).style('fillOpacity', 0.9)
      chart.axis('x', false)
      chart.axis('y', false)
    }
    // 直角坐标系图表的坐标轴文字颜色随背景明暗自适应
    if (
      component.type === 'line' || component.type === 'bar' || component.type === 'area' ||
      component.type === 'scatter' || component.type === 'barh' || component.type === 'barGroup' ||
      component.type === 'barStack' || component.type === 'lineMulti' || component.type === 'areaStack' ||
      component.type === 'barPercent' || component.type === 'barhGroup' || component.type === 'barhStack' ||
      component.type === 'lineStep' || component.type === 'barhPercent' || component.type === 'areaPercent' ||
      component.type === 'scatterBubble' || component.type === 'barRange' || component.type === 'barWaterfall' ||
      component.type === 'lineDual' || component.type === 'dualLineBar' || component.type === 'doubleBar' ||
      component.type === 'contrastBar' || component.type === 'multiStack'
    ) {
      chart.axis('x', { labelFill: textColor })
      chart.axis('y', { labelFill: textColor })
    }
    chart.render()
    // 运行态点击上报：把点击图元的 datum 写入 clickCtx，供钻取参数/链接的 {{ctx.*}} 插值。
    // 注意事件要先于 React onClick 冒泡到 RuntimeLayer，保证 gotoPage 读到的就是本次点击的上下文。
    if (interactive) {
      chart.on('element:click', (e: { data?: { data?: Record<string, unknown> } }) => {
        const datum = e?.data?.data
        if (!datum || typeof datum !== 'object') return
        useInteractionStore.getState().setClickCtx({
          name: datum.name == null ? undefined : String(datum.name),
          value: typeof datum.value === 'number' || typeof datum.value === 'string' ? datum.value : undefined,
          series: datum.series == null ? undefined : String(datum.series),
        })
      })
    }
    // 图表重排重绘开销大：交互（拖拽/缩放）期间不重建，尺寸稳定 250ms 后整体重建一次。
    // 不用 forceFit：它与进行中的 render 竞争时会出现坐标轴更新但图形丢失的问题。
    let interacting = false
    let timer: ReturnType<typeof setTimeout> | null = null
    let first = true
    const scheduleRebuild = () => {
      if (interacting) return
      if (timer) clearTimeout(timer)
      timer = setTimeout(() => setResizeTick((t) => t + 1), 250)
    }
    const onInteraction = (e: Event) => {
      interacting = (e as CustomEvent<boolean>).detail
      if (!interacting) scheduleRebuild()
    }
    window.addEventListener(INTERACTION_EVENT, onInteraction)
    const ro = new ResizeObserver(() => {
      // 首次 observe 触发只是挂载通知，无需重建
      if (first) {
        first = false
        return
      }
      scheduleRebuild()
    })
    ro.observe(container)
    // 首次挂载时容器可能尚未稳定（与首帧布局竞争会出现空图/碎片），延迟做一次整体重建兜底
    let mountTimer: ReturnType<typeof setTimeout> | null = null
    if (!mountRebuilt.current) {
      mountRebuilt.current = true
      mountTimer = setTimeout(() => setResizeTick((t) => t + 1), 300)
    }
    return () => {
      ro.disconnect()
      if (timer) clearTimeout(timer)
      if (mountTimer) clearTimeout(mountTimer)
      window.removeEventListener(INTERACTION_EVENT, onInteraction)
      chart.destroy()
    }
  }, [component.type, filteredData, component.props.color, textColor, resizeTick, interactive])

  return (
    <div style={{ width: '100%', height: '100%', padding: 8 * scale, boxSizing: 'border-box' }}>
      <div style={{ color: textColor, fontSize: 14 * scale, marginBottom: 4 * scale }}>
        {String(component.props.title ?? component.name)}
      </div>
      <div ref={ref} style={{ width: '100%', height: `calc(100% - ${24 * scale}px)` }} />
    </div>
  )
}
