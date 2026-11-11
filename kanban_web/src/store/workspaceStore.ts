import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'
import { persist } from 'zustand/middleware'
import type { Workspace } from '../types'

interface WorkspaceState {
  list: Workspace[]
  currentId: number | null
  setList: (list: Workspace[]) => void
  switchTo: (id: number) => void
  refresh: (list: Workspace[]) => void
  clear: () => void
}

export const useWorkspaceStore = create<WorkspaceState>()(
  persist(
    immer((set) => ({
      list: [],
      currentId: null,
      setList: (list) =>
        set((s) => {
          s.list = list
          // 当前 id 失效（不在列表中）→ 取第一个，无则 null
          if (s.currentId == null || !list.some((w) => w.id === s.currentId)) {
            s.currentId = list.length ? list[0].id : null
          }
        }),
      switchTo: (id) =>
        set((s) => {
          s.currentId = id
        }),
      refresh: (list) =>
        set((s) => {
          s.list = list
        }),
      clear: () =>
        set((s) => {
          s.list = []
          s.currentId = null
        }),
    })),
    {
      name: 'kanban-workspace',
      partialize: (s) => ({ currentId: s.currentId }),
    },
  ),
)
