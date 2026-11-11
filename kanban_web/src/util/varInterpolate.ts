import type { GlobalVariable } from '../types'

const VAR_RE = /\{\{\s*var\.([a-zA-Z_]\w*)\s*\}\}/g
const CTX_RE = /\{\{\s*ctx\.(name|value|series)\s*\}\}/g

/** 图表/地图点击上下文：钻取参数与链接插值用 */
export interface ClickContext {
  name?: string
  value?: string | number
  series?: string
}

/** 将文本中的 {{var.name}} 替换为对应全局变量值，未定义则保留原样。 */
export function interpolateVars(text: string, variables: GlobalVariable[]): string {
  if (!text) return text
  if (!variables.length) return text
  return text.replace(VAR_RE, (m, name: string) => {
    const v = variables.find((x) => x.name === name)
    return v ? v.value ?? '' : m
  })
}

/** 将文本中的 {{ctx.name}}/{{ctx.value}}/{{ctx.series}} 替换为点击上下文值，无上下文则保留原样。 */
export function interpolateCtx(text: string, ctx: ClickContext | null): string {
  if (!text || !ctx) return text
  return text.replace(CTX_RE, (m, key: keyof ClickContext) => {
    const v = ctx[key]
    return v == null ? m : String(v)
  })
}

/** 运行态插值：先 var 后 ctx（钻取参数、openUrl 链接共用） */
export function interpolateRuntime(text: string, variables: GlobalVariable[], ctx: ClickContext | null): string {
  return interpolateCtx(interpolateVars(text, variables), ctx)
}
