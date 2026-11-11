import { useCallback, useEffect, useState } from 'react'
import {
  Button,
  Card,
  Col,
  Form,
  Input,
  InputNumber,
  Result,
  Row,
  Space,
  Spin,
  Statistic,
  Table,
  Tabs,
  Typography,
  App as AntdApp,
} from 'antd'
import { ArrowLeftOutlined, RobotOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import { aiConfigApi, aiUsageApi } from '../api'
import DictManager from '../components/DictManager'
import type { AiConfig, AiUsage, ApiError } from '../types'

const CONFIG_META: Record<string, { title: string; desc: string }> = {
  ladv: {
    title: '视觉模型（LADV 智能生成）',
    desc: '用于「上传设计稿生成大屏」，需支持图片输入的 OpenAI 兼容模型（如 GLM-4V / Qwen-VL 等）',
  },
  assistant: {
    title: '对话模型（AI 助手 / 技能对话）',
    desc: '用于编辑器内的自然语言改样式与 AntV 技能对话，需支持工具调用的模型',
  },
}

const SOURCE_LABELS: Record<string, string> = {
  ladv: 'LADV 智能生成',
  'ai-assist': 'AI 助手',
  'skill-chat': '技能对话',
}

interface ConfigFormValues {
  baseUrl?: string
  apiKey?: string
  model?: string
  timeoutSeconds?: number
  maxTokens?: number
}

function ConfigCard({ config, onSaved }: { config: AiConfig; onSaved: (c: AiConfig) => void }) {
  const { message } = AntdApp.useApp()
  const [form] = Form.useForm<ConfigFormValues>()
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const meta = CONFIG_META[config.key] ?? { title: config.key, desc: '' }

  useEffect(() => {
    form.setFieldsValue({
      baseUrl: config.baseUrl,
      model: config.model,
      timeoutSeconds: config.timeoutSeconds,
      maxTokens: config.maxTokens,
      apiKey: '',
    })
  }, [config, form])

  const save = async () => {
    const values = await form.validateFields()
    setSaving(true)
    try {
      const saved = await aiConfigApi.save(config.key, {
        baseUrl: values.baseUrl,
        model: values.model,
        timeoutSeconds: values.timeoutSeconds,
        maxTokens: values.maxTokens,
        apiKey: values.apiKey?.trim() ? values.apiKey.trim() : undefined,
      })
      onSaved(saved)
      message.success('已保存，立即生效')
    } catch (e) {
      message.error((e as ApiError).message || '保存失败')
    } finally {
      setSaving(false)
    }
  }

  /** 用当前表单内容（无需先保存）探测模型连通性 */
  const test = async () => {
    const values = await form.validateFields()
    setTesting(true)
    try {
      const r = await aiConfigApi.test(config.key, {
        baseUrl: values.baseUrl,
        model: values.model,
        timeoutSeconds: values.timeoutSeconds,
        maxTokens: values.maxTokens,
        apiKey: values.apiKey?.trim() ? values.apiKey.trim() : undefined,
      })
      if (r.success) {
        message.success(`${r.message}，耗时 ${r.latencyMs}ms`, 6)
      } else {
        message.error(r.message, 8)
      }
    } catch (e) {
      message.error((e as ApiError).message || '测试连接失败')
    } finally {
      setTesting(false)
    }
  }

  return (
    <Card
      title={meta.title}
      style={{ marginBottom: 16 }}
      extra={
        config.configured ? (
          <Typography.Text type="success">已配置</Typography.Text>
        ) : (
          <Typography.Text type="warning">未配置 API Key</Typography.Text>
        )
      }
    >
      <Typography.Paragraph type="secondary" style={{ marginBottom: 16 }}>
        {meta.desc}
      </Typography.Paragraph>
      <Form form={form} layout="vertical">
        <Form.Item label="Base URL" name="baseUrl" rules={[{ required: true, message: '请输入 Base URL' }]}>
          <Input placeholder="https://api.deepseek.com/" />
        </Form.Item>
        <Form.Item label="API Key" name="apiKey">
          <Input.Password
            placeholder={config.configured ? `当前：${config.apiKey}（留空则不修改）` : '请输入 API Key'}
            autoComplete="new-password"
          />
        </Form.Item>
        <Form.Item label="模型" name="model" rules={[{ required: true, message: '请输入模型名' }]}>
          <Input placeholder="deepseek-vl" />
        </Form.Item>
        <Space size="large">
          <Form.Item label="超时（秒）" name="timeoutSeconds" rules={[{ required: true, message: '必填' }]}>
            <InputNumber min={1} max={600} style={{ width: 140 }} />
          </Form.Item>
          <Form.Item label="Max Tokens" name="maxTokens" rules={[{ required: true, message: '必填' }]}>
            <InputNumber min={256} max={128000} style={{ width: 140 }} />
          </Form.Item>
        </Space>
        <Space>
          <Button type="primary" loading={saving} onClick={save}>
            保存
          </Button>
          <Button loading={testing} onClick={test}>
            测试连接
          </Button>
        </Space>
      </Form>
    </Card>
  )
}

function UsagePanel() {
  const { message } = AntdApp.useApp()
  const [usage, setUsage] = useState<AiUsage | null>(null)
  const [loading, setLoading] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      setUsage(await aiUsageApi.get())
    } catch (e) {
      message.error((e as ApiError).message || '加载失败')
    } finally {
      setLoading(false)
    }
  }, [message])

  useEffect(() => {
    load()
  }, [load])

  if (loading && !usage) return <Spin style={{ display: 'block', margin: '60px auto' }} />
  if (!usage) return null

  return (
    <Spin spinning={loading}>
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={6}>
          <Card>
            <Statistic title="总消耗 Token" value={usage.totalTokens} />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic title="总调用次数" value={usage.totalCalls} />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic title="输入 Token（Prompt）" value={usage.promptTokens} />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic title="输出 Token（Completion）" value={usage.completionTokens} />
          </Card>
        </Col>
      </Row>
      <Card title="按功能统计" style={{ marginBottom: 16 }}>
        <Table
          rowKey="source"
          size="small"
          pagination={false}
          dataSource={usage.bySource}
          columns={[
            {
              title: '功能',
              dataIndex: 'source',
              render: (s: string) => SOURCE_LABELS[s] ?? s,
            },
            { title: '调用次数', dataIndex: 'calls' },
            { title: '消耗 Token', dataIndex: 'totalTokens' },
          ]}
        />
      </Card>
      <Card title="按天统计（近 30 天）">
        <Table
          rowKey="day"
          size="small"
          pagination={false}
          dataSource={[...usage.byDay].reverse()}
          columns={[
            { title: '日期', dataIndex: 'day' },
            { title: '调用次数', dataIndex: 'calls' },
            { title: '消耗 Token', dataIndex: 'totalTokens' },
          ]}
        />
      </Card>
    </Spin>
  )
}

