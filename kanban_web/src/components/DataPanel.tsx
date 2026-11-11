import { useEffect, useState } from 'react'
import { App as AntdApp, Button, Form, Input, InputNumber, Segmented, Select, Space } from 'antd'
import { DatabaseOutlined, FilterOutlined, ReloadOutlined } from '@ant-design/icons'
import { useEditorStore, useSelectedComponent } from '../store/editorStore'
import { useEffectiveFilterCode, useFilterStore } from '../store/filterStore'
import { defaultData, type ComponentType } from '../types/editor'
import { dataSetApi } from '../api'
import { runFilterAsync, type FilterRunResult } from '../util/filterRunner'
import type { ApiError, DataSet } from '../types'
import DataSourceDrawer from './DataSourceDrawer'
import FilterDrawer from './FilterDrawer'

// v1 数据绑定的图表类型（对应 PRD §4.2.5）
const DATA_BOUND_CHART_TYPES: ComponentType[] = [
  'line', 'bar', 'pie', 'area', 'scatter', 'radar', 'funnel', 'rose',
  'barh', 'barGroup', 'barStack', 'ring', 'lineMulti', 'areaStack',
  'barPercent', 'barhGroup', 'barhStack', 'lineStep',
  'barhPercent', 'areaPercent', 'scatterBubble', 'barRange', 'barWaterfall',
  'lineDual', 'pieNest', 'dualLineBar',
  'tableKv', 'tableCarousel', 'tableProgress',
  'wordcloud', 'relationTree', 'relationSankey', 'relationChord', 'treemap', 'yujue',
  'mapChina', 'mapWorld', 'mapRegion',
  'mapFlight', 'mapScatter',
  'doubleBar', 'contrastBar', 'multiStack',
  'tableCarouselBar', 'tablePivot',
]
// 不需要数据的组件：标题/文本由 props.text 控制，翻牌器/时间器/仪表盘等由 props 控制
const NON_DATA_TYPES: ComponentType[] = [
  'title', 'text', 'flipper', 'timer', 'gauge',
  'label', 'countdown', 'marquee', 'statusCard', 'bizTrend',
  'image', 'carousel', 'colorBlock', 'bgBlock', 'video', 'audio',
  'borderBox', 'decoration', 'decorationBar',
  'btn', 'selectDropdown', 'selectRadio', 'selectCheckbox', 'selectSwitch', 'inputBasic', 'inputSlider',
  'liquid',
  'selectDate', 'inputSearch', 'navTabs', 'navMenu', 'navBreadcrumb',
  'dataProgress', 'dataSteps', 'dataTimeline', 'btnIcon', 'icon',
  'gallery', 'logoWall', 'arrowPlot',
  'streamPlayer', 'rtmpPlayer',
  'earth3d', 'map3dChina', 'map3dWorld', 'city3d',
]

const stringify = (data: unknown) => {
  try {
    return JSON.stringify(data ?? [], null, 2)
  } catch {
    return '[]'
  }
}

type Mode = 'static' | 'source'

