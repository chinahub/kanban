import { useEffect, useMemo, useState } from 'react'
import { geoMercator, geoPath } from 'd3-geo'
import type { Feature, FeatureCollection, Geometry } from 'geojson'
import type { CanvasComponent } from '../../types/editor'
import { useInteractionStore } from '../../util/interactionRunner'
import { rewindCollection } from './mapComponents'

interface LayerProps {
  component: CanvasComponent
  scale?: number
  /** 运行态为 true：城市点可点击，点击上报 name/value 到 clickCtx 供钻取传参 */
  interactive?: boolean
}

interface CityDatum {
  name: string
  value?: number
  lon?: number
  lat?: number
}

interface FlightDatum {
  from: string
  to: string
  value?: number
}

/** 内置常用城市经纬度（数据未带 lon/lat 时按 name 匹配） */
export const CITY_COORDS: Record<string, [number, number]> = {
  北京: [116.4, 39.9], 上海: [121.47, 31.23], 广州: [113.26, 23.13], 深圳: [114.06, 22.55],
  杭州: [120.15, 30.28], 成都: [104.07, 30.67], 武汉: [114.3, 30.6], 西安: [108.94, 34.34],
  重庆: [106.55, 29.56], 南京: [118.8, 32.06], 天津: [117.2, 39.13], 沈阳: [123.43, 41.8],
  哈尔滨: [126.53, 45.8], 长春: [125.32, 43.9], 大连: [121.62, 38.91], 青岛: [120.38, 36.07],
  济南: [117.12, 36.65], 郑州: [113.63, 34.75], 长沙: [112.94, 28.23], 南昌: [115.89, 28.68],
  福州: [119.3, 26.08], 厦门: [118.09, 24.48], 昆明: [102.71, 25.04], 贵阳: [106.63, 26.65],
  南宁: [108.37, 22.82], 海口: [110.2, 20.04], 三亚: [109.51, 18.25], 兰州: [103.83, 36.06],
  乌鲁木齐: [87.62, 43.82], 拉萨: [91.11, 29.97], 西宁: [101.78, 36.62], 银川: [106.23, 38.49],
  呼和浩特: [111.67, 40.82], 石家庄: [114.48, 38.03], 太原: [112.53, 37.87], 合肥: [117.28, 31.86],
  苏州: [120.58, 31.3], 宁波: [121.55, 29.87], 温州: [120.7, 28.0], 香港: [114.17, 22.32],
  澳门: [113.54, 22.19], 台北: [121.56, 25.03],
}

/** 城市定位：显式 lon/lat（有限数值）优先，否则查内置城市表；查不到返回 null（跳过绘制） */
function resolveCity(name: string, lon?: number, lat?: number): [number, number] | null {
  if (lon != null && lat != null && Number.isFinite(lon) && Number.isFinite(lat)) return [lon, lat]
  return CITY_COORDS[name] ?? null
}

/** GeoJSON 拉取 + 环方向纠正（与地图组件共用 /maps 内置数据） */
function useGeo(geoUrl: string): { geo: FeatureCollection | null; failed: boolean } {
  const [geo, setGeo] = useState<FeatureCollection | null>(null)
  const [failed, setFailed] = useState(false)
  useEffect(() => {
    let cancelled = false
    setFailed(false)
    fetch(geoUrl)
      .then((r) => {
        if (!r.ok) throw new Error(String(r.status))
        return r.json() as Promise<FeatureCollection>
      })
      .then((g) => !cancelled && setGeo(rewindCollection(g)))
      .catch(() => !cancelled && setFailed(true))
    return () => {
      cancelled = true
    }
  }, [geoUrl])
  return { geo, failed }
}

const W = 400
const H = 300

function FailedBox({ geoUrl }: { geoUrl: string }) {
  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#7f8db3', fontSize: 13 }}>
      GeoJSON 加载失败：{geoUrl}
    </div>
  )
}

/** 底图（区域面）绘制：无值统一淡填充，图层组件的地图背景 */
function BaseMap({ geo, color }: { geo: FeatureCollection; color: string }) {
  const projection = geoMercator().fitSize([W, H], geo)
  const pathGen = geoPath(projection)
  return (
    <g>
      {geo.features.map((f: Feature<Geometry>, i) => {
        const d = pathGen(f)
        return d ? (
          <path key={i} d={d} fill={color} fillOpacity={0.35} stroke="#4f8cff" strokeOpacity={0.6} strokeWidth={0.5} />
        ) : null
      })}
    </g>
  )
}

/**
 * 飞线图（地图图层，PRD §7.2 三维/图层补齐）：城市间弧线 + 流动光点。
 * data 形如 { from: '北京', to: '上海', value }；城市定位查内置表，数据也可直接带 lon/lat。
 */
