import { create } from 'zustand'
import { dictApi } from '../api'
import type { SysDict } from '../types'

interface DictState {
  /** 全量字典缓存；null = 未加载（分享页等未登录场景保持 null，走前端兜底） */
  dicts: SysDict[] | null
  loading: boolean
  /** 全量拉取字典（并发去重：进行中或已加载时直接复用） */
  fetchOnce: () => Promise<void>
  /** 强制重新拉取（字典管理页保存后调用） */
  reload: () => Promise<void>
}

// 模块级 inflight 标记，保证跨组件并发 fetchOnce 只发一次请求
let inflight: Promise<void> | null = null

export const useDictStore = create<DictState>()((set, get) => ({
  dicts: null,
  loading: false,
  fetchOnce: () => {
    if (get().dicts) return Promise.resolve()
    if (inflight) return inflight
    inflight = get()
      .reload()
      .finally(() => {
        inflight = null
      })
    return inflight
  },
  reload: async () => {
    set({ loading: true })
    try {
      const dicts = await dictApi.list()
      set({ dicts, loading: false })
    } catch (e) {
      set({ loading: false })
      throw e
    }
  },
}))
