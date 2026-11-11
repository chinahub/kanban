import { useState } from 'react'
import { App as AntdApp, Button, Dropdown, Form, Input, Modal, Tree, Typography } from 'antd'
import type { TreeDataNode, TreeProps } from 'antd'
import { FolderOutlined, MoreOutlined, PlusOutlined } from '@ant-design/icons'
import type { ProjectGroup, SelectedGroup } from '../types'

interface GroupSidebarProps {
  groups: ProjectGroup[]
  selected: SelectedGroup
  onSelect: (s: SelectedGroup) => void
  onCreate: (name: string, parentId: number | null) => Promise<void>
  onRename: (id: number, name: string) => Promise<void>
  onDelete: (id: number) => Promise<void>
  onReorder: (parentId: number | null, orderedIds: number[]) => Promise<void>
}

const ALL = 'all'
const UNGROUPED = 'ungrouped'
const isGroupKey = (key: unknown) => typeof key === 'string' && key.startsWith('group:')
const idFromGroupKey = (key: string) => Number(key.slice('group:'.length))
const groupKey = (id: number) => `group:${id}`

export default function GroupSidebar({
  groups,
  selected,
  onSelect,
  onCreate,
  onRename,
  onDelete,
  onReorder,
}: GroupSidebarProps) {
  const { modal } = AntdApp.useApp()
  const [createOpen, setCreateOpen] = useState(false)
  const [createParentId, setCreateParentId] = useState<number | null>(null)
  const [createForm] = Form.useForm<{ name: string }>()
  const [renameTarget, setRenameTarget] = useState<ProjectGroup | null>(null)
  const [renameForm] = Form.useForm<{ name: string }>()

  const selectedKey =
    selected.kind === 'all' ? ALL : selected.kind === 'ungrouped' ? UNGROUPED : groupKey(selected.id)

  const handleMenu = (g: ProjectGroup, action: string) => {
    if (action === 'add') {
      setCreateParentId(g.id)
      createForm.resetFields()
      setCreateOpen(true)
    } else if (action === 'rename') {
      setRenameTarget(g)
      renameForm.setFieldsValue({ name: g.name })
    } else if (action === 'delete') {
      modal.confirm({
        title: '删除分组',
        content: `删除「${g.name}」后，组内看板将变为未分组。确认删除？`,
        okText: '删除',
        okButtonProps: { danger: true },
        onOk: () => onDelete(g.id),
      })
    }
  }

  const buildTree = (parentId: number | null): TreeDataNode[] =>
    groups
      .filter((g) => (g.parentId ?? null) === parentId)
      .sort((a, b) => (a.sort ?? 0) - (b.sort ?? 0))
      .map<TreeDataNode>((g) => ({
        key: groupKey(g.id),
        title: (
          <div className="group-node">
            <FolderOutlined className="group-node-icon" />
            <span className="group-node-name">{g.name}</span>
            <Dropdown
              trigger={['click']}
              placement="bottomRight"
              menu={{
                items: [
                  { key: 'add', label: '新建子分组' },
                  { key: 'rename', label: '重命名' },
                  { key: 'delete', label: '删除分组', danger: true },
                ],
                onClick: ({ key: action }) => handleMenu(g, action),
              }}
            >
              <Button
                size="small"
                type="text"
                className="group-node-menu"
                icon={<MoreOutlined />}
                onClick={(e) => e.stopPropagation()}
              />
            </Dropdown>
          </div>
        ),
        children: buildTree(g.id),
      }))

  const treeData: TreeDataNode[] = [
    { key: ALL, title: <span className="group-fixed">全部看板</span>, selectable: true, isLeaf: true },
    { key: UNGROUPED, title: <span className="group-fixed">未分组</span>, selectable: true, isLeaf: true },
    ...buildTree(null),
  ]

  const handleSelect: NonNullable<TreeProps['onSelect']> = (keys) => {
    const key = String(keys[0] ?? ALL)
    if (key === ALL) onSelect({ kind: 'all' })
    else if (key === UNGROUPED) onSelect({ kind: 'ungrouped' })
    else if (isGroupKey(key)) onSelect({ kind: 'group', id: idFromGroupKey(key) })
  }

  const handleDrop: NonNullable<TreeProps['onDrop']> = (info) => {
    const dragKey = String(info.dragNode.key)
    const dropKey = String(info.node.key)
    if (!isGroupKey(dragKey) || !isGroupKey(dropKey)) return
    const dragId = idFromGroupKey(dragKey)
    const dropId = idFromGroupKey(dropKey)
    const drag = groups.find((g) => g.id === dragId)
    const drop = groups.find((g) => g.id === dropId)
    if (!drag || !drop || (drag.parentId ?? null) !== (drop.parentId ?? null)) return
    const parentId = drag.parentId ?? null
    const siblings = groups
      .filter((g) => (g.parentId ?? null) === parentId)
      .sort((a, b) => (a.sort ?? 0) - (b.sort ?? 0))
    const arr = siblings.filter((g) => g.id !== dragId)
    const dropIdx = arr.findIndex((g) => g.id === dropId)
    if (dropIdx < 0) return
    const pos = String(info.node.pos ?? '').split('-')
    const norm = info.dropPosition - Number(pos[pos.length - 1])
    const insertAt = Number.isNaN(norm) || norm >= 0 ? dropIdx + 1 : dropIdx
    arr.splice(insertAt, 0, drag)
    void onReorder(parentId, arr.map((g) => g.id))
  }

  const allowDrop: NonNullable<TreeProps['allowDrop']> = ({ dragNode, dropNode }) => {
    const dk = String(dragNode?.key ?? '')
    const nk = String(dropNode?.key ?? '')
    if (!isGroupKey(dk) || !isGroupKey(nk)) return false
    const d = groups.find((g) => g.id === idFromGroupKey(dk))
    const n = groups.find((g) => g.id === idFromGroupKey(nk))
    if (!d || !n) return false
    return (d.parentId ?? null) === (n.parentId ?? null)
  }

  const openCreateRoot = () => {
    setCreateParentId(null)
    createForm.resetFields()
    setCreateOpen(true)
  }

  const submitCreate = async () => {
    const values = await createForm.validateFields()
    await onCreate(values.name.trim(), createParentId)
    setCreateOpen(false)
  }

  const submitRename = async () => {
    if (!renameTarget) return
    const values = await renameForm.validateFields()
    await onRename(renameTarget.id, values.name.trim())
    setRenameTarget(null)
  }

  return (
    <aside className="group-sidebar">
      <div className="group-sidebar-header">
        <Typography.Text strong>分组</Typography.Text>
        <Button size="small" type="text" icon={<PlusOutlined />} onClick={openCreateRoot} title="新建分组" />
      </div>
      <Tree
        treeData={treeData}
        selectedKeys={[selectedKey]}
        onSelect={handleSelect}
        blockNode
        draggable={(node) => isGroupKey(node.key)}
        allowDrop={allowDrop}
        onDrop={handleDrop}
      />

      <Modal
        title={createParentId == null ? '新建分组' : '新建子分组'}
        open={createOpen}
        onOk={submitCreate}
        onCancel={() => setCreateOpen(false)}
        destroyOnHidden
      >
        <Form form={createForm} layout="vertical" style={{ marginTop: 12 }}>
          <Form.Item label="分组名称" name="name" rules={[{ required: true, message: '名称不能为空' }]}>
            <Input placeholder="分组名称" autoFocus />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="重命名分组"
        open={renameTarget != null}
        onOk={submitRename}
        onCancel={() => setRenameTarget(null)}
        destroyOnHidden
      >
        <Form form={renameForm} layout="vertical" style={{ marginTop: 12 }}>
          <Form.Item label="分组名称" name="name" rules={[{ required: true, message: '名称不能为空' }]}>
            <Input placeholder="分组名称" />
          </Form.Item>
        </Form>
      </Modal>
    </aside>
  )
}