function safeParseArray(raw: string | null | undefined): unknown[] {
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export default function DataPanel() {
  const selected = useSelectedComponent()
  const update = useEditorStore((s) => s.updateComponent)
  const updateProps = useEditorStore((s) => s.updateComponentProps)
  const { message } = AntdApp.useApp()

  const [text, setText] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [mode, setMode] = useState<Mode>('static')
  const [datasets, setDatasets] = useState<DataSet[]>([])
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [filterDrawerOpen, setFilterDrawerOpen] = useState(false)

  const boundId = (selected?.props.dataSetId as number | undefined) ?? undefined
  const filters = useFilterStore((s) => s.filters)
  const loadFilters = useFilterStore((s) => s.load)
  const filterId = (selected?.props.filterId as number | undefined) ?? undefined
  const filterCode = useEffectiveFilterCode(filterId)

  const loadDatasets = async () => {
    try {
      setDatasets(await dataSetApi.list())
    } catch (e) {
      message.error((e as ApiError).message || '加载数据集失败')
    }
  }

  // 切换选中组件时，按当前 props 决定模式：未绑定数据集走静态、已绑定走数据源
  useEffect(() => {
    setText(stringify(selected?.data ?? []))
    setError(null)
    setMode(boundId != null ? 'source' : 'static')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected?.id])

  // 选中期间经撤销/重做等外部途径改变 data 时同步 textarea（§6.3 修复）；
  // 用户正在输入的非法 JSON 不覆盖，避免打断编辑
  const selectedData = selected?.data
  useEffect(() => {
    setText((cur) => {
      try {
        const parsed = cur.trim() === '' ? [] : JSON.parse(cur)
        if (JSON.stringify(parsed) === JSON.stringify(selectedData ?? [])) return cur
      } catch {
        return cur
      }
      return stringify(selectedData ?? [])
    })
  }, [selectedData])

  useEffect(() => {
    if (mode === 'source') loadDatasets()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode])

  if (!selected) {
    return <div className="placeholder">选中图表组件以配置数据</div>
  }
  if (NON_DATA_TYPES.includes(selected.type)) {
    return <div className="placeholder">文本 / 标题组件无需数据配置。</div>
  }
  if (!DATA_BOUND_CHART_TYPES.includes(selected.type)) {
    return <div className="placeholder">该组件类型不支持数据绑定</div>
  }

  const apply = (val: string) => {
    setText(val)
    const trimmed = val.trim()
    if (trimmed === '') {
      setError(null)
      update(selected.id, { data: [] })
      return
    }
    try {
      const parsed = JSON.parse(trimmed)
      if (!Array.isArray(parsed)) {
        setError('数据需为 JSON 数组')
        return
      }
      setError(null)
      update(selected.id, { data: parsed })
    } catch (e) {
      setError((e as Error).message)
    }
  }

  const format = () => {
    try {
      setText(stringify(JSON.parse(text)))
      setError(null)
    } catch (e) {
      setError((e as Error).message)
    }
  }

  const reset = () => {
    setText(stringify(defaultData))
    setError(null)
    update(selected.id, { data: defaultData })
  }

  const bindDataset = (id: number | undefined) => {
    updateProps(selected.id, { dataSetId: id })
  }

  const refreshData = async () => {
    if (boundId == null) return
    setRefreshing(true)
    try {
      const ds = await dataSetApi.refresh(boundId)
      update(selected.id, { data: safeParseArray(ds.data) })
      message.success('已拉取最新数据')
    } catch (e) {
      message.error((e as ApiError).message || '拉取失败')
    } finally {
      setRefreshing(false)
    }
  }

  const bindFilter = (id: number | undefined) => {
    updateProps(selected.id, { filterId: id })
  }

  // 过滤器预览（受控模式用生效快照，Worker 沙箱异步执行；报错仅提示，不中断该组件）
  const [filterResult, setFilterResult] = useState<FilterRunResult | null>(null)
  useEffect(() => {
    if (!filterCode) {
      setFilterResult(null)
      return
    }
    let cancelled = false
    void runFilterAsync(filterCode, selected.data ?? []).then((r) => {
      if (!cancelled) setFilterResult(r)
    })
    return () => {
      cancelled = true
    }
  }, [filterCode, selected.data])
  const filterError =
    filterResult && !filterResult.ok ? filterResult.error ?? '过滤器执行失败' : null

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <Segmented
          size="small"
          value={mode}
          onChange={(v) => {
            const m = String(v) as Mode
            setMode(m)
            if (m === 'source') {
              if (boundId == null) loadDatasets()
            } else {
              if (boundId != null) updateProps(selected.id, { dataSetId: undefined })
              setText(stringify(selected.data ?? []))
            }
          }}
          options={[
            { label: '静态数据', value: 'static' },
            { label: '数据源', value: 'source' },
          ]}
        />
        <Button size="small" icon={<DatabaseOutlined />} onClick={() => setDrawerOpen(true)}>
          数据源
        </Button>
      </div>

      {mode === 'static' ? (
        <Form layout="vertical" className="prop-form">
          <Form.Item
            label="静态数据（JSON 数组）"
            validateStatus={error ? 'error' : ''}
            help={error ?? '数组元素形如 { "name": "Mon", "value": 120 }'}
          >
            <Input.TextArea
              value={text}
              onChange={(e) => apply(e.target.value)}
              autoSize={{ minRows: 10, maxRows: 22 }}
              spellCheck={false}
              style={{ fontFamily: 'monospace', fontSize: 12 }}
              placeholder='[{"name":"Mon","value":120}]'
            />
          </Form.Item>
          <Space>
            <Button size="small" onClick={format}>
              格式化
            </Button>
            <Button size="small" onClick={reset}>
              恢复示例
            </Button>
          </Space>
        </Form>
      ) : (
        <Form layout="vertical" className="prop-form">
          <Form.Item
            label="绑定数据集"
            help={boundId != null ? undefined : '选择数据集后点击"拉取数据"注入图表'}
          >
            <Select
              value={boundId}
              placeholder="选择数据集"
              allowClear
              onChange={(v) => bindDataset(v == null ? undefined : Number(v))}
              options={datasets.map((d) => ({ value: d.id, label: d.name }))}
            />
          </Form.Item>
          <Button
            size="small"
            type="primary"
            icon={<ReloadOutlined />}
            loading={refreshing}
            disabled={boundId == null}
            onClick={refreshData}
          >
            拉取数据
          </Button>
          <Form.Item
            label="自动刷新间隔（秒）"
            style={{ marginTop: 12 }}
            help="0 或留空表示不自动刷新；仅编辑器内生效，分享页展示快照"
          >
            <InputNumber
              min={0}
              max={3600}
              style={{ width: '100%' }}
              placeholder="0 = 关闭"
              disabled={boundId == null}
              value={Number(selected.props.autoRefreshSec) || 0}
              onChange={(v) => updateProps(selected.id, { autoRefreshSec: v && v > 0 ? v : undefined })}
            />
          </Form.Item>
          <Input.TextArea
            value={stringify(selected.data ?? [])}
            autoSize={{ minRows: 6, maxRows: 16 }}
            readOnly
            style={{ fontFamily: 'monospace', fontSize: 12, marginTop: 12 }}
          />
        </Form>
      )}

      <Form layout="vertical" className="prop-form" style={{ marginTop: 12 }}>
        <Form.Item
          label="过滤器（对数据应用 JS 转换，实时生效）"
          validateStatus={filterError ? 'error' : ''}
          help={
            filterError
              ? filterError
              : filterId != null
                ? '已绑定，图表渲染过滤后的数据'
                : '可选：图表将渲染过滤后的数据'
          }
        >
          <div style={{ display: 'flex', gap: 8 }}>
            <Select
              value={filterId}
              placeholder="选择过滤器"
              allowClear
              onChange={(v) => bindFilter(v == null ? undefined : Number(v))}
              options={filters.map((f) => ({ value: f.id, label: f.name }))}
              style={{ flex: 1 }}
            />
            <Button size="small" icon={<FilterOutlined />} onClick={() => setFilterDrawerOpen(true)}>
              管理
            </Button>
          </div>
        </Form.Item>
        {filterId != null && filterResult?.ok && filterResult.data && (
          <Input.TextArea
            value={stringify(filterResult.data.slice(0, 5))}
            autoSize={{ minRows: 3, maxRows: 8 }}
            readOnly
            style={{ fontFamily: 'monospace', fontSize: 12 }}
          />
        )}
      </Form>

      <DataSourceDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} onChanged={loadDatasets} />
      <FilterDrawer
        open={filterDrawerOpen}
        onClose={() => {
          setFilterDrawerOpen(false)
          loadFilters()
        }}
      />
    </div>
  )
}
