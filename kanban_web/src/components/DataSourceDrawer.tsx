import { useEffect, useState } from 'react'
import { App as AntdApp, Button, Drawer, Form, Input, InputNumber, Modal, Select, Space, Table, Tabs, Tag, Typography } from 'antd'
import type { TableColumnsType } from 'antd'
import { DeleteOutlined, EditOutlined, PlusOutlined, ReloadOutlined, ThunderboltOutlined } from '@ant-design/icons'
import { dataSourceApi, dataSetApi } from '../api'
import type { ApiError, DataSet, DataSource } from '../types'
import { useDict } from '../hooks/useDict'

const { Text, Paragraph } = Typography

interface Props {
  open: boolean
  onClose: () => void
  onChanged?: () => void
}

type DsType = 'static' | 'api' | 'mysql' | 'postgres'

// 数据源类型的内置兜底（正常路径由 sys_dict 的 data_source_type 下发）
const DS_TYPE_OPTIONS_FALLBACK: { value: DsType; label: string }[] = [
  { value: 'api', label: 'API（HTTP）' },
  { value: 'static', label: '静态 JSON' },
  { value: 'mysql', label: 'MySQL' },
  { value: 'postgres', label: 'PostgreSQL' },
]

interface SourceFormVals {
  name: string
  type: DsType
  staticData?: string
  url?: string
  method?: string
  dataPath?: string
  headersText?: string
  host?: string
  port?: number
  database?: string
  username?: string
  password?: string
  query?: string
}

interface Preview {
  name: string
  type: string
  rows: unknown[]
  error?: string
}

function buildConfig(vals: SourceFormVals): string {
  if (vals.type === 'static') {
    let arr: unknown[] = []
    try {
      const parsed = JSON.parse((vals.staticData ?? '').trim() || '[]')
      if (Array.isArray(parsed)) arr = parsed
    } catch {
      // keep []
    }
    return JSON.stringify({ data: arr })
  }
  if (vals.type === 'mysql' || vals.type === 'postgres') {
    return JSON.stringify({
      host: (vals.host ?? '').trim(),
      port: vals.port,
      database: (vals.database ?? '').trim(),
      username: (vals.username ?? '').trim(),
      password: vals.password ?? '',
      query: (vals.query ?? '').trim(),
    })
  }
  const headers: Record<string, string> = {}
  const ht = (vals.headersText ?? '').trim()
  if (ht) {
    try {
      const parsed = JSON.parse(ht)
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        for (const [k, v] of Object.entries(parsed)) headers[k] = String(v)
      }
    } catch {
      // ignore invalid headers
    }
  }
  return JSON.stringify({
    url: (vals.url ?? '').trim(),
    method: vals.method || 'GET',
    headers,
    dataPath: (vals.dataPath ?? '').trim() || undefined,
  })
}

