import { useEffect, useMemo, useRef, useState } from 'react'
import { AutoComplete, Button, Checkbox, Drawer, Input, Popconfirm, Select, Space, Typography } from 'antd'
import { ClearOutlined, DeleteOutlined, NodeIndexOutlined, PlusOutlined } from '@ant-design/icons'
import { useEditorStore } from '../store/editorStore'
import { useVariableStore } from '../store/variableStore'
import type {
  BlueprintNode,
  BlueprintNodeKind,
  ComponentEventAction,
  EventTrigger,
} from '../types/editor'
import './BlueprintPanel.css'

/** 蓝图画布逻辑尺寸（超出可视区滚动） */
const CANVAS_W = 2600
const CANVAS_H = 1500
const NODE_W = 176
const NODE_H = 62

const KIND_META: Record<BlueprintNodeKind, { label: string; color: string }> = {
  event: { label: '事件源', color: '#1677ff' },
  condition: { label: '条件', color: '#fa8c16' },
  action: { label: '动作', color: '#52c41a' },
}

const TRIGGER_OPTIONS: { value: EventTrigger; label: string }[] = [
  { value: 'click', label: '点击' },
  { value: 'dblclick', label: '双击' },
  { value: 'hover', label: '悬停' },
  { value: 'viewport', label: '进入视口' },
]

const TRIGGER_LABEL: Record<EventTrigger, string> = {
  click: '点击',
  dblclick: '双击',
  hover: '悬停',
  viewport: '进入视口',
}

const ACTION_OPTIONS: { value: ComponentEventAction['type']; label: string }[] = [
  { value: 'setVariable', label: '设置变量' },
  { value: 'toggleVisible', label: '切换显隐' },
  { value: 'highlight', label: '高亮组件' },
  { value: 'openUrl', label: '打开链接' },
  { value: 'gotoPage', label: '跳转到页面' },
]

function defaultAction(type: ComponentEventAction['type']): ComponentEventAction {
  switch (type) {
    case 'setVariable':
      return { type, variable: '', value: '' }
    case 'toggleVisible':
    case 'highlight':
      return { type, targetId: '' }
    case 'openUrl':
      return { type, url: '', newWindow: true }
    case 'gotoPage':
      return { type, pageId: '', params: [] }
  }
}

function isEditable(el: EventTarget | null): boolean {
  const node = el as HTMLElement | null
  if (!node) return false
  return node.tagName === 'INPUT' || node.tagName === 'TEXTAREA' || node.isContentEditable
}

/** 拖动节点时的瞬时位置（pointerup 才提交 store，保证一次拖动 = 一步撤销） */
interface NodeDrag {
  id: string
  offsetX: number
  offsetY: number
  curX: number
  curY: number
}

/** 正在连线状态：从 out 端口拉出到当前指针（画布坐标） */
interface Linking {
  from: string
  x: number
  y: number
}

/**
 * 蓝图编排面板（PRD §4.14）：事件源/条件/动作节点 + 连线的可视化编辑器。
 * 数据存 config.blueprint（随配置保存进快照）；运行态由 interactionRunner.fireBlueprintEvent 执行。
 */