export function FlylineMap({ component }: LayerProps) {
  const geoUrl = String(component.props.geoUrl ?? '/maps/china.json')
  const { geo, failed } = useGeo(geoUrl)
  const mapColor = String(component.props.color ?? '#1d3d7a')
  const flyColor = String(component.props.flyColor ?? '#4f8cff')
  // 全局动画相位 0..1，3s 一轮；各飞线按序号错开 1/4 周期
  const [phase, setPhase] = useState(0)

  useEffect(() => {
    let raf = 0
    const start = performance.now()
    const loop = (now: number) => {
      setPhase(((now - start) / 3000) % 1)
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [])

  const flights = useMemo(() => {
    const rows = (component.data?.length ? component.data : []) as FlightDatum[]
    if (!geo) return []
    const projection = geoMercator().fitSize([W, H], geo)
    return rows
      .map((row, i) => {
        const fr = row as { fromLon?: number; fromLat?: number }
        const to = row as { toLon?: number; toLat?: number }
        const from = resolveCity(String(row.from ?? ''), fr.fromLon, fr.fromLat)
        const dest = resolveCity(String(row.to ?? ''), to.toLon, to.toLat)
        if (!from || !dest) return null
        const p1 = projection(from)
        const p2 = projection(dest)
        if (!p1 || !p2) return null
        const [x1, y1] = p1
        const [x2, y2] = p2
        // 二次贝塞尔控制点：中点沿法线方向偏移，距离越远弧越高
        const mx = (x1 + x2) / 2
        const my = (y1 + y2) / 2
        const cx = mx - (y2 - y1) * 0.22
        const cy = my + (x2 - x1) * 0.22
        return { key: i, x1, y1, x2, y2, cx, cy, offset: (i % 4) * 0.25 }
      })
      .filter((v): v is NonNullable<typeof v> => v !== null)
  }, [component.data, geo])

  // 底图元素按引用固定：飞线动画每帧 setState 时 React 跳过底图子树，避免整图重绘拖垮 FPS
  const baseMap = useMemo(() => (geo ? <BaseMap geo={geo} color={mapColor} /> : null), [geo, mapColor])

  if (failed) return <FailedBox geoUrl={geoUrl} />
  if (!geo) return null

  const qPoint = (f: { x1: number; y1: number; cx: number; cy: number; x2: number; y2: number }, t: number) => {
    const u = 1 - t
    return {
      x: u * u * f.x1 + 2 * u * t * f.cx + t * t * f.x2,
      y: u * u * f.y1 + 2 * u * t * f.cy + t * t * f.y2,
    }
  }

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: '100%', display: 'block' }}>
      {baseMap}
      {flights.map((f) => {
        const t = (phase + f.offset) % 1
        const dot = qPoint(f, t)
        const tail = qPoint(f, Math.max(0, t - 0.05))
        const d = `M ${f.x1} ${f.y1} Q ${f.cx} ${f.cy} ${f.x2} ${f.y2}`
        return (
          <g key={f.key}>
            <path d={d} fill="none" stroke={flyColor} strokeOpacity={0.3} strokeWidth={1} strokeDasharray="3 3" />
            <circle cx={f.x1} cy={f.y1} r={1.6} fill={flyColor} />
            <circle cx={f.x2} cy={f.y2} r={1.6} fill={flyColor} />
            <line x1={tail.x} y1={tail.y} x2={dot.x} y2={dot.y} stroke={flyColor} strokeWidth={2.2} strokeLinecap="round" />
            <circle cx={dot.x} cy={dot.y} r={4.5} fill={flyColor} fillOpacity={0.25} />
            <circle cx={dot.x} cy={dot.y} r={2} fill={flyColor} />
          </g>
        )
      })}
    </svg>
  )
}

/**
 * 散点图层（地图图层）：城市按数值画发光圆点。
 * data 形如 { name: '北京', value }（或带 lon/lat），点击城市点上报 clickCtx 供钻取传参。
 */
export function ScatterMap({ component, interactive = false }: LayerProps) {
  const geoUrl = String(component.props.geoUrl ?? '/maps/china.json')
  const { geo, failed } = useGeo(geoUrl)
  const mapColor = String(component.props.color ?? '#1d3d7a')
  const dotColor = String(component.props.dotColor ?? '#4f8cff')

  const points = useMemo(() => {
    const rows = (component.data?.length ? component.data : []) as CityDatum[]
    if (!geo) return []
    const projection = geoMercator().fitSize([W, H], geo)
    const maxValue = Math.max(...rows.map((d) => Number(d.value) || 0), 1)
    return rows
      .map((row, i) => {
        const coord = resolveCity(String(row.name ?? ''), row.lon, row.lat)
        if (!coord) return null
        const p = projection(coord)
        if (!p) return null
        const value = Number(row.value) || 0
        return { key: i, x: p[0], y: p[1], name: String(row.name ?? i), value, r: 3 + (value / maxValue) * 9 }
      })
      .filter((v): v is NonNullable<typeof v> => v !== null)
  }, [component.data, geo])

  if (failed) return <FailedBox geoUrl={geoUrl} />
  if (!geo) return null

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: '100%', display: 'block' }}>
      <BaseMap geo={geo} color={mapColor} />
      {points.map((p) => (
        <g
          key={p.key}
          style={interactive ? { cursor: 'pointer' } : undefined}
          onClick={interactive ? () => useInteractionStore.getState().setClickCtx({ name: p.name, value: p.value }) : undefined}
        >
          <title>{`${p.name}: ${p.value}`}</title>
          <circle cx={p.x} cy={p.y} r={p.r * 1.8} fill={dotColor} fillOpacity={0.18} />
          <circle cx={p.x} cy={p.y} r={p.r} fill={dotColor} fillOpacity={0.85} stroke="#ffffff" strokeOpacity={0.7} strokeWidth={0.8} />
        </g>
      ))}
    </svg>
  )
}
