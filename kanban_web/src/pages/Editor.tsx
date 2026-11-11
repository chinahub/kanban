import { memo, useEffect, useMemo, useRef, useState } from 'react'
import Moveable from 'react-moveable'
import { useNavigate, useParams } from 'react-router-dom'
import { App as AntdApp, Button, ColorPicker, Drawer, Form, Input, InputNumber, Popconfirm, Select, Space, Spin, Switch, Tabs, Tag, Tooltip, Typography } from 'antd'
import { AppstoreOutlined, ArrowLeftOutlined, BlockOutlined, BorderOutlined, CloseOutlined, ColumnWidthOutlined, DeleteOutlined, ExpandOutlined, EyeOutlined, FilterOutlined, HistoryOutlined, NodeIndexOutlined, PictureOutlined, PlusOutlined, RobotOutlined, SaveOutlined, ShareAltOutlined, UnorderedListOutlined } from '@ant-design/icons'
import { projectApi, dataSetApi } from '../api'
import ComponentRenderer from '../components/ComponentRenderer'
import DataPanel from '../components/DataPanel'
import { beginInteraction, currentPageOf, endInteraction, isInteracting, useCurrentPage, useEditorStore, useSelectedComponent } from '../store/editorStore'
import { useFilterStore } from '../store/filterStore'
import { isDomComponent, parseCanvasConfig, type ComponentType, type GuideLine } from '../types/editor'
import type { ApiError, Project } from '../types'
import { useDict } from '../hooks/useDict'
import './Editor.css'
import { useVariableStore } from '../store/variableStore'
import { loadHistory, applyHistoryTemporal, clearHistory, saveHistory } from '../store/editorHistoryPersist'
import VariablesDrawer from '../components/VariablesDrawer'
import AssetDrawer from '../components/AssetDrawer'
import FilterDrawer from '../components/FilterDrawer'
import PublishDrawer from '../components/PublishDrawer'
import AiAssistant from '../components/AiAssistant'
import BlueprintPanel from '../components/BlueprintPanel'
import HistoryPanel from '../components/HistoryPanel'
import LayerPanel from '../components/LayerPanel'
import ComponentLibraryPanel from '../components/ComponentLibraryPanel'
import InteractionPanel from '../components/InteractionPanel'
import PreviewModal from '../components/PreviewModal'
import Ruler from '../components/Ruler'
import { CollabClient, type CollabPeer } from '../util/collabClient'
import { useAuthStore } from '../store/authStore'
import { CANVAS_THEMES } from '../theme/themes'

const BATCH_TYPES: ComponentType[] = ['bar', 'line', 'pie', 'area', 'scatter', 'radar', 'funnel', 'rose', 'title', 'text']

function safeParseArray(raw: string | null | undefined): unknown[] {
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function isEditable(el: EventTarget | null): boolean {
  const node = el as HTMLElement | null
  if (!node) return false
  return node.tagName === 'INPUT' || node.tagName === 'TEXTAREA' || node.isContentEditable
}

/** 窄屏（移动端编辑器形态）检测：宽度 ≤ 768px 时左面板/属性面板改为底部抽屉（PRD §4.3） */
function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState(() => window.matchMedia('(max-width: 768px)').matches)
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 768px)')
    const onChange = (e: MediaQueryListEvent) => setIsMobile(e.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])
  return isMobile
}



