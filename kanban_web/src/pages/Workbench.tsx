import { useCallback, useEffect, useState } from 'react'
import {
  Avatar,
  Button,
  Card,
  Dropdown,
  Form,
  Input,
  Modal,
  Select,
  Space,
  Spin,
  Typography,
  App as AntdApp,
  type MenuProps,
} from 'antd'
import { PlusOutlined, LogoutOutlined, DesktopOutlined, SettingOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { useWorkspaceStore } from '../store/workspaceStore'
import { authApi, groupApi, projectApi, workspaceApi } from '../api'
import type { ApiError, Project, ProjectGroup, SelectedGroup } from '../types'
import { useDict } from '../hooks/useDict'
import GroupSidebar from '../components/GroupSidebar'
import './Workbench.css'

// 字典未加载时的内置兜底（正常路径由 sys_dict 的 project_status 下发）
const STATUS_TAG: Record<string, { color: string; label: string }> = {
  DRAFT: { color: 'default', label: '草稿' },
  PUBLISHED: { color: 'green', label: '已发布' },
  TRASHED: { color: 'red', label: '已回收' },
}

// 新建看板类型的内置兜底（正常路径由 sys_dict 的 project_type 下发）
const TYPE_OPTIONS_FALLBACK = [
  { value: 'PC', label: 'PC 大屏' },
  { value: 'MOBILE', label: '移动端' },
  { value: 'CITY3D', label: '三维城市', disabled: true },
]

export default function Workbench() {
  const { message, modal } = AntdApp.useApp()
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const setUser = useAuthStore((s) => s.setUser)
  const logout = useAuthStore((s) => s.logout)
  const workspaces = useWorkspaceStore((s) => s.list)
  const currentId = useWorkspaceStore((s) => s.currentId)
  const switchTo = useWorkspaceStore((s) => s.switchTo)
  const setWorkspaceList = useWorkspaceStore((s) => s.setList)
  const { labelMap: statusLabels, extMap: statusExts } = useDict('project_status')

  const [projects, setProjects] = useState<Project[]>([])
  const [groups, setGroups] = useState<ProjectGroup[]>([])
  const [selected, setSelected] = useState<SelectedGroup>({ kind: 'all' })
  const [loading, setLoading] = useState(false)
  const [bootstrapping, setBootstrapping] = useState(true)
  const [creating, setCreating] = useState(false)
  const [renameTarget, setRenameTarget] = useState<Project | null>(null)
  const [renameForm] = Form.useForm<{ name: string }>()

  // 刷新页面恢复 user：token 尚在但 user 为 null → 拉 /me；同时确保工作空间列表已加载
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        if (!useAuthStore.getState().user) {
          const me = await authApi.me()
          if (cancelled) return
          setUser(me)
        }
        let { list, currentId } = useWorkspaceStore.getState()
        if (list.length === 0) {
          const ws = await workspaceApi.list()
          if (cancelled) return
          setWorkspaceList(ws)
          ;({ list, currentId } = useWorkspaceStore.getState())
        }
        if (currentId == null && list.length > 0) {
          switchTo(list[0].id)
        }
      } catch {
        logout()
      } finally {
        if (!cancelled) setBootstrapping(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [setUser, setWorkspaceList, switchTo, logout])

  const reloadProjects = useCallback(async () => {
    if (currentId == null) {
      setProjects([])
      return
    }
    setLoading(true)
    try {
      let list: Project[]
      if (selected.kind === 'all') list = await projectApi.list()
      else if (selected.kind === 'ungrouped') list = await projectApi.list({ ungrouped: true })
      else list = await projectApi.list({ groupId: selected.id })
      setProjects(list)
    } catch (e) {
      message.error((e as ApiError).message || '加载看板失败')
    } finally {
      setLoading(false)
    }
  }, [currentId, selected, message])

  useEffect(() => {
    void reloadProjects()
  }, [reloadProjects])

  const reloadGroups = useCallback(async () => {
    if (currentId == null) {
      setGroups([])
      return
    }
    try {
      setGroups(await groupApi.list())
    } catch {
      // 静默：分组加载失败不阻断看板列表
    }
  }, [currentId])

  useEffect(() => {
    void reloadGroups()
  }, [reloadGroups])

  // 切换工作空间 → 选中重置为「全部」
  useEffect(() => {
    setSelected({ kind: 'all' })
  }, [currentId])

  const createGroup = async (name: string, parentId: number | null) => {
    try {
      const sort = groups.filter((g) => (g.parentId ?? null) === parentId).length
      await groupApi.create({ name, parentId: parentId ?? undefined, sort })
      await reloadGroups()
    } catch (e) {
      message.error((e as ApiError).message || '创建分组失败')
    }
  }

  const renameGroup = async (id: number, name: string) => {
    try {
      await groupApi.update(id, { name })
      await reloadGroups()
    } catch (e) {
      message.error((e as ApiError).message || '重命名失败')
    }
  }

  const deleteGroup = async (id: number) => {
    try {
      await groupApi.remove(id)
      await reloadGroups()
      if (selected.kind === 'group' && selected.id === id) setSelected({ kind: 'all' })
    } catch (e) {
      message.error((e as ApiError).message || '删除失败')
    }
  }

  const reorderGroups = async (_parentId: number | null, orderedIds: number[]) => {
    try {
      await Promise.all(orderedIds.map((gid, i) => groupApi.update(gid, { sort: i })))
    } catch (e) {
      message.error((e as ApiError).message || '排序失败')
    } finally {
      await reloadGroups()
    }
  }

  const handleSwitch = async (id: number) => {
    switchTo(id)
  }

  const handleCreate = async (name: string, type: string) => {
    setCreating(true)
    try {
      const groupId = selected.kind === 'group' ? selected.id : undefined
      const project = await projectApi.create({ name, type, groupId })
      message.success('创建成功')
      navigate(`/editor/${project.id}`)
    } catch (e) {
      message.error((e as ApiError).message || '创建失败')
    } finally {
      setCreating(false)
    }
  }

  const handleRename = (p: Project) => {
    setRenameTarget(p)
    renameForm.setFieldsValue({ name: p.name })
  }

  const submitRename = async () => {
    if (!renameTarget) return
    const values = await renameForm.validateFields()
    try {
      await projectApi.update(renameTarget.id, { name: values.name.trim() })
      await reloadProjects()
      message.success('已重命名')
      setRenameTarget(null)
    } catch (e) {
      message.error((e as ApiError).message || '重命名失败')
    }
  }

  const handleDelete = (p: Project) => {
    modal.confirm({
      title: '删除看板',
      content: `确定删除「${p.name}」吗？`,
      okText: '删除',
      okButtonProps: { danger: true },
      onOk: async () => {
        await projectApi.remove(p.id)
        await reloadProjects()
        message.success('已删除')
      },
    })
  }

  const moveProject = async (p: Project, groupId: number | null) => {
    try {
      if (groupId == null) await projectApi.update(p.id, { clearGroup: true })
      else await projectApi.update(p.id, { groupId })
      await reloadProjects()
      message.success('已移动')
    } catch (e) {
      message.error((e as ApiError).message || '移动失败')
    }
  }

  const moveItems: MenuProps['items'] = [
    { key: 'ungrouped', label: '未分组' },
    { type: 'divider' },
    ...groups.map((g) => ({ key: String(g.id), label: g.name })),
  ]

  const handleLogout = () => {
    logout()
    location.href = '/login'
  }

  if (bootstrapping) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Spin size="large" tip="加载中…" />
      </div>
    )
  }

  const currentWorkspace = workspaces.find((w) => w.id === currentId)

  return (
    <div style={{ minHeight: '100vh', background: '#f5f5f7' }}>
      {/* 顶栏 */}
      <header
        style={{
          height: 56,
          padding: '0 24px',
          background: '#1e1b4b',
          color: '#fff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <Space size="large">
          <Typography.Text strong style={{ color: '#fff', fontSize: 16 }}>
            看板平台
          </Typography.Text>
          <Select
            value={currentId ?? undefined}
            onChange={handleSwitch}
            style={{ width: 200 }}
            options={workspaces.map((w) => ({ value: w.id, label: `${w.name} (${w.code})` }))}
            placeholder="选择工作空间"
          />
        </Space>
        <Dropdown
          menu={{
            items: [
              ...(user?.isPlatformAdmin
                ? [
                    {
                      key: 'settings',
                      icon: <SettingOutlined />,
                      label: '系统设置',
                      onClick: () => navigate('/settings'),
                    },
                  ]
                : []),
              {
                key: 'logout',
                icon: <LogoutOutlined />,
                label: '退出登录',
                onClick: handleLogout,
              },
            ],
          }}
        >
          <Space style={{ cursor: 'pointer', color: '#fff' }}>
            <Avatar style={{ background: '#6366f1' }}>
              {user?.displayName?.[0] ?? user?.username?.[0] ?? 'U'}
            </Avatar>
            <Typography.Text style={{ color: '#fff' }}>{user?.displayName ?? user?.username}</Typography.Text>
          </Space>
        </Dropdown>
      </header>

      <div className="workbench-body">
        <GroupSidebar
          groups={groups}
          selected={selected}
          onSelect={setSelected}
          onCreate={createGroup}
          onRename={renameGroup}
          onDelete={deleteGroup}
          onReorder={reorderGroups}
        />

        {/* 主区 */}
        <main className="workbench-main" style={{ padding: 24 }}>
          <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography.Title level={4} style={{ margin: 0 }}>
              {currentWorkspace ? `${currentWorkspace.name} · 看板` : '看板'}
            </Typography.Title>
            <CreateButton onCreated={handleCreate} loading={creating} disabled={currentId == null} />
          </div>

          <Spin spinning={loading}>
            {projects.length === 0 ? (
              <Card>
                <div style={{ textAlign: 'center', padding: '48px 0', color: '#999' }}>
                  <DesktopOutlined style={{ fontSize: 48, marginBottom: 16 }} />
                  <div>当前分组下未创建看板</div>
                </div>
              </Card>
            ) : (
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
                  gap: 16,
                }}
              >
                {projects.map((p) => {
                  const fallback = STATUS_TAG[p.status] ?? STATUS_TAG.DRAFT
                  const extColor = statusExts[p.status]?.color
                  const st = {
                    label: statusLabels[p.status] ?? fallback.label,
                    color: typeof extColor === 'string' ? extColor : fallback.color,
                  }
                  return (
                    <Card
                      key={p.id}
                      hoverable
                      size="small"
                      title={p.name}
                      actions={[]}
                      extra={<Typography.Text type="secondary" style={{ fontSize: 12 }}>{st.label}</Typography.Text>}
                    >
                      <div className="card-preview">
                        {p.thumbnail ? (
                          <img src={p.thumbnail} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                          <span>{p.canvasW}×{p.canvasH}</span>
                        )}
                      </div>
                      <Space wrap>
                        <Button size="small" type="primary" onClick={() => navigate(`/editor/${p.id}`)}>编辑</Button>
                        <Dropdown menu={{ items: moveItems, onClick: ({ key }) => moveProject(p, key === 'ungrouped' ? null : Number(key)) }}>
                          <Button size="small">移动</Button>
                        </Dropdown>
                        <Button size="small" onClick={() => handleRename(p)}>重命名</Button>
                        <Button size="small" danger onClick={() => handleDelete(p)}>删除</Button>
                      </Space>
                    </Card>
                  )
                })}
              </div>
            )}
          </Spin>
        </main>
      </div>

      <Modal
        title="重命名看板"
        open={renameTarget != null}
        onOk={submitRename}
        onCancel={() => setRenameTarget(null)}
        destroyOnHidden
      >
        <Form form={renameForm} layout="vertical" style={{ marginTop: 12 }}>
          <Form.Item label="看板名称" name="name" rules={[{ required: true, message: '名称不能为空' }]}>
            <Input placeholder="看板名称" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

function CreateButton({
  onCreated,
  loading,
  disabled,
}: {
  onCreated: (name: string, type: string) => void
  loading: boolean
  disabled: boolean
}) {
  const [open, setOpen] = useState(false)
  const [form] = Form.useForm<{ name: string; type: string }>()
  const { options: typeOptions } = useDict('project_type')

  const openModal = () => {
    form.resetFields()
    setOpen(true)
  }

  const handleOk = async () => {
    const values = await form.validateFields()
    onCreated(values.name.trim(), values.type ?? 'PC')
    setOpen(false)
  }

  return (
    <>
      <Button type="primary" icon={<PlusOutlined />} onClick={openModal} loading={loading} disabled={disabled}>
        新建看板
      </Button>
      <Modal title="新建看板" open={open} onOk={handleOk} onCancel={() => setOpen(false)} confirmLoading={loading} destroyOnHidden>
        <Form form={form} layout="vertical" initialValues={{ type: 'PC' }} style={{ marginTop: 12 }}>
          <Form.Item label="看板名称" name="name" rules={[{ required: true, message: '名称不能为空' }]}>
            <Input placeholder="看板名称" autoFocus />
          </Form.Item>
          <Form.Item label="类型" name="type">
            <Select options={typeOptions.length ? typeOptions : TYPE_OPTIONS_FALLBACK} />
          </Form.Item>
        </Form>
      </Modal>
    </>
  )
}
