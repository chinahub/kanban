/// <reference lib="webworker" />
// 过滤器沙箱 Worker（P2-4）：在独立线程内用 Function 执行用户代码，
// 死循环/重计算不阻塞主线程，超时由主线程 terminate 整个 Worker 兜底。

interface RunRequest {
  id: number
  code: string
  data: unknown[]
}

interface RunResponse {
  id: number
  ok: boolean
  data?: unknown[]
  error?: string
}

const ctx = self as unknown as {
  onmessage: ((e: MessageEvent<RunRequest>) => void) | null
  postMessage: (msg: RunResponse) => void
}

ctx.onmessage = (e) => {
  const { id, code, data } = e.data
  try {
    const fn = new Function('data', '"use strict";\n' + code) as (d: unknown[]) => unknown
    const out = fn(data)
    if (Array.isArray(out)) {
      ctx.postMessage({ id, ok: true, data: out })
    } else if (out == null) {
      ctx.postMessage({ id, ok: true, data: [] })
    } else {
      ctx.postMessage({ id, ok: false, error: '过滤器需返回数组，实际返回 ' + typeof out })
    }
  } catch (err) {
    ctx.postMessage({ id, ok: false, error: (err as Error).message })
  }
}