export default function Editor() {
  const { projectId } = useParams()
  const navigate = useNavigate()
  const { message, notification } = AntdApp.useApp()
  const id = Number(projectId)
  const isMobile = useIsMobile()
  const [project, setProject] = useState<Project | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [varDrawerOpen, setVarDrawerOpen] = useState(false)
  const [assetDrawerOpen, setAssetDrawerOpen] = useState(false)
  const [filterDrawerOpen, setFilterDrawerOpen] = useState(false)
  const [pubDrawerOpen, setPubDrawerOpen] = useState(false)
  const [aiDrawerOpen, setAiDrawerOpen] = useState(false)
  const [previewOpen, setPreviewOpen] = useState(false)
  const [bpOpen, setBpOpen] = useState(false)
  // 协同（PRD §7.2）：WS 房间在线成员 + 他人保存提醒；不做 CRDT/OT，冲突以「重新加载」兜底
  const [peers, setPeers] = useState<CollabPeer[]>([])
  const collabRef = useRef<CollabClient | null>(null)
  const reloadRef = useRef<(() => void) | null>(null)
  // 左侧面板：图标栏当前激活的面板（图层/组件库/历史记录），null = 收起只留图标栏
  const [activePanel, setActivePanel] = useState<'layers' | 'components' | 'history' | null>('components')
  const config = useEditorStore((s) => s.config)
  const currentPage = useCurrentPage()
  const load = useEditorStore((s) => s.load)
  const addComponent = useEditorStore((s) => s.addComponent)
  const select = useEditorStore((s) => s.select)
  const selectedId = useEditorStore((s) => s.selectedId)
  const removeSelected = useEditorStore((s) => s.removeSelected)
  const mainRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const p = await projectApi.get(id)
        if (cancelled) return
        setProject(p)
        const snap = loadHistory(p.id)
        const serverTs = Date.parse(p.updatedAt) || 0
        if (snap && snap.config && snap.ts >= serverTs) {
          load(p.id, snap.config)
          applyHistoryTemporal(snap)
        } else {
          load(p.id, parseCanvasConfig(p.canvasConfig, p.canvasW, p.canvasH))
          clearHistory(p.id)
        }
        useVariableStore.getState().load(p.id)
      } catch (e) {
        message.error((e as ApiError).message || '加载看板失败')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [id, load, message])

  // 加载工作空间过滤器（图表绑定/渲染用）
  const loadFilters = useFilterStore((s) => s.load)
  useEffect(() => {
    loadFilters()
  }, [loadFilters])

  // 协同「重新加载」：放弃本地草稿，取服务端最新配置覆盖画布（他人保存新版本时用户可点）
  const reloadFromServer = async () => {
    try {
      const p = await projectApi.get(id)
      setProject(p)
      load(p.id, parseCanvasConfig(p.canvasConfig, p.canvasW, p.canvasH))
      clearHistory(p.id)
      useVariableStore.getState().load(p.id)
      message.success('已加载最新版本')
    } catch (e) {
      message.error((e as ApiError).message || '加载最新版本失败')
    }
  }
  useEffect(() => {
    reloadRef.current = reloadFromServer
  })

  // 协同连接：进入看板即连 WS 房间，广播在线成员；他人保存时弹「重新加载」提醒
  const me = useAuthStore((s) => s.user)
  const accessToken = useAuthStore((s) => s.accessToken)
  useEffect(() => {
    if (!project?.id || !accessToken) return
    const client = new CollabClient()
    collabRef.current = client
    const SAVED_KEY = 'collab-saved'
    client.connect(project.id, accessToken, {
      onRoster: (list) => setPeers(list.filter((u) => u.id !== me?.id)),
      onSaved: (peer) => {
        notification.info({
          key: SAVED_KEY,
          message: `${peer.name} 已保存新版本`,
          description: '当前画布可能与最新版本不一致，重新加载将覆盖本地未保存内容。',
          duration: 0,
          btn: (
            <Button
              size="small"
              type="primary"
              onClick={() => {
                notification.destroy(SAVED_KEY)
                reloadRef.current?.()
              }}
            >
              重新加载
            </Button>
          ),
        })
      },
    })
    return () => {
      client.close()
      collabRef.current = null
      setPeers([])
    }
  }, [project?.id, accessToken, me?.id, notification])

  // 组件数据自动刷新（P2-2）：编辑器内对绑定了数据集且配置了间隔的组件定时拉取（覆盖全部页面）。
  // 依赖只取 dataSetId/autoRefreshSec 签名，数据刷新本身不会重建定时器；
  // 分享页保持快照语义，不做实时拉取。
  const refreshPlan = config.pages
    .flatMap((p) => p.components)
    .map((c) => `${c.id}|${(c.props.dataSetId as number | undefined) ?? ''}|${Number(c.props.autoRefreshSec) || 0}`)
    .join(';')
  useEffect(() => {
    const timers: ReturnType<typeof setInterval>[] = []
    for (const p of useEditorStore.getState().config.pages) {
      for (const c of p.components) {
        const dsId = c.props.dataSetId as number | undefined
        const sec = Number(c.props.autoRefreshSec) || 0
        if (dsId == null || sec <= 0) continue
        timers.push(
          setInterval(() => {
            if (isInteracting()) return // 拖拽中跳过本次，避免打乱单步撤销
            void (async () => {
              try {
                const ds = await dataSetApi.refresh(dsId)
                const temporalStore = useEditorStore.temporal.getState()
                temporalStore.pause() // 后台刷新不记入撤销历史
                useEditorStore.getState().updateComponent(c.id, { data: safeParseArray(ds.data) })
                temporalStore.resume()
              } catch {
                // 拉取失败静默跳过，下个周期重试
              }
            })()
          }, sec * 1000),
        )
      }
    }
    return () => timers.forEach((t) => clearInterval(t))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshPlan])

  // 持久化撤销/重做历史与未保存草稿到 localStorage（按项目，防抖 500ms）

  // --- Auto-fit: keep canvas filling the editor area per fitMode ---
  useEffect(() => {
    const el = mainRef.current
    if (!el) return
    const PAD_X = 16
    const PAD_TOP = 16
    const PAD_BOTTOM = 16
    const RULER = 24
    const MIN = 0.1
    const MAX = 1.5
    const apply = () => {
      const state = useEditorStore.getState()
      const { width, height, scale, fitMode } = state.config.canvas
      if (fitMode === 'none') return
      const aw = el.clientWidth - PAD_X * 2 - RULER
      const ah = el.clientHeight - PAD_TOP - PAD_BOTTOM - RULER
      if (aw <= 0 || ah <= 0) return
      let next = scale
      if (fitMode === 'width') {
        next = Math.min(MAX, Math.max(MIN, aw / width))
      } else {
        next = Math.min(MAX, Math.max(MIN, Math.min(aw / width, ah / height)))
      }
      if (Math.abs(next - scale) > 0.001) {
        state.updateCanvas({ scale: next })
      }
    }
    apply()
    const ro = new ResizeObserver(apply)
    ro.observe(el)
    return () => ro.disconnect()
  }, [project?.id])

  useEffect(() => {
    if (!project) return
    const pid = project.id
    let timer: ReturnType<typeof setTimeout> | null = null
    const save = () => {
      if (timer) clearTimeout(timer)
      timer = setTimeout(() => saveHistory(pid), 500)
    }
    const unsub1 = useEditorStore.subscribe(save)
    const unsub2 = useEditorStore.temporal.subscribe(save)
    return () => {
      unsub1()
      unsub2()
      if (timer) clearTimeout(timer)
    }
  }, [project?.id])

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (isEditable(e.target)) return
      const store = useEditorStore.getState()
      const ctrl = e.ctrlKey || e.metaKey
      const key = e.key.toLowerCase()

      if (ctrl && key === 'z' && !e.shiftKey) {
        e.preventDefault()
        useEditorStore.temporal.getState().undo()
      } else if (ctrl && ((key === 'z' && e.shiftKey) || key === 'y')) {
        e.preventDefault()
        useEditorStore.temporal.getState().redo()
      } else if (ctrl && key === 'c') {
        if (!store.selectedId) return
        e.preventDefault()
        store.copySelected()
      } else if (ctrl && key === 'v') {
        e.preventDefault()
        store.paste()
      } else if (ctrl && key === 'd') {
        if (!store.selectedId) return
        e.preventDefault()
        store.duplicateSelected()
      } else if (!ctrl && (key === 'delete' || key === 'backspace')) {
        if (store.selectedId) {
          e.preventDefault()
          store.removeSelected()
        }
      } else if (!ctrl && key === 'escape') {
        if (store.selectedId) {
          e.preventDefault()
          store.select(null)
        }
      } else if (!ctrl && key.startsWith('arrow')) {
        if (!store.selectedId) return
        e.preventDefault()
        const step = e.shiftKey ? 10 : 1
        const sel = currentPageOf(store).components.find((c) => c.id === store.selectedId)
        if (!sel) return
        if (key === 'arrowup') store.updateComponent(sel.id, { y: sel.y - step })
        else if (key === 'arrowdown') store.updateComponent(sel.id, { y: sel.y + step })
        else if (key === 'arrowleft') store.updateComponent(sel.id, { x: sel.x - step })
        else if (key === 'arrowright') store.updateComponent(sel.id, { x: sel.x + step })
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  const save = async () => {
    if (!project) return
    setSaving(true)
    try {
      const updated = await projectApi.update(project.id, {
        canvasW: config.canvas.width,
        canvasH: config.canvas.height,
        background: config.canvas.background,
        canvasConfig: JSON.stringify(config),
      })
      setProject(updated)
      message.success('已保存')
      collabRef.current?.sendSaved()
    } catch (e) {
      message.error((e as ApiError).message || '保存失败')
    } finally {
      setSaving(false)
    }
  }

  const batchAdd = () => {
    for (let i = 0; i < 10; i++) {
      const type = BATCH_TYPES[i % BATCH_TYPES.length]
      const col = i % 5
      const row = Math.floor(i / 5)
      const isText = type === 'title' || type === 'text'
      addComponent(type, {
        x: 40 + col * 370,
        y: 40 + row * 310,
        width: isText ? 300 : 340,
        height: isText ? 72 : 280,
      })
    }
    message.info('已添加 10 个组件用于性能测试')
  }

  // 左侧面板内容：桌面端内联渲染，移动端走底部抽屉（组件库抽屉化，PRD §4.3）
  const panelTitle = activePanel === 'components' ? '组件库' : activePanel === 'layers' ? '图层' : '历史记录'
  const panelContent =
    activePanel === 'components' ? (
      <>
        <ComponentLibraryPanel
          onAdd={(type) => {
            addComponent(type)
            // 移动端添加后收起组件库抽屉，让画布可见
            if (isMobile) setActivePanel(null)
          }}
        />
        <Button size="small" type="dashed" className="batch-add-btn" onClick={batchAdd}>
          +10 组件 (性能测试)
        </Button>
        <div className="shortcut-hint">
          <span className="kbd">Del</span>删除
          <span className="kbd">Ctrl</span>+<span className="kbd">C</span>复制
          <span className="kbd">Ctrl</span>+<span className="kbd">V</span>粘贴
          <span className="kbd">Ctrl</span>+<span className="kbd">Z</span>撤销
          <span className="kbd">方向键</span>微调
        </div>
      </>
    ) : activePanel === 'layers' ? (
      <LayerPanel />
    ) : activePanel === 'history' ? (
      <HistoryPanel />
    ) : null

  // 右侧属性面板内容：桌面端内联三栏，移动端选中组件时弹出底部抽屉
  const propsTabs = (
    <Tabs
      items={[
        { key: 'style', label: '样式', children: <StylePanel /> },
        { key: 'data', label: '数据', children: <DataPanel /> },
        { key: 'interaction', label: '交互', children: <InteractionPanel /> },
      ]}
    />
  )

  if (loading) {
    return <div className="editor-loading"><Spin size="large" tip="加载编辑器..." /></div>
  }

  return (
    <div className={isMobile ? 'editor-page mobile' : 'editor-page'}>
      <header className="editor-topbar">
        <Space>
          <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/')}>返回</Button>
          <span className="editor-topbar-title">
            <Typography.Text strong>{project?.name ?? '未命名看板'}</Typography.Text>
          </span>
          {peers.length > 0 && (
            <span className="editor-topbar-peers">
              <Tooltip title={`其他协作者：${peers.map((p) => p.name).join('、')}`}>
                <Space size={4}>
                  {peers.slice(0, 5).map((p) => (
                    <Tag key={p.id} color="blue" style={{ marginInlineEnd: 0 }}>{p.name.slice(0, 8)}</Tag>
                  ))}
                  {peers.length > 5 && <Tag style={{ marginInlineEnd: 0 }}>+{peers.length - 5}</Tag>}
                </Space>
              </Tooltip>
            </span>
          )}
        </Space>
        <Space size={isMobile ? 0 : 8}>
          <Button icon={<RobotOutlined />} onClick={() => setAiDrawerOpen(true)}>{isMobile ? '' : 'AI'}</Button>
          <Button icon={<EyeOutlined />} onClick={() => setPreviewOpen(true)}>{isMobile ? '' : '预览'}</Button>
          <Button icon={<ShareAltOutlined />} onClick={() => setPubDrawerOpen(true)}>{isMobile ? '' : '发布'}</Button>
          <Button type="primary" icon={<SaveOutlined />} loading={saving} onClick={save}>{isMobile ? '' : '保存'}</Button>
        </Space>
      </header>

      <aside className="editor-leftbar">
        <nav className="editor-rail">
          <button
            className={activePanel === 'layers' ? 'rail-item active' : 'rail-item'}
            onClick={() => setActivePanel(activePanel === 'layers' ? null : 'layers')}
          >
            <UnorderedListOutlined />
            <span>图层</span>
          </button>
          <button
            className={activePanel === 'components' ? 'rail-item active' : 'rail-item'}
            onClick={() => setActivePanel(activePanel === 'components' ? null : 'components')}
          >
            <AppstoreOutlined />
            <span>组件库</span>
          </button>
          <button className="rail-item" onClick={() => setAssetDrawerOpen(true)}>
            <PictureOutlined />
            <span>资源</span>
          </button>
          <button className="rail-item" onClick={() => setVarDrawerOpen(true)}>
            <BlockOutlined />
            <span>全局变量</span>
          </button>
          <button className="rail-item" onClick={() => setFilterDrawerOpen(true)}>
            <FilterOutlined />
            <span>过滤器</span>
          </button>
          <button className="rail-item" onClick={() => setBpOpen(true)}>
            <NodeIndexOutlined />
            <span>蓝图</span>
          </button>
          <button
            className={activePanel === 'history' ? 'rail-item active' : 'rail-item'}
            onClick={() => setActivePanel(activePanel === 'history' ? null : 'history')}
          >
            <HistoryOutlined />
            <span>历史记录</span>
          </button>
        </nav>
        {activePanel && !isMobile && (
          <div className={activePanel === 'components' ? 'editor-panel wide' : 'editor-panel'}>
            <div className="editor-panel-header">
              <span>{panelTitle}</span>
              <Button type="text" size="small" icon={<CloseOutlined />} onClick={() => setActivePanel(null)} />
            </div>
            {panelContent}
          </div>
        )}
      </aside>
      {/* 移动端：组件库/图层/历史记录走底部抽屉（组件库抽屉化，PRD §4.3） */}
      <Drawer
        placement="bottom"
        height="55%"
        open={isMobile && activePanel !== null}
        onClose={() => setActivePanel(null)}
        title={panelTitle}
        destroyOnHidden
        className="editor-mobile-drawer"
      >
        {panelContent}
      </Drawer>

      <main ref={mainRef} className="editor-main" onMouseDown={() => select(null)}>
        <PageBar />
        <Canvas />
      </main>

      {!isMobile && (
        <aside className="editor-right">
          {propsTabs}
          {selectedId && (
            <Button danger icon={<DeleteOutlined />} onClick={removeSelected} block>
              删除选中组件
            </Button>
          )}
        </aside>
      )}
      {/* 移动端：选中组件时弹出属性底部抽屉，关闭即取消选中。
          不加遮罩（mask=false）：属性面板只占底部，画布上已选中的组件仍可直接单指拖拽 */}
      <Drawer
        placement="bottom"
        height="62%"
        open={isMobile && !!selectedId}
        onClose={() => select(null)}
        title="组件属性"
        destroyOnHidden
        mask={false}
        className="editor-mobile-drawer"
      >
        {propsTabs}
        {selectedId && (
          <Button danger icon={<DeleteOutlined />} onClick={removeSelected} block>
            删除选中组件
          </Button>
        )}
      </Drawer>

      <footer className="editor-footer">
        <span>画布 {config.canvas.width}×{config.canvas.height} · 缩放 {Math.round(config.canvas.scale * 100)}% · 页面 {config.pages.length} · 当前页组件 {currentPage.components.length}</span>
        <span className="fps-counter"><FpsCounter /></span>
      </footer>

      <VariablesDrawer projectId={project?.id ?? null} open={varDrawerOpen} onClose={() => setVarDrawerOpen(false)} />
      <AssetDrawer open={assetDrawerOpen} onClose={() => setAssetDrawerOpen(false)} />
      <FilterDrawer open={filterDrawerOpen} onClose={() => setFilterDrawerOpen(false)} />
      <PublishDrawer projectId={project?.id ?? null} project={project} open={pubDrawerOpen} onClose={() => setPubDrawerOpen(false)} onProjectChange={setProject} />
      <AiAssistant projectId={project?.id ?? null} open={aiDrawerOpen} onClose={() => setAiDrawerOpen(false)} />
      <BlueprintPanel open={bpOpen} onClose={() => setBpOpen(false)} />
      <PreviewModal open={previewOpen} onClose={() => setPreviewOpen(false)} projectId={project?.id ?? null} />
    </div>
  )
}

