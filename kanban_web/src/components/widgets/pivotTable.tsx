import type { CanvasComponent } from '../../types/editor'

interface PivotRow {
  row?: string
  col?: string
  value?: number | string
}

const cellStyle: React.CSSProperties = { padding: '6px 10px', borderBottom: '1px solid rgba(42,53,80,0.6)', textAlign: 'right', whiteSpace: 'nowrap' }

/** 交叉透视表（简化版）：data 为 { row, col, value } 长表，行列去重后交叉求和 */
export function TablePivot({ component, scale = 1 }: { component: CanvasComponent; scale?: number }) {
  const rows = (component.data?.length ? component.data : []) as PivotRow[]
  const rowKeys = [...new Set(rows.map((r) => String(r.row ?? '')))]
  const colKeys = [...new Set(rows.map((r) => String(r.col ?? '')))]
  const fontSize = 13 * scale
  // 交叉单元格求和
  const cell = new Map<string, number>()
  rows.forEach((r) => {
    const k = `${String(r.row)}::${String(r.col)}`
    cell.set(k, (cell.get(k) ?? 0) + (Number(r.value) || 0))
  })
  return (
    <div style={{ width: '100%', height: '100%', overflow: 'auto', fontSize }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th style={{ ...cellStyle, textAlign: 'left', color: '#7f8db3' }}>行 \ 列</th>
            {colKeys.map((c) => (
              <th key={c} style={{ ...cellStyle, color: '#7f8db3' }}>{c}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rowKeys.map((r, ri) => (
            <tr key={r} style={{ background: ri % 2 ? 'rgba(42,53,80,0.25)' : 'transparent' }}>
              <td style={{ ...cellStyle, textAlign: 'left', color: '#dbeafe' }}>{r}</td>
              {colKeys.map((c) => (
                <td key={c} style={{ ...cellStyle, color: '#dbeafe' }}>{cell.get(`${r}::${c}`) ?? '-'}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
