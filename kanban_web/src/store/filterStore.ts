import { create } from 'zustand'
import { filterApi } from '../api'
import type { Filter } from '../types'

// 受控模式（PRD §4.6.3）：开启后过滤器保存不实时生效，需手动"应用"；
// 受控标记与生效代码快照存 localStorage，不加表
const STORAGE_KEY = 'kanban:filterControlled'

interface ControlledState {
  controlled: number[]
  applied: Record<number, string>
}

function readControlled(): ControlledState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (parsed && Array.isArray(parsed.controlled) && parsed.applied && typeof parsed.applied === 'object') {
        return parsed as ControlledState
      }
    }
  } catch {
    // 本地数据损坏时回落到默认
  }
  return { controlled: [], applied: {} }
}

function writeControlled(s: ControlledState) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(s))
}

interface FilterState {
  /** 服务端真实过滤器列表 */
  filters: Filter[]
  /** 开启受控模式的过滤器 id */
  controlled: number[]
  /** 受控过滤器当前生效的代码快照（id → code） */
  applied: Record<number, string>
  loaded: boolean
  load: () => Promise<void>
  setControlled: (id: number, on: boolean) => void
  /** 把服务端最新代码置为生效（受控模式下手动"应用"） */
  applyCode: (id: number) => void
}

export const useFilterStore = create<FilterState>((set, get) => ({
  filters: [],
  controlled: readControlled().controlled,
  applied: readControlled().applied,
  loaded: false,
  load: async () => {
    try {
      const filters = await filterApi.list()
      // 受控过滤器缺少生效快照时（首次开启还没应用过），以当前服务端代码为基线
      const { controlled, applied } = get()
      const nextApplied = { ...applied }
      let changed = false
      for (const id of controlled) {
        const f = filters.find((x) => x.id === id)
        if (f && nextApplied[id] == null) {
          nextApplied[id] = f.code
          changed = true
        }
      }
      if (changed) {
        writeControlled({ controlled, applied: nextApplied })
        set({ filters, applied: nextApplied, loaded: true })
      } else {
        set({ filters, loaded: true })
      }
    } catch {
      // 保留旧值；非致命
    }
  },
  setControlled: (id, on) => {
    const { controlled, applied, filters } = get()
    const nextControlled = on ? [...new Set([...controlled, id])] : controlled.filter((x) => x !== id)
    const nextApplied = { ...applied }
    if (on) {
      // 开启即以当前服务端代码为生效基线
      const f = filters.find((x) => x.id === id)
      if (f) nextApplied[id] = f.code
    } else {
      delete nextApplied[id]
    }
    writeControlled({ controlled: nextControlled, applied: nextApplied })
    set({ controlled: nextControlled, applied: nextApplied })
  },
  applyCode: (id) => {
    const { controlled, applied, filters } = get()
    const f = filters.find((x) => x.id === id)
    if (!f) return
    const nextApplied = { ...applied, [id]: f.code }
    writeControlled({ controlled, applied: nextApplied })
    set({ applied: nextApplied })
  },
}))

export const useFilter = (id: number | null | undefined): Filter | undefined =>
  useFilterStore((s) => (id == null ? undefined : s.filters.find((f) => f.id === id)))

/** 组件渲染/预览实际使用的过滤器代码：受控过滤器用生效快照，其余用服务端最新 */
export const useEffectiveFilterCode = (id: number | null | undefined): string | undefined =>
  useFilterStore((s) => {
    if (id == null) return undefined
    const f = s.filters.find((x) => x.id === id)
    if (!f) return undefined
    return s.controlled.includes(f.id) ? (s.applied[f.id] ?? f.code) : f.code
  })

// 开发环境调试钩子：与 __editorStore 同理，供浏览器控制台/自动化脚本访问
if (import.meta.env.DEV) {
  ;(window as unknown as Record<string, unknown>).__filterStore = useFilterStore
}
