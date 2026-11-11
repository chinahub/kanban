import { Breadcrumb, Button, DatePicker, Input, Menu, Progress, Steps, Tabs, Timeline } from 'antd'
import {
  BellOutlined,
  CloudOutlined,
  DownloadOutlined,
  EnvironmentOutlined,
  FireOutlined,
  GlobalOutlined,
  HeartOutlined,
  HomeOutlined,
  MailOutlined,
  RocketOutlined,
  SafetyOutlined,
  SearchOutlined,
  SettingOutlined,
  StarOutlined,
  ThunderboltOutlined,
  TrophyOutlined,
} from '@ant-design/icons'
import dayjs from 'dayjs'
import type { CanvasComponent } from '../../types/editor'
import { useVariableStore } from '../../store/variableStore'
import { setRuntimeVariable } from '../../util/interactionRunner'
import { ControlShell, parseOptions } from './controlShell'

export interface ControlProps {
  component: CanvasComponent
  scale?: number
  interactive?: boolean
}

/** 图标选择器可用的内置图标（props.icon 写组件名，如 StarOutlined） */
export const ICON_MAP: Record<string, React.ComponentType<{ style?: React.CSSProperties }>> = {
  StarOutlined,
  HeartOutlined,
  HomeOutlined,
  SettingOutlined,
  BellOutlined,
  MailOutlined,
  SearchOutlined,
  DownloadOutlined,
  CloudOutlined,
  EnvironmentOutlined,
  GlobalOutlined,
  RocketOutlined,
  TrophyOutlined,
  FireOutlined,
  ThunderboltOutlined,
  SafetyOutlined,
}

function renderIcon(name: string, style?: React.CSSProperties) {
  const C = ICON_MAP[name] ?? StarOutlined
  return <C style={style} />
}

/** 变量读写辅助：targetVariable 绑定的当前值 + 写入函数 */
function useTargetVar(component: CanvasComponent): { current: string | undefined; set: (v: string) => void } {
  const variables = useVariableStore((s) => s.variables)
  const target = String(component.props.targetVariable ?? '')
  return {
    current: target ? variables.find((v) => v.name === target)?.value : undefined,
    set: (v: string) => setRuntimeVariable(target, v),
  }
}

/** 日期选择器：选中日期（YYYY-MM-DD）写入绑定变量 */
export function SelectDate({ component, scale, interactive }: ControlProps) {
  const { current, set } = useTargetVar(component)
  return (
    <ControlShell interactive={interactive} scale={scale}>
      <DatePicker
        style={{ width: '100%' }}
        placeholder={String(component.props.placeholder ?? '选择日期')}
        value={current ? dayjs(current) : null}
        onChange={(d) => set(d ? d.format('YYYY-MM-DD') : '')}
      />
    </ControlShell>
  )
}

/** 搜索框：回车/点按钮时把关键字写入绑定变量 */
export function InputSearch({ component, scale, interactive }: ControlProps) {
  const { set } = useTargetVar(component)
  return (
    <ControlShell interactive={interactive} scale={scale}>
      <Input.Search placeholder={String(component.props.placeholder ?? '搜索')} onSearch={(v) => set(v)} allowClear />
    </ControlShell>
  )
}

/** Tab 列表：点击切换并写入绑定变量 */
export function NavTabs({ component, scale, interactive }: ControlProps) {
  const { current, set } = useTargetVar(component)
  const opts = parseOptions(component.props.options)
  return (
    <ControlShell interactive={interactive} scale={scale}>
      <Tabs
        activeKey={current ?? opts[0]}
        onChange={(k) => set(k)}
        items={opts.map((o) => ({ key: o, label: o }))}
      />
    </ControlShell>
  )
}

/** 菜单：横向导航，点击写入绑定变量 */
export function NavMenu({ component, scale, interactive }: ControlProps) {
  const { current, set } = useTargetVar(component)
  const opts = parseOptions(component.props.options)
  return (
    <ControlShell interactive={interactive} scale={scale}>
      <Menu
        mode="horizontal"
        style={{ width: '100%', background: 'transparent' }}
        selectedKeys={current ? [current] : []}
        onClick={(e) => set(e.key)}
        items={opts.map((o) => ({ key: o, label: o }))}
      />
    </ControlShell>
  )
}

/** 面包屑：点击层级写入绑定变量 */
export function NavBreadcrumb({ component, scale, interactive }: ControlProps) {
  const { set } = useTargetVar(component)
  const opts = parseOptions(component.props.options)
  return (
    <ControlShell interactive={interactive} scale={scale}>
      <Breadcrumb
        items={opts.map((o) => ({
          title: <a onClick={() => set(o)}>{o}</a>,
        }))}
      />
    </ControlShell>
  )
}

/** 进度条：绑定变量时显示变量值（0-100），否则显示 props.value */
export function DataProgress({ component, scale, interactive }: ControlProps) {
  const { current } = useTargetVar(component)
  const percent = Math.min(100, Math.max(0, Number(current ?? component.props.value ?? 0) || 0))
  return (
    <ControlShell interactive={interactive} scale={scale}>
      <Progress style={{ width: '100%' }} percent={percent} strokeColor={String(component.props.color ?? '#4f8cff')} />
    </ControlShell>
  )
}

/** 步骤条：绑定变量时以变量值（数字）为当前步骤，否则用 props.current */
export function DataSteps({ component, scale, interactive }: ControlProps) {
  const { current } = useTargetVar(component)
  const opts = parseOptions(component.props.options)
  const step = Math.min(opts.length, Math.max(0, Number(current ?? component.props.current ?? 1) || 0))
  return (
    <ControlShell interactive={interactive} scale={scale}>
      <Steps
        style={{ width: '100%' }}
        size="small"
        current={step - 1}
        items={opts.map((o) => ({ title: o }))}
      />
    </ControlShell>
  )
}

/** 时间轴：纯展示，options 每行一个事件 */
export function DataTimeline({ component, scale, interactive }: ControlProps) {
  const opts = parseOptions(component.props.options)
  return (
    <ControlShell interactive={interactive} scale={scale}>
      <Timeline style={{ width: '100%', padding: '12px 4px 0' }} items={opts.map((o) => ({ children: o }))} />
    </ControlShell>
  )
}

/** 图标按钮：点击把 props.value 写入绑定变量 */
export function BtnIcon({ component, scale, interactive }: ControlProps) {
  const { set } = useTargetVar(component)
  return (
    <ControlShell interactive={interactive} scale={scale}>
      <Button
        type="primary"
        block
        icon={renderIcon(String(component.props.icon ?? 'StarOutlined'))}
        style={{ background: String(component.props.color ?? '#1d39c4') }}
        onClick={() => set(String(component.props.value ?? ''))}
      />
    </ControlShell>
  )
}

/** 图标：展示单个内置图标（props.icon/size/color） */
export function IconDisplay({ component, scale = 1, interactive }: ControlProps) {
  return (
    <ControlShell interactive={interactive} scale={scale}>
      <div style={{ width: '100%', textAlign: 'center' }}>
        {renderIcon(String(component.props.icon ?? 'StarOutlined'), {
          fontSize: Number(component.props.size ?? 32) * scale,
          color: String(component.props.color ?? '#4f8cff'),
        })}
      </div>
    </ControlShell>
  )
}
