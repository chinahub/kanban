import { AutoComplete, Button, Checkbox, Input, Select, Space, Typography } from 'antd'
import { DeleteOutlined, PlusOutlined } from '@ant-design/icons'
import { useEditorStore, useCurrentPage, useSelectedComponent } from '../store/editorStore'
import { useVariableStore } from '../store/variableStore'
import type { ComponentEvent, ComponentEventAction, EventTrigger } from '../types/editor'

const TRIGGER_OPTIONS: { value: EventTrigger; label: string }[] = [
  { value: 'click', label: '点击' },
  { value: 'dblclick', label: '双击' },
  { value: 'hover', label: '悬停' },
  { value: 'viewport', label: '进入视口' },
]

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

/** 交互配置面板（PRD §4.10 v1）：为选中组件维护 事件触发 → 动作 列表 */
export default function InteractionPanel() {
  const selected = useSelectedComponent()
  const update = useEditorStore((s) => s.updateComponent)
  const components = useCurrentPage().components
  const pages = useEditorStore((s) => s.config.pages)
  const variables = useVariableStore((s) => s.variables)

  if (!selected) {
    return <div className="placeholder">选中组件后配置交互事件（点击/悬停 → 设变量/显隐/高亮/跳链接）。</div>
  }

  const events = selected.events ?? []
  const setEvents = (next: ComponentEvent[]) => update(selected.id, { events: next })

  const addEvent = () =>
    setEvents([
      ...events,
      {
        id: `ev_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        trigger: 'click',
        action: defaultAction('setVariable'),
      },
    ])

  const patchEvent = (id: string, patch: Partial<ComponentEvent>) =>
    setEvents(events.map((e) => (e.id === id ? { ...e, ...patch } : e)))

  const patchAction = (id: string, patch: Record<string, unknown>) =>
    setEvents(
      events.map((e) =>
        e.id === id ? { ...e, action: { ...e.action, ...patch } as ComponentEventAction } : e,
      ),
    )

  const targetOptions = components.map((c) => ({ value: c.id, label: `${c.name}（${c.type}）` }))
  const pageOptions = pages.map((p) => ({ value: p.id, label: p.name }))
  const variableOptions = variables.map((v) => ({ value: v.name }))

  return (
    <div className="prop-form">
      {events.length === 0 && (
        <Typography.Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 8 }}>
          暂无事件。交互动作在「预览」和分享页生效，编辑画布内不触发。
        </Typography.Text>
      )}
      {events.map((ev, idx) => (
        <div
          key={ev.id}
          style={{
            border: '1px solid rgba(255,255,255,0.12)',
            borderRadius: 6,
            padding: 8,
            marginBottom: 8,
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <Typography.Text style={{ fontSize: 12 }}>事件 {idx + 1}</Typography.Text>
            <Button
              size="small"
              type="text"
              danger
              icon={<DeleteOutlined />}
              onClick={() => setEvents(events.filter((e) => e.id !== ev.id))}
            />
          </div>
          <Space direction="vertical" style={{ width: '100%' }} size={8}>
            <Select
              style={{ width: '100%' }}
              value={ev.trigger}
              options={TRIGGER_OPTIONS}
              onChange={(trigger) => patchEvent(ev.id, { trigger })}
            />
            <Select
              style={{ width: '100%' }}
              value={ev.action.type}
              options={ACTION_OPTIONS}
              onChange={(type) => patchEvent(ev.id, { action: defaultAction(type) })}
            />
            {ev.action.type === 'setVariable' && (
              <>
                <AutoComplete
                  style={{ width: '100%' }}
                  value={ev.action.variable}
                  options={variableOptions}
                  placeholder="变量名（var. 后的名字）"
                  onChange={(variable) => patchAction(ev.id, { variable })}
                />
                <Input
                  value={ev.action.value}
                  placeholder="写入的值"
                  onChange={(e) => patchAction(ev.id, { value: e.target.value })}
                />
              </>
            )}
            {(ev.action.type === 'toggleVisible' || ev.action.type === 'highlight') && (
              <Select
                style={{ width: '100%' }}
                value={ev.action.targetId || undefined}
                options={targetOptions}
                placeholder="目标组件"
                showSearch
                optionFilterProp="label"
                onChange={(targetId) => patchAction(ev.id, { targetId })}
              />
            )}
            {ev.action.type === 'openUrl' && (
              <>
                <Input
                  value={ev.action.url}
                  placeholder="https://…（支持 {{var.变量名}} 插值）"
                  onChange={(e) => patchAction(ev.id, { url: e.target.value })}
                />
                <Checkbox
                  checked={ev.action.newWindow}
                  onChange={(e) => patchAction(ev.id, { newWindow: e.target.checked })}
                >
                  新窗口打开
                </Checkbox>
              </>
            )}
            {ev.action.type === 'gotoPage' && (
              <>
                <Select
                  style={{ width: '100%' }}
                  value={ev.action.pageId || undefined}
                  options={pageOptions}
                  placeholder="目标页面"
                  onChange={(pageId) => patchAction(ev.id, { pageId })}
                />
                <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                  携带参数（写入全局变量，值支持 {'{{var.xxx}}'} 与点击上下文 {'{{ctx.name}}'}/{'{{ctx.value}}'}/{'{{ctx.series}}'}）
                </Typography.Text>
                {ev.action.params.map((p, i) => (
                  <Space key={i} style={{ width: '100%' }} size={4}>
                    <Input
                      style={{ width: 110 }}
                      value={p.name}
                      placeholder="变量名"
                      onChange={(e) =>
                        patchAction(ev.id, {
                          params: ev.action.type === 'gotoPage'
                            ? ev.action.params.map((item, j) => (j === i ? { ...item, name: e.target.value } : item))
                            : [],
                        })
                      }
                    />
                    <Input
                      value={p.value}
                      placeholder="值，如 {{ctx.name}}"
                      onChange={(e) =>
                        patchAction(ev.id, {
                          params: ev.action.type === 'gotoPage'
                            ? ev.action.params.map((item, j) => (j === i ? { ...item, value: e.target.value } : item))
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
                        patchAction(ev.id, {
                          params: ev.action.type === 'gotoPage'
                            ? ev.action.params.filter((_, j) => j !== i)
                            : [],
                        })
                      }
                    />
                  </Space>
                ))}
                <Button
                  size="small"
                  type="dashed"
                  icon={<PlusOutlined />}
                  block
                  onClick={() =>
                    patchAction(ev.id, {
                      params: ev.action.type === 'gotoPage' ? [...ev.action.params, { name: '', value: '' }] : [],
                    })
                  }
                >
                  添加参数
                </Button>
              </>
            )}
          </Space>
        </div>
      ))}
      <Button size="small" type="dashed" icon={<PlusOutlined />} onClick={addEvent} block>
        添加事件
      </Button>
    </div>
  )
}
