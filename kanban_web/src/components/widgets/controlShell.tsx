import type { ReactNode } from 'react'

/** 控件容器：编辑器内 pointerEvents 关闭（不吞选择点击），预览/分享态可交互 */
export function ControlShell({ interactive, scale = 1, children }: { interactive?: boolean; scale?: number; children: ReactNode }) {
  return (
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
      {children}
    </div>
  )
}

/** 控件选项解析：props.options 每行一个 */
export function parseOptions(raw: unknown): string[] {
  return String(raw ?? '').split('\n').map((s) => s.trim()).filter(Boolean)
}
