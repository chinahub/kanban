import { useEffect, useRef, useState } from 'react'
import cloud from 'd3-cloud'
import { hierarchy, tree, treemap } from 'd3-hierarchy'
import { sankey, sankeyLinkHorizontal } from 'd3-sankey'
import { chord, ribbon } from 'd3-chord'
import type { CanvasComponent } from '../../types/editor'

export interface WidgetProps {
  component: CanvasComponent
  scale?: number
  background?: string
  interactive?: boolean
}

/** 关系/层级类图表共用调色板 */
export const WIDGET_PALETTE = ['#4f8cff', '#5ad8a6', '#f6bd16', '#f5576c', '#945fb9', '#1e9493', '#6e9eff', '#ff9d4d']

interface CloudWord {
  text?: string
  x?: number
  y?: number
  size?: number
}

/** 词云：d3-cloud 布局 + SVG 文本，data 形如 { name, value }，value 决定字号 */
export function WordCloud({ component, scale = 1 }: WidgetProps) {
  const data = (component.data?.length ? component.data : []) as { name: string; value: number }[]
  const boxRef = useRef<HTMLDivElement>(null)
  const [words, setWords] = useState<CloudWord[]>([])

  useEffect(() => {
    const el = boxRef.current
    if (!el || !data.length) return
    const w = el.clientWidth || 400
    const h = el.clientHeight || 250
    const max = Math.max(...data.map((d) => Number(d.value) || 0), 1)
    const layout = cloud()
      .size([w, h])
      .words(data.map((d) => ({ text: String(d.name), size: 12 + ((Number(d.value) || 0) / max) * 36 * scale })))
      .padding(3)
      .rotate(0)
      .fontSize((d) => d.size ?? 12)
      .on('end', (ws: CloudWord[]) => setWords(ws))
    layout.start()
    return () => {
      layout.stop()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [component.data, scale])

  return (
    <div ref={boxRef} style={{ width: '100%', height: '100%', overflow: 'hidden' }}>
      <svg style={{ width: '100%', height: '100%', display: 'block' }}>
        <g transform={`translate(${(boxRef.current?.clientWidth ?? 400) / 2},${(boxRef.current?.clientHeight ?? 250) / 2})`}>
          {words.map((wd, i) => (
            <text
              key={i}
              x={wd.x}
              y={wd.y}
              textAnchor="middle"
              fontSize={wd.size}
              fill={WIDGET_PALETTE[i % WIDGET_PALETTE.length]}
            >
              {wd.text}
            </text>
          ))}
        </g>
      </svg>
    </div>
  )
}

interface TreeNode {
  name: string
  value?: number
  children?: TreeNode[]
}

/** 树图：d3-hierarchy tree 布局 + SVG 贝塞尔连线，data 为单根层级结构（数组内一个根节点） */
export function RelationTree({ component, scale = 1 }: WidgetProps) {
  const rootData = component.data?.[0] as TreeNode | undefined
  if (!rootData) return null
  const W = 400
  const H = 260
  const root = tree<TreeNode>().size([H - 40, W - 90])(hierarchy(rootData))
  const fontSize = 12 * scale
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: '100%', display: 'block' }}>
      {root.links().map((l, i) => (
        <path
          key={i}
          fill="none"
          stroke="#2a3550"
          d={`M ${l.source.y + 50} ${l.source.x + 20} C ${(l.source.y + l.target.y) / 2 + 50} ${l.source.x + 20} ${(l.source.y + l.target.y) / 2 + 50} ${l.target.x + 20} ${l.target.y + 50} ${l.target.x + 20}`}
        />
      ))}
      {root.descendants().map((n, i) => (
        <g key={i} transform={`translate(${n.y + 50},${n.x + 20})`}>
          <circle r={4} fill={WIDGET_PALETTE[n.depth % WIDGET_PALETTE.length]} />
          <text x={8} y={4} fill="#dbeafe" fontSize={fontSize}>
            {n.data.name}
          </text>
        </g>
      ))}
    </svg>
  )
}

interface SankeyLink {
  source: string
  target: string
  value: number
}

/** 桑基图：d3-sankey 布局，data 为 { source, target, value } 边列表 */
export function RelationSankey({ component }: WidgetProps) {
  const links = (component.data?.length ? component.data : []) as SankeyLink[]
  if (!links.length) return null
  const names = [...new Set(links.flatMap((l) => [String(l.source), String(l.target)]))]
  const index = new Map(names.map((n, i) => [n, i]))
  const W = 400
  const H = 260
  // d3-sankey 会原地写入节点/边坐标，输入用索引引用
  const graph = sankey<{ name: string }, { source: number; target: number; value: number }>()
    .nodeWidth(12)
    .nodePadding(10)
    .extent([
      [8, 8],
      [W - 8, H - 8],
    ])({
    nodes: names.map((name) => ({ name })),
    links: links.map((l) => ({ source: index.get(String(l.source))!, target: index.get(String(l.target))!, value: Number(l.value) || 0 })),
  })
  const linkPath = sankeyLinkHorizontal()
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: '100%', display: 'block' }}>
      {graph.links.map((l, i) => {
        const d = linkPath(l as never)
        return d ? (
          <path key={i} d={d} fill="none" stroke={WIDGET_PALETTE[(l.source as { index?: number }).index ?? i % 8]} strokeOpacity={0.3} strokeWidth={Math.max(1, l.width ?? 1)} />
        ) : null
      })}
      {graph.nodes.map((n, i) => (
        <g key={i}>
          <rect x={n.x0} y={n.y0} width={(n.x1 ?? 0) - (n.x0 ?? 0)} height={Math.max(2, (n.y1 ?? 0) - (n.y0 ?? 0))} fill={WIDGET_PALETTE[i % WIDGET_PALETTE.length]} />
          <text x={(n.x1 ?? 0) + 4} y={((n.y0 ?? 0) + (n.y1 ?? 0)) / 2 + 4} fill="#dbeafe" fontSize={11}>
            {n.name}
          </text>
        </g>
      ))}
    </svg>
  )
}

