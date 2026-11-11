import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'
import { persist } from 'zustand/middleware'
import type { User } from '../types'

interface AuthState {
  accessToken: string | null
  refreshToken: string | null
  user: User | null
  login: (tokens: { accessToken: string; refreshToken: string }, user: User) => void
  setUser: (user: User) => void
  logout: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    immer((set) => ({
      accessToken: null,
      refreshToken: null,
      user: null,
      login: (tokens, user) =>
        set((s) => {
          s.accessToken = tokens.accessToken
          s.refreshToken = tokens.refreshToken
          s.user = user
        }),
      setUser: (user) =>
        set((s) => {
          s.user = user
        }),
      logout: () =>
        set((s) => {
          s.accessToken = null
          s.refreshToken = null
          s.user = null
        }),
    })),
    {
      name: 'kanban-auth',
      // 只持久化 token，user 每次刷新通过 /me 恢复
      partialize: (s) => ({ accessToken: s.accessToken, refreshToken: s.refreshToken }),
    },
  ),
)