function safeParseArray(raw: string | null): unknown[] {
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function isFormError(e: unknown): boolean {
  return !!e && typeof e === 'object' && 'errorFields' in e
}

export default function DataSourceDrawer({ open, onClose, onChanged }: Props) {
  const { message, modal } = AntdApp.useApp()
  const { options: dsTypeOptions, extMap: dsTypeExts } = useDict('data_source_type')
  const [activeTab, setActiveTab] = useState<'sources' | 'datasets'>('sources')
  const [sources, setSources] = useState<DataSource[]>([])
  const [datasets, setDatasets] = useState<DataSet[]>([])
  const [loading, setLoading] = useState(false)

  const [srcModalOpen, setSrcModalOpen] = useState(false)
  const [editingSrc, setEditingSrc] = useState<DataSource | null>(null)
  const [srcForm] = Form.useForm<SourceFormVals>()
  const [srcSaving, setSrcSaving] = useState(false)

  const [preview, setPreview] = useState<Preview | null>(null)
  const [fetchingId, setFetchingId] = useState<number | null>(null)

  const [dsModalOpen, setDsModalOpen] = useState(false)
  const [editingDs, setEditingDs] = useState<DataSet | null>(null)
  const [dsForm] = Form.useForm<{ name: string; sourceId: number; mapName?: string; mapValue?: string; mapSeries?: string }>()
  const [dsSaving, setDsSaving] = useState(false)
  const [refreshingId, setRefreshingId] = useState<number | null>(null)

  const load = async () => {
    setLoading(true)
    try {
      const [ss, dss] = await Promise.all([dataSourceApi.list(), dataSetApi.list()])
      setSources(ss)
      setDatasets(dss)
    } catch (e) {
      message.error((e as ApiError).message || '加载数据源失败')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (open) load()
  }, [open])

  const sourceName = (id: number | null) =>
    sources.find((s) => s.id === id)?.name ?? (id == null ? '—' : `#${id}`)

  const openCreateSource = () => {
    setEditingSrc(null)
    srcForm.resetFields()
    srcForm.setFieldsValue({
      type: 'api',
      method: 'GET',
      staticData: JSON.stringify([{ name: 'Mon', value: 120 }], null, 2),
    })
    setSrcModalOpen(true)
  }

  const openEditSource = (s: DataSource) => {
    setEditingSrc(s)
    const vals: SourceFormVals = {
      name: s.name,
      type: s.type as DsType,
      method: 'GET',
      url: '',
      dataPath: '',
      headersText: '',
      staticData: '[]',
      host: '',
      port: undefined,
      database: '',
      username: '',
      password: '',
      query: '',
    }
    try {
      const cfg = JSON.parse(s.config)
      if (s.type === 'static') {
        vals.staticData = JSON.stringify(cfg.data ?? [], null, 2)
      } else if (s.type === 'api') {
        vals.url = cfg.url ?? ''
        vals.method = cfg.method ?? 'GET'
        vals.dataPath = cfg.dataPath ?? ''
        vals.headersText = cfg.headers ? JSON.stringify(cfg.headers, null, 2) : ''
      } else {
        // mysql / postgres
        vals.host = cfg.host ?? ''
        vals.port = cfg.port ?? (s.type === 'mysql' ? 3306 : 5432)
        vals.database = cfg.database ?? ''
        vals.username = cfg.username ?? ''
        vals.query = cfg.query ?? ''
      }
    } catch {
      // ignore parse error
    }
    srcForm.setFieldsValue(vals)
    setSrcModalOpen(true)
  }

  const saveSource = async () => {
    let values: SourceFormVals
    try {
      values = await srcForm.validateFields()
    } catch (e) {
      if (isFormError(e)) return
      message.error((e as ApiError).message || '校验失败')
      return
    }
    setSrcSaving(true)
    try {
      const config = buildConfig(values)
      if (editingSrc) {
        await dataSourceApi.update(editingSrc.id, { name: values.name, type: values.type, config })
        message.success('已更新数据源')
      } else {
        await dataSourceApi.create({ name: values.name, type: values.type, config })
        message.success('已创建数据源')
      }
      setSrcModalOpen(false)
      await load()
      onChanged?.()
    } catch (e) {
      message.error((e as ApiError).message || '保存失败')
    } finally {
      setSrcSaving(false)
    }
  }

  const removeSource = (s: DataSource) => {
    modal.confirm({
      title: `删除数据源「${s.name}」？`,
      content: '关联的数据集将解除引用。',
      okText: '删除',
      okType: 'danger',
      cancelText: '取消',
      onOk: async () => {
        try {
          await dataSourceApi.remove(s.id)
          message.success('已删除')
          await load()
          onChanged?.()
        } catch (e) {
          message.error((e as ApiError).message || '删除失败')
        }
      },
    })
  }

  const testSource = async (s: DataSource) => {
    setFetchingId(s.id)
    setPreview(null)
    try {
      const res = await dataSourceApi.fetch(s.id)
      setPreview({ name: s.name, type: s.type, rows: safeParseArray(res.data) })
    } catch (e) {
      setPreview({ name: s.name, type: s.type, rows: [], error: (e as ApiError).message || '测试失败' })
    } finally {
      setFetchingId(null)
    }
  }

  /** 打开数据集新建/编辑弹窗；编辑时从 transform.renames（old→new）反填三个目标字段的源列名 */
  const openDatasetModal = (d: DataSet | null) => {
    setEditingDs(d)
    dsForm.resetFields()
    if (d) {
      const vals: { name: string; sourceId: number; mapName?: string; mapValue?: string; mapSeries?: string } = {
        name: d.name,
        sourceId: d.sourceId ?? undefined as unknown as number,
      }
      try {
        const renames = d.transform ? (JSON.parse(d.transform).renames ?? {}) : {}
        for (const [src, dst] of Object.entries(renames)) {
          if (dst === 'name') vals.mapName = src
          else if (dst === 'value') vals.mapValue = src
          else if (dst === 'series') vals.mapSeries = src
        }
      } catch {
        // transform 解析失败则留空
      }
      dsForm.setFieldsValue(vals)
    }
    setDsModalOpen(true)
  }

  const saveDataset = async () => {
    let values: { name: string; sourceId: number; mapName?: string; mapValue?: string; mapSeries?: string }
    try {
      values = await dsForm.validateFields()
    } catch (e) {
      if (isFormError(e)) return
      message.error((e as ApiError).message || '校验失败')
      return
    }
    setDsSaving(true)
    try {
      // 字段映射：目标字段 name/value/series ← 源列名，生成 transform.renames（old→new）
      const renames: Record<string, string> = {}
      if (values.mapName?.trim()) renames[values.mapName.trim()] = 'name'
      if (values.mapValue?.trim()) renames[values.mapValue.trim()] = 'value'
      if (values.mapSeries?.trim()) renames[values.mapSeries.trim()] = 'series'
      const transform = Object.keys(renames).length > 0 ? JSON.stringify({ renames }) : undefined
      if (editingDs) {
        // 编辑时映射全清空传空串，后端据此把 transform 置 null
        await dataSetApi.update(editingDs.id, { name: values.name, sourceId: values.sourceId, transform: transform ?? '' })
        message.success('已更新数据集')
      } else {
        await dataSetApi.create({ name: values.name, sourceId: values.sourceId, transform })
        message.success('已创建数据集')
      }
      setDsModalOpen(false)
      await load()
      onChanged?.()
    } catch (e) {
      message.error((e as ApiError).message || '保存失败')
    } finally {
      setDsSaving(false)
    }
  }

  const removeDataset = (d: DataSet) => {
    modal.confirm({
      title: `删除数据集「${d.name}」？`,
      okText: '删除',
      okType: 'danger',
      cancelText: '取消',
      onOk: async () => {
        try {
          await dataSetApi.remove(d.id)
          message.success('已删除')
          await load()
          onChanged?.()
        } catch (e) {
          message.error((e as ApiError).message || '删除失败')
        }
      },
    })
  }

  const refreshDataset = async (d: DataSet) => {
    setRefreshingId(d.id)
    try {
      const updated = await dataSetApi.refresh(d.id)
      message.success('已刷新')
      setPreview({ name: d.name, type: 'dataset', rows: safeParseArray(updated.data) })
      await load()
      onChanged?.()
    } catch (e) {
      message.error((e as ApiError).message || '刷新失败')
    } finally {
      setRefreshingId(null)
    }
  }

  const sourceColumns: TableColumnsType<DataSource> = [
    { title: '名称', dataIndex: 'name', ellipsis: true },
    { title: '类型', dataIndex: 'type', width: 90, render: (t) => <Tag>{String(t)}</Tag> },
    {
      title: '操作',
      width: 210,
      render: (_, r) => (
        <Space size="small">
          <Button size="small" icon={<ThunderboltOutlined />} loading={fetchingId === r.id} onClick={() => testSource(r)}>
            测试
          </Button>
          <Button size="small" icon={<EditOutlined />} onClick={() => openEditSource(r)}>
            编辑
          </Button>
          <Button size="small" danger icon={<DeleteOutlined />} onClick={() => removeSource(r)} />
        </Space>
      ),
    },
  ]

  const datasetColumns: TableColumnsType<DataSet> = [
    { title: '名称', dataIndex: 'name', ellipsis: true },
    { title: '数据源', width: 150, render: (_, r) => sourceName(r.sourceId) },
    { title: '最近刷新', dataIndex: 'lastRefreshAt', width: 150, render: (t) => (t ? String(t) : '—') },
    {
      title: '操作',
      width: 230,
      render: (_, r) => (
        <Space size="small">
          <Button size="small" icon={<ReloadOutlined />} loading={refreshingId === r.id} onClick={() => refreshDataset(r)}>
            刷新
          </Button>
          <Button size="small" icon={<EditOutlined />} onClick={() => openDatasetModal(r)}>
            映射
          </Button>
          <Button size="small" danger icon={<DeleteOutlined />} onClick={() => removeDataset(r)} />
        </Space>
      ),
    },
  ]

  return (
    <Drawer title="数据源 / 数据集管理" open={open} onClose={onClose} width={640} destroyOnHidden>
      <Tabs
        activeKey={activeTab}
        onChange={(k) => setActiveTab(k as 'sources' | 'datasets')}
        items={[
          {
            key: 'sources',
            label: '数据源',
            children: (
              <>
                <Button type="primary" icon={<PlusOutlined />} onClick={openCreateSource} style={{ marginBottom: 12 }}>
                  新建数据源
                </Button>
                <Table<DataSource>
                  rowKey="id"
                  size="small"
                  loading={loading}
                  dataSource={sources}
                  pagination={false}
                  columns={sourceColumns}
                />
              </>
            ),
          },
          {
            key: 'datasets',
            label: '数据集',
            children: (
              <>
                <Button type="primary" icon={<PlusOutlined />} onClick={() => openDatasetModal(null)} style={{ marginBottom: 12 }}>
                  新建数据集
                </Button>
                <Table<DataSet>
                  rowKey="id"
                  size="small"
                  loading={loading}
                  dataSource={datasets}
                  pagination={false}
                  columns={datasetColumns}
                />
              </>
            ),
          },
        ]}
      />

      {preview && (
        <div style={{ marginTop: 16 }}>
          <Text strong>预览：{preview.name}</Text>
          {preview.error ? (
            <Paragraph type="danger" style={{ marginTop: 8 }}>
              {preview.error}
            </Paragraph>
          ) : (
            <Paragraph type="secondary" style={{ marginTop: 8 }}>
              共 {preview.rows.length} 条 · 前 5 条：
            </Paragraph>
          )}
          {!preview.error && (
            <Input.TextArea
              value={JSON.stringify(preview.rows.slice(0, 5), null, 2)}
              autoSize={{ minRows: 4, maxRows: 12 }}
              readOnly
              style={{ fontFamily: 'monospace', fontSize: 12 }}
            />
          )}
        </div>
      )}

      <Modal
        title={editingSrc ? '编辑数据源' : '新建数据源'}
        open={srcModalOpen}
        onOk={saveSource}
        onCancel={() => setSrcModalOpen(false)}
        confirmLoading={srcSaving}
        destroyOnHidden
        width={520}
      >
        <Form form={srcForm} layout="vertical" style={{ marginTop: 12 }}>
          <Form.Item label="名称" name="name" rules={[{ required: true, message: '名称不能为空' }]}>
            <Input placeholder="如：销售明细 API" />
          </Form.Item>
          <Form.Item label="类型" name="type" rules={[{ required: true }]}>
            <Select
              options={dsTypeOptions.length ? dsTypeOptions : DS_TYPE_OPTIONS_FALLBACK}
              onChange={(v: DsType) => {
                // 默认端口由字典 ext_json 下发（defaultPort），无则不联动
                const port = dsTypeExts[v]?.defaultPort
                if (typeof port === 'number') srcForm.setFieldValue('port', port)
              }}
            />
          </Form.Item>
          <Form.Item noStyle shouldUpdate={(prev, cur) => prev.type !== cur.type}>
            {({ getFieldValue }) => {
              const t = getFieldValue('type') as DsType
              if (t === 'static') {
                return (
                  <Form.Item
                    label="静态数据（JSON 数组）"
                    name="staticData"
                    rules={[{ required: true, message: '不能为空' }]}
                  >
                    <Input.TextArea
                      autoSize={{ minRows: 6, maxRows: 14 }}
                      spellCheck={false}
                      style={{ fontFamily: 'monospace', fontSize: 12 }}
                      placeholder='[{"name":"Mon","value":120}]'
                    />
                  </Form.Item>
                )
              }
              if (t === 'api') {
                return (
                  <>
                    <Form.Item label="接口地址 URL" name="url" rules={[{ required: true, message: 'URL 不能为空' }]}>
                      <Input placeholder="https://api.example.com/sales" />
                    </Form.Item>
                    <Form.Item label="请求方法" name="method">
                      <Select
                        style={{ width: 140 }}
                        options={[
                          { value: 'GET', label: 'GET' },
                          { value: 'POST', label: 'POST' },
                        ]}
                      />
                    </Form.Item>
                    <Form.Item label="数据路径 dataPath（取响应内数组路径，如 data.list）" name="dataPath">
                      <Input placeholder="留空则取 data 字段或整组" />
                    </Form.Item>
                    <Form.Item label="请求头 Headers（JSON 对象）" name="headersText">
                      <Input.TextArea
                        autoSize={{ minRows: 3, maxRows: 8 }}
                        spellCheck={false}
                        style={{ fontFamily: 'monospace', fontSize: 12 }}
                        placeholder='{"Authorization":"Bearer xxx"}'
                      />
                    </Form.Item>
                  </>
                )
              }
              // mysql / postgres
              return (
                <>
                  <Form.Item label="主机地址" name="host" rules={[{ required: true, message: '主机不能为空' }]}>
                    <Input placeholder="如 127.0.0.1 或 db.example.com" />
                  </Form.Item>
                  <Form.Item label="端口" name="port" rules={[{ required: true, message: '端口不能为空' }]}>
                    <InputNumber min={1} max={65535} style={{ width: '100%' }} placeholder="MySQL 3306 / PostgreSQL 5432" />
                  </Form.Item>
                  <Form.Item label="数据库名" name="database" rules={[{ required: true, message: '数据库名不能为空' }]}>
                    <Input placeholder="如 kanban" />
                  </Form.Item>
                  <Form.Item label="用户名" name="username" rules={[{ required: true, message: '用户名不能为空' }]}>
                    <Input placeholder="如 root" />
                  </Form.Item>
                  <Form.Item label="密码" name="password">
                    <Input.Password placeholder={editingSrc ? '留空不修改' : '数据库密码'} />
                  </Form.Item>
                  <Form.Item
                    label="SQL 查询（需返回 name 与 value 列）"
                    name="query"
                    rules={[{ required: true, message: 'SQL 不能为空' }]}
                  >
                    <Input.TextArea
                      autoSize={{ minRows: 3, maxRows: 8 }}
                      spellCheck={false}
                      style={{ fontFamily: 'monospace', fontSize: 12 }}
                      placeholder="SELECT name, value FROM sales_stat"
                    />
                  </Form.Item>
                </>
              )
            }}
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title={editingDs ? '编辑数据集 / 字段映射' : '新建数据集'}
        open={dsModalOpen}
        onOk={saveDataset}
        onCancel={() => setDsModalOpen(false)}
        confirmLoading={dsSaving}
        destroyOnHidden
      >
        <Form form={dsForm} layout="vertical" style={{ marginTop: 12 }}>
          <Form.Item label="名称" name="name" rules={[{ required: true, message: '名称不能为空' }]}>
            <Input placeholder="如：销售明细" />
          </Form.Item>
          <Form.Item label="数据源" name="sourceId" rules={[{ required: true, message: '请选择数据源' }]}>
            <Select
              placeholder="选择数据源"
              options={sources.map((s) => ({ value: s.id, label: `${s.name}（${s.type}）` }))}
            />
          </Form.Item>
          <Form.Item
            label="字段映射：name ← 源列名"
            name="mapName"
            tooltip="组件取数用的标准字段是 name/value（系列图另需 series）。若数据源列名不同，在此填源列名做映射；留空则不映射。"
          >
            <Input placeholder="源数据中的列名，如 月份；留空不映射" allowClear />
          </Form.Item>
          <Form.Item label="字段映射：value ← 源列名" name="mapValue">
            <Input placeholder="源数据中的列名，如 销量；留空不映射" allowClear />
          </Form.Item>
          <Form.Item label="字段映射：series ← 源列名" name="mapSeries">
            <Input placeholder="系列列名，如 地区；留空不映射" allowClear />
          </Form.Item>
        </Form>
      </Modal>
    </Drawer>
  )
}
