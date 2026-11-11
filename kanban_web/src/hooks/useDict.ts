import { useEffect, useMemo } from 'react'
import { useDictStore } from '../store/dictStore'
import type { SysDictItem } from '../types'

/** 字典项 ext_json 解析结果（color / defaultPort / disabled 等扩展属性） */
export type DictExt = Record<string, unknown>

export interface DictOption {
  value: string
  label: string
  disabled?: boolean
}

/** 解析字典项的 ext_json；非法内容返回空对象 */
export function parseExt(extJson: string | null | undefined): DictExt {
  if (!extJson) return {}
  try {
    const v: unknown = JSON.parse(extJson)
    return typeof v === 'object' && v !== null ? (v as DictExt) : {}
  } catch {
    return {}
  }
}

/**
 * 取一个字典类型的可用选项（渐进增强：字典未加载/加载失败时返回空，
 * 由调用方回落到内置硬编码兜底；未登录的分享页不会触发请求）。
 */
export function useDict(dictType: string) {
  const dicts = useDictStore((s) => s.dicts)
  const loading = useDictStore((s) => s.loading)
  const fetchOnce = useDictStore((s) => s.fetchOnce)

  useEffect(() => {
    fetchOnce().catch(() => undefined)
  }, [fetchOnce])

  return useMemo(() => {
    const dict = dicts?.find((d) => d.dictType === dictType)
    const bySort = (a: SysDictItem, b: SysDictItem) =>
      a.sortOrder - b.sortOrder || a.value.localeCompare(b.value)
    const options: DictOption[] = (dict?.items ?? [])
      .filter((i) => i.enabled)
      .slice()
      .sort(bySort)
      .map((i) => {
        const ext = parseExt(i.extJson)
        return ext.disabled === true ? { value: i.value, label: i.label, disabled: true } : { value: i.value, label: i.label }
      })
    // labelMap / extMap 含停用项：历史存量数据（画布 JSON 里的 value）仍能取到 label
    const labelMap: Record<string, string> = {}
    const extMap: Record<string, DictExt> = {}
    for (const i of dict?.items ?? []) {
      labelMap[i.value] = i.label
      extMap[i.value] = parseExt(i.extJson)
    }
    return { options, labelMap, extMap, loading }
  }, [dicts, dictType, loading])
}
