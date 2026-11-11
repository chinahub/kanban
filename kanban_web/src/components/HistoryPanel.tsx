import { useStore } from 'zustand'
import { Button, Typography } from 'antd'
import { RedoOutlined, UndoOutlined } from '@ant-design/icons'
import { useEditorStore } from '../store/editorStore'

export default function HistoryPanel() {
  const pastCount = useStore(useEditorStore.temporal, (s) => s.pastStates.length)
  const futureCount = useStore(useEditorStore.temporal, (s) => s.futureStates.length)

  // 连续调用 undo/redo 跳转：pastStates 尾部 = 最近一步，futureStates 尾部 = 下一个可重做
  const jump = (steps: number, direction: 'undo' | 'redo') => {
    const { undo, redo } = useEditorStore.temporal.getState()
    const fn = direction === 'undo' ? undo : redo
    for (let k = 0; k < steps; k++) fn()
  }

  return (
    <>
      <div className="history-actions">
        <Button size="small" icon={<UndoOutlined />} disabled={pastCount === 0} onClick={() => jump(1, 'undo')} block>
          撤销
        </Button>
        <Button size="small" icon={<RedoOutlined />} disabled={futureCount === 0} onClick={() => jump(1, 'redo')} block>
          重做
        </Button>
      </div>
      <div className="history-list">
        {pastCount === 0 && futureCount === 0 && (
          <Typography.Text type="secondary" className="history-empty">暂无历史记录</Typography.Text>
        )}
        {Array.from({ length: pastCount }, (_, i) => (
          <button key={`p${i}`} className="history-item" onClick={() => jump(pastCount - i, 'undo')}>
            步骤 {i + 1}
          </button>
        ))}
        {(pastCount > 0 || futureCount > 0) && (
          <div className="history-item current">当前状态</div>
        )}
        {Array.from({ length: futureCount }, (_, j) => (
          <button key={`f${j}`} className="history-item future" onClick={() => jump(j + 1, 'redo')}>
            重做 {j + 1}
          </button>
        ))}
      </div>
    </>
  )
}
