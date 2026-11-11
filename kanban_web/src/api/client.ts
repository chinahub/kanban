import axios, { AxiosError } from 'axios'
import type { ApiError } from '../types'
import { useAuthStore } from '../store/authStore'
import { useWorkspaceStore } from '../store/workspaceStore'

// 开发期走 Vite proxy（/api → :8080），无需写 baseURL。
const client = axios.create({
  baseURL: '/api',
  timeout: 15000,
})

// 请求拦截器：注入 Authorization 与 X-Workspace-Id。
// 工作空间选择无状态——后端每次请求重新解析 token，当前 workspaceId 由前端 localStorage 持久化。
client.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  const wsId = useWorkspaceStore.getState().currentId
  if (wsId != null) {
    config.headers['X-Workspace-Id'] = String(wsId)
  }
  return config
})

// 响应拦截器：401 清 token 跳登录；其余按 ApiError 结构 reject。
client.interceptors.response.use(
  (resp) => resp,
  (error: AxiosError<ApiError>) => {
    if (error.response?.status === 401) {
      useAuthStore.getState().logout()
      // 避免在登录页本身循环跳转
      if (location.pathname !== '/login') {
        location.href = '/login'
      }
    }
    const apiError: ApiError =
      error.response?.data ?? {
        status: error.response?.status ?? 0,
        error: 'Network',
        message: error.message,
      }
    return Promise.reject(apiError)
  },
)

export default client
