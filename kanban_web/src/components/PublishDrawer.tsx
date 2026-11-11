import { useEffect, useState } from 'react'
import { App as AntdApp, Alert, Button, Drawer, Form, Input, Space, Tag, Typography } from 'antd'
import { CopyOutlined, LinkOutlined, ShareAltOutlined, ThunderboltOutlined } from '@ant-design/icons'
import { projectApi, publishApi } from '../api'
import { useEditorStore } from '../store/editorStore'
import type { ApiError, Project, ShareLink, Snapshot } from '../types'

const { Text, Paragraph } = Typography

interface Props {
  projectId: number | null
  project: Project | null
  open: boolean
  onClose: () => void
  onProjectChange: (p: Project) => void
}

export default function PublishDrawer({ projectId, project, open, onClose, onProjectChange }: Props) {
  const { message } = AntdApp.useApp()
  const config = useEditorStore((s) => s.config)
  const [publishing, setPublishing] = useState(false)
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null)
  const [share, setShare] = useState<ShareLink | null>(null)
  const [sharing, setSharing] = useState(false)
  const [password, setPassword] = useState('')

  useEffect(() => {
    if (open) {
      setShare(null)
      setSnapshot(null)
      setPassword('')
    }
  }, [open])

  const published = project?.status === 'PUBLISHED'

  const doPublish = async () => {
    if (projectId == null) return
    setPublishing(true)
    try {
      // 先保存当前画布，再发布快照
      const updated = await projectApi.update(projectId, {
        canvasW: config.canvas.width,
        canvasH: config.canvas.height,
        background: config.canvas.background,
        canvasConfig: JSON.stringify(config),
      })
      onProjectChange(updated)
      const snap = await publishApi.publish(projectId)
      setSnapshot(snap)
      setShare(null)
      message.success(`已发布（版本 v${snap.version}）`)
    } catch (e) {
      message.error((e as ApiError).message || '发布失败')
    } finally {
      setPublishing(false)
    }
  }

  const doShare = async () => {
    if (projectId == null) return
    setSharing(true)
    try {
      const sl = await publishApi.share(projectId, password ? { password } : {})
      setShare(sl)
      message.success('分享链接已生成')
    } catch (e) {
      message.error((e as ApiError).message || '生成分享链接失败')
    } finally {
      setSharing(false)
    }
  }

  const fullUrl = share ? `${window.location.origin}${share.url}` : ''
  const copyLink = async () => {
    if (!fullUrl) return
    try {
      await navigator.clipboard.writeText(fullUrl)
      message.success('链接已复制')
    } catch {
      message.error('复制失败，请手动复制')
    }
  }

  return (
    <Drawer title="发布与分享" open={open} onClose={onClose} width={480} destroyOnHidden>
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <div>
          <Space align="center">
            <Text strong>当前状态：</Text>
            <Tag color={published ? 'green' : 'default'}>{published ? '已发布' : '未发布'}</Tag>
          </Space>
          <Paragraph type="secondary" style={{ marginTop: 8, marginBottom: 0 }}>
            发布会保存当前画布并生成版本快照，分享链接将访问该快照。
          </Paragraph>
        </div>

        <div>
          <Button type="primary" icon={<ThunderboltOutlined />} loading={publishing} onClick={doPublish} block>
            {published ? '重新发布（新快照）' : '发布大屏'}
          </Button>
          {snapshot && (
            <Alert style={{ marginTop: 12 }} type="success" showIcon message={`已发布版本 v${snapshot.version}`} />
          )}
        </div>

        <div>
          <Text strong>分享链接</Text>
          <Paragraph type="secondary" style={{ fontSize: 12 }}>
            生成公开访问链接（无需登录），可设访问密码。
          </Paragraph>
          <Form layout="vertical">
            <Form.Item label="访问密码（可选）">
              <Input.Password
                placeholder="留空表示无需密码"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                allowClear
              />
            </Form.Item>
          </Form>
          <Button
            icon={<ShareAltOutlined />}
            loading={sharing}
            onClick={doShare}
            disabled={!published && !snapshot}
            block
          >
            生成分享链接
          </Button>
          {share && (
            <div style={{ marginTop: 12 }}>
              <Input value={fullUrl} readOnly prefix={<LinkOutlined />} />
              <Button icon={<CopyOutlined />} onClick={copyLink} block style={{ marginTop: 8 }}>
                复制链接
              </Button>
              <div style={{ marginTop: 8 }}>
                {share.hasPassword ? <Tag color="orange">需密码访问</Tag> : <Tag color="blue">公开访问</Tag>}
              </div>
            </div>
          )}
        </div>
      </Space>
    </Drawer>
  )
}
