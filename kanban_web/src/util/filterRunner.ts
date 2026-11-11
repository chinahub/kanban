export interface FilterRunResult {
  ok: boolean
  data?: unknown[]
  error?: string
}

// --- Web Worker 沙箱（P2-4）：异步执行，超时可终止，不阻塞主线程 ---
// code 为函数体，入参 data（原始数组），需 return 结构化数组；QuickJS 后置（dev doc §5）。

const WORKER_TIMEOUT_MS = 3000

interface PendingRun {
  resolve: (r: FilterRunResult) => void
  timer: ReturnType<typeof setTimeout>
}

let worker: Worker | null = null
let seq = 0
const pending = new Map<number, PendingRun>()

/** 终止当前 Worker 并拒绝其所有挂起请求（超时或 Worker 级错误时调用） */
function killWorker(error: string) {
  const w = worker
  worker = null
  w?.terminate()
  for (const [, p] of pending) {
    clearTimeout(p.timer)
    p.resolve({ ok: false, error })
  }
  pending.clear()
}

function ensureWorker(): Worker {
  if (worker) return worker
  const w = new Worker(new URL('./filterWorker.ts', import.meta.url), { type: 'module' })
  w.onmessage = (e: MessageEvent<{ id: number; ok: boolean; data?: unknown[]; error?: string }>) => {
    const { id, ok, data, error } = e.data
    const p = pending.get(id)
    if (!p) return
    pending.delete(id)
    clearTimeout(p.timer)
    p.resolve({ ok, data, error })
  }
  w.onerror = (e) => {
    killWorker(e.message || '过滤器 Worker 异常')
  }
  worker = w
  return w
}

/**
 * 在 Web Worker 中异步执行过滤器。超时（默认 3s）判定为死循环/重计算，
 * 直接 terminate Worker（JS 无法中断执行中的同步代码，只能整体杀掉）并返回错误。
 */
export function runFilterAsync(code: string, data: unknown[], timeoutMs = WORKER_TIMEOUT_MS): Promise<FilterRunResult> {
  if (!code || !code.trim()) return Promise.resolve({ ok: true, data })
  return new Promise((resolve) => {
    const w = ensureWorker()
    const id = ++seq
    const timer = setTimeout(() => {
      killWorker(`过滤器执行超时（>${timeoutMs}ms），已终止`)
      resolve({ ok: false, error: `过滤器执行超时（>${timeoutMs}ms），已终止` })
    }, timeoutMs)
    // killWorker 可能已清空 pending 并 resolve；此处再 set 无冲突（id 单调递增）
    pending.set(id, { resolve, timer })
    w.postMessage({ id, code, data })
  })
}

export const DEFAULT_FILTER_CODE = `// 入参 data（原始数组），return 结构化数组
// 示例：重命名为图表所需的 name/value
return data.map((d) => ({
  name: d.name,
  value: Number(d.value) || 0,
}))`
