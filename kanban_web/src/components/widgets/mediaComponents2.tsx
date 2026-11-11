import { useEffect, useState } from 'react'
import type { CanvasComponent } from '../../types/editor'
import { parseOptions } from './controlShell'

interface MediaProps {
  component: CanvasComponent
  scale?: number
}

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

/** 图片轮播画廊：中间大两侧小的 coverflow 简化版，自动轮播（props.urls 每行一个） */
export function Gallery({ component, scale }: MediaProps) {
  const urls = parseOptions(component.props.urls)
  const [index, setIndex] = useState(0)
  const interval = Math.max(1, Number(component.props.interval ?? 3))
  useEffect(() => {
    if (urls.length < 2) return
    const t = setInterval(() => setIndex((i) => (i + 1) % urls.length), interval * 1000)
    return () => clearInterval(t)
  }, [urls.length, interval])
  if (!urls.length) return <EmptyHolder hint="请在样式面板配置图片地址（每行一个）" scale={scale} />
  // 展示当前、前后各一张，共 3 张
  const slots = [-1, 0, 1].map((off) => urls[(index + off + urls.length) % urls.length])
  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, overflow: 'hidden' }}>
      {slots.map((u, i) => (
        <img
          key={`${u}-${i}`}
          src={u}
          alt=""
          style={{
            width: i === 1 ? '56%' : '22%',
            height: i === 1 ? '90%' : '60%',
            objectFit: 'cover',
            borderRadius: 4,
            opacity: i === 1 ? 1 : 0.5,
            transition: 'all 0.5s',
          }}
        />
      ))}
    </div>
  )
}

/** 标志墙：图片网格平铺（props.urls 每行一个，columns 列数） */
export function LogoWall({ component, scale }: MediaProps) {
  const urls = parseOptions(component.props.urls)
  const columns = Math.max(2, Number(component.props.columns ?? 4))
  if (!urls.length) return <EmptyHolder hint="请在样式面板配置图片地址（每行一个）" scale={scale} />
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'grid',
        gridTemplateColumns: `repeat(${columns}, 1fr)`,
        gap: 8,
        overflow: 'hidden',
        alignContent: 'center',
      }}
    >
      {urls.map((u) => (
        <img key={u} src={u} alt="" style={{ width: '100%', height: '100%', maxHeight: 60, objectFit: 'contain', opacity: 0.85 }} />
      ))}
    </div>
  )
}

/** 箭头标绘：SVG 箭头，props.direction 控制方向（right/left/up/down） */
export function ArrowPlot({ component }: MediaProps) {
  const color = String(component.props.color ?? '#4f8cff')
  const direction = String(component.props.direction ?? 'right')
  const angle = { right: 0, down: 90, left: 180, up: -90 }[direction] ?? 0
  return (
    <svg viewBox="0 0 100 40" style={{ width: '100%', height: '100%', display: 'block' }}>
      <g transform={`rotate(${angle} 50 20)`}>
        <line x1={4} y1={20} x2={82} y2={20} stroke={color} strokeWidth={6} strokeLinecap="round" />
        <polygon points="82,8 98,20 82,32" fill={color} />
      </g>
    </svg>
  )
}

interface BarRow {
  name?: string
  key?: string
  value?: number | string
}

/** 轮播列表柱状图：轮播列表的行内加数值条形（data 形如 { name, value }） */
export function TableCarouselBar({ component, scale = 1 }: MediaProps) {
  const rows = (component.data?.length ? component.data : []) as BarRow[]
  const [offset, setOffset] = useState(0)
  const interval = Math.max(1, Number(component.props.interval ?? 2))
  const max = Number(component.props.max ?? 100) || 100
  const color = String(component.props.color ?? '#4f8cff')
  const fontSize = 13 * scale
  useEffect(() => {
    if (rows.length < 2) return
    const t = setInterval(() => setOffset((o) => o + 1), interval * 1000)
    return () => clearInterval(t)
  }, [rows.length, interval])
  const ordered = rows.length ? [...rows.slice(offset % rows.length), ...rows.slice(0, offset % rows.length)] : []
  return (
    <div style={{ width: '100%', height: '100%', overflow: 'hidden', fontSize }}>
      {ordered.map((r, i) => {
        const value = Number(r.value) || 0
        const pct = Math.min(100, Math.max(0, (value / max) * 100))
        return (
          <div key={`${offset}-${i}`} style={{ position: 'relative', display: 'flex', justifyContent: 'space-between', padding: '7px 10px', borderBottom: '1px solid rgba(42,53,80,0.6)' }}>
            <span style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${pct}%`, background: color, opacity: 0.22, transition: 'width 0.5s' }} />
            <span style={{ position: 'relative', color: '#dbeafe', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{String(r.name ?? r.key ?? '')}</span>
            <span style={{ position: 'relative', color: '#7f8db3' }}>{String(r.value ?? '')}</span>
          </div>
        )
      })}
    </div>
  )
}
