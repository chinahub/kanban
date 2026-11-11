/** 内置画布主题套件（PRD §4.9）：纯前端套用，套用动作写入 editorStore 一次 set，可单步撤销 */

export interface CanvasTheme {
  id: string
  label: string
  background: string
  primary: string
  palette: string[]
}

export const CANVAS_THEMES: CanvasTheme[] = [
  {
    id: 'dusk-blue',
    label: '暮蓝',
    background: '#0b1020',
    primary: '#4f8cff',
    palette: ['#4f8cff', '#36cfc9', '#ffc53d', '#ff7a45', '#9254de', '#f759ab'],
  },
  {
    id: 'neutral-gray',
    label: '中性灰',
    background: '#17181c',
    primary: '#8fa3bf',
    palette: ['#8fa3bf', '#b8c4d6', '#6b7a90', '#d9d9d9', '#5c6b7f', '#a6adb8'],
  },
  {
    id: 'violet-night',
    label: '紫夜',
    background: '#150826',
    primary: '#9254de',
    palette: ['#9254de', '#f759ab', '#4f8cff', '#36cfc9', '#ffc53d', '#ff7a45'],
  },
]

export function getThemeById(id: string | undefined): CanvasTheme | undefined {
  return CANVAS_THEMES.find((t) => t.id === id)
}
