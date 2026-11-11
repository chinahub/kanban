import { useEffect, useState } from 'react'
import { App as AntdApp, Button, Drawer, Form, Input, Modal, Space, Switch, Table, Tag, Typography } from 'antd'
import type { TableColumnsType } from 'antd'
import { CheckOutlined, DeleteOutlined, EditOutlined, PlayCircleOutlined, PlusOutlined } from '@ant-design/icons'
import Editor from '@monaco-editor/react'
import { filterApi } from '../api'
import { useFilterStore } from '../store/filterStore'
import { DEFAULT_FILTER_CODE, runFilterAsync } from '../util/filterRunner'
import type { ApiError, Filter } from '../types'

const { Text, Paragraph } = Typography

interface Props {
  open: boolean
  onClose: () => void
}

const SAMPLE_INPUT = JSON.stringify(
  [
    { name: 'Mon', value: 120 },
    { name: 'Tue', value: 200 },
    { name: 'Wed', value: 150 },
  ],
  null,
  2,
)

interface Preview {
  ok: boolean
  data?: unknown[]
  error?: string
}

export default function FilterDrawer({ open, onClose }: Props) {
  const { message, modal } = AntdApp.useApp()
  const filters = useFilterStore((s) => s.filters)
  const loadFilters = useFilterStore((s) => s.load)
  const controlledIds = useFilterStore((s) => s.controlled)
  const appliedMap = useFilterStore((s) => s.applied)
  const setControlled = useFilterStore((s) => s.setControlled)
  const applyCode = useFilterStore((s) => s.applyCode)
  const [loading, setLoading] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Filter | null>(null)
  const [form] = Form.useForm<{ name: string }>()
  const [code, setCode] = useState(DEFAULT_FILTER_CODE)
  const [inputData, setInputData] = useState(SAMPLE_INPUT)
  const [preview, setPreview] = useState<Preview | null>(null)
  const [saving, setSaving] = useState(false)
  // 新建过滤器的受控开关（已存在的直接读写 store）
  const [newControlled, setNewControlled] = useState(false)

  const refresh = async () => {
    setLoading(true)
    try {
      await loadFilters()
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (open) refresh()
  }, [open])

  const openCreate = () => {
    setEditing(null)
    form.resetFields()
    setCode(DEFAULT_FILTER_CODE)
    setInputData(SAMPLE_INPUT)
    setPreview(null)
    setNewControlled(false)
    setModalOpen(true)
  }

  const openEdit = (f: Filter) => {
    setEditing(f)
    form.setFieldsValue({ name: f.name })
    setCode(f.code || '')
    setInputData(SAMPLE_INPUT)
    setPreview(null)
    setModalOpen(true)
  }

  const [previewing, setPreviewing] = useState(false)

  const runPreview = async () => {
    let data: unknown[] = []
    try {
      const parsed = JSON.parse(inputData)
      data = Array.isArray(parsed) ? parsed : []
    } catch (e) {
      setPreview({ ok: false, error: '输入数据 JSON 解析失败：' + (e as Error).message })
      return
    }
    setPreviewing(true)
    try {
      setPreview(await runFilterAsync(code, data))
    } finally {
      setPreviewing(false)
    }
  }

  const save = async () => {
    let name: string
    try {
      name = (await form.validateFields()).name
    } catch (e) {
      if (e && typeof e === 'object' && 'errorFields' in e) return
      message.error((e as ApiError).message || '校验失败')
      return
    }
    if (!code.trim()) {
      message.warning('过滤器代码不能为空')
      return
    }
    setSaving(true)
    try {
      if (editing) {
        await filterApi.update(editing.id, { name, code })
        message.success(
          controlledIds.includes(editing.id)
            ? '已保存（受控模式：需在列表点"应用"后才对图表生效）'
            : '已更新过滤器',
        )
      } else {
        const created = await filterApi.create({ name, code })
        if (newControlled) setControlled(created.id, true)
        message.success('已创建过滤器')
      }
      setModalOpen(false)
      await loadFilters()
    } catch (e) {
      message.error((e as ApiError).message || '保存失败')
    } finally {
      setSaving(false)
    }
  }

  const remove = (f: Filter) => {
    modal.confirm({
      title: `删除过滤器「${f.name}」？`,
      okText: '删除',
      okType: 'danger',
      cancelText: '取消',
      onOk: async () => {
        try {
          await filterApi.remove(f.id)
          setControlled(f.id, false) // 清理受控标记与生效快照
          message.success('已删除')
          await loadFilters()
        } catch (e) {
          message.error((e as ApiError).message || '删除失败')
        }
      },
    })
  }

  const columns: TableColumnsType<Filter> = [
    {
      title: '名称',
      dataIndex: 'name',
      ellipsis: true,
      render: (name, r) => (
        <Space size={4}>
          <span>{name}</span>
          {controlledIds.includes(r.id) && <Tag color="blue">受控</Tag>}
          {controlledIds.includes(r.id) && appliedMap[r.id] !== r.code && <Tag color="orange">待应用</Tag>}
        </Space>
      ),
    },
    { title: '更新时间', dataIndex: 'updatedAt', width: 170, render: (t) => (t ? String(t) : '—') },
    {
      title: '操作',
      width: 220,
      render: (_, r) => (
        <Space size="small">
          {controlledIds.includes(r.id) && appliedMap[r.id] !== r.code && (
            <Button
              size="small"
              type="primary"
              icon={<CheckOutlined />}
              onClick={async () => {
                applyCode(r.id)
                message.success('已应用，绑定该过滤器的图表立即使用最新代码')
              }}
            >
              应用
            </Button>
          )}
          <Button size="small" icon={<EditOutlined />} onClick={() => openEdit(r)}>
            编辑
          </Button>
          <Button size="small" danger icon={<DeleteOutlined />} onClick={() => remove(r)} />
        </Space>
      ),
    },
  ]

  return (
    <Drawer title="过滤器管理" open={open} onClose={onClose} width={680} destroyOnHidden>
      <Button type="primary" icon={<PlusOutlined />} onClick={openCreate} style={{ marginBottom: 12 }}>
        新建过滤器
      </Button>
      <Table<Filter> rowKey="id" size="small" loading={loading} dataSource={filters} pagination={false} columns={columns} />

      <Modal
        title={editing ? '编辑过滤器' : '新建过滤器'}
        open={modalOpen}
        onOk={save}
        onCancel={() => setModalOpen(false)}
        confirmLoading={saving}
        destroyOnHidden
        width={760}
      >
        <Form form={form} layout="vertical" style={{ marginTop: 12 }}>
          <Form.Item label="名称" name="name" rules={[{ required: true, message: '名称不能为空' }]}>
            <Input placeholder="如：销售字段映射" />
          </Form.Item>
        </Form>
        <div style={{ marginBottom: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text>
            受控模式
            <Text type="secondary" style={{ marginLeft: 8, fontSize: 12 }}>
              开启后保存不实时生效，需在列表手动"应用"
            </Text>
          </Text>
          <Switch
            checked={editing ? controlledIds.includes(editing.id) : newControlled}
            onChange={(on) => {
              if (editing) setControlled(editing.id, on)
              else setNewControlled(on)
            }}
          />
        </div>
        <div style={{ marginBottom: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text strong>转换函数（入参 data，return 数组）</Text>
          <Button size="small" icon={<PlayCircleOutlined />} loading={previewing} onClick={runPreview}>
            运行预览
          </Button>
        </div>
        <Editor
          height="260px"
          defaultLanguage="javascript"
          value={code}
          onChange={(v) => setCode(v ?? '')}
          options={{ minimap: { enabled: false }, fontSize: 13, tabSize: 2, scrollBeyondLastLine: false }}
        />
        <Text type="secondary" style={{ display: 'block', margin: '12px 0 4px' }}>
          输入数据（JSON 数组）
        </Text>
        <Input.TextArea
          value={inputData}
          onChange={(e) => setInputData(e.target.value)}
          autoSize={{ minRows: 4, maxRows: 8 }}
          spellCheck={false}
          style={{ fontFamily: 'monospace', fontSize: 12 }}
        />
        {preview && (
          <div style={{ marginTop: 12 }}>
            <Text strong>预览结果</Text>
            {preview.error ? (
              <Paragraph type="danger" style={{ marginTop: 8 }}>
                {preview.error}
              </Paragraph>
            ) : (
              <>
                <Paragraph type="secondary" style={{ marginTop: 8 }}>
                  输出 {preview.data?.length ?? 0} 条 · 前 5 条：
                </Paragraph>
                <Input.TextArea
                  value={JSON.stringify((preview.data ?? []).slice(0, 5), null, 2)}
                  autoSize={{ minRows: 4, maxRows: 12 }}
                  readOnly
                  style={{ fontFamily: 'monospace', fontSize: 12 }}
                />
              </>
            )}
          </div>
        )}
      </Modal>
    </Drawer>
  )
}
