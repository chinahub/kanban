import { useMemo, useState } from 'react'
import { Input, Tooltip } from 'antd'
import { SearchOutlined } from '@ant-design/icons'
import type { ComponentType } from '../types/editor'
import { LIBRARY, THUMB_KEYS, type ChartThumbKind, type LibraryItem } from './componentLibrary'

interface ComponentLibraryPanelProps {
  /** 点击卡片添加组件到画布 */
  onAdd: (type: ComponentType) => void
}

/** 搜索命中结果：携带分类路径，便于在扁平结果集中展示来源 */
interface SearchHit {
  item: LibraryItem
  categoryLabel: string
  subLabel: string
}

const ALL_SUB = '__all__'

/**
 * DataV 风格组件库面板：一级分类图标栏 + 二级分类列表 + 组件卡片网格 + 关键词搜索。
 * 已接入渲染引擎的组件（type 非空）可点击/拖拽添加到画布，其余组件展示为"待接入"。
 */
export default function ComponentLibraryPanel({ onAdd }: ComponentLibraryPanelProps) {
  const [activeCategory, setActiveCategory] = useState(LIBRARY[0].key)
  const [activeSub, setActiveSub] = useState(ALL_SUB)
  const [keyword, setKeyword] = useState('')

  const category = LIBRARY.find((c) => c.key === activeCategory) ?? LIBRARY[0]
  // 只有一个"全部"子分类时（信息/表格/媒体/其他），隐藏子分类列
  const showSubs = category.subs.length > 1

  const visibleItems = useMemo(() => {
    if (activeSub === ALL_SUB) return category.subs.flatMap((s) => s.items)
    return category.subs.find((s) => s.key === activeSub)?.items ?? []
  }, [category, activeSub])

  const hits = useMemo<SearchHit[]>(() => {
    const kw = keyword.trim().toLowerCase()
    if (!kw) return []
    const result: SearchHit[] = []
    for (const cat of LIBRARY) {
      for (const sub of cat.subs) {
        for (const item of sub.items) {
          if (item.label.toLowerCase().includes(kw)) {
            result.push({ item, categoryLabel: cat.label, subLabel: cat.subs.length > 1 ? sub.label : '' })
          }
        }
      }
    }
    return result
  }, [keyword])

  const searching = keyword.trim().length > 0

  const selectCategory = (key: string) => {
    setActiveCategory(key)
    setActiveSub(ALL_SUB)
  }

  return (
    <div className="clp">
      <div className="clp-search">
        <Input
          allowClear
          size="small"
          prefix={<SearchOutlined />}
          placeholder="搜索组件名称"
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
        />
      </div>
      {searching ? (
        <div className="clp-grid">
          {hits.length === 0 && <div className="clp-empty">未找到匹配的组件</div>}
          {hits.map((h) => (
            <LibraryCard key={h.item.key} item={h.item} onAdd={onAdd} trail={h.subLabel ? `${h.categoryLabel} / ${h.subLabel}` : h.categoryLabel} />
          ))}
        </div>
      ) : (
        <div className="clp-body">
          <nav className="clp-cats">
            {LIBRARY.map((cat) => {
              const CatIcon = cat.icon
              return (
                <Tooltip key={cat.key} title={cat.label} placement="right">
                  <button
                    className={cat.key === activeCategory ? 'clp-cat active' : 'clp-cat'}
                    onClick={() => selectCategory(cat.key)}
                  >
                    <CatIcon className="clp-cat-icon" />
                    <span>{cat.label}</span>
                  </button>
                </Tooltip>
              )
            })}
          </nav>
          {showSubs && (
            <nav className="clp-subs">
              <button className={activeSub === ALL_SUB ? 'clp-sub active' : 'clp-sub'} onClick={() => setActiveSub(ALL_SUB)}>
                全部
              </button>
              {category.subs.map((sub) => (
                <button
                  key={sub.key}
                  className={activeSub === sub.key ? 'clp-sub active' : 'clp-sub'}
                  onClick={() => setActiveSub(sub.key)}
                >
                  {sub.label}
                </button>
              ))}
            </nav>
          )}
          <div className="clp-grid">
            {visibleItems.map((item) => (
              <LibraryCard key={item.key} item={item} onAdd={onAdd} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

/** 单个组件卡片：缩略图 + 名称；未接入的组件禁用并标记"待接入" */
function LibraryCard({ item, onAdd, trail }: { item: LibraryItem; onAdd: (type: ComponentType) => void; trail?: string }) {
  const disabled = !item.type
  const Icon = item.icon
  const hasThumb = THUMB_KEYS.has(item.key)
  const card = (
    <button
      className={disabled ? 'clp-card disabled' : 'clp-card'}
      draggable={!disabled}
      onClick={() => {
        if (!disabled && item.type) onAdd(item.type)
      }}
      onDragStart={(e) => {
        if (!item.type) return
        e.dataTransfer.setData('application/x-kanban-component', item.type)
        e.dataTransfer.effectAllowed = 'copy'
      }}
    >
      <span className="clp-thumb">
        {hasThumb ? (
          <img src={`/thumbs/${item.key}.png`} alt={item.label} loading="lazy" />
        ) : item.chart ? (
          <ChartThumb kind={item.chart} />
        ) : Icon ? (
          <Icon className="clp-thumb-icon" />
        ) : null}
      </span>
      <span className="clp-label">{item.label}</span>
      {trail && <span className="clp-trail">{trail}</span>}
      {disabled && <span className="clp-badge">待接入</span>}
    </button>
  )
  return disabled ? <Tooltip title="该组件将在后续版本接入">{card}</Tooltip> : card
}

/** 图表缩略图：内联 SVG 迷你预览图（颜色取自 CSS currentColor） */
function ChartThumb({ kind }: { kind: ChartThumbKind }) {
  switch (kind) {
    case 'bar':
      return (
        <svg viewBox="0 0 96 60" fill="currentColor" stroke="currentColor">
          <rect x="14" y="26" width="10" height="26" />
          <rect x="32" y="14" width="10" height="38" />
          <rect x="50" y="22" width="10" height="30" />
          <rect x="68" y="8" width="10" height="44" />
        </svg>
      )
    case 'line':
      return (
        <svg viewBox="0 0 96 60" fill="currentColor" stroke="currentColor">
          <polyline points="12,44 30,28 48,34 66,16 84,22" fill="none" strokeWidth="2.5" />
          <circle cx="30" cy="28" r="2.5" />
          <circle cx="48" cy="34" r="2.5" />
          <circle cx="66" cy="16" r="2.5" />
        </svg>
      )
    case 'area':
      return (
        <svg viewBox="0 0 96 60" fill="currentColor" stroke="currentColor">
          <path d="M12 44 L30 30 L48 36 L66 18 L84 26 L84 52 L12 52 Z" fillOpacity="0.35" stroke="none" />
          <polyline points="12,44 30,30 48,36 66,18 84,26" fill="none" strokeWidth="2" />
        </svg>
      )
    case 'pie':
      return (
        <svg viewBox="0 0 96 60" fill="currentColor" stroke="currentColor">
          <circle cx="48" cy="30" r="15" fill="none" strokeWidth="10" strokeOpacity="0.35" />
          <circle cx="48" cy="30" r="15" fill="none" strokeWidth="10" strokeDasharray="56.5 37.7" transform="rotate(-90 48 30)" />
        </svg>
      )
    case 'scatter':
      return (
        <svg viewBox="0 0 96 60" fill="currentColor" stroke="currentColor">
          <circle cx="20" cy="42" r="4" />
          <circle cx="36" cy="26" r="5" />
          <circle cx="52" cy="36" r="3.5" />
          <circle cx="66" cy="16" r="6" />
          <circle cx="80" cy="32" r="4" />
        </svg>
      )
    case 'radar':
      return (
        <svg viewBox="0 0 96 60" fill="currentColor" stroke="currentColor">
          <polygon points="48,8 70,19 70,41 48,52 26,41 26,19" fill="none" strokeWidth="1.5" strokeOpacity="0.4" />
          <polygon points="48,16 62,23 60,38 48,46 34,38 32,24" fillOpacity="0.35" strokeWidth="1.5" />
        </svg>
      )
    case 'funnel':
      return (
        <svg viewBox="0 0 96 60" fill="currentColor" stroke="currentColor">
          <polygon points="20,10 76,10 66,24 30,24" />
          <polygon points="30,27 66,27 58,40 38,40" fillOpacity="0.7" />
          <polygon points="38,43 58,43 52,54 44,54" fillOpacity="0.45" />
        </svg>
      )
    case 'rose':
      return (
        <svg viewBox="0 0 96 60" fill="currentColor" stroke="currentColor">
          <path d="M48 30 L48 8 A22 22 0 0 1 67 19 Z" />
          <path d="M48 30 L70 30 A22 22 0 0 1 60 48 Z" fillOpacity="0.7" />
          <path d="M48 30 L37 48 A22 22 0 0 1 26 34 Z" fillOpacity="0.45" />
        </svg>
      )
  }
}
