import { useEffect, useMemo, useState } from 'react'
import { Modal } from 'antd'
import RuntimeCanvas from './RuntimeCanvas'
import { useEditorStore } from '../store/editorStore'
import { useVariableStore } from '../store/variableStore'
import { useInteractionStore } from '../util/interactionRunner'

/**
 * 编辑器预览模态：全屏运行态渲染当前画布，交互事件在此生效（编辑画布内不触发）。
 * 关闭时重置运行态覆盖并重新加载项目变量，避免污染编辑器状态。
 */
export default function PreviewModal({
  open,
  onClose,
  projectId,
}: {
  open: boolean
  onClose: () => void
  projectId: number | null
}) {
  const config = useEditorStore((s) => s.config)
  const [viewport, setViewport] = useState({ w: window.innerWidth, h: window.innerHeight })

  useEffect(() => {
    if (!open) return
    const onResize = () => setViewport({ w: window.innerWidth, h: window.innerHeight })
    window.addEventListener('resize', onResize)
    useInteractionStore.getState().reset()
    return () => window.removeEventListener('resize', onResize)
  }, [open])

  const scale = useMemo(() => {
    const pad = 24
    const sw = (viewport.w - pad * 2) / config.canvas.width
    const sh = (viewport.h - pad * 2) / config.canvas.height
    return Math.min(sw, sh)
  }, [config.canvas.width, config.canvas.height, viewport])

  const handleClose = () => {
    useInteractionStore.getState().reset()
    // 预览中的 setVariable 是运行态覆盖，关闭后还原为项目持久化变量
    if (projectId != null) void useVariableStore.getState().load(projectId)
    onClose()
  }

  return (
    <Modal
      open={open}
      onCancel={handleClose}
      footer={null}
      width="100vw"
      style={{ top: 0, maxWidth: '100vw', paddingBottom: 0 }}
      styles={{ body: { height: 'calc(100vh - 56px)', display: 'flex', alignItems: 'center', justifyContent: 'center' } }}
      title="预览（交互事件已生效）"
      destroyOnHidden
    >
      <div
        style={{
          position: 'relative',
          overflow: 'hidden',
          width: config.canvas.width * scale,
          height: config.canvas.height * scale,
          background: config.canvas.background,
          flexShrink: 0,
        }}
      >
        <RuntimeCanvas config={config} scale={scale} />
      </div>
    </Modal>
  )
}