export default function Settings() {
  const navigate = useNavigate()
  const { message } = AntdApp.useApp()
  const [configs, setConfigs] = useState<AiConfig[]>([])
  const [loading, setLoading] = useState(true)
  const [forbidden, setForbidden] = useState(false)

  useEffect(() => {
    ;(async () => {
      try {
        setConfigs(await aiConfigApi.list())
      } catch (e) {
        const err = e as ApiError
        if (err.status === 403) {
          setForbidden(true)
        } else {
          message.error(err.message || '加载 AI 配置失败')
        }
      } finally {
        setLoading(false)
      }
    })()
  }, [message])

  if (forbidden) {
    return (
      <Result
        status="403"
        title="仅平台管理员可访问"
        subTitle="AI 配置与 Token 统计仅对平台管理员开放"
        extra={
          <Button type="primary" onClick={() => navigate('/')}>
            返回工作台
          </Button>
        }
      />
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f5f5f5' }}>
      <header
        style={{
          height: 56,
          padding: '0 24px',
          background: '#1e1b4b',
          color: '#fff',
          display: 'flex',
          alignItems: 'center',
          gap: 16,
        }}
      >
        <Button
          type="text"
          icon={<ArrowLeftOutlined />}
          style={{ color: '#fff' }}
          onClick={() => navigate('/')}
        >
          返回工作台
        </Button>
        <Typography.Text strong style={{ color: '#fff', fontSize: 16 }}>
          <RobotOutlined /> 系统设置
        </Typography.Text>
      </header>
      <div style={{ maxWidth: 960, margin: '24px auto', padding: '0 24px' }}>
        {loading ? (
          <Spin style={{ display: 'block', margin: '60px auto' }} />
        ) : (
          <Tabs
            items={[
              {
                key: 'config',
                label: 'AI 配置',
                children: configs.map((c) => (
                  <ConfigCard
                    key={c.key}
                    config={c}
                    onSaved={(saved) =>
                      setConfigs((prev) => prev.map((p) => (p.key === saved.key ? saved : p)))
                    }
                  />
                )),
              },
              { key: 'usage', label: 'Token 统计', children: <UsagePanel /> },
              { key: 'dicts', label: '字典管理', children: <DictManager /> },
            ]}
          />
        )}
      </div>
    </div>
  )
}