/** 页面管理条：切换/双击重命名/新增/删除子页面（至少保留一页）。点击需阻止冒泡，避免触发画布取消选中 */
function PageBar() {
  const pages = useEditorStore((s) => s.config.pages)
  const currentPageId = useEditorStore((s) => s.currentPageId)
  const switchPage = useEditorStore((s) => s.switchPage)
  const addPage = useEditorStore((s) => s.addPage)
  const removePage = useEditorStore((s) => s.removePage)
  const renamePage = useEditorStore((s) => s.renamePage)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingName, setEditingName] = useState('')

  const commitRename = () => {
    if (editingId) renamePage(editingId, editingName)
    setEditingId(null)
  }

  return (
    <div className="page-bar" onMouseDown={(e) => e.stopPropagation()}>
      {pages.map((p) => (
        <div
          key={p.id}
          className={p.id === currentPageId ? 'page-tab active' : 'page-tab'}
          onClick={() => switchPage(p.id)}
          onDoubleClick={() => { setEditingId(p.id); setEditingName(p.name) }}
        >
          {editingId === p.id ? (
            <Input
              size="small"
              autoFocus
              value={editingName}
              onChange={(e) => setEditingName(e.target.value)}
              onBlur={commitRename}
              onPressEnter={commitRename}
              onKeyDown={(e) => { if (e.key === 'Escape') setEditingId(null) }}
              style={{ width: 100 }}
            />
          ) : (
            <span className="page-tab-name">{p.name}</span>
          )}
          {pages.length > 1 && editingId !== p.id && (
            <Popconfirm title="删除该页面及其全部组件？" onConfirm={() => removePage(p.id)}>
              <CloseOutlined className="page-tab-close" onClick={(e) => e.stopPropagation()} />
            </Popconfirm>
          )}
        </div>
      ))}
      <Tooltip title="新增页面">
        <Button size="small" type="text" icon={<PlusOutlined />} onClick={() => addPage()} />
      </Tooltip>
    </div>
  )
}

