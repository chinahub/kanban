import { useCallback, useEffect, useState } from 'react'
import {
  App as AntdApp,
  Button,
  Card,
  Form,
  Input,
  InputNumber,
  Modal,
  Popconfirm,
  Space,
  Switch,
  Table,
  Tag,
  Tooltip,
  Typography,
} from 'antd'
import type { TableColumnsType } from 'antd'
import { PlusOutlined } from '@ant-design/icons'
import { dictApi } from '../api'
import { useDictStore } from '../store/dictStore'
import type { ApiError, SysDict, SysDictItem } from '../types'

/** 校验 ext_json：空串/留空放行，否则必须是合法 JSON 对象字面量 */
async function validateExtJson(_: unknown, value: string | undefined) {
  if (!value || !value.trim()) return
  try {
    const parsed: unknown = JSON.parse(value)
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
      throw new Error('not object')
    }
  } catch {
    throw new Error('必须是合法的 JSON 对象，如 {"color":"green"}')
  }
}

interface DictFormVals {
  dictType?: string
  name?: string
  remark?: string
  sortOrder?: number
}

interface ItemFormVals {
  value?: string
  label?: string
  sortOrder?: number
  enabled?: boolean
  remark?: string
  extJson?: string
}

/** 数据字典管理：左侧类型列表 + 右侧字典项维护（仅平台管理员可见入口） */
export default function DictManager() {
  const { message } = AntdApp.useApp()
  const [dicts, setDicts] = useState<SysDict[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedDictId, setSelectedDictId] = useState<number | null>(null)

  const [dictModalOpen, setDictModalOpen] = useState(false)
  const [editingDict, setEditingDict] = useState<SysDict | null>(null)
  const [dictForm] = Form.useForm<DictFormVals>()

  const [itemModalOpen, setItemModalOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<SysDictItem | null>(null)
  const [itemForm] = Form.useForm<ItemFormVals>()

  const selectedDict = dicts.find((d) => d.id === selectedDictId) ?? null

  /** 拉取全量字典并同步全局 dictStore 缓存（useDict 消费方立即生效） */
  const reload = useCallback(async () => {
    setLoading(true)
    try {
      const list = await dictApi.list()
      setDicts(list)
      setSelectedDictId((prev) =>
        prev != null && list.some((d) => d.id === prev) ? prev : (list[0]?.id ?? null),
      )
      await useDictStore.getState().reload()
    } catch (e) {
      message.error((e as ApiError).message || '加载字典失败')
    } finally {
      setLoading(false)
    }
  }, [message])

  useEffect(() => {
    void reload()
  }, [reload])

  /** 打开字典类型弹窗（编辑时回填；dictType 编码不可改） */
  const openDictModal = (d: SysDict | null) => {
    setEditingDict(d)
    dictForm.setFieldsValue({
      dictType: d?.dictType,
      name: d?.name,
      remark: d?.remark ?? undefined,
      sortOrder: d?.sortOrder ?? 0,
    })
    setDictModalOpen(true)
  }

  /** 保存字典类型（新建/编辑） */
  const saveDict = async () => {
    const v = await dictForm.validateFields()
    try {
      if (editingDict) {
        await dictApi.update(editingDict.id, { name: v.name, remark: v.remark, sortOrder: v.sortOrder })
      } else {
        await dictApi.create({ dictType: v.dictType!.trim(), name: v.name!.trim(), remark: v.remark, sortOrder: v.sortOrder })
      }
      message.success('已保存')
      setDictModalOpen(false)
      await reload()
    } catch (e) {
      message.error((e as ApiError).message || '保存失败')
    }
  }

  /** 删除字典类型（内置字典后端拒删，前端置灰） */
  const removeDict = async (d: SysDict) => {
    try {
      await dictApi.remove(d.id)
      message.success('已删除')
      await reload()
    } catch (e) {
      message.error((e as ApiError).message || '删除失败')
    }
  }

  /** 打开字典项弹窗（编辑时回填；value 不可改） */
  const openItemModal = (item: SysDictItem | null) => {
    if (!selectedDict) return
    setEditingItem(item)
    itemForm.setFieldsValue({
      value: item?.value,
      label: item?.label,
      sortOrder: item?.sortOrder ?? 0,
      enabled: item?.enabled ?? true,
      remark: item?.remark ?? undefined,
      extJson: item?.extJson ?? undefined,
    })
    setItemModalOpen(true)
  }

  /** 保存字典项（新建/编辑） */
  const saveItem = async () => {
    if (!selectedDict) return
    const v = await itemForm.validateFields()
    try {
      if (editingItem) {
        await dictApi.updateItem(selectedDict.id, editingItem.id, {
          label: v.label!.trim(),
          sortOrder: v.sortOrder,
          enabled: v.enabled,
          remark: v.remark,
          extJson: v.extJson?.trim() || undefined,
        })
      } else {
        await dictApi.createItem(selectedDict.id, {
          value: v.value!.trim(),
          label: v.label!.trim(),
          sortOrder: v.sortOrder,
          enabled: v.enabled,
          remark: v.remark,
          extJson: v.extJson?.trim() || undefined,
        })
      }
      message.success('已保存')
      setItemModalOpen(false)
      await reload()
    } catch (e) {
      message.error((e as ApiError).message || '保存失败')
    }
  }

  /** 删除字典项 */
  const removeItem = async (item: SysDictItem) => {
    if (!selectedDict) return
    try {
      await dictApi.removeItem(selectedDict.id, item.id)
      message.success('已删除')
      await reload()
    } catch (e) {
      message.error((e as ApiError).message || '删除失败')
    }
  }

  const dictColumns: TableColumnsType<SysDict> = [
    { title: '类型编码', dataIndex: 'dictType', width: 170 },
    { title: '名称', dataIndex: 'name', width: 130 },
    {
      title: '内置',
      dataIndex: 'isSystem',
      width: 70,
      render: (v: boolean) => (v ? <Tag color="blue">内置</Tag> : <Tag>自定义</Tag>),
    },
    { title: '排序', dataIndex: 'sortOrder', width: 60 },
    {
      title: '操作',
      width: 130,
      render: (_, d) => (
        <Space>
          <Button size="small" type="link" onClick={() => openDictModal(d)}>编辑</Button>
          <Tooltip title={d.isSystem ? '内置字典不允许删除' : undefined}>
            <Popconfirm title="删除该类型及其全部字典项？" disabled={d.isSystem} onConfirm={() => void removeDict(d)}>
              <Button size="small" type="link" danger disabled={d.isSystem}>删除</Button>
            </Popconfirm>
          </Tooltip>
        </Space>
      ),
    },
  ]

  const itemColumns: TableColumnsType<SysDictItem> = [
    { title: '值', dataIndex: 'value', width: 130 },
    { title: '显示名', dataIndex: 'label', width: 140 },
    { title: '排序', dataIndex: 'sortOrder', width: 60 },
    {
      title: '启用',
      dataIndex: 'enabled',
      width: 80,
      render: (v: boolean) => (v ? <Tag color="success">启用</Tag> : <Tag>停用</Tag>),
    },
    { title: '扩展属性', dataIndex: 'extJson', ellipsis: true, render: (v: string | null) => v || '-' },
    {
      title: '操作',
      width: 130,
      render: (_, item) => (
        <Space>
          <Button size="small" type="link" onClick={() => openItemModal(item)}>编辑</Button>
          <Popconfirm title="删除该字典项？" onConfirm={() => void removeItem(item)}>
            <Button size="small" type="link" danger>删除</Button>
          </Popconfirm>
        </Space>
      ),
    },
  ]

  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      <Card
        size="small"
        title="字典类型"
        extra={
          <Button size="small" icon={<PlusOutlined />} onClick={() => openDictModal(null)}>新建类型</Button>
        }
      >
        <Table<SysDict>
          size="small"
          rowKey="id"
          loading={loading}
          columns={dictColumns}
          dataSource={dicts}
          pagination={false}
          rowSelection={{ type: 'radio', selectedRowKeys: selectedDictId != null ? [selectedDictId] : [], onChange: (keys) => setSelectedDictId(Number(keys[0])) }}
        />
      </Card>
      <Card
        size="small"
        title={selectedDict ? `字典项：${selectedDict.name}（${selectedDict.dictType}）` : '字典项'}
        extra={
          <Button size="small" icon={<PlusOutlined />} disabled={!selectedDict} onClick={() => openItemModal(null)}>
            新增字典项
          </Button>
        }
      >
        <Table<SysDictItem>
          size="small"
          rowKey="id"
          loading={loading}
          columns={itemColumns}
          dataSource={selectedDict?.items ?? []}
          pagination={false}
          locale={{ emptyText: '请先选择上方字典类型' }}
        />
      </Card>

      <Modal
        title={editingDict ? '编辑字典类型' : '新建字典类型'}
        open={dictModalOpen}
        onOk={() => void saveDict()}
        onCancel={() => setDictModalOpen(false)}
        destroyOnHidden
      >
        <Form form={dictForm} layout="vertical">
          <Form.Item label="类型编码（创建后不可改，建议小写下划线，如 project_status）" name="dictType"
            rules={[{ required: true, pattern: /^[a-z][a-z0-9_]*$/, message: '小写字母开头，仅含小写字母/数字/下划线' }]}>
            <Input disabled={!!editingDict} placeholder="project_status" />
          </Form.Item>
          <Form.Item label="名称" name="name" rules={[{ required: true, message: '名称不能为空' }]}>
            <Input placeholder="看板状态" />
          </Form.Item>
          <Form.Item label="排序（升序）" name="sortOrder">
            <InputNumber min={0} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item label="备注" name="remark">
            <Input.TextArea autoSize={{ minRows: 2, maxRows: 4 }} />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title={editingItem ? '编辑字典项' : `新增字典项${selectedDict ? `：${selectedDict.name}` : ''}`}
        open={itemModalOpen}
        onOk={() => void saveItem()}
        onCancel={() => setItemModalOpen(false)}
        destroyOnHidden
      >
        <Form form={itemForm} layout="vertical">
          <Form.Item label="值（创建后不可改；必须与存量数据一致，如 DRAFT / online）" name="value"
            rules={[{ required: true, message: '值不能为空' }]}>
            <Input disabled={!!editingItem} />
          </Form.Item>
          <Form.Item label="显示名" name="label" rules={[{ required: true, message: '显示名不能为空' }]}>
            <Input />
          </Form.Item>
          <Form.Item label="排序（升序）" name="sortOrder">
            <InputNumber min={0} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item label="启用（停用项不出现在业务下拉，但历史数据仍能显示）" name="enabled" valuePropName="checked">
            <Switch />
          </Form.Item>
          <Form.Item label={'扩展属性 JSON（可选：{"color":"#52c41a"} / {"defaultPort":3306} / {"disabled":true}）'} name="extJson"
            rules={[{ validator: validateExtJson }]}>
            <Input.TextArea autoSize={{ minRows: 2, maxRows: 5 }} placeholder='{"color":"green"}' style={{ fontFamily: 'monospace', fontSize: 12 }} />
          </Form.Item>
          <Form.Item label="备注" name="remark">
            <Input.TextArea autoSize={{ minRows: 1, maxRows: 3 }} />
          </Form.Item>
        </Form>
      </Modal>
      <Typography.Text type="secondary" style={{ fontSize: 12 }}>
        提示：value 一旦投入使用即与画布 JSON / 数据库存量数据绑定，只可改显示名与扩展属性，不可改值。
      </Typography.Text>
    </Space>
  )
}