export default function BlueprintPanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  const blueprint = useEditorStore((s) => s.config.blueprint)
  const pages = useEditorStore((s) => s.config.pages)
  const variables = useVariableStore((s) => s.variables)
  const [selected, setSelected] = useState<{ type: 'node' | 'edge'; id: string } | null>(null)
  const [drag, setDrag] = useState<NodeDrag | null>(null)
  const [linking, setLinking] = useState<Linking | null>(null)
  const canvasRef = useRef<HTMLDivElement | null>(null)

  const selectedNode = selected?.type === 'node' ? blueprint.nodes.find((n) => n.id === selected.id) ?? null : null
  const selectedEdge = selected?.type === 'edge' ? blueprint.edges.find((e) => e.id === selected.id) ?? null : null

  const componentById = useMemo(() => {
    const map = new Map<string, { name: string; pageName: string }>()
    for (const p of pages) for (const c of p.components) map.set(c.id, { name: c.name, pageName: p.name })
    return map
  }, [pages])

  const componentOptions = useMemo(
    () =>
      pages.flatMap((p) =>
        p.components.map((c) => ({ value: c.id, label: `【${p.name}】${c.name}（${c.type}）` })),
      ),
    [pages],
  )
  const pageOptions = useMemo(() => pages.map((p) => ({ value: p.id, label: p.name })), [pages])
  const variableOptions = useMemo(() => variables.map((v) => ({ value: v.name })), [variables])

  // 拖拽节点 / 连线期间挂 document 级指针监听（pointer capture 简化为全局监听）
  useEffect(() => {
    if (!drag && !linking) return
    const toCanvas = (e: PointerEvent) => {
      const rect = canvasRef.current?.getBoundingClientRect()
      return rect ? { x: e.clientX - rect.left, y: e.clientY - rect.top } : { x: 0, y: 0 }
    }
    const onMove = (e: PointerEvent) => {
      const pos = toCanvas(e)
      if (drag) {
        setDrag((d) =>
          d ? { ...d, curX: Math.max(0, pos.x - d.offsetX), curY: Math.max(0, pos.y - d.offsetY) } : d,
        )
      } else if (linking) {
        setLinking((l) => (l ? { ...l, x: pos.x, y: pos.y } : l))
      }
    }
    const onUp = (e: PointerEvent) => {
      if (linking) {
        // 命中某个节点的 in 端口则建立连线
        const el = document.elementFromPoint(e.clientX, e.clientY) as HTMLElement | null
        const target = el?.closest('[data-in-node]')?.getAttribute('data-in-node')
        if (target) useEditorStore.getState().addBlueprintEdge(linking.from, target)
      }
      if (drag) {
        useEditorStore.getState().moveBlueprintNode(drag.id, drag.curX, drag.curY)
      }
      setDrag(null)
      setLinking(null)
    }
    document.addEventListener('pointermove', onMove)
    document.addEventListener('pointerup', onUp)
    return () => {
      document.removeEventListener('pointermove', onMove)
      document.removeEventListener('pointerup', onUp)
    }
  }, [drag, linking])

  // Delete 删除选中节点/连线，Esc 取消选择（输入框内不拦截）
  useEffect(() => {
    if (!open) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (isEditable(e.target)) return
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (!selected) return
        e.preventDefault()
        const store = useEditorStore.getState()
        if (selected.type === 'node') store.removeBlueprintNode(selected.id)
        else store.removeBlueprintEdge(selected.id)
        setSelected(null)
      } else if (e.key === 'Escape') {
        setSelected(null)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [open, selected])

  /** 节点当前应渲染的位置（拖拽中取瞬时位置） */
  const posOf = (n: BlueprintNode) =>
    drag && drag.id === n.id ? { x: drag.curX, y: drag.curY } : { x: n.x, y: n.y }

  const portOut = (n: BlueprintNode) => {
    const p = posOf(n)
    return { x: p.x + NODE_W, y: p.y + NODE_H / 2 }
  }
  const portIn = (n: BlueprintNode) => {
    const p = posOf(n)
    return { x: p.x, y: p.y + NODE_H / 2 }
  }

  const nodeById = useMemo(() => new Map(blueprint.nodes.map((n) => [n.id, n])), [blueprint.nodes])

  const bezier = (x1: number, y1: number, x2: number, y2: number) =>
    `M ${x1} ${y1} C ${x1 + 70} ${y1}, ${x2 - 70} ${y2}, ${x2} ${y2}`

  const nodeSummary = (n: BlueprintNode): string => {
    if (n.kind === 'event') {
      const comp = n.componentId ? componentById.get(n.componentId) : undefined
      return `${TRIGGER_LABEL[n.trigger ?? 'click']} · ${comp ? comp.name : '（未绑定组件）'}`
    }
    if (n.kind === 'condition') return n.expression?.trim() ? n.expression : '恒真（未配置表达式）'
    const a = n.action
    if (!a) return '（未配置动作）'
    switch (a.type) {
      case 'setVariable':
        return `${a.variable || '变量?'} = ${a.value || "''"}`
      case 'toggleVisible':
      case 'highlight':
        return componentById.get(a.targetId)?.name ?? '（未选目标组件）'
      case 'openUrl':
        return a.url || '（未填链接）'
      case 'gotoPage':
        return pages.find((p) => p.id === a.pageId)?.name ?? '（未选页面）'
    }
  }

  const startDrag = (e: React.PointerEvent, node: BlueprintNode) => {
    if (e.button !== 0) return
    e.preventDefault()
    e.stopPropagation()
    setSelected({ type: 'node', id: node.id })
    const rect = canvasRef.current?.getBoundingClientRect()
    if (!rect) return
    const px = e.clientX - rect.left
    const py = e.clientY - rect.top
    setDrag({ id: node.id, offsetX: px - node.x, offsetY: py - node.y, curX: node.x, curY: node.y })
  }

  const startLink = (e: React.PointerEvent, node: BlueprintNode) => {
    if (e.button !== 0) return
    e.preventDefault()
    e.stopPropagation()
    const p = portOut(node)
    setLinking({ from: node.id, x: p.x, y: p.y })
  }

  const addNode = (kind: BlueprintNodeKind) => {
    const graph = canvasRef.current
    // 在当前可视区中心落点，避免新节点总在角落
    const scroll = graph ? { left: graph.scrollLeft, top: graph.scrollTop, w: graph.clientWidth, h: graph.clientHeight } : null
    const x = scroll ? scroll.left + scroll.w / 2 - NODE_W / 2 : 120
    const y = scroll ? scroll.top + scroll.h / 2 - NODE_H / 2 : 120
    const store = useEditorStore.getState()
    store.addBlueprintNode(kind, Math.max(0, x + Math.random() * 40), Math.max(0, y + Math.random() * 40))
  }

  return (
    <Drawer
      title={
        <Space>
          <NodeIndexOutlined />
          蓝图编排
          <Typography.Text type="secondary" style={{ fontSize: 12, fontWeight: 400 }}>
            事件源 → 条件 → 动作；在预览与分享页运行态生效
          </Typography.Text>
        </Space>
      }
      placement="right"
      width={Math.min(1150, Math.round(window.innerWidth * 0.94))}
      open={open}
      onClose={onClose}
      className="bp-drawer"
      destroyOnHidden
    >
      <div className="bp-toolbar">
        <Button size="small" icon={<PlusOutlined />} onClick={() => addNode('event')}>
          事件源
        </Button>
        <Button size="small" icon={<PlusOutlined />} onClick={() => addNode('condition')}>
          条件
        </Button>
        <Button size="small" icon={<PlusOutlined />} onClick={() => addNode('action')}>
          动作
        </Button>
        <Button
          size="small"
          danger
          icon={<DeleteOutlined />}
          disabled={!selected}
          onClick={() => {
            if (!selected) return
            const store = useEditorStore.getState()
            if (selected.type === 'node') store.removeBlueprintNode(selected.id)
            else store.removeBlueprintEdge(selected.id)
            setSelected(null)
          }}
        >
          删除选中
        </Button>
        <Popconfirm title="清空全部节点与连线？" onConfirm={() => useEditorStore.getState().clearBlueprint()}>
          <Button size="small" danger icon={<ClearOutlined />} disabled={!blueprint.nodes.length}>
            清空
          </Button>
        </Popconfirm>
        <span className="bp-hint">拖节点头部移动 · 从右侧端口拉出到目标节点连线 · Delete 删除选中</span>
      </div>
      <div className="bp-body">
        <div
          className="bp-graph"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setSelected(null)
          }}
        >
          <div
            ref={canvasRef}
            className="bp-canvas"
            style={{ width: CANVAS_W, height: CANVAS_H }}
            onMouseDown={(e) => {
              if (e.target === e.currentTarget) setSelected(null)
            }}
          >
            <svg className="bp-edges" width={CANVAS_W} height={CANVAS_H}>
              {blueprint.edges.map((edge) => {
                const from = nodeById.get(edge.from)
                const to = nodeById.get(edge.to)
                if (!from || !to) return null
                const a = portOut(from)
                const b = portIn(to)
                const d = bezier(a.x, a.y, b.x, b.y)
                const active = selected?.type === 'edge' && selected.id === edge.id
                return (
                  <g key={edge.id}>
                    <path
                      className="bp-edge-hit"
                      d={d}
                      fill="none"
                      stroke="transparent"
                      strokeWidth={14}
                      onMouseDown={(e) => {
                        e.stopPropagation()
                        setSelected({ type: 'edge', id: edge.id })
                      }}
                    />
                    <path
                      d={d}
                      fill="none"
                      stroke={active ? '#faad14' : 'rgba(120, 160, 255, 0.55)'}
                      strokeWidth={active ? 2.5 : 1.6}
                    />
                  </g>
                )
              })}
              {linking && (() => {
                const from = nodeById.get(linking.from)
                if (!from) return null
                const a = portOut(from)
                return (
                  <path
                    d={bezier(a.x, a.y, linking.x, linking.y)}
                    fill="none"
                    stroke="#52c41a"
                    strokeWidth={2}
                    strokeDasharray="6 4"
                  />
                )
              })()}
            </svg>
            {blueprint.nodes.length === 0 && (
              <div className="bp-empty">
                点击上方「事件源 / 条件 / 动作」添加节点：例如 点击柱状图 → 条件 value &gt; 100 → 跳转到详情页
              </div>
            )}
            {blueprint.nodes.map((n) => {
              const p = posOf(n)
              const meta = KIND_META[n.kind]
              const active = selected?.type === 'node' && selected.id === n.id
              return (
                <div
                  key={n.id}
                  className={active ? 'bp-node selected' : 'bp-node'}
                  style={{ left: p.x, top: p.y }}
                  onPointerDown={(e) => {
                    // 节点整体可拖动（含端口外的空白处）；端口自身在 startLink/startDrag 中已 stopPropagation
                    if (e.target === e.currentTarget) startDrag(e, n)
                  }}
                >
                  {n.kind !== 'event' && (
                    <span
                      className="bp-port in"
                      data-in-node={n.id}
                      title="入端口"
                    />
                  )}
                  <div
                    className="bp-node-head"
                    style={{ background: meta.color }}
                    onPointerDown={(e) => startDrag(e, n)}
                  >
                    <span className="bp-node-title">{meta.label}</span>
                    <span
                      className="bp-node-close"
                      title="删除节点"
                      onClick={(e) => {
                        e.stopPropagation()
                        useEditorStore.getState().removeBlueprintNode(n.id)
                        if (active) setSelected(null)
                      }}
                    >
                      ✕
                    </span>
                  </div>
                  <div className="bp-node-body" title={nodeSummary(n)}>{nodeSummary(n)}</div>
                  <span
                    className="bp-port out"
                    title="拖到目标节点连线"
                    onPointerDown={(e) => startLink(e, n)}
                  />
                </div>
              )
            })}
          </div>
        </div>
        <div className="bp-config">
          {selectedNode ? (
            <NodeConfigForm
              key={selectedNode.id}
              node={selectedNode}
              componentOptions={componentOptions}
              pageOptions={pageOptions}
              variableOptions={variableOptions}
            />
          ) : selectedEdge ? (
            <div>
              <Typography.Text strong>连线</Typography.Text>
              <Typography.Paragraph type="secondary" style={{ fontSize: 12, marginTop: 8 }}>
                {KIND_META[nodeById.get(selectedEdge.from)?.kind ?? 'event'].label} →{' '}
                {KIND_META[nodeById.get(selectedEdge.to)?.kind ?? 'event'].label}
              </Typography.Paragraph>
              <Button
                danger
                size="small"
                icon={<DeleteOutlined />}
                onClick={() => {
                  useEditorStore.getState().removeBlueprintEdge(selectedEdge.id)
                  setSelected(null)
                }}
              >
                删除连线
              </Button>
            </div>
          ) : (
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
              选中节点或连线后在此配置。
              事件源绑定组件与触发方式；条件用 JS 表达式（作用域 vars / ctx）控制流向；动作支持设变量、显隐、高亮、打开链接、跳转子页面。
            </Typography.Text>
          )}
        </div>
      </div>
    </Drawer>
  )
}

