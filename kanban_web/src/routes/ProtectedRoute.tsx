import { type ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'

// 受保护路由：无 token 重定向 /login。
// 注：user 可能为 null（页面刷新后 token 尚在但 /me 未恢复），由 Workbench 内部负责拉取 /me。
export default function ProtectedRoute({ children }: { children: ReactNode }) {
  const accessToken = useAuthStore((s) => s.accessToken)
  if (!accessToken) {
    return <Navigate to="/login" replace />
  }
  return <>{children}</>
}
