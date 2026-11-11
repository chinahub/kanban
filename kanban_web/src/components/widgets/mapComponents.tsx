import { useEffect, useState } from 'react'
import { geoMercator, geoPath } from 'd3-geo'
import type { Feature, FeatureCollection, Geometry } from 'geojson'
import type { CanvasComponent } from '../../types/editor'
import { useInteractionStore } from '../../util/interactionRunner'

interface MapProps {
  component: CanvasComponent
  scale?: number
  /** 运行态为 true：区域可点击，点击上报区域名/数值到 clickCtx 供钻取传参 */
  interactive?: boolean
}

interface RegionDatum {
  name: string
  value: number
}

/** 环的平面鞋带面积（>0 为逆时针） */
function ringArea(ring: number[][]): number {
  let a = 0
  for (let i = 0, n = ring.length; i < n; i++) {
    const [x1, y1] = ring[i]
    const [x2, y2] = ring[(i + 1) % n]
    a += x1 * y2 - x2 * y1
  }
  return a / 2
}

/**
 * d3-geo 按球面右手规则判断多边形内侧：外环须顺时针、内环须逆时针。
 * RFC7946 数据（如 DataV geojson）外环为逆时针，会被 d3 当作补集（覆盖全世界），
 * 这里按环面积符号逐环纠正。
 */
function rewindPolygon(rings: number[][][]): number[][][] {
  return rings.map((ring, i) => {
    const outer = i === 0
    const ccw = ringArea(ring) > 0
    return ccw === outer ? [...ring].reverse() : ring
  })
}

/** 纠正 FeatureCollection 中所有 Polygon/MultiPolygon 的环方向（飞线/散点等图层组件复用） */
export function rewindCollection(fc: FeatureCollection): FeatureCollection {
  return {
    ...fc,
    features: fc.features.map((f) => {
      const g = f.geometry
      if (!g) return f
      if (g.type === 'Polygon') {
        return { ...f, geometry: { ...g, coordinates: rewindPolygon(g.coordinates as number[][][]) } }
      }
      if (g.type === 'MultiPolygon') {
        return {
          ...f,
          geometry: { ...g, coordinates: (g.coordinates as number[][][][]).map((p) => rewindPolygon(p)) },
        }
      }
      return f
    }),
  }
}

/**
 * 2D 平面地图：d3-geo mercator 投影 + SVG path。
 * data 形如 { name, value }（按区域名匹配），有值区域按数值加深填充。
 */
function GeoMap({ component, geoUrl, interactive = false }: MapProps & { geoUrl: string }) {
  const [geo, setGeo] = useState<FeatureCollection | null>(null)
  const [failed, setFailed] = useState(false)
  const color = String(component.props.color ?? '#1d3d7a')

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

  if (failed) {
    return (
      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#7f8db3', fontSize: 13 }}>
        GeoJSON 加载失败：{geoUrl}
      </div>
    )
  }
  if (!geo) return null

  const W = 400
  const H = 300
  const projection = geoMercator().fitSize([W, H], geo)
  const pathGen = geoPath(projection)
  const data = (component.data?.length ? component.data : []) as RegionDatum[]
  const valueByName = new Map(data.map((d) => [String(d.name), Number(d.value) || 0]))
  const maxValue = Math.max(...data.map((d) => Number(d.value) || 0), 1)

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: '100%', display: 'block' }}>
      {geo.features.map((f: Feature<Geometry>, i) => {
        const name = String((f.properties as { name?: string } | null)?.name ?? i)
        const value = valueByName.get(name)
        const d = pathGen(f)
        return d ? (
          <path
            key={i}
            d={d}
            fill={color}
            fillOpacity={value != null ? 0.35 + (value / maxValue) * 0.65 : 0.35}
            stroke="#4f8cff"
            strokeOpacity={0.6}
            strokeWidth={0.5}
            style={interactive ? { cursor: 'pointer' } : undefined}
            onClick={interactive ? () => useInteractionStore.getState().setClickCtx({ name, value }) : undefined}
          >
            <title>{value != null ? `${name}: ${value}` : name}</title>
          </path>
        ) : null
      })}
    </svg>
  )
}

/** 中国地图（内置 /maps/china.json，省级 GeoJSON 取自 DataV geo 服务） */
export function MapChina({ component, scale, interactive }: MapProps) {
  return <GeoMap component={component} scale={scale} geoUrl="/maps/china.json" interactive={interactive} />
}

/** 世界地图（内置 /maps/world.json） */
export function MapWorld({ component, scale, interactive }: MapProps) {
  return <GeoMap component={component} scale={scale} geoUrl="/maps/world.json" interactive={interactive} />
}

/** 自定义区域地图：props.geoUrl 指向任意 GeoJSON（默认复用中国地图） */
export function MapRegion({ component, scale, interactive }: MapProps) {
  return <GeoMap component={component} scale={scale} geoUrl={String(component.props.geoUrl ?? '/maps/china.json')} interactive={interactive} />
}
