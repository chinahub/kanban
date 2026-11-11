import { create } from 'zustand'
import { variableApi } from '../api'
import type { GlobalVariable } from '../types'

interface VariableState {
  variables: GlobalVariable[]
  projectId: number | null
  load: (projectId: number) => Promise<void>
  setAll: (variables: GlobalVariable[]) => void
}

export const useVariableStore = create<VariableState>((set) => ({
  variables: [],
  projectId: null,
  load: async (projectId) => {
    try {
      const variables = await variableApi.list(projectId)
      set({ variables, projectId })
    } catch {
      // 保留旧值；非致命
    }
  },
  setAll: (variables) => set({ variables, projectId: null }),
}))
