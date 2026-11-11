import { useState } from 'react'
import type { ReactNode } from 'react'
import { Dropdown, Input, Typography } from 'antd'
import type { MenuProps } from 'antd'
import {
  AimOutlined,
  AreaChartOutlined,
  AudioOutlined,
  BarChartOutlined,
  BgColorsOutlined,
  BlockOutlined,
  BorderOutlined,
  CheckSquareOutlined,
  ClockCircleOutlined,
  CompassOutlined,
  ControlOutlined,
  DotChartOutlined,
  DownSquareOutlined,
  EditOutlined,
  EyeInvisibleOutlined,
  EyeOutlined,
  FieldNumberOutlined,
  FieldTimeOutlined,
  FileTextOutlined,
  FontSizeOutlined,
  FunnelPlotOutlined,
  IdcardOutlined,
  LineChartOutlined,
  LockOutlined,
  MinusOutlined,
  NotificationOutlined,
  OrderedListOutlined,
  PictureOutlined,
  PieChartOutlined,
  PoweroffOutlined,
  RadarChartOutlined,
  RiseOutlined,
  SkinOutlined,
  SlidersOutlined,
  TableOutlined,
  TagOutlined,
  UnlockOutlined,
  VideoCameraOutlined,
  CloudOutlined,
  NodeIndexOutlined,
  SwapOutlined,
  DeploymentUnitOutlined,
  EnvironmentOutlined,
  GlobalOutlined,
  SearchOutlined,
  SendOutlined,
  MenuOutlined,
  FlagOutlined,
  PlayCircleOutlined,
  StarOutlined,
} from '@ant-design/icons'
import { useCurrentPage, useEditorStore } from '../store/editorStore'
import type { ComponentType } from '../types/editor'

const TYPE_ICONS: Record<ComponentType, ReactNode> = {
  title: <FontSizeOutlined />,
  text: <FileTextOutlined />,
  line: <LineChartOutlined />,
  bar: <BarChartOutlined />,
  pie: <PieChartOutlined />,
  area: <AreaChartOutlined />,
  scatter: <DotChartOutlined />,
  radar: <RadarChartOutlined />,
  funnel: <FunnelPlotOutlined />,
  rose: <CompassOutlined />,
  barh: <BarChartOutlined />,
  barGroup: <BarChartOutlined />,
  barStack: <BarChartOutlined />,
  ring: <PieChartOutlined />,
  lineMulti: <LineChartOutlined />,
  areaStack: <AreaChartOutlined />,
  barPercent: <BarChartOutlined />,
  barhGroup: <BarChartOutlined />,
  barhStack: <BarChartOutlined />,
  lineStep: <LineChartOutlined />,
  barhPercent: <BarChartOutlined />,
  areaPercent: <AreaChartOutlined />,
  scatterBubble: <DotChartOutlined />,
  barRange: <BarChartOutlined />,
  barWaterfall: <BarChartOutlined />,
  lineDual: <LineChartOutlined />,
  pieNest: <PieChartOutlined />,
  gauge: <CompassOutlined />,
  dualLineBar: <BarChartOutlined />,
  flipper: <FieldNumberOutlined />,
  timer: <ClockCircleOutlined />,
  label: <TagOutlined />,
  countdown: <FieldTimeOutlined />,
  marquee: <NotificationOutlined />,
  statusCard: <IdcardOutlined />,
  bizTrend: <RiseOutlined />,
  image: <PictureOutlined />,
  carousel: <PictureOutlined />,
  colorBlock: <BgColorsOutlined />,
  bgBlock: <BlockOutlined />,
  video: <VideoCameraOutlined />,
  audio: <AudioOutlined />,
  borderBox: <BorderOutlined />,
  decoration: <SkinOutlined />,
  decorationBar: <MinusOutlined />,
  tableKv: <TableOutlined />,
  tableCarousel: <OrderedListOutlined />,
  tableProgress: <TableOutlined />,
  btn: <PoweroffOutlined />,
  selectDropdown: <DownSquareOutlined />,
  selectRadio: <CheckSquareOutlined />,
  selectCheckbox: <CheckSquareOutlined />,
  selectSwitch: <ControlOutlined />,
  inputBasic: <EditOutlined />,
  inputSlider: <SlidersOutlined />,
  wordcloud: <CloudOutlined />,
  relationTree: <NodeIndexOutlined />,
  relationSankey: <SwapOutlined />,
  relationChord: <DeploymentUnitOutlined />,
  treemap: <BlockOutlined />,
  yujue: <PieChartOutlined />,
  liquid: <CompassOutlined />,
  mapChina: <EnvironmentOutlined />,
  mapWorld: <GlobalOutlined />,
  mapRegion: <EnvironmentOutlined />,
  mapFlight: <SendOutlined />,
  mapScatter: <AimOutlined />,
  doubleBar: <BarChartOutlined />,
  contrastBar: <BarChartOutlined />,
  multiStack: <AreaChartOutlined />,
  selectDate: <ClockCircleOutlined />,
  inputSearch: <SearchOutlined />,
  navTabs: <MenuOutlined />,
  navMenu: <MenuOutlined />,
  navBreadcrumb: <MenuOutlined />,
  dataProgress: <MinusOutlined />,
  dataSteps: <OrderedListOutlined />,
  dataTimeline: <FieldTimeOutlined />,
  btnIcon: <PoweroffOutlined />,
  icon: <StarOutlined />,
  gallery: <PictureOutlined />,
  logoWall: <FlagOutlined />,
  arrowPlot: <NodeIndexOutlined />,
  tableCarouselBar: <BarChartOutlined />,
  tablePivot: <TableOutlined />,
  streamPlayer: <PlayCircleOutlined />,
  rtmpPlayer: <VideoCameraOutlined />,
  earth3d: <GlobalOutlined />,
  map3dChina: <EnvironmentOutlined />,
  map3dWorld: <GlobalOutlined />,
  city3d: <DeploymentUnitOutlined />,
}

