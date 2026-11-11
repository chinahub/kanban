import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'
import { temporal } from 'zundo'
import {
  cloneComponent,
  createBlueprintNode,
  createComponent,
  createPage,
  defaultCanvas,
  type BlueprintNode,
  type CanvasConfig,
  type CanvasComponent,
  type ComponentType,
  type GuideLine,
  type Page,
} from '../types/editor'
import type { CanvasTheme } from '../theme/themes'

interface EditorState {
  config: CanvasConfig
  /** 当前编辑的页面 id（不进撤销历史） */
  currentPageId: string
  selectedId: string | null
  loadedProjectId: number | null
  clipboard: CanvasComponent | null
  load: (projectId: number, config: CanvasConfig) => void
  select: (id: string | null) => void
  addPage: (name?: string) => void
  removePage: (id: string) => void
  renamePage: (id: string, name: string) => void
  switchPage: (id: string) => void
  addComponent: (type: ComponentType, placement?: { x: number; y: number; width: number; height: number }) => void
  addComponentAt: (component: CanvasComponent) => void
  updateComponent: (id: string, patch: Partial<CanvasComponent>) => void
  updateComponentProps: (id: string, props: Record<string, unknown>) => void
  updateCanvas: (patch: Partial<CanvasConfig['canvas']>) => void
  applyTheme: (theme: CanvasTheme) => void
  importComponents: (components: CanvasComponent[]) => void
  removeSelected: () => void
  removeComponent: (id: string) => void
  copySelected: () => void
  paste: () => void
  duplicateSelected: () => void
  duplicateComponent: (id: string) => void
  moveLayer: (id: string, action: 'top' | 'up' | 'down' | 'bottom') => void
  reorderLayer: (activeId: string, overId: string) => void
  toggleVisible: (id: string) => void
  toggleLocked: (id: string) => void
  addGuide: (orientation: GuideLine['orientation'], position: number) => void
  updateGuide: (id: string, position: number) => void
  removeGuide: (id: string) => void
  clearGuides: () => void
  addBlueprintNode: (kind: BlueprintNode['kind'], x?: number, y?: number) => void
  updateBlueprintNode: (id: string, patch: Partial<BlueprintNode>) => void
  moveBlueprintNode: (id: string, x: number, y: number) => void
  removeBlueprintNode: (id: string) => void
  addBlueprintEdge: (from: string, to: string) => void
  removeBlueprintEdge: (id: string) => void
  clearBlueprint: () => void
}

let preInteractionConfig: CanvasConfig | null = null

/** 交互开始/结束的自定义事件名（detail 为 boolean），供图表等非 React 逻辑监听 */
export const INTERACTION_EVENT = 'kanban:editor-interaction'

let interactionCount = 0

/** 通过 window 事件通知交互状态，避免写入 store 触发订阅与历史记录 */
function emitInteraction(active: boolean) {
  window.dispatchEvent(new CustomEvent<boolean>(INTERACTION_EVENT, { detail: active }))
}

/** 是否处于拖拽等连续交互中（自动刷新等后台写入需避开，防止打乱单步撤销语义） */
export function isInteracting() {
  return interactionCount > 0
}

/** Pause zundo tracking during a continuous interaction (drag/resize/rotate). */
export function beginInteraction() {
  preInteractionConfig = useEditorStore.getState().config
  useEditorStore.temporal.getState().pause()
  interactionCount += 1
  if (interactionCount === 1) emitInteraction(true)
}

/** Resume zundo tracking and push exactly one history entry covering the whole interaction. */
export function endInteraction() {
  const temporalStore = useEditorStore.temporal.getState()
  temporalStore.resume()
  interactionCount = Math.max(0, interactionCount - 1)
  if (interactionCount === 0) emitInteraction(false)
  if (preInteractionConfig) {
    const currentConfig = useEditorStore.getState().config
    // _handleSet 是 zundo v2.3.0 内部 API：把 partialized 的过去状态（{config}）
    // 压入 pastStates 并清空 futureStates —— 整个交互过程恰好记为一步撤销。
    // 注意必须包成 {config}（与 partialize 一致），否则 undo 会把裸 config
    // 按键合并进 store 顶层而 config 本身不变，表现为撤销无效。
    const ts = temporalStore as unknown as {
      _handleSet: (
        pastState: unknown,
        replace: unknown,
        currentState: unknown,
        deltaState?: unknown,
      ) => void
    }
    ts._handleSet({ config: preInteractionConfig }, undefined, { config: currentConfig }, undefined)
    preInteractionConfig = null
  }
}

const initialConfig = defaultCanvas()

/** 取当前编辑页（immer draft 安全；id 失效时回退第一页） */
export function currentPageOf(s: { config: CanvasConfig; currentPageId: string }): Page {
  return s.config.pages.find((p) => p.id === s.currentPageId) ?? s.config.pages[0]
}

