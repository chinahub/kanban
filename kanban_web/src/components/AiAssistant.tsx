import { useState } from 'react'
import { App as AntdApp, Button, Divider, Drawer, Input, Space, Tag, Typography, Upload } from 'antd'
import { PictureOutlined, RobotOutlined, SendOutlined } from '@ant-design/icons'
import { Link } from 'react-router-dom'
import { aiApi } from '../api'
import { useAuthStore } from '../store/authStore'
import { useEditorStore, useSelectedComponent } from '../store/editorStore'
import type { ApiError } from '../types'
import type { CanvasComponent } from '../types/editor'

const { Text, Paragraph } = Typography

interface Props {
  projectId: number | null
  open: boolean
  onClose: () => void
}

interface HistoryItem {
  key: string
  instruction: string
  source: string
  changes: Record<string, unknown>
  error: string | null
  ts: number
}

const CHIPS = ['改成红色', '颜色用 #13c2c2', '字号调大到 32', '调小字号', '加粗', '标题改为销售概览', '颜色改成绿色']

const SOURCE_LABEL: Record<string, { text: string; color: string }> = {
  ai: { text: 'AI', color: 'geekblue' },
  local: { text: '本地规则', color: 'default' },
  error: { text: '失败', color: 'red' },
}

function formatChange(key: string, value: unknown): string {
  return `${key} = ${typeof value === 'object' && value !== null ? JSON.stringify(value) : String(value)}`
}