function Canvas() {
  const config = useEditorStore((s) => s.config)
  const page = useCurrentPage()
  const selectedId = useEditorStore((s) => s.selectedId)
  const select = useEditorStore((s) => s.select)
  const update = useEditorStore((s) => s.updateComponent)
  const addComponent = useEditorStore((s) => s.addComponent)
  const [target, setTarget] = useState<HTMLElement | null>(null)
  const stageRef = useRef<HTMLDivElement | null>(null)
  const moveableRef = useRef<Moveable>(null)
  const dragRef = useRef<{ type: 'create' | 'move'; orientation: 'horizontal' | 'vertical'; guideId?: string } | null>(null)
  const [preview, setPreview] = useState<{ orientation: 'horizontal' | 'vertical'; position: number } | null>(null)

  const scaledSize = useMemo(
    () => ({ width: config.canvas.width * config.canvas.scale, height: config.canvas.height * config.canvas.scale }),
    [config.canvas.width, config.canvas.height, config.canvas.scale],
  )
  const selected = page.components.find((c) => c.id === selectedId) ?? null

  useEffect(() => {
    setTarget(selectedId ? document.querySelector<HTMLElement>(`[data-component-id="${selectedId}"]`) : null)
  }, [selectedId, page.components.length])

  useEffect(() => {
    if (!target) return
    const raf = requestAnimationFrame(() => {
      moveableRef.current?.moveable?.updateRect()
    })
    return () => cancelAnimationFrame(raf)
  }, [target])

  // Guide drag: create from ruler, move existing, delete by dragging back to ruler
  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      const drag = dragRef.current
      if (!drag) return
      const stage = stageRef.current
      if (!stage) return
      const rect = stage.getBoundingClientRect()
      const scale = useEditorStore.getState().config.canvas.scale
      if (drag.orientation === 'horizontal') {
        setPreview({ orientation: 'horizontal', position: (e.clientY - rect.top) / scale })
      } else {
        setPreview({ orientation: 'vertical', position: (e.clientX - rect.left) / scale })
      }
    }
    const onUp = (e: MouseEvent) => {
      const drag = dragRef.current
      const stage = stageRef.current
      if (!drag || !stage) {
        dragRef.current = null
        setPreview(null)
        return
      }
      const rect = stage.getBoundingClientRect()
      const state = useEditorStore.getState()
      const scale = state.config.canvas.scale
      const w = state.config.canvas.width
      const h = state.config.canvas.height
      if (drag.type === 'create') {
        if (drag.orientation === 'horizontal') {
          const y = (e.clientY - rect.top) / scale
          if (y >= 0 && y <= h) state.addGuide('horizontal', y)
        } else {
          const x = (e.clientX - rect.left) / scale
          if (x >= 0 && x <= w) state.addGuide('vertical', x)
        }
      } else if (drag.type === 'move' && drag.guideId) {
        if (drag.orientation === 'horizontal') {
          const y = (e.clientY - rect.top) / scale
          if (y < 0 || y > h) state.removeGuide(drag.guideId)
          else state.updateGuide(drag.guideId, y)
        } else {
          const x = (e.clientX - rect.left) / scale
          if (x < 0 || x > w) state.removeGuide(drag.guideId)
          else state.updateGuide(drag.guideId, x)
        }
      }
      dragRef.current = null
      setPreview(null)
    }
    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
    return () => {
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup', onUp)
    }
  }, [])

  const startGuideCreate = (orientation: 'horizontal' | 'vertical') => {
    dragRef.current = { type: 'create', orientation }
    setPreview({ orientation, position: 0 })
  }

  const startGuideMove = (guide: GuideLine) => {
    dragRef.current = { type: 'move', orientation: guide.orientation, guideId: guide.id }
    setPreview({ orientation: guide.orientation, position: guide.position })
  }

  return (
    <div className="canvas-shell">
      <div className="canvas-stage-wrap">
        <div className="canvas-ruler-corner" />
        <Ruler
          orientation="horizontal"
          length={config.canvas.width}
          scale={config.canvas.scale}
          onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); startGuideCreate('horizontal') }}
        />
        <Ruler
          orientation="vertical"
          length={config.canvas.height}
          scale={config.canvas.scale}
          onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); startGuideCreate('vertical') }}
        />
      <div
        ref={stageRef}
        className="canvas-stage"
        style={{ width: scaledSize.width, height: scaledSize.height, background: config.canvas.background }}
        onDragOverCapture={(e) => { e.preventDefault() }}
        onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'copy' }}
        onDrop={(e) => {
          e.preventDefault()
          const type = e.dataTransfer.getData('application/x-kanban-component') as ComponentType
          if (!type) return
          const rect = e.currentTarget.getBoundingClientRect()
          const scale = config.canvas.scale
          const sizeW = isDomComponent(type) ? 300 : 420
          const sizeH = isDomComponent(type) ? 72 : 260
          const x = (e.clientX - rect.left) / scale - sizeW / 2
          const y = (e.clientY - rect.top) / scale - sizeH / 2
          addComponent(type, { x, y, width: sizeW, height: sizeH })
        }}
      >
        <div className="grid" />
        {page.components.map((c) => (
          <div
            key={c.id}
            data-component-id={c.id}
            className={c.id === selectedId ? 'canvas-layer selected' : 'canvas-layer'}
            style={{
              width: c.width * config.canvas.scale,
              height: c.height * config.canvas.scale,
              opacity: c.opacity,
              transform: `translate(${c.x * config.canvas.scale}px, ${c.y * config.canvas.scale}px) rotate(${c.rotate}deg)`,
              display: c.visible ? 'block' : 'none',
              // 锁定组件点击穿透：mousedown 自然落到下层组件或画布（取消选中）
              pointerEvents: c.locked ? 'none' : undefined,
            }}
            onMouseDown={(e) => {
              e.stopPropagation()
              select(c.id)
            }}
          >
            <div style={{ width: '100%', height: '100%' }}>
              <ComponentRenderer component={c} scale={config.canvas.scale} background={config.canvas.background} />
            </div>
          </div>
        ))}
        {page.guides.map((g) => (
          <div
            key={g.id}
            className={`guide-line ${g.orientation}`}
            style={g.orientation === 'horizontal' ? { top: g.position * config.canvas.scale } : { left: g.position * config.canvas.scale }}
            onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); startGuideMove(g) }}
            onDoubleClick={(e) => { e.preventDefault(); e.stopPropagation(); useEditorStore.getState().removeGuide(g.id) }}
          >
            <span className="guide-label">{Math.round(g.position)}</span>
          </div>
        ))}
        {preview && (
          <div
            className={`guide-line ${preview.orientation} preview`}
            style={preview.orientation === 'horizontal' ? { top: preview.position * config.canvas.scale } : { left: preview.position * config.canvas.scale }}
          />
        )}
        {selected && target && !selected.locked && selected.visible && (
          <Moveable
            ref={moveableRef}
            target={target}
            container={stageRef.current ?? undefined}
            draggable
            resizable
            rotatable
            snappable
            snapThreshold={5}
            snapDirections={{ left: true, top: true, right: true, bottom: true, center: true, middle: true }}
            elementGuidelines={['[data-component-id]:not(.selected)']}
            verticalGuidelines={[0, scaledSize.width / 2, scaledSize.width]}
            horizontalGuidelines={[0, scaledSize.height / 2, scaledSize.height]}
            throttleDrag={1}
            throttleResize={1}
            throttleRotate={1}
            origin={false}
            bounds={{ left: 0, top: 0, right: scaledSize.width, bottom: scaledSize.height }}
            onDragStart={() => beginInteraction()}
            onDrag={(e) => {
              // 拖拽过程中只改目标 DOM，不写 store（避免整页每像素重渲染），结束时一次性提交
              e.target.style.transform = `translate(${e.beforeTranslate[0]}px, ${e.beforeTranslate[1]}px) rotate(${selected.rotate}deg)`
            }}
            onDragEnd={(e) => {
              const last = e.lastEvent
              if (last) {
                update(selected.id, { x: last.beforeTranslate[0] / config.canvas.scale, y: last.beforeTranslate[1] / config.canvas.scale })
              }
              endInteraction()
            }}
            onResizeStart={() => beginInteraction()}
            onResize={(e) => {
              // 缩放过程中只改目标 DOM，不写 store，结束时一次性提交
              e.target.style.width = `${e.width}px`
              e.target.style.height = `${e.height}px`
              e.target.style.transform = `translate(${e.drag.beforeTranslate[0]}px, ${e.drag.beforeTranslate[1]}px) rotate(${selected.rotate}deg)`
            }}
            onResizeEnd={(e) => {
              const last = e.lastEvent
              if (last) {
                update(selected.id, {
                  width: last.width / config.canvas.scale,
                  height: last.height / config.canvas.scale,
                  x: last.drag.beforeTranslate[0] / config.canvas.scale,
                  y: last.drag.beforeTranslate[1] / config.canvas.scale,
                })
              }
              endInteraction()
            }}
            onRotateStart={() => beginInteraction()}
            onRotate={(e) => {
              // 旋转过程中只改目标 DOM，不写 store，结束时一次性提交
              e.target.style.transform = `translate(${selected.x * config.canvas.scale}px, ${selected.y * config.canvas.scale}px) rotate(${e.beforeRotate}deg)`
            }}
            onRotateEnd={(e) => {
              const last = e.lastEvent
              if (last) update(selected.id, { rotate: last.beforeRotate })
              endInteraction()
            }}
          />
        )}
      </div>
      </div>
    </div>
  )
}