/** 内部别名：动作内取当前页 draft */
const pageOf = currentPageOf

/** 跨页查找组件（id 全局唯一；自动刷新等场景需要命中非当前页组件） */
function findComponentAny(s: { config: CanvasConfig }, id: string): CanvasComponent | undefined {
  for (const p of s.config.pages) {
    const c = p.components.find((item) => item.id === id)
    if (c) return c
  }
  return undefined
}

export const useEditorStore = create<EditorState>()(
  temporal(
    immer((set) => ({
      config: initialConfig,
      currentPageId: initialConfig.pages[0].id,
      selectedId: null,
      loadedProjectId: null,
      clipboard: null,
      load: (projectId, config) =>
        set((s) => {
          s.loadedProjectId = projectId
          s.config = config
          s.currentPageId = config.pages[0].id
          s.selectedId = null
        }),
      addPage: (name) =>
        set((s) => {
          const p = createPage(name?.trim() || `页面 ${s.config.pages.length + 1}`)
          s.config.pages.push(p)
          s.currentPageId = p.id
          s.selectedId = null
        }),
      // 至少保留一页；删除当前页时回退到第一页
      removePage: (id) =>
        set((s) => {
          if (s.config.pages.length <= 1) return
          s.config.pages = s.config.pages.filter((p) => p.id !== id)
          if (s.currentPageId === id) s.currentPageId = s.config.pages[0].id
          s.selectedId = null
        }),
      renamePage: (id, name) =>
        set((s) => {
          const p = s.config.pages.find((item) => item.id === id)
          if (p && name.trim()) p.name = name.trim()
        }),
      switchPage: (id) =>
        set((s) => {
          if (s.config.pages.some((p) => p.id === id)) {
            s.currentPageId = id
            s.selectedId = null
          }
        }),
      select: (id) =>
        set((s) => {
          s.selectedId = id
        }),
      addComponent: (type, placement) =>
        set((s) => {
          const page = pageOf(s)
          const c = createComponent(type, page.components.length, placement)
          page.components.push(c)
          s.selectedId = c.id
        }),
      addComponentAt: (component) =>
        set((s) => {
          pageOf(s).components.push(component)
          s.selectedId = component.id
        }),
      updateComponent: (id, patch) =>
        set((s) => {
          const c = findComponentAny(s, id)
          if (c) Object.assign(c, patch)
        }),
      updateComponentProps: (id, props) =>
        set((s) => {
          const c = findComponentAny(s, id)
          if (c) c.props = { ...c.props, ...props }
        }),
      updateCanvas: (patch) =>
        set((s) => {
          s.config.canvas = { ...s.config.canvas, ...patch }
        }),
      // 套用主题：背景 + 全部页面组件主色一次提交，zundo 视为单步可撤销
      applyTheme: (theme) =>
        set((s) => {
          s.config.canvas.background = theme.background
          s.config.canvas.themeId = theme.id
          for (const p of s.config.pages) {
            for (const c of p.components) {
              if (typeof c.props.color === 'string') c.props = { ...c.props, color: theme.primary }
            }
          }
        }),
      // LADV 导入：整体替换当前页组件列表，一次 set 保证可单步撤销
      importComponents: (components) =>
        set((s) => {
          pageOf(s).components = components
          s.selectedId = null
        }),
      removeSelected: () =>
        set((s) => {
          if (!s.selectedId) return
          const page = pageOf(s)
          page.components = page.components.filter((c) => c.id !== s.selectedId)
          s.selectedId = null
        }),
      removeComponent: (id) =>
        set((s) => {
          for (const p of s.config.pages) {
            const next = p.components.filter((c) => c.id !== id)
            if (next.length !== p.components.length) {
              p.components = next
              break
            }
          }
          if (s.selectedId === id) s.selectedId = null
        }),
      copySelected: () =>
        set((s) => {
          if (!s.selectedId) return
          const c = pageOf(s).components.find((item) => item.id === s.selectedId)
          if (c) s.clipboard = JSON.parse(JSON.stringify(c)) as CanvasComponent
        }),
      paste: () =>
        set((s) => {
          if (!s.clipboard) return
          const copy = cloneComponent(s.clipboard)
          pageOf(s).components.push(copy)
          s.selectedId = copy.id
        }),
      duplicateSelected: () =>
        set((s) => {
          if (!s.selectedId) return
          const c = pageOf(s).components.find((item) => item.id === s.selectedId)
          if (c) {
            const copy = cloneComponent(c)
            pageOf(s).components.push(copy)
            s.selectedId = copy.id
          }
        }),
      duplicateComponent: (id) =>
        set((s) => {
          const c = pageOf(s).components.find((item) => item.id === id)
          if (c) {
            const copy = cloneComponent(c)
            pageOf(s).components.push(copy)
            s.selectedId = copy.id
          }
        }),
      moveLayer: (id, action) =>
        set((s) => {
          const list = pageOf(s).components
          const from = list.findIndex((item) => item.id === id)
          if (from < 0) return
          const last = list.length - 1
          // 数组末尾 = 最上层，index 0 = 最底层
          const to = action === 'top' ? last : action === 'bottom' ? 0 : action === 'up' ? from + 1 : from - 1
          if (to === from || to < 0 || to > last) return
          const [c] = list.splice(from, 1)
          list.splice(to, 0, c)
        }),
      reorderLayer: (activeId, overId) =>
        set((s) => {
          if (activeId === overId) return
          const list = pageOf(s).components
          const from = list.findIndex((item) => item.id === activeId)
          const over = list.findIndex((item) => item.id === overId)
          if (from < 0 || over < 0) return
          // 语义：active 插到 over 之后（数组中更靠后 = 层级更高，即拖到目标行上方）
          const [c] = list.splice(from, 1)
          const to = list.findIndex((item) => item.id === overId) + 1
          list.splice(to, 0, c)
        }),
      toggleVisible: (id) =>
        set((s) => {
          const c = pageOf(s).components.find((item) => item.id === id)
          if (c) c.visible = !c.visible
        }),
      toggleLocked: (id) =>
        set((s) => {
          const c = pageOf(s).components.find((item) => item.id === id)
          if (!c) return
          c.locked = !c.locked
          // 锁定后完全不可选：锁定当前选中项时清除选中态
          if (c.locked && s.selectedId === id) s.selectedId = null
        }),
      addGuide: (orientation, position) =>
        set((s) => {
          pageOf(s).guides.push({
            id: `guide_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
            orientation,
            position: Math.round(position),
          })
        }),
      updateGuide: (id, position) =>
        set((s) => {
          const g = pageOf(s).guides.find((item) => item.id === id)
          if (g) g.position = Math.round(position)
        }),
      removeGuide: (id) =>
        set((s) => {
          const page = pageOf(s)
          page.guides = page.guides.filter((g) => g.id !== id)
        }),
      clearGuides: () =>
        set((s) => {
          pageOf(s).guides = []
        }),
      // --- 蓝图编排（PRD §4.14）：每次变更单次 set = 一步撤销 ---
      addBlueprintNode: (kind, x, y) =>
        set((s) => {
          // 新节点放在已有节点右下方错开的位置，避免完全重叠
          const n = s.config.blueprint.nodes.length
          const node = createBlueprintNode(kind, x ?? 80 + (n % 4) * 220, y ?? 60 + Math.floor(n / 4) * 120)
          s.config.blueprint.nodes.push(node)
        }),
      updateBlueprintNode: (id, patch) =>
        set((s) => {
          const node = s.config.blueprint.nodes.find((item) => item.id === id)
          if (node) Object.assign(node, patch)
        }),
      moveBlueprintNode: (id, x, y) =>
        set((s) => {
          const node = s.config.blueprint.nodes.find((item) => item.id === id)
          if (node) {
            node.x = Math.round(Math.max(0, x))
            node.y = Math.round(Math.max(0, y))
          }
        }),
      removeBlueprintNode: (id) =>
        set((s) => {
          s.config.blueprint.nodes = s.config.blueprint.nodes.filter((n) => n.id !== id)
          // 连带删除与该节点相连的边
          s.config.blueprint.edges = s.config.blueprint.edges.filter((e) => e.from !== id && e.to !== id)
        }),
      addBlueprintEdge: (from, to) =>
        set((s) => {
          if (from === to) return
          const ids = new Set(s.config.blueprint.nodes.map((n) => n.id))
          if (!ids.has(from) || !ids.has(to)) return
          const exists = s.config.blueprint.edges.some((e) => e.from === from && e.to === to)
          if (exists) return
          s.config.blueprint.edges.push({
            id: `bpe_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
            from,
            to,
          })
        }),
      removeBlueprintEdge: (id) =>
        set((s) => {
          s.config.blueprint.edges = s.config.blueprint.edges.filter((e) => e.id !== id)
        }),
      clearBlueprint: () =>
        set((s) => {
          s.config.blueprint = { nodes: [], edges: [] }
        }),
    })),
    {
      partialize: (s) => ({ config: s.config }),
    },
  ),
)

export const useSelectedComponent = () =>
  useEditorStore(
    (s) =>
      (s.config.pages.find((p) => p.id === s.currentPageId) ?? s.config.pages[0]).components.find(
        (c) => c.id === s.selectedId,
      ) ?? null,
  )

/** 当前编辑页（找不到时回退第一页） */
export const useCurrentPage = () =>
  useEditorStore((s) => s.config.pages.find((p) => p.id === s.currentPageId) ?? s.config.pages[0])

// 开发环境调试钩子：浏览器控制台/自动化脚本可通过 window.__editorStore 访问编辑器状态
if (import.meta.env.DEV) {
  ;(window as unknown as Record<string, unknown>).__editorStore = useEditorStore
}