interface ChordRow {
  from: string
  to: string
  value: number
}

/** 和弦图：d3-chord 布局，data 为 { from, to, value } 关系列表（内部构建方阵）；外环用 dasharray 圆弧 */
export function RelationChord({ component }: WidgetProps) {
  const rows = (component.data?.length ? component.data : []) as ChordRow[]
  if (!rows.length) return null
  const names = [...new Set(rows.flatMap((r) => [String(r.from), String(r.to)]))]
  const index = new Map(names.map((n, i) => [n, i]))
  const n = names.length
  const matrix = Array.from({ length: n }, () => Array<number>(n).fill(0))
  rows.forEach((r) => {
    matrix[index.get(String(r.from))!][index.get(String(r.to))!] += Number(r.value) || 0
  })
  const R = 100
  const C = 130
  const chords = chord().padAngle(0.05)(matrix)
  const ribbonGen = ribbon().radius(R - 12)
  const circumference = 2 * Math.PI * R
  return (
    <svg viewBox="0 0 260 260" style={{ width: '100%', height: '100%', display: 'block' }}>
      <g transform={`translate(${C},${C})`}>
        {chords.map((c, i) => {
          const d = ribbonGen(c as never) as string | undefined
          return d ? <path key={i} d={d} fill={WIDGET_PALETTE[c.source.index % WIDGET_PALETTE.length]} fillOpacity={0.35} /> : null
        })}
        {chords.groups.map((g, i) => {
          const frac = (g.endAngle - g.startAngle) / (2 * Math.PI)
          return (
            <g key={i}>
              <circle
                r={R}
                fill="none"
                stroke={WIDGET_PALETTE[i % WIDGET_PALETTE.length]}
                strokeWidth={8}
                strokeDasharray={`${Math.max(0, frac * circumference - 2)} ${circumference}`}
                transform={`rotate(${(g.startAngle * 180) / Math.PI - 90})`}
              />
              <text
                x={Math.cos((g.startAngle + g.endAngle) / 2 - Math.PI / 2) * (R + 16)}
                y={Math.sin((g.startAngle + g.endAngle) / 2 - Math.PI / 2) * (R + 16) + 4}
                textAnchor="middle"
                fill="#dbeafe"
                fontSize={11}
              >
                {names[i]}
              </text>
            </g>
          )
        })}
      </g>
    </svg>
  )
}

/** 矩形树图：d3 treemap 布局 + SVG 矩形，data 为单根层级结构（叶子带 value） */
export function TreeMap({ component }: WidgetProps) {
  const rootData = component.data?.[0] as TreeNode | undefined
  if (!rootData) return null
  const W = 400
  const H = 260
  const root = treemap<TreeNode>().size([W, H]).padding(2)(
    hierarchy(rootData).sum((d) => Number(d.value) || 0),
  )
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: '100%', display: 'block' }}>
      {root.leaves().map((leaf, i) => {
        const w = leaf.x1 - leaf.x0
        const h = leaf.y1 - leaf.y0
        return (
          <g key={i}>
            <rect x={leaf.x0} y={leaf.y0} width={w} height={h} fill={WIDGET_PALETTE[i % WIDGET_PALETTE.length]} fillOpacity={0.75} rx={2}>
              <title>{`${leaf.data.name}: ${leaf.value}`}</title>
            </rect>
            {w > 40 && h > 16 && (
              <text x={leaf.x0 + 5} y={leaf.y0 + 14} fill="#0b1020" fontSize={11} fontWeight={600}>
                {leaf.data.name}
              </text>
            )}
          </g>
        )
      })}
    </svg>
  )
}

/** 水球图：SVG 圆形裁切 + SMIL 波浪平移动画，props.value 为 0-100 百分比 */
export function Liquid({ component }: WidgetProps) {
  const pct = Math.min(100, Math.max(0, Number(component.props.value ?? 66)))
  const color = String(component.props.color ?? '#4f8cff')
  const cid = `liquid-${component.id}`
  // 波面 y（viewBox 200x200，圆 r=90 圆心 100,100）
  const y = 190 - (pct / 100) * 180
  // 一段宽 400 的正弦波路径（两个 200 周期），SMIL 横向平移 -200 循环
  const wave = (amp: number) => `M -200 ${y} q 25 ${-amp} 50 0 t 50 0 t 50 0 t 50 0 t 50 0 t 50 0 t 50 0 t 50 0 L 200 200 L -200 200 Z`
  return (
    <svg viewBox="0 0 200 200" style={{ width: '100%', height: '100%', display: 'block' }}>
      <defs>
        <clipPath id={cid}>
          <circle cx={100} cy={100} r={88} />
        </clipPath>
      </defs>
      <circle cx={100} cy={100} r={90} fill="none" stroke={color} strokeWidth={3} />
      <g clipPath={`url(#${cid})`}>
        <path d={wave(10)} fill={color} opacity={0.35}>
          <animateTransform attributeName="transform" type="translate" from="0 0" to="200 0" dur="4s" repeatCount="indefinite" />
        </path>
        <path d={wave(6)} fill={color} opacity={0.8}>
          <animateTransform attributeName="transform" type="translate" from="0 0" to="200 0" dur="2.5s" repeatCount="indefinite" />
        </path>
      </g>
      <text x={100} y={112} textAnchor="middle" fill="#ffffff" fontSize={30} fontWeight={700}>
        {pct}%
      </text>
    </svg>
  )
}
