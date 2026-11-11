import { memo, useEffect, useRef } from 'react'
import ComponentRenderer from './ComponentRenderer'
import { fireBlueprintEvent, runComponentEvents, useInteractionStore } from '../util/interactionRunner'
import type { CanvasComponent, CanvasConfig } from '../types/editor'

/**
 * 运行态画布：按 scale 等比缩放渲染当前页组件，并挂载交互事件（PRD §4.10）与蓝图编排（PRD §4.14）。
 * 编辑器预览模态与分享页共用；编辑画布本身不执行交互动作。
 * 渲染页 = pageId prop ?? interactionStore.pageId（钻取切换）?? 首页。
 */
export default function RuntimeCanvas({ config, scale, pageId }: { config: CanvasConfig; scale: number; pageId?: string }) {
  const hidden = useInteractionStore((s) => s.hidden)
  const highlightId = useInteractionStore((s) => s.highlightId)
  const runtimePageId = useInteractionStore((s) => s.pageId)
  const activeId = pageId ?? runtimePageId
  const page = config.pages.find((p) => p.id === activeId) ?? config.pages[0]
  return (
    <>
      {page.components.map((c) => (
        <RuntimeLayer key={c.id} component={c} scale={scale} background={config.canvas.background} blueprint={config.blueprint} hidden={!!hidden[c.id]} highlighted={highlightId === c.id} />
      ))}
    </>
  )
}

const RuntimeLayer = memo(function RuntimeLayer({
  component: c,
  scale,
  background,
  blueprint,
  hidden,
  highlighted,
}: {
  component: CanvasComponent
  scale: number
  background: string
  blueprint: CanvasConfig['blueprint']
  hidden: boolean
  highlighted: boolean
}) {
  const ref = useRef<HTMLDivElement | null>(null)
  const hasViewportEvent = c.events?.some((e) => e.trigger === 'viewport') ||
    !!blueprint?.nodes.some((n) => n.kind === 'event' && n.componentId === c.id && n.trigger === 'viewport')
  const clickable = c.events?.some((e) => e.trigger === 'click' || e.trigger === 'dblclick') ||
    !!blueprint?.nodes.some((n) => n.kind === 'event' && n.componentId === c.id && (n.trigger === 'click' || n.trigger === 'dblclick'))

  // 「进入视口」触发：每次进入视口时执行一次
  useEffect(() => {
    if (!hasViewportEvent || !ref.current) return
    const el = ref.current
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          runComponentEvents(c.events, 'viewport')
          fireBlueprintEvent(blueprint, c.id, 'viewport')
        }
      }
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [hasViewportEvent, c.events, blueprint, c.id])

  /** 组件交互事件 + 蓝图事件源一起触发 */
  const fire = (trigger: 'click' | 'dblclick' | 'hover') => {
    runComponentEvents(c.events, trigger)
    fireBlueprintEvent(blueprint, c.id, trigger)
  }

  return (
    <div
      ref={ref}
      className="share-layer"
      style={{
        position: 'absolute',
        left: 0,
        top: 0,
        boxSizing: 'border-box',
        transformOrigin: '0 0',
        overflow: 'hidden',
        width: c.width * scale,
        height: c.height * scale,
        opacity: c.opacity,
        transform: `translate(${c.x * scale}px, ${c.y * scale}px) rotate(${c.rotate}deg)`,
        display: c.visible && !hidden ? 'block' : 'none',
        outline: highlighted ? '2px solid #faad14' : undefined,
        outlineOffset: highlighted ? 2 : undefined,
        cursor: clickable ? 'pointer' : undefined,
      }}
      onClick={() => fire('click')}
      onDoubleClick={() => fire('dblclick')}
      onMouseEnter={() => fire('hover')}
    >
      <div style={{ width: '100%', height: '100%' }}>
        <ComponentRenderer component={c} scale={scale} background={background} interactive />
      </div>
    </div>
  )
})