const LAYER_MENU: MenuProps['items'] = [
  { key: 'top', label: '置顶' },
  { key: 'up', label: '上移一层' },
  { key: 'down', label: '下移一层' },
  { key: 'bottom', label: '置底' },
  { type: 'divider' },
  { key: 'duplicate', label: '复制' },
  { key: 'delete', label: '删除', danger: true },
]

export default function LayerPanel() {
  const components = useCurrentPage().components
  const selectedId = useEditorStore((s) => s.selectedId)
  const select = useEditorStore((s) => s.select)
  const updateComponent = useEditorStore((s) => s.updateComponent)
  const removeComponent = useEditorStore((s) => s.removeComponent)
  const duplicateComponent = useEditorStore((s) => s.duplicateComponent)
  const moveLayer = useEditorStore((s) => s.moveLayer)
  const reorderLayer = useEditorStore((s) => s.reorderLayer)
  const toggleVisible = useEditorStore((s) => s.toggleVisible)
  const toggleLocked = useEditorStore((s) => s.toggleLocked)

  const [dragId, setDragId] = useState<string | null>(null)
  const [overId, setOverId] = useState<string | null>(null)
  const [renamingId, setRenamingId] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState('')

  const commitRename = () => {
    if (renamingId) {
      const name = renameValue.trim()
      if (name) updateComponent(renamingId, { name })
    }
    setRenamingId(null)
  }

  const onMenuClick = (id: string, key: string) => {
    if (key === 'top' || key === 'up' || key === 'down' || key === 'bottom') moveLayer(id, key)
    else if (key === 'duplicate') duplicateComponent(id)
    else if (key === 'delete') removeComponent(id)
  }

  if (components.length === 0) {
    return (
      <div className="layer-list">
        <Typography.Text type="secondary" className="layer-empty">暂无组件，从组件库添加</Typography.Text>
      </div>
    )
  }

  // 列表顶部 = 最上层（数组倒序展示）
  return (
    <div className="layer-list">
      {[...components].reverse().map((c) => {
        const classNames = ['layer-item']
        if (c.id === selectedId) classNames.push('selected')
        if (c.locked) classNames.push('locked')
        if (!c.visible) classNames.push('hidden')
        if (c.id === overId && c.id !== dragId) classNames.push('drag-over')

        const row = (
          <div
            key={c.id}
            className={classNames.join(' ')}
            draggable={renamingId !== c.id}
            onClick={() => {
              if (!c.locked) select(c.id)
            }}
            onDragStart={(e) => {
              setDragId(c.id)
              e.dataTransfer.effectAllowed = 'move'
            }}
            onDragOver={(e) => {
              e.preventDefault()
              e.dataTransfer.dropEffect = 'move'
              if (overId !== c.id) setOverId(c.id)
            }}
            onDragLeave={() => {
              if (overId === c.id) setOverId(null)
            }}
            onDrop={(e) => {
              e.preventDefault()
              if (dragId && dragId !== c.id) reorderLayer(dragId, c.id)
              setDragId(null)
              setOverId(null)
            }}
            onDragEnd={() => {
              setDragId(null)
              setOverId(null)
            }}
          >
            <span className="layer-type-icon">{TYPE_ICONS[c.type]}</span>
            {renamingId === c.id ? (
              <Input
                size="small"
                className="layer-rename-input"
                autoFocus
                value={renameValue}
                onChange={(e) => setRenameValue(e.target.value)}
                onPressEnter={commitRename}
                onBlur={commitRename}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') setRenamingId(null)
                }}
                onClick={(e) => e.stopPropagation()}
              />
            ) : (
              <span
                className="layer-name"
                onDoubleClick={(e) => {
                  if (c.locked) return
                  e.stopPropagation()
                  setRenamingId(c.id)
                  setRenameValue(c.name)
                }}
              >
                {c.name}
              </span>
            )}
            <span
              className="layer-action"
              onClick={(e) => {
                e.stopPropagation()
                toggleVisible(c.id)
              }}
            >
              {c.visible ? <EyeOutlined /> : <EyeInvisibleOutlined />}
            </span>
            <span
              className="layer-action"
              onClick={(e) => {
                e.stopPropagation()
                toggleLocked(c.id)
              }}
            >
              {c.locked ? <LockOutlined /> : <UnlockOutlined />}
            </span>
          </div>
        )

        // 锁定行不可选也不提供右键菜单，仅行内图标可点（用于解锁/显隐）
        if (c.locked) return row
        return (
          <Dropdown
            key={c.id}
            menu={{ items: LAYER_MENU, onClick: ({ key }) => onMenuClick(c.id, key) }}
            trigger={['contextMenu']}
          >
            {row}
          </Dropdown>
        )
      })}
    </div>
  )
}
