import { memo, useMemo } from 'react'

interface RulerProps {
  length: number
  scale: number
  orientation: 'horizontal' | 'vertical'
  onMouseDown?: (e: React.MouseEvent) => void
}

const RULER_THICKNESS = 24
const MAJOR_TICK = 12
const MINOR_TICK = 5
const FONT_SIZE = 9

// 1, 2, 5, 10, 20, 50, 100, 200, 500, ...
const NICE = [1, 2, 5, 10, 20, 50, 100, 200, 500, 1000, 2000, 5000, 10000]

function niceStep(targetScreen: number, scale: number): number {
  const raw = targetScreen / scale
  return NICE.find((n) => n >= raw) ?? NICE[NICE.length - 1]
}

interface Tick {
  pos: number
  major: boolean
  label: number | null
}

const Ruler = memo(function Ruler({ length, scale, orientation, onMouseDown }: RulerProps) {
  const isH = orientation === 'horizontal'
  const pxSize = Math.max(length * scale, RULER_THICKNESS)
  const width = isH ? pxSize : RULER_THICKNESS
  const height = isH ? RULER_THICKNESS : pxSize

  const ticks = useMemo<Tick[]>(() => {
    const minor = niceStep(10, scale)
    let major = niceStep(60, scale)
    if (major < minor) major = minor * 5
    if (major % minor !== 0) major = Math.ceil(major / minor) * minor
    const arr: Tick[] = []
    // floating-point tolerance for "is this value a multiple of major"
    const eps = minor * 1e-6
    const total = length + eps
    for (let v = 0; v <= total; v += minor) {
      const isMajor = Math.abs((v / major) - Math.round(v / major)) * major < eps
      arr.push({ pos: v * scale, major: isMajor, label: isMajor ? v : null })
    }
    return arr
  }, [length, scale])

  const lastIdx = ticks.length - 1

  return (
    <div
      className={`ruler ${orientation}`}
      style={{ width, height }}
      onMouseDown={onMouseDown}
    >
      <svg
        width={width}
        height={height}
        className="ruler-svg"
        shapeRendering="crispEdges"
      >
        {ticks.map((t, i) => {
          const tickLen = t.major ? MAJOR_TICK : MINOR_TICK
          if (isH) {
            const isFirst = i === 0
            const isLast = i === lastIdx
            const textX = isLast ? t.pos - 2 : isFirst ? t.pos + 3 : t.pos
            const textAnchor = isLast ? 'end' : isFirst ? 'start' : 'middle'
            return (
              <g key={i}>
                <line
                  x1={t.pos}
                  y1={RULER_THICKNESS - tickLen}
                  x2={t.pos}
                  y2={RULER_THICKNESS}
                  stroke={t.major ? '#94a3b8' : '#475569'}
                  strokeWidth={1}
                />
                {t.label !== null && (
                  <text
                    x={textX}
                    y={11}
                    fontSize={FONT_SIZE}
                    fill="#94a3b8"
                    fontFamily="ui-monospace, SFMono-Regular, Menlo, Consolas, monospace"
                    textAnchor={textAnchor}
                  >
                    {t.label}
                  </text>
                )}
              </g>
            )
          }
          // vertical: text rotated -90 so it reads bottom-to-top
          const cx = 12
          const cy = t.pos
          return (
            <g key={i}>
              <line
                x1={RULER_THICKNESS - tickLen}
                y1={t.pos}
                x2={RULER_THICKNESS}
                y2={t.pos}
                stroke={t.major ? '#94a3b8' : '#475569'}
                strokeWidth={1}
              />
              {t.label !== null && (
                <text
                  x={cx}
                  y={cy}
                  fontSize={FONT_SIZE}
                  fill="#94a3b8"
                  fontFamily="ui-monospace, SFMono-Regular, Menlo, Consolas, monospace"
                  textAnchor="middle"
                  dominantBaseline="central"
                  transform={`rotate(-90, ${cx}, ${cy})`}
                >
                  {t.label}
                </text>
              )}
            </g>
          )
        })}
      </svg>
    </div>
  )
})

export default Ruler
