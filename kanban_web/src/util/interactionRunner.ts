import { create } from 'zustand'
import type { Blueprint, ComponentEventAction, ComponentEvent, EventTrigger } from '../types/editor'
import { useVariableStore } from '../store/variableStore'
import { interpolateRuntime, type ClickContext } from './varInterpolate'
import type { GlobalVariable } from '../types'

/** 运行态覆盖（显隐/高亮/页面切换/点击上下文）：只在预览/分享运行时生效，不持久化、不进快照 */
interface InteractionState {
  hidden: Record<string, boolean>
  highlightId: string | null
  /** 运行态当前页面 id（钻取切换），null = 首页 */
  pageId: string | null
  /** 最近一次图表/地图点击的数据上下文，供 {{ctx.*}} 插值 */
  clickCtx: ClickContext | null
  setPage: (id: string | null) => void
  setClickCtx: (ctx: ClickContext | null) => void
  reset: () => void
}

export const useInteractionStore = create<InteractionState>((set) => ({
  hidden: {},
  highlightId: null,
  pageId: null,
  clickCtx: null,
  setPage: (id) => set({ pageId: id }),
  setClickCtx: (ctx) => set({ clickCtx: ctx }),
  reset: () => set({ hidden: {}, highlightId: null, pageId: null, clickCtx: null }),
}))

/** 写入运行态变量（控件 onChange 与 setVariable 事件共用）：未定义时建本地运行态变量，供 {{var.xx}} 插值联动 */
export function setRuntimeVariable(name: string, value: string) {
  if (!name) return
  const store = useVariableStore.getState()
  const exists = store.variables.some((v) => v.name === name)
  const next = exists
    ? store.variables.map((v) => (v.name === name ? { ...v, value } : v))
    : [
        ...store.variables,
        {
          id: -Date.now(),
          projectId: 0,
          name,
          description: null,
          source: 'runtime',
          value,
          createdAt: '',
          updatedAt: '',
        } satisfies GlobalVariable,
      ]
  store.setAll(next)
}

/** 执行组件上匹配触发方式的全部事件动作 */
export function runComponentEvents(events: ComponentEvent[] | undefined, trigger: EventTrigger) {
  if (!events?.length) return
  for (const ev of events) {
    if (ev.trigger !== trigger) continue
    executeAction(ev.action)
  }
}

/** 执行单个动作（组件交互事件与蓝图动作节点共用） */
export function executeAction(a: ComponentEventAction) {
  switch (a.type) {
    case 'setVariable': {
      const { variables } = useVariableStore.getState()
      const { clickCtx } = useInteractionStore.getState()
      setRuntimeVariable(a.variable, interpolateRuntime(a.value, variables, clickCtx))
      break
    }
    case 'toggleVisible':
      if (!a.targetId) break
      useInteractionStore.setState((s) => ({
        hidden: { ...s.hidden, [a.targetId]: !s.hidden[a.targetId] },
      }))
      break
    case 'highlight':
      if (!a.targetId) break
      useInteractionStore.setState((s) => ({
        highlightId: s.highlightId === a.targetId ? null : a.targetId,
      }))
      break
    case 'openUrl': {
      if (!a.url) break
      const { variables } = useVariableStore.getState()
      const { clickCtx } = useInteractionStore.getState()
      const url = interpolateRuntime(a.url, variables, clickCtx)
      if (a.newWindow) window.open(url, '_blank', 'noopener')
      else window.location.href = url
      break
    }
    case 'gotoPage': {
      if (!a.pageId) break
      // 先把携带参数插值后写入运行态变量（目标页组件可用 {{var.xxx}} 引用），再切页
      const { clickCtx } = useInteractionStore.getState()
      for (const p of a.params) {
        if (!p.name) continue
        // 每轮重读变量，允许后面的参数引用前面刚写入的变量
        setRuntimeVariable(p.name, interpolateRuntime(p.value, useVariableStore.getState().variables, clickCtx))
      }
      useInteractionStore.getState().setPage(a.pageId)
      break
    }
  }
}

/** 求值蓝图条件表达式：作用域 vars（变量名→值）/ ctx（点击上下文）；空表达式恒真，报错按假处理（跳过该分支） */
function evalCondition(expression: string | undefined): boolean {
  const code = expression?.trim()
  if (!code) return true
  try {
    const vars: Record<string, string> = {}
    for (const v of useVariableStore.getState().variables) vars[v.name] = v.value ?? ''
    const { clickCtx } = useInteractionStore.getState()
    const fn = new Function('vars', 'ctx', `"use strict"; return (${code})`)
    return Boolean(fn(vars, clickCtx))
  } catch {
    return false
  }
}

/**
 * 蓝图事件传播（PRD §4.14）：组件触发事件时，从绑定的「事件源」节点沿连线广度优先扩散。
 * 条件节点为真才继续向下游传播；动作节点执行动作。每个节点一次传播内至多执行一次（防环 + 菱形去重）。
 */
export function fireBlueprintEvent(blueprint: Blueprint | undefined, componentId: string, trigger: EventTrigger) {
  if (!blueprint?.nodes.length) return
  const byId = new Map(blueprint.nodes.map((n) => [n.id, n]))
  const outEdges = new Map<string, string[]>()
  for (const e of blueprint.edges) {
    const list = outEdges.get(e.from)
    if (list) list.push(e.to)
    else outEdges.set(e.from, [e.to])
  }
  const queue = blueprint.nodes
    .filter((n) => n.kind === 'event' && n.componentId === componentId && (n.trigger ?? 'click') === trigger)
    .map((n) => n.id)
  const visited = new Set<string>()
  while (queue.length) {
    const id = queue.shift() as string
    if (visited.has(id)) continue
    visited.add(id)
    const node = byId.get(id)
    if (!node) continue
    if (node.kind === 'condition') {
      if (!evalCondition(node.expression)) continue
    } else if (node.kind === 'action' && node.action) {
      executeAction(node.action)
    }
    for (const to of outEdges.get(id) ?? []) queue.push(to)
  }
}
