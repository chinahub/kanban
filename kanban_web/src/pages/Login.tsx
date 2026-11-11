import { useEffect, useState } from 'react'
import { Card, Form, Input, Button, Typography, App as AntdApp } from 'antd'
import { useNavigate } from 'react-router-dom'
import { authApi, workspaceApi } from '../api'
import { useAuthStore } from '../store/authStore'
import { useWorkspaceStore } from '../store/workspaceStore'
import type { ApiError } from '../types'

export default function Login() {
  const navigate = useNavigate()
  const { message } = AntdApp.useApp()
  const login = useAuthStore((s) => s.login)
  const setWorkspaceList = useWorkspaceStore((s) => s.setList)
  const [loading, setLoading] = useState(false)

  // 已登录则直接跳工作台
  const accessToken = useAuthStore((s) => s.accessToken)
  useEffect(() => {
    if (accessToken) navigate('/', { replace: true })
  }, [accessToken, navigate])

  const onFinish = async (values: { username: string; password: string }) => {
    setLoading(true)
    try {
      const resp = await authApi.login(values.username, values.password)
      login({ accessToken: resp.accessToken, refreshToken: resp.refreshToken }, resp.user)
      const workspaces = await workspaceApi.list()
      setWorkspaceList(workspaces)
      message.success('登录成功')
      navigate('/', { replace: true })
    } catch (e) {
      const err = e as ApiError
      message.error(err.message || '登录失败')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 100%)',
      }}
    >
      <Card style={{ width: 380, boxShadow: '0 10px 40px rgba(0,0,0,0.3)' }}>
        <Typography.Title level={3} style={{ textAlign: 'center', marginBottom: 24 }}>
          看板平台
        </Typography.Title>
        <Form
          name="login"
          layout="vertical"
          initialValues={{ username: 'admin' }}
          onFinish={onFinish}
          autoComplete="off"
        >
          <Form.Item
            label="用户名"
            name="username"
            rules={[{ required: true, message: '请输入用户名' }]}
          >
            <Input placeholder="用户名" />
          </Form.Item>
          <Form.Item
            label="密码"
            name="password"
            rules={[{ required: true, message: '请输入密码' }]}
          >
            <Input.Password placeholder="密码" />
          </Form.Item>
          <Form.Item style={{ marginBottom: 0 }}>
            <Button type="primary" htmlType="submit" block loading={loading}>
              登录
            </Button>
          </Form.Item>
        </Form>
        <Typography.Text type="secondary" style={{ display: 'block', textAlign: 'center', marginTop: 16, fontSize: 12 }}>
          默认账号 admin / admin123
        </Typography.Text>
      </Card>
    </div>
  )
}
