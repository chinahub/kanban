import { useEditorStore } from './editorStore'
import { parseCanvasConfig, type CanvasConfig } from '../types/editor'

const KEY = (projectId: number) => `kanban:editor:${projectId}`

export interface EditorSnapshot {
  config: CanvasConfig
  pastStates: unknown[]
  futureStates: unknown[]
  ts: number
}

/** 持久化当前画布 + zundo 历史（未保存草稿与撤销/重做栈）到 localStorage，按项目隔离。 */
export function saveHistory(projectId: number) {
  try {
    const state = useEditorStore.getState()
    const temporal = useEditorStore.temporal.getState()
    const snap: EditorSnapshot = {
      config: state.config,
      pastStates: temporal.pastStates as unknown[],
      futureStates: temporal.futureStates as unknown[],
      ts: Date.now(),
    }
    localStorage.setItem(KEY(projectId), JSON.stringify(snap))
  } catch {
    // 配额/序列化失败 — 忽略
  }
}

export function loadHistory(projectId: number): EditorSnapshot | null {
  try {
    const raw = localStorage.getItem(KEY(projectId))
    if (!raw) return null
    const snap = JSON.parse(raw) as EditorSnapshot
    // v1 草稿（组件挂在配置顶层，无 pages）：迁移为单页 v2；旧撤销栈是 v1 partial，一并丢弃
    if (!snap.config || !Array.isArray((snap.config as { pages?: unknown }).pages)) {
      return {
        ...snap,
        config: parseCanvasConfig(
          JSON.stringify(snap.config ?? null),
          snap.config?.canvas?.width ?? 1920,
          snap.config?.canvas?.height ?? 1080,
        ),
        pastStates: [],
        futureStates: [],
      }
    }
    return snap
  } catch {
    return null
  }
}

export function clearHistory(projectId: number) {
  try {
    localStorage.removeItem(KEY(projectId))
  } catch {
    // ignore
  }
}

export function applyHistoryTemporal(snap: EditorSnapshot) {
  try {
    useEditorStore.temporal.setState({
      pastStates: snap.pastStates as never,
      futureStates: snap.futureStates as never,
    })
  } catch {
    // 恢复失败 — 忽略，保持空历史
  }
}