export default function AiAssistant({ projectId, open, onClose }: Props) {
  const { message, modal } = AntdApp.useApp()
  const selected = useSelectedComponent()
  const updateComponentProps = useEditorStore((s) => s.updateComponentProps)
  const importComponents = useEditorStore((s) => s.importComponents)
  const canvas = useEditorStore((s) => s.config.canvas)
  const [instruction, setInstruction] = useState('')
  const [loading, setLoading] = useState(false)
  const [history, setHistory] = useState<HistoryItem[]>([])
  const [ladvImage, setLadvImage] = useState<string | null>(null)
  const [ladvLoading, setLadvLoading] = useState(false)
  const isAdmin = useAuthStore((s) => s.user?.isPlatformAdmin)

  /** AI 类错误提示：未配置时给平台管理员附「前往系统设置」入口 */
  const showAiError = (text: string) => {
    if (text.includes('未配置')) {
      message.error(
        <span>
          {text}
          {isAdmin && (
            <Link to="/settings" style={{ marginLeft: 8 }} onClick={onClose}>
              前往系统设置
            </Link>
          )}
        </span>,
        8,
      )
    } else {
      message.error(text)
    }
  }

  /** 选择设计稿图片：限制 2MB，读为 base64 data URI */
  const pickImage = (file: File) => {
    if (file.size > 2 * 1024 * 1024) {
      message.error('图片不能超过 2MB，请压缩后再上传')
      return Upload.LIST_IGNORE
    }
    const reader = new FileReader()
    reader.onload = () => setLadvImage(String(reader.result))
    reader.readAsDataURL(file)
    return false
  }

  /** LADV 智能生成：视觉模型把设计稿还原为组件布局，确认后整体导入画布（可撤销） */
  const generate = async () => {
    if (projectId == null) {
      message.warning('看板未加载')
      return
    }
    if (!ladvImage) return
    setLadvLoading(true)
    try {
      const resp = await aiApi.ladv(projectId, {
        image: ladvImage,
        canvasWidth: canvas.width,
        canvasHeight: canvas.height,
      })
      if (resp.error || !resp.components) {
        if (resp.error) {
          showAiError(resp.error)
        } else {
          message.error('未识别到可用组件')
        }
        return
      }
      const comps = JSON.parse(resp.components) as CanvasComponent[]
      modal.confirm({
        title: `识别到 ${comps.length} 个组件`,
        content: '导入将替换当前画布的全部组件（可 Ctrl+Z 撤销），是否继续？',
        okText: '导入',
        cancelText: '取消',
        onOk: () => {
          importComponents(comps)
          message.success(`已导入 ${comps.length} 个组件`)
        },
      })
    } catch (e) {
      message.error((e as ApiError).message || 'LADV 请求失败')
    } finally {
      setLadvLoading(false)
    }
  }

  const send = async (text?: string) => {
    const cmd = (text ?? instruction).trim()
    if (!cmd) return
    if (projectId == null) {
      message.warning('看板未加载')
      return
    }
    if (!selected) {
      message.warning('请先在画布选中一个组件')
      return
    }
    setLoading(true)
    const item: HistoryItem = {
      key: `${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      instruction: cmd,
      source: 'error',
      changes: {},
      error: null,
      ts: Date.now(),
    }
    try {
      const resp = await aiApi.assist(projectId, {
        componentId: selected.id,
        componentType: selected.type,
        componentProps: JSON.stringify(selected.props),
        instruction: cmd,
      })
      let changes: Record<string, unknown> = {}
      try {
        changes = JSON.parse(resp.changes || '{}') as Record<string, unknown>
      } catch {
        changes = {}
      }
      item.source = resp.source
      item.changes = changes
      item.error = resp.error
      const keys = Object.keys(changes)
      if (keys.length > 0) {
        updateComponentProps(selected.id, changes)
        message.success(`已应用 ${keys.length} 项修改（可 Ctrl+Z 撤销）`)
      } else if (resp.error) {
        showAiError(resp.error)
      } else {
        message.info('AI 未能识别可修改的属性，请换种说法')
      }
    } catch (e) {
      item.error = (e as ApiError).message || 'AI 请求失败'
      message.error(item.error)
    } finally {
      setHistory((h) => [item, ...h])
      setLoading(false)
      setInstruction('')
    }
  }

  return (
    <Drawer
      title={<Space><RobotOutlined /> AI 助手</Space>}
      open={open}
      onClose={onClose}
      width={420}
      destroyOnHidden
    >
      <Divider plain style={{ marginTop: 0 }}>上传图生成大屏（LADV）</Divider>
      <Paragraph type="secondary" style={{ fontSize: 12 }}>
        上传大屏设计稿/截图，视觉模型自动还原为画布组件布局。
      </Paragraph>
      <Upload accept="image/*" showUploadList={false} beforeUpload={pickImage}>
        <Button icon={<PictureOutlined />}>选择设计稿图片（≤2MB）</Button>
      </Upload>
      {ladvImage && (
        <img src={ladvImage} alt="设计稿预览" style={{ width: '100%', borderRadius: 6, marginTop: 8 }} />
      )}
      <Button
        type="primary"
        disabled={!ladvImage}
        loading={ladvLoading}
        onClick={generate}
        block
        style={{ marginTop: 8 }}
      >
        {ladvLoading ? '生成中，可能需要 1-2 分钟…' : '生成大屏'}
      </Button>

      <Divider plain>组件样式修改</Divider>
      {!selected ? (
        <Paragraph type="secondary">
          请先在画布选中一个组件，再用自然语言描述要做的修改，例如「把颜色改成红色」「调小字号」「标题改为销售概览」。
        </Paragraph>
      ) : (
        <>
          <div style={{ marginBottom: 12 }}>
            当前组件：<Text code>{selected.name}</Text> <Tag>{selected.type}</Tag>
          </div>
          <Space wrap size={[8, 8]} style={{ marginBottom: 12 }}>
            {CHIPS.map((c) => (
              <Button key={c} size="small" disabled={loading} onClick={() => send(c)}>{c}</Button>
            ))}
          </Space>
          <Input.TextArea
            value={instruction}
            onChange={(e) => setInstruction(e.target.value)}
            autoSize={{ minRows: 2, maxRows: 5 }}
            placeholder="描述你想做的修改，如：把柱状图颜色改成渐变蓝、字号调小"
            disabled={loading}
            onPressEnter={(e) => {
              if (!e.shiftKey) {
                e.preventDefault()
                send()
              }
            }}
          />
          <Button
            type="primary"
            icon={<SendOutlined />}
            loading={loading}
            onClick={() => send()}
            block
            style={{ marginTop: 8 }}
          >
            发送
          </Button>

          {history.length > 0 && (
            <div style={{ marginTop: 16 }}>
              <Text type="secondary">本次会话记录</Text>
              {history.map((h) => {
                const meta = SOURCE_LABEL[h.source] ?? SOURCE_LABEL.error
                const keys = Object.keys(h.changes)
                return (
                  <div key={h.key} style={{ border: '1px solid #303a5a', borderRadius: 6, padding: 8, marginTop: 8 }}>
                    <Space size={6} style={{ marginBottom: 4 }}>
                      <Tag color={meta.color}>{meta.text}</Tag>
                      <Text strong style={{ fontSize: 13 }}>{h.instruction}</Text>
                    </Space>
                    {h.error ? (
                      <div style={{ color: '#ff7875', fontSize: 12 }}>{h.error}</div>
                    ) : keys.length > 0 ? (
                      <div style={{ fontSize: 12, color: '#b6c2ff' }}>
                        {keys.map((k) => (
                          <div key={k}>· {formatChange(k, h.changes[k])}</div>
                        ))}
                      </div>
                    ) : (
                      <div style={{ fontSize: 12, color: '#8c8c8c' }}>无可用修改</div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </>
      )}
    </Drawer>
  )
}
