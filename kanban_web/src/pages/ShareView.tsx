import { useEffect, useMemo, useState } from 'react'
import { App as AntdApp, Button, Input, Spin } from 'antd'
import { LockOutlined } from '@ant-design/icons'
import { useParams } from 'react-router-dom'
import RuntimeCanvas from '../components/RuntimeCanvas'
import { shareApi } from '../api'
import { useVariableStore } from '../store/variableStore'
import { useInteractionStore } from '../util/interactionRunner'
import { parseCanvasConfig, type CanvasConfig } from '../types/editor'
import type { ApiError, ShareMeta } from '../types'
import './ShareView.css'

export default function ShareView() {
  const { token } = useParams<{ token: string }>()
  const { message } = AntdApp.useApp()
  const [meta, setMeta] = useState<ShareMeta | null>(null)
  const [config, setConfig] = useState<CanvasConfig | null>(null)
  const [loading, setLoading] = useState(true)
  const [needPassword, setNeedPassword] = useState(false)
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [viewport, setViewport] = useState({ w: window.innerWidth, h: window.innerHeight })

  useEffect(() => {
    // 运行态覆盖（显隐/高亮）不跨分享页会话保留
    useInteractionStore.getState().reset()
  }, [token])

  useEffect(() => {
    const onResize = () => setViewport({ w: window.innerWidth, h: window.innerHeight })
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      if (!token) return
      setLoading(true)
      try {
        const m = await shareApi.meta(token)
        if (cancelled) return
        setMeta(m)
        if (!m.requirePassword) {
          const acc = await shareApi.access(token, {})
          if (cancelled) return
          useVariableStore.getState().setAll(acc.variables ?? [])
          setConfig(parseCanvasConfig(acc.config, m.canvasW, m.canvasH))
        } else {
          setNeedPassword(true)
        }
      } catch (e) {
        message.error((e as ApiError).message || '加载失败')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [token, message])

  const scale = useMemo(() => {
    if (!config) return 1
    const pad = 24
    const sw = (viewport.w - pad * 2) / config.canvas.width
    const sh = (viewport.h - pad * 2) / config.canvas.height
    return Math.min(sw, sh)
  }, [config, viewport])

  const submitPassword = async () => {
    if (!token) return
    setSubmitting(true)
    try {
      const acc = await shareApi.access(token, password ? { password } : {})
      useVariableStore.getState().setAll(acc.variables ?? [])
      setConfig(parseCanvasConfig(acc.config, meta?.canvasW ?? 1920, meta?.canvasH ?? 1080))
      setNeedPassword(false)
    } catch (e) {
      message.error((e as ApiError).message || '密码错误')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="share-loading">
        <Spin size="large" tip="加载中…" />
      </div>
    )
  }

  if (needPassword) {
    return (
      <div className="share-gate">
        <div className="share-gate-box">
          <LockOutlined style={{ fontSize: 32, color: '#4f8cff' }} />
          <h2>该看板需要密码访问</h2>
          <Input.Password
            placeholder="请输入访问密码"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onPressEnter={submitPassword}
          />
          <Button type="primary" loading={submitting} onClick={submitPassword} block>
            进入
          </Button>
        </div>
      </div>
    )
  }

  if (!config) {
    return <div className="share-loading">无法加载看板</div>
  }

  const stageW = config.canvas.width * scale
  const stageH = config.canvas.height * scale
  return (
    <div className="share-page" style={{ background: config.canvas.background }}>
      <div className="share-stage" style={{ width: stageW, height: stageH }}>
        <RuntimeCanvas config={config} scale={scale} />
      </div>
    </div>
  )
}
