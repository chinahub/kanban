/**
 * 根据画布背景色亮度计算图表文字（图例/坐标轴/标题）颜色：
 * 暗背景返回浅色，亮背景返回深色，保证文字对比度。
 * 无法解析背景色时按编辑器默认深色主题返回浅色。
 */
export function chartTextColor(background: string | undefined): string {
  const rgb = parseColor(background)
  if (!rgb) return '#dce6ff'
  // 感知亮度（sRGB 加权），范围 0~1
  const luminance = (0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2]) / 255
  return luminance < 0.5 ? '#dce6ff' : 'rgba(0, 0, 0, 0.75)'
}

/** 解析 #rgb / #rrggbb / rgb() / rgba() 格式的颜色，返回 [r, g, b]，失败返回 null */
function parseColor(color: string | undefined): [number, number, number] | null {
  if (!color) return null
  const c = color.trim()
  const hex = c.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i)
  if (hex) {
    let h = hex[1]
    if (h.length === 3) h = h.split('').map((s) => s + s).join('')
    return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)]
  }
  const rgba = c.match(/^rgba?\(([^)]+)\)$/i)
  if (rgba) {
    const parts = rgba[1].split(',').map((s) => parseFloat(s))
    if (parts.length >= 3 && parts.slice(0, 3).every((n) => !Number.isNaN(n))) {
      return [parts[0], parts[1], parts[2]]
    }
  }
  return null
}