function StylePanel() {
  const selected = useSelectedComponent()
  const update = useEditorStore((s) => s.updateComponent)
  const updateProps = useEditorStore((s) => s.updateComponentProps)
  const updateCanvas = useEditorStore((s) => s.updateCanvas)
  const applyTheme = useEditorStore((s) => s.applyTheme)
  const canvas = useEditorStore((s) => s.config.canvas)
  const guides = useCurrentPage().guides
  const removeGuide = useEditorStore((s) => s.removeGuide)
  const clearGuides = useEditorStore((s) => s.clearGuides)
  const { options: statusCardOptions } = useDict('status_card_status')

  if (!selected) {
    return (
      <Form layout="vertical" className="prop-form">
        <Form.Item label="画布宽度"><InputNumber min={320} max={20000} value={canvas.width} onChange={(v) => v && updateCanvas({ width: v })} /></Form.Item>
        <Form.Item label="画布高度"><InputNumber min={240} max={10000} value={canvas.height} onChange={(v) => v && updateCanvas({ height: v })} /></Form.Item>
        <Form.Item label="背景色">
          <ColorPicker
            value={canvas.background}
            onChange={(v) => updateCanvas({ background: v.toHexString() })}
            showText
          />
        </Form.Item>
        <Form.Item label="主题套件">
          <Space size={8}>
            {CANVAS_THEMES.map((t) => (
              <Tooltip key={t.id} title={`套用「${t.label}」：背景 + 全部组件主色（可撤销）`}>
                <div
                  onClick={() => applyTheme(t)}
                  style={{
                    width: 56,
                    cursor: 'pointer',
                    borderRadius: 6,
                    padding: 4,
                    border: canvas.themeId === t.id ? '2px solid #4f8cff' : '2px solid rgba(255,255,255,0.15)',
                    textAlign: 'center',
                  }}
                >
                  <div
                    style={{
                      height: 28,
                      borderRadius: 4,
                      background: t.background,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <div style={{ width: 14, height: 14, borderRadius: 3, background: t.primary }} />
                  </div>
                  <Typography.Text style={{ fontSize: 12 }}>{t.label}</Typography.Text>
                </div>
              </Tooltip>
            ))}
          </Space>
        </Form.Item>
        <Form.Item label="缩放"><InputNumber min={0.1} max={1.5} step={0.05} value={canvas.scale} onChange={(v) => v && updateCanvas({ scale: v, fitMode: 'none' })} /></Form.Item>
        <Form.Item label="适配方式">
          <Space.Compact>
            <Tooltip title="自定义缩放">
              <Button
                icon={<ColumnWidthOutlined />}
                type={canvas.fitMode === 'none' ? 'primary' : 'default'}
                onClick={() => updateCanvas({ fitMode: 'none' })}
              />
            </Tooltip>
            <Tooltip title="自适应宽度">
              <Button
                icon={<ExpandOutlined rotate={90} />}
                type={canvas.fitMode === 'width' ? 'primary' : 'default'}
                onClick={() => updateCanvas({ fitMode: 'width' })}
              />
            </Tooltip>
            <Tooltip title="等比适配">
              <Button
                icon={<BorderOutlined />}
                type={canvas.fitMode === 'both' ? 'primary' : 'default'}
                onClick={() => updateCanvas({ fitMode: 'both' })}
              />
            </Tooltip>
          </Space.Compact>
        </Form.Item>
        <Form.Item label={`参考线 (${guides.length})`}>
          {guides.length === 0 ? (
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>从标尺拖出参考线，双击删除</Typography.Text>
          ) : (
            <Space direction="vertical" style={{ width: '100%' }} size={4}>
              {guides.map((g) => (
                <div key={g.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography.Text style={{ fontSize: 12 }}>
                    {g.orientation === 'horizontal' ? '水平' : '垂直'} {Math.round(g.position)}px
                  </Typography.Text>
                  <Button size="small" type="text" danger icon={<DeleteOutlined />} onClick={() => removeGuide(g.id)} />
                </div>
              ))}
              <Button size="small" onClick={clearGuides} block>清除所有参考线</Button>
            </Space>
          )}
        </Form.Item>
      </Form>
    )
  }

  return (
    <Form layout="vertical" className="prop-form">
      <Form.Item label="名称"><Input value={selected.name} onChange={(e) => update(selected.id, { name: e.target.value })} /></Form.Item>
      <Space>
        <Form.Item label="X"><InputNumber value={selected.x} onChange={(v) => update(selected.id, { x: Number(v ?? 0) })} /></Form.Item>
        <Form.Item label="Y"><InputNumber value={selected.y} onChange={(v) => update(selected.id, { y: Number(v ?? 0) })} /></Form.Item>
      </Space>
      <Space>
        <Form.Item label="W"><InputNumber min={20} value={selected.width} onChange={(v) => update(selected.id, { width: Number(v ?? 20) })} /></Form.Item>
        <Form.Item label="H"><InputNumber min={20} value={selected.height} onChange={(v) => update(selected.id, { height: Number(v ?? 20) })} /></Form.Item>
      </Space>
      <Form.Item label="旋转"><InputNumber value={selected.rotate} onChange={(v) => update(selected.id, { rotate: Number(v ?? 0) })} /></Form.Item>
      <Form.Item label="不透明度"><InputNumber min={0} max={1} step={0.05} value={selected.opacity} onChange={(v) => update(selected.id, { opacity: Number(v ?? 1) })} /></Form.Item>
      {(selected.type === 'title' || selected.type === 'text') && (
        <>
          <Form.Item label="文本"><Input.TextArea value={String(selected.props.text ?? '')} onChange={(e) => updateProps(selected.id, { text: e.target.value })} /></Form.Item>
          <Form.Item label="字号"><InputNumber min={8} value={Number(selected.props.fontSize ?? 18)} onChange={(v) => updateProps(selected.id, { fontSize: Number(v ?? 18) })} /></Form.Item>
          <Form.Item label="颜色"><Input value={String(selected.props.color ?? '#fff')} onChange={(e) => updateProps(selected.id, { color: e.target.value })} /></Form.Item>
        </>
      )}
      {(selected.type === 'line' || selected.type === 'bar' || selected.type === 'pie' || selected.type === 'area' || selected.type === 'scatter' || selected.type === 'radar' || selected.type === 'funnel' || selected.type === 'rose' || selected.type === 'barh' || selected.type === 'barGroup' || selected.type === 'barStack' || selected.type === 'ring' || selected.type === 'lineMulti' || selected.type === 'areaStack' || selected.type === 'barPercent' || selected.type === 'barhGroup' || selected.type === 'barhStack' || selected.type === 'lineStep' || selected.type === 'barhPercent' || selected.type === 'areaPercent' || selected.type === 'scatterBubble' || selected.type === 'barRange' || selected.type === 'barWaterfall' || selected.type === 'lineDual' || selected.type === 'dualLineBar' || selected.type === 'pieNest' || selected.type === 'yujue' || selected.type === 'doubleBar' || selected.type === 'contrastBar' || selected.type === 'multiStack') && (
        <>
          <Form.Item label="标题"><Input value={String(selected.props.title ?? '')} onChange={(e) => updateProps(selected.id, { title: e.target.value })} /></Form.Item>
          <Form.Item label="颜色"><Input value={String(selected.props.color ?? '#4f8cff')} onChange={(e) => updateProps(selected.id, { color: e.target.value })} /></Form.Item>
        </>
      )}
      {selected.type === 'flipper' && (
        <>
          <Form.Item label="数值"><InputNumber value={Number(selected.props.value ?? 0)} onChange={(v) => updateProps(selected.id, { value: Number(v ?? 0) })} style={{ width: '100%' }} /></Form.Item>
          <Form.Item label="字号"><InputNumber min={8} value={Number(selected.props.fontSize ?? 36)} onChange={(v) => updateProps(selected.id, { fontSize: Number(v ?? 36) })} /></Form.Item>
          <Form.Item label="颜色"><Input value={String(selected.props.color ?? '#4f8cff')} onChange={(e) => updateProps(selected.id, { color: e.target.value })} /></Form.Item>
        </>
      )}
      {selected.type === 'timer' && (
        <>
          <Form.Item label="格式"><Input value={String(selected.props.format ?? 'YYYY-MM-DD HH:mm:ss')} onChange={(e) => updateProps(selected.id, { format: e.target.value })} /></Form.Item>
          <Form.Item label="字号"><InputNumber min={8} value={Number(selected.props.fontSize ?? 24)} onChange={(v) => updateProps(selected.id, { fontSize: Number(v ?? 24) })} /></Form.Item>
          <Form.Item label="颜色"><Input value={String(selected.props.color ?? '#fff')} onChange={(e) => updateProps(selected.id, { color: e.target.value })} /></Form.Item>
        </>
      )}
      {selected.type === 'gauge' && (
        <>
          <Form.Item label="数值"><InputNumber value={Number(selected.props.value ?? 66)} onChange={(v) => updateProps(selected.id, { value: Number(v ?? 0) })} style={{ width: '100%' }} /></Form.Item>
          <Space>
            <Form.Item label="最小值"><InputNumber value={Number(selected.props.min ?? 0)} onChange={(v) => updateProps(selected.id, { min: Number(v ?? 0) })} /></Form.Item>
            <Form.Item label="最大值"><InputNumber value={Number(selected.props.max ?? 100)} onChange={(v) => updateProps(selected.id, { max: Number(v ?? 100) })} /></Form.Item>
          </Space>
          <Form.Item label="标题"><Input value={String(selected.props.title ?? '')} onChange={(e) => updateProps(selected.id, { title: e.target.value })} /></Form.Item>
          <Form.Item label="颜色"><Input value={String(selected.props.color ?? '#4f8cff')} onChange={(e) => updateProps(selected.id, { color: e.target.value })} /></Form.Item>
        </>
      )}
      {selected.type === 'label' && (
        <>
          <Form.Item label="文本"><Input value={String(selected.props.text ?? '')} onChange={(e) => updateProps(selected.id, { text: e.target.value })} /></Form.Item>
          <Form.Item label="字号"><InputNumber min={8} value={Number(selected.props.fontSize ?? 16)} onChange={(v) => updateProps(selected.id, { fontSize: Number(v ?? 16) })} /></Form.Item>
          <Form.Item label="颜色"><Input value={String(selected.props.color ?? '#ffffff')} onChange={(e) => updateProps(selected.id, { color: e.target.value })} /></Form.Item>
          <Form.Item label="背景色"><Input value={String(selected.props.background ?? '#1d39c4')} onChange={(e) => updateProps(selected.id, { background: e.target.value })} /></Form.Item>
          <Form.Item label="圆角"><InputNumber min={0} value={Number(selected.props.borderRadius ?? 4)} onChange={(v) => updateProps(selected.id, { borderRadius: Number(v ?? 0) })} /></Form.Item>
        </>
      )}
      {selected.type === 'countdown' && (
        <>
          <Form.Item label="目标时间"><Input placeholder="YYYY-MM-DD HH:mm:ss" value={String(selected.props.targetTime ?? '')} onChange={(e) => updateProps(selected.id, { targetTime: e.target.value })} /></Form.Item>
          <Form.Item label="字号"><InputNumber min={8} value={Number(selected.props.fontSize ?? 24)} onChange={(v) => updateProps(selected.id, { fontSize: Number(v ?? 24) })} /></Form.Item>
          <Form.Item label="颜色"><Input value={String(selected.props.color ?? '#4f8cff')} onChange={(e) => updateProps(selected.id, { color: e.target.value })} /></Form.Item>
        </>
      )}
      {selected.type === 'marquee' && (
        <>
          <Form.Item label="文本"><Input.TextArea value={String(selected.props.text ?? '')} onChange={(e) => updateProps(selected.id, { text: e.target.value })} /></Form.Item>
          <Form.Item label="字号"><InputNumber min={8} value={Number(selected.props.fontSize ?? 18)} onChange={(v) => updateProps(selected.id, { fontSize: Number(v ?? 18) })} /></Form.Item>
          <Form.Item label="颜色"><Input value={String(selected.props.color ?? '#ffffff')} onChange={(e) => updateProps(selected.id, { color: e.target.value })} /></Form.Item>
          <Form.Item label="滚动速度"><InputNumber min={10} max={500} value={Number(selected.props.speed ?? 60)} onChange={(v) => updateProps(selected.id, { speed: Number(v ?? 60) })} /></Form.Item>
        </>
      )}
      {selected.type === 'statusCard' && (
        <>
          <Form.Item label="名称"><Input value={String(selected.props.label ?? '')} onChange={(e) => updateProps(selected.id, { label: e.target.value })} /></Form.Item>
          <Form.Item label="状态">
            <Select
              value={String(selected.props.status ?? 'online')}
              onChange={(v) => updateProps(selected.id, { status: v })}
              options={
                statusCardOptions.length
                  ? statusCardOptions
                  : [
                      { value: 'online', label: '正常（绿）' },
                      { value: 'warning', label: '告警（黄）' },
                      { value: 'offline', label: '离线（红）' },
                    ]
              }
            />
          </Form.Item>
          <Form.Item label="说明"><Input value={String(selected.props.value ?? '')} onChange={(e) => updateProps(selected.id, { value: e.target.value })} /></Form.Item>
        </>
      )}
      {selected.type === 'bizTrend' && (
        <>
          <Form.Item label="指标名"><Input value={String(selected.props.label ?? '')} onChange={(e) => updateProps(selected.id, { label: e.target.value })} /></Form.Item>
          <Space>
            <Form.Item label="数值"><InputNumber value={Number(selected.props.value ?? 0)} onChange={(v) => updateProps(selected.id, { value: Number(v ?? 0) })} /></Form.Item>
            <Form.Item label="单位"><Input value={String(selected.props.suffix ?? '')} onChange={(e) => updateProps(selected.id, { suffix: e.target.value })} /></Form.Item>
          </Space>
          <Space>
            <Form.Item label="涨跌 %"><InputNumber value={Number(selected.props.percent ?? 0)} onChange={(v) => updateProps(selected.id, { percent: Number(v ?? 0) })} /></Form.Item>
            <Form.Item label="方向">
              <Select
                value={Boolean(selected.props.up ?? true) ? 'up' : 'down'}
                onChange={(v) => updateProps(selected.id, { up: v === 'up' })}
                options={[{ value: 'up', label: '上涨' }, { value: 'down', label: '下跌' }]}
              />
            </Form.Item>
          </Space>
        </>
      )}
      {selected.type === 'image' && (
        <>
          <Form.Item label="图片地址"><Input placeholder="https://… 或素材库地址" value={String(selected.props.url ?? '')} onChange={(e) => updateProps(selected.id, { url: e.target.value })} /></Form.Item>
          <Form.Item label="填充方式">
            <Select
              value={String(selected.props.fit ?? 'cover')}
              onChange={(v) => updateProps(selected.id, { fit: v })}
              options={[{ value: 'cover', label: '裁剪填充' }, { value: 'contain', label: '完整包含' }, { value: 'fill', label: '拉伸填满' }]}
            />
          </Form.Item>
        </>
      )}
      {selected.type === 'carousel' && (
        <>
          <Form.Item label="图片地址（每行一个）"><Input.TextArea rows={4} value={String(selected.props.urls ?? '')} onChange={(e) => updateProps(selected.id, { urls: e.target.value })} /></Form.Item>
          <Form.Item label="切换间隔（秒）"><InputNumber min={1} value={Number(selected.props.interval ?? 3)} onChange={(v) => updateProps(selected.id, { interval: Number(v ?? 3) })} /></Form.Item>
        </>
      )}
      {selected.type === 'colorBlock' && (
        <>
          <Form.Item label="颜色"><Input value={String(selected.props.color ?? '#12305e')} onChange={(e) => updateProps(selected.id, { color: e.target.value })} /></Form.Item>
          <Form.Item label="圆角"><InputNumber min={0} value={Number(selected.props.borderRadius ?? 8)} onChange={(v) => updateProps(selected.id, { borderRadius: Number(v ?? 0) })} /></Form.Item>
        </>
      )}
      {selected.type === 'bgBlock' && (
        <>
          <Form.Item label="背景色"><Input value={String(selected.props.color ?? 'rgba(18,48,94,0.4)')} onChange={(e) => updateProps(selected.id, { color: e.target.value })} /></Form.Item>
          <Form.Item label="边框颜色"><Input value={String(selected.props.borderColor ?? '#2a4b8f')} onChange={(e) => updateProps(selected.id, { borderColor: e.target.value })} /></Form.Item>
          <Space>
            <Form.Item label="边框宽度"><InputNumber min={0} value={Number(selected.props.borderWidth ?? 1)} onChange={(v) => updateProps(selected.id, { borderWidth: Number(v ?? 0) })} /></Form.Item>
            <Form.Item label="圆角"><InputNumber min={0} value={Number(selected.props.borderRadius ?? 8)} onChange={(v) => updateProps(selected.id, { borderRadius: Number(v ?? 0) })} /></Form.Item>
          </Space>
        </>
      )}
      {(selected.type === 'video' || selected.type === 'audio') && (
        <>
          <Form.Item label={selected.type === 'video' ? '视频地址' : '音频地址'}><Input placeholder="https://… 或素材库地址" value={String(selected.props.url ?? '')} onChange={(e) => updateProps(selected.id, { url: e.target.value })} /></Form.Item>
          <Form.Item label="自动播放"><Switch checked={Boolean(selected.props.autoplay)} onChange={(v) => updateProps(selected.id, { autoplay: v })} /></Form.Item>
          <Form.Item label="循环播放"><Switch checked={Boolean(selected.props.loop)} onChange={(v) => updateProps(selected.id, { loop: v })} /></Form.Item>
          {selected.type === 'video' && (
            <Form.Item label="静音"><Switch checked={Boolean(selected.props.muted ?? true)} onChange={(v) => updateProps(selected.id, { muted: v })} /></Form.Item>
          )}
          <Form.Item label="显示控制条"><Switch checked={Boolean(selected.props.controls ?? true)} onChange={(v) => updateProps(selected.id, { controls: v })} /></Form.Item>
        </>
      )}
      {(selected.type === 'borderBox' || selected.type === 'decoration') && (
        <>
          <Form.Item label="颜色"><Input value={String(selected.props.color ?? '#2a4b8f')} onChange={(e) => updateProps(selected.id, { color: e.target.value })} /></Form.Item>
          <Form.Item label="样式">
            <Select
              value={String(selected.props.style ?? (selected.type === 'borderBox' ? 'corner' : 'slashes'))}
              onChange={(v) => updateProps(selected.id, { style: v })}
              options={
                selected.type === 'borderBox'
                  ? [{ value: 'corner', label: '四角边框' }, { value: 'frame', label: '整框' }, { value: 'double', label: '双线框' }]
                  : [{ value: 'slashes', label: '斜线' }, { value: 'dots', label: '点阵' }]
              }
            />
          </Form.Item>
        </>
      )}
      {selected.type === 'decorationBar' && (
        <Form.Item label="颜色"><Input value={String(selected.props.color ?? '#4f8cff')} onChange={(e) => updateProps(selected.id, { color: e.target.value })} /></Form.Item>
      )}
      {selected.type === 'tableCarousel' && (
        <Form.Item label="滚动间隔（秒）"><InputNumber min={1} value={Number(selected.props.interval ?? 2)} onChange={(v) => updateProps(selected.id, { interval: Number(v ?? 2) })} /></Form.Item>
      )}
      {selected.type === 'tableProgress' && (
        <>
          <Form.Item label="最大值"><InputNumber min={1} value={Number(selected.props.max ?? 100)} onChange={(v) => updateProps(selected.id, { max: Number(v ?? 100) })} /></Form.Item>
          <Form.Item label="颜色"><Input value={String(selected.props.color ?? '#4f8cff')} onChange={(e) => updateProps(selected.id, { color: e.target.value })} /></Form.Item>
        </>
      )}
      {(selected.type === 'btn' || selected.type === 'selectDropdown' || selected.type === 'selectRadio' || selected.type === 'selectCheckbox' || selected.type === 'selectSwitch' || selected.type === 'inputBasic' || selected.type === 'inputSlider' || selected.type === 'selectDate' || selected.type === 'inputSearch' || selected.type === 'navTabs' || selected.type === 'navMenu' || selected.type === 'navBreadcrumb' || selected.type === 'dataProgress' || selected.type === 'dataSteps' || selected.type === 'btnIcon') && (
        <Form.Item label="绑定变量" tooltip="控件值写入该全局变量，其他组件可用 {{var.变量名}} 引用">
          <Input placeholder="变量名，如 region" value={String(selected.props.targetVariable ?? '')} onChange={(e) => updateProps(selected.id, { targetVariable: e.target.value })} />
        </Form.Item>
      )}
      {selected.type === 'btn' && (
        <>
          <Form.Item label="文本"><Input value={String(selected.props.text ?? '')} onChange={(e) => updateProps(selected.id, { text: e.target.value })} /></Form.Item>
          <Form.Item label="颜色"><Input value={String(selected.props.color ?? '#1d39c4')} onChange={(e) => updateProps(selected.id, { color: e.target.value })} /></Form.Item>
          <Form.Item label="点击写入值"><Input placeholder="点击按钮时写入变量的值" value={String(selected.props.value ?? '')} onChange={(e) => updateProps(selected.id, { value: e.target.value })} /></Form.Item>
        </>
      )}
      {(selected.type === 'selectDropdown' || selected.type === 'selectRadio' || selected.type === 'selectCheckbox') && (
        <Form.Item label="选项（每行一个）"><Input.TextArea rows={3} value={String(selected.props.options ?? '')} onChange={(e) => updateProps(selected.id, { options: e.target.value })} /></Form.Item>
      )}
      {selected.type === 'selectDropdown' && (
        <Form.Item label="占位文本"><Input value={String(selected.props.placeholder ?? '请选择')} onChange={(e) => updateProps(selected.id, { placeholder: e.target.value })} /></Form.Item>
      )}
      {selected.type === 'selectSwitch' && (
        <Space>
          <Form.Item label="开值"><Input value={String(selected.props.onValue ?? '开')} onChange={(e) => updateProps(selected.id, { onValue: e.target.value })} /></Form.Item>
          <Form.Item label="关值"><Input value={String(selected.props.offValue ?? '关')} onChange={(e) => updateProps(selected.id, { offValue: e.target.value })} /></Form.Item>
        </Space>
      )}
      {selected.type === 'inputBasic' && (
        <Form.Item label="占位文本"><Input value={String(selected.props.placeholder ?? '请输入')} onChange={(e) => updateProps(selected.id, { placeholder: e.target.value })} /></Form.Item>
      )}
      {selected.type === 'inputSlider' && (
        <Space>
          <Form.Item label="最小值"><InputNumber value={Number(selected.props.min ?? 0)} onChange={(v) => updateProps(selected.id, { min: Number(v ?? 0) })} /></Form.Item>
          <Form.Item label="最大值"><InputNumber value={Number(selected.props.max ?? 100)} onChange={(v) => updateProps(selected.id, { max: Number(v ?? 100) })} /></Form.Item>
          <Form.Item label="默认值"><InputNumber value={Number(selected.props.defaultValue ?? 50)} onChange={(v) => updateProps(selected.id, { defaultValue: Number(v ?? 0) })} /></Form.Item>
        </Space>
      )}
      {selected.type === 'liquid' && (
        <>
          <Form.Item label="数值（0-100）"><InputNumber min={0} max={100} value={Number(selected.props.value ?? 60)} onChange={(v) => updateProps(selected.id, { value: Number(v ?? 0) })} style={{ width: '100%' }} /></Form.Item>
          <Form.Item label="颜色"><Input value={String(selected.props.color ?? '#4f8cff')} onChange={(e) => updateProps(selected.id, { color: e.target.value })} /></Form.Item>
        </>
      )}
      {(selected.type === 'mapChina' || selected.type === 'mapWorld' || selected.type === 'mapRegion') && (
        <>
          {selected.type === 'mapRegion' && (
            <Form.Item label="GeoJSON 地址"><Input placeholder="/maps/china.json 或 https://…" value={String(selected.props.geoUrl ?? '')} onChange={(e) => updateProps(selected.id, { geoUrl: e.target.value })} /></Form.Item>
          )}
          <Form.Item label="颜色"><Input value={String(selected.props.color ?? '#4f8cff')} onChange={(e) => updateProps(selected.id, { color: e.target.value })} /></Form.Item>
        </>
      )}
      {(selected.type === 'mapFlight' || selected.type === 'mapScatter') && (
        <>
          <Form.Item label="GeoJSON 地址" tooltip="底图数据，默认内置中国地图"><Input placeholder="/maps/china.json 或 /maps/world.json" value={String(selected.props.geoUrl ?? '')} onChange={(e) => updateProps(selected.id, { geoUrl: e.target.value })} /></Form.Item>
          <Form.Item label="底图颜色"><Input value={String(selected.props.color ?? '#1d3d7a')} onChange={(e) => updateProps(selected.id, { color: e.target.value })} /></Form.Item>
          {selected.type === 'mapFlight' ? (
            <Form.Item label="飞线颜色"><Input value={String(selected.props.flyColor ?? '#4f8cff')} onChange={(e) => updateProps(selected.id, { flyColor: e.target.value })} /></Form.Item>
          ) : (
            <Form.Item label="散点颜色"><Input value={String(selected.props.dotColor ?? '#4f8cff')} onChange={(e) => updateProps(selected.id, { dotColor: e.target.value })} /></Form.Item>
          )}
          <Form.Item>
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
              {selected.type === 'mapFlight'
                ? '数据形如 { from: "北京", to: "上海", value }，城市名查内置经纬度表，也可用 fromLon/fromLat/toLon/toLat 指定坐标'
                : '数据形如 { name: "北京", value }，城市名查内置经纬度表，也可用 lon/lat 字段指定坐标；value 决定圆点半径'}
            </Typography.Text>
          </Form.Item>
        </>
      )}
      {(selected.type === 'selectDate' || selected.type === 'inputSearch') && (
        <Form.Item label="占位文本"><Input value={String(selected.props.placeholder ?? '')} onChange={(e) => updateProps(selected.id, { placeholder: e.target.value })} /></Form.Item>
      )}
      {(selected.type === 'navTabs' || selected.type === 'navMenu' || selected.type === 'navBreadcrumb' || selected.type === 'dataTimeline') && (
        <Form.Item label="选项（每行一个）"><Input.TextArea rows={3} value={String(selected.props.options ?? '')} onChange={(e) => updateProps(selected.id, { options: e.target.value })} /></Form.Item>
      )}
      {selected.type === 'dataProgress' && (
        <>
          <Form.Item label="数值（0-100）"><InputNumber min={0} max={100} value={Number(selected.props.value ?? 60)} onChange={(v) => updateProps(selected.id, { value: Number(v ?? 0) })} style={{ width: '100%' }} /></Form.Item>
          <Form.Item label="颜色"><Input value={String(selected.props.color ?? '#4f8cff')} onChange={(e) => updateProps(selected.id, { color: e.target.value })} /></Form.Item>
        </>
      )}
      {selected.type === 'dataSteps' && (
        <>
          <Form.Item label="选项（每行一个）"><Input.TextArea rows={3} value={String(selected.props.options ?? '')} onChange={(e) => updateProps(selected.id, { options: e.target.value })} /></Form.Item>
          <Form.Item label="当前步骤"><InputNumber min={0} value={Number(selected.props.current ?? 1)} onChange={(v) => updateProps(selected.id, { current: Number(v ?? 0) })} style={{ width: '100%' }} /></Form.Item>
        </>
      )}
      {(selected.type === 'btnIcon' || selected.type === 'icon') && (
        <>
          <Form.Item label="图标">
            <Select
              value={String(selected.props.icon ?? 'StarOutlined')}
              onChange={(v) => updateProps(selected.id, { icon: v })}
              options={['StarOutlined', 'HeartOutlined', 'HomeOutlined', 'SettingOutlined', 'BellOutlined', 'MailOutlined', 'SearchOutlined', 'DownloadOutlined', 'CloudOutlined', 'EnvironmentOutlined', 'GlobalOutlined', 'RocketOutlined', 'TrophyOutlined', 'FireOutlined', 'ThunderboltOutlined', 'SafetyOutlined'].map((n) => ({ value: n, label: n }))}
            />
          </Form.Item>
          {selected.type === 'icon' && (
            <Form.Item label="尺寸"><InputNumber min={8} value={Number(selected.props.size ?? 32)} onChange={(v) => updateProps(selected.id, { size: Number(v ?? 32) })} style={{ width: '100%' }} /></Form.Item>
          )}
          <Form.Item label="颜色"><Input value={String(selected.props.color ?? '#4f8cff')} onChange={(e) => updateProps(selected.id, { color: e.target.value })} /></Form.Item>
          {selected.type === 'btnIcon' && (
            <Form.Item label="点击写入值"><Input placeholder="点击按钮时写入变量的值" value={String(selected.props.value ?? '')} onChange={(e) => updateProps(selected.id, { value: e.target.value })} /></Form.Item>
          )}
        </>
      )}
      {selected.type === 'gallery' && (
        <>
          <Form.Item label="图片地址（每行一个）"><Input.TextArea rows={4} value={String(selected.props.urls ?? '')} onChange={(e) => updateProps(selected.id, { urls: e.target.value })} /></Form.Item>
          <Form.Item label="切换间隔（秒）"><InputNumber min={1} value={Number(selected.props.interval ?? 3)} onChange={(v) => updateProps(selected.id, { interval: Number(v ?? 3) })} /></Form.Item>
        </>
      )}
      {selected.type === 'logoWall' && (
        <>
          <Form.Item label="图片地址（每行一个）"><Input.TextArea rows={4} value={String(selected.props.urls ?? '')} onChange={(e) => updateProps(selected.id, { urls: e.target.value })} /></Form.Item>
          <Form.Item label="每行列数"><InputNumber min={1} value={Number(selected.props.columns ?? 4)} onChange={(v) => updateProps(selected.id, { columns: Number(v ?? 4) })} /></Form.Item>
        </>
      )}
      {selected.type === 'arrowPlot' && (
        <>
          <Form.Item label="颜色"><Input value={String(selected.props.color ?? '#4f8cff')} onChange={(e) => updateProps(selected.id, { color: e.target.value })} /></Form.Item>
          <Form.Item label="方向">
            <Select
              value={String(selected.props.direction ?? 'right')}
              onChange={(v) => updateProps(selected.id, { direction: v })}
              options={[{ value: 'right', label: '向右' }, { value: 'left', label: '向左' }, { value: 'up', label: '向上' }, { value: 'down', label: '向下' }]}
            />
          </Form.Item>
        </>
      )}
      {selected.type === 'tableCarouselBar' && (
        <>
          <Form.Item label="滚动间隔（秒）"><InputNumber min={1} value={Number(selected.props.interval ?? 2)} onChange={(v) => updateProps(selected.id, { interval: Number(v ?? 2) })} /></Form.Item>
          <Form.Item label="最大值"><InputNumber min={1} value={Number(selected.props.max ?? 100)} onChange={(v) => updateProps(selected.id, { max: Number(v ?? 100) })} /></Form.Item>
          <Form.Item label="颜色"><Input value={String(selected.props.color ?? '#4f8cff')} onChange={(e) => updateProps(selected.id, { color: e.target.value })} /></Form.Item>
        </>
      )}
      {(selected.type === 'streamPlayer' || selected.type === 'rtmpPlayer') && (
        <>
          <Form.Item label="流地址"><Input placeholder="https://…/live.m3u8 或 .flv" value={String(selected.props.url ?? '')} onChange={(e) => updateProps(selected.id, { url: e.target.value })} /></Form.Item>
          <Form.Item label="自动播放"><Switch checked={Boolean(selected.props.autoplay)} onChange={(v) => updateProps(selected.id, { autoplay: v })} /></Form.Item>
          <Form.Item label="静音"><Switch checked={Boolean(selected.props.muted ?? true)} onChange={(v) => updateProps(selected.id, { muted: v })} /></Form.Item>
        </>
      )}
      {(selected.type === 'earth3d' || selected.type === 'map3dChina' || selected.type === 'map3dWorld' || selected.type === 'city3d') && (
        <Form.Item label="颜色"><Input value={String(selected.props.color ?? '#4f8cff')} onChange={(e) => updateProps(selected.id, { color: e.target.value })} /></Form.Item>
      )}
    </Form>
  )
}

const FpsCounter = memo(function FpsCounter() {
  const [fps, setFps] = useState(60)
  useEffect(() => {
    let frames = 0
    let lastTime = performance.now()
    let raf = 0
    const loop = () => {
      frames++
      const now = performance.now()
      if (now - lastTime >= 1000) {
        setFps(frames)
        frames = 0
        lastTime = now
      }
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [])
  const color = fps >= 55 ? '#52c41a' : fps >= 30 ? '#faad14' : '#ff4d4f'
  return <span style={{ color }}>{fps} FPS</span>
})
