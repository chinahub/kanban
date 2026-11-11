import { useEffect, useState } from 'react'
import { App as AntdApp, Button, Drawer, Form, Input, Modal, Space, Table, Typography } from 'antd'
import type { TableColumnsType } from 'antd'
import { DeleteOutlined, EditOutlined, PlusOutlined } from '@ant-design/icons'
import { variableApi } from '../api'
import { useVariableStore } from '../store/variableStore'
import type { ApiError, GlobalVariable } from '../types'

const { Text } = Typography

interface Props {
  projectId: number | null
  open: boolean
  onClose: () => void
}

interface VForm {
  name: string
  value: string
  description?: string
}

export default function VariablesDrawer({ projectId, open, onClose }: Props) {
  const { message, modal } = AntdApp.useApp()
  const variables = useVariableStore((s) => s.variables)
  const load = useVariableStore((s) => s.load)
  const [loading, setLoading] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<GlobalVariable | null>(null)
  const [form] = Form.useForm<VForm>()
  const [saving, setSaving] = useState(false)

  const refresh = async () => {
    if (projectId == null) return
    setLoading(true)
    try {
      await load(projectId)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (open) refresh()
  }, [open, projectId])

  const openCreate = () => {
    setEditing(null)
    form.resetFields()
    setModalOpen(true)
  }

  const openEdit = (v: GlobalVariable) => {
    setEditing(v)
    form.setFieldsValue({ name: v.name, value: v.value ?? '', description: v.description ?? '' })
    setModalOpen(true)
  }

  const save = async () => {
    if (projectId == null) return
    let vals: VForm
    try {
      vals = await form.validateFields()
    } catch (e) {
      if (e && typeof e === 'object' && 'errorFields' in e) return
      message.error((e as ApiError).message || '校验失败')
      return
    }
    setSaving(true)
    try {
      if (editing) {
        await variableApi.update(projectId, editing.id, vals)
        message.success('已更新')
      } else {
        await variableApi.create(projectId, vals)
        message.success('已创建')
      }
      setModalOpen(false)
      await load(projectId)
    } catch (e) {
      message.error((e as ApiError).message || '保存失败')
    } finally {
      setSaving(false)
    }
  }

  const remove = (v: GlobalVariable) => {
    if (projectId == null) return
    modal.confirm({
      title: `删除变量「${v.name}」？`,
      okText: '删除',
      okType: 'danger',
      cancelText: '取消',
      onOk: async () => {
        try {
          await variableApi.remove(projectId, v.id)
          message.success('已删除')
          await load(projectId)
        } catch (e) {
          message.error((e as ApiError).message || '删除失败')
        }
      },
    })
  }

  const columns: TableColumnsType<GlobalVariable> = [
    { title: '引用', dataIndex: 'name', width: 150, render: (n) => <Text code>{`{{var.${String(n)}}}`}</Text> },
    { title: '值', dataIndex: 'value', ellipsis: true, render: (v) => String(v ?? '') },
    { title: '描述', dataIndex: 'description', ellipsis: true, render: (d) => (d ? String(d) : '—') },
    {
      title: '操作',
      width: 120,
      render: (_, r) => (
        <Space size="small">
          <Button size="small" icon={<EditOutlined />} onClick={() => openEdit(r)} />
          <Button size="small" danger icon={<DeleteOutlined />} onClick={() => remove(r)} />
        </Space>
      ),
    },
  ]

  return (
    <Drawer title="全局变量" open={open} onClose={onClose} width={600} destroyOnHidden>
      <Text type="secondary">
        项目级变量，在文本/标题组件中用 {`{{var.名称}}`} 引用，改值即联动刷新。
      </Text>
      <Button type="primary" icon={<PlusOutlined />} onClick={openCreate} style={{ margin: '12px 0' }}>
        新建变量
      </Button>
      <Table<GlobalVariable>
        rowKey="id"
        size="small"
        loading={loading}
        dataSource={variables}
        pagination={false}
        columns={columns}
      />
      <Modal
        title={editing ? '编辑变量' : '新建变量'}
        open={modalOpen}
        onOk={save}
        onCancel={() => setModalOpen(false)}
        confirmLoading={saving}
        destroyOnHidden
      >
        <Form form={form} layout="vertical" style={{ marginTop: 12 }}>
          <Form.Item
            label="名称"
            name="name"
            rules={[
              { required: true, message: '名称不能为空' },
              { pattern: /^[a-zA-Z_]\w*$/, message: '仅字母/下划线开头，含字母数字下划线' },
            ]}
          >
            <Input placeholder="如 totalSales" />
          </Form.Item>
          <Form.Item label="值" name="value">
            <Input placeholder="静态值（字符串）" />
          </Form.Item>
          <Form.Item label="描述" name="description">
            <Input.TextArea autoSize={{ minRows: 2, maxRows: 4 }} />
          </Form.Item>
        </Form>
      </Modal>
    </Drawer>
  )
}