/** 选中节点的配置表单：按类型渲染（事件源 / 条件 / 动作） */
function NodeConfigForm({
  node,
  componentOptions,
  pageOptions,
  variableOptions,
}: {
  node: BlueprintNode
  componentOptions: { value: string; label: string }[]
  pageOptions: { value: string; label: string }[]
  variableOptions: { value: string }[]
}) {
  const update = useEditorStore((s) => s.updateBlueprintNode)
  const meta = KIND_META[node.kind]

  const patchAction = (patch: Record<string, unknown>) =>
    update(node.id, { action: { ...node.action, ...patch } as ComponentEventAction })

  return (
    <Space direction="vertical" style={{ width: '100%' }} size={10}>
      <Typography.Text strong style={{ color: meta.color }}>
        {meta.label}节点
      </Typography.Text>

      {node.kind === 'event' && (
        <>
          <Select
            style={{ width: '100%' }}
            showSearch
            optionFilterProp="label"
            placeholder="绑定触发组件（跨页面）"
            value={node.componentId || undefined}
            options={componentOptions}
            onChange={(componentId) => update(node.id, { componentId })}
          />
          <Select
            style={{ width: '100%' }}
            value={node.trigger ?? 'click'}
            options={TRIGGER_OPTIONS}
            onChange={(trigger) => update(node.id, { trigger })}
          />
        </>
      )}

      {node.kind === 'condition' && (
        <>
          <Input.TextArea
            rows={4}
            placeholder="JS 表达式，如 Number(vars.value) > 100"
            value={node.expression ?? ''}
            onChange={(e) => update(node.id, { expression: e.target.value })}
          />
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            作用域：vars.变量名（全局变量值）、ctx.name/value/series（点击上下文）。表达式为真才向下游传播；为空视为恒真。
          </Typography.Text>
          {variableOptions.length > 0 && (
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
              可用变量：{variableOptions.map((v) => v.value).join('、')}
            </Typography.Text>
          )}
        </>
      )}

      {node.kind === 'action' && (
        <>
          <Select
            style={{ width: '100%' }}
            value={node.action?.type ?? 'setVariable'}
            options={ACTION_OPTIONS}
            onChange={(type) => update(node.id, { action: defaultAction(type) })}
          />
          {node.action?.type === 'setVariable' && (
            <>
              <AutoComplete
                style={{ width: '100%' }}
                value={node.action.variable}
                options={variableOptions}
                placeholder="变量名（var. 后的名字）"
                onChange={(variable) => patchAction({ variable })}
              />
              <Input
                value={node.action.value}
                placeholder="写入的值，支持 {{var.xxx}}/{{ctx.name}}"
                onChange={(e) => patchAction({ value: e.target.value })}
              />
            </>
          )}
          {(node.action?.type === 'toggleVisible' || node.action?.type === 'highlight') && (
            <Select
              style={{ width: '100%' }}
              showSearch
              optionFilterProp="label"
              value={node.action.targetId || undefined}
              options={componentOptions}
              placeholder="目标组件"
              onChange={(targetId) => patchAction({ targetId })}
            />
          )}
          {node.action?.type === 'openUrl' && (
            <>
              <Input
                value={node.action.url}
                placeholder="https://…（支持 {{var.变量名}} 插值）"
                onChange={(e) => patchAction({ url: e.target.value })}
              />
              <Checkbox
                checked={node.action.newWindow}
                onChange={(e) => patchAction({ newWindow: e.target.checked })}
              >
                新窗口打开
              </Checkbox>
            </>
          )}
          {node.action?.type === 'gotoPage' && (
            <>
              <Select
                style={{ width: '100%' }}
                value={node.action.pageId || undefined}
                options={pageOptions}
                placeholder="目标页面"
                onChange={(pageId) => patchAction({ pageId })}
              />
              <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                携带参数（写入全局变量，值支持 {'{{var.xxx}}'} 与 {'{{ctx.name}}'} 插值）
              </Typography.Text>
              {node.action.params.map((p, i) => (
                <div key={i} className="bp-param-row">
                  <Input
                    style={{ width: 104 }}
                    value={p.name}
                    placeholder="变量名"
                    onChange={(e) =>
                      patchAction({
                        params: node.action
                          ? (node.action as Extract<ComponentEventAction, { type: 'gotoPage' }>).params.map((item, j) =>
                              j === i ? { ...item, name: e.target.value } : item,
                            )
                          : [],
                      })
                    }
                  />
                  <Input
                    value={p.value}
                    placeholder="值，如 {{ctx.name}}"
                    onChange={(e) =>
                      patchAction({
                        params: node.action
                          ? (node.action as Extract<ComponentEventAction, { type: 'gotoPage' }>).params.map((item, j) =>
                              j === i ? { ...item, value: e.target.value } : item,
                            )
                          : [],
                      })
                    }
                  />
                  <Button
                    size="small"
                    type="text"
                    danger
                    icon={<DeleteOutlined />}
                    onClick={() =>
                      patchAction({
                        params: node.action
                          ? (node.action as Extract<ComponentEventAction, { type: 'gotoPage' }>).params.filter(
                              (_, j) => j !== i,
                            )
                          : [],
                      })
                    }
                  />
                </div>
              ))}
              <Button
                size="small"
                type="dashed"
                icon={<PlusOutlined />}
                block
                onClick={() =>
                  patchAction({
                    params: node.action
                      ? [...(node.action as Extract<ComponentEventAction, { type: 'gotoPage' }>).params, { name: '', value: '' }]
                      : [],
                  })
                }
              >
                添加参数
              </Button>
            </>
          )}
        </>
      )}

      <Typography.Text type="secondary" style={{ fontSize: 12 }}>
        节点位置：x {Math.round(node.x)} · y {Math.round(node.y)}
      </Typography.Text>
    </Space>
  )
}
