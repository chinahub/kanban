import { useEffect, useRef } from 'react'
import type * as THREE_NS from 'three'
import type { CanvasComponent } from '../../types/editor'

interface ThreeProps {
  component: CanvasComponent
  scale?: number
}

type Three = typeof THREE_NS
type Cleanup = () => void

/**
 * 3D 组件通用挂载壳：three.js 动态 import（不进主包），
 * init 返回清理函数；卸载/参数变化时销毁 renderer 与动画循环。
 */
function ThreeCanvas({ component, init, deps }: ThreeProps & { init: (el: HTMLDivElement, c: CanvasComponent) => Promise<Cleanup>; deps: unknown[] }) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    let cleanup: Cleanup | undefined
    let dead = false
    void init(el, component).then((c) => {
      if (dead) c()
      else cleanup = c
    })
    return () => {
      dead = true
      cleanup?.()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)
  return <div ref={ref} style={{ width: '100%', height: '100%', overflow: 'hidden' }} />
}

/** 建 renderer/scene/透视相机并开动画循环，返回控制对象 */
function makeStage(THREE: Three, el: HTMLDivElement) {
  const w = el.clientWidth || 400
  const h = el.clientHeight || 260
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
  renderer.setSize(w, h)
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  el.appendChild(renderer.domElement)
  const scene = new THREE.Scene()
  const camera = new THREE.PerspectiveCamera(45, w / h, 0.01, 100)
  let raf = 0
  const animate = (tick: () => void) => {
    const loop = () => {
      tick()
      renderer.render(scene, camera)
      raf = requestAnimationFrame(loop)
    }
    loop()
  }
  const dispose = () => {
    cancelAnimationFrame(raf)
    renderer.dispose()
    el.removeChild(renderer.domElement)
  }
  return { renderer, scene, camera, animate, dispose }
}

/** 3D 地球：暗色球体 + 世界国家质心点云（/maps/world.json），缓慢自转 */
export function Earth3D({ component }: ThreeProps) {
  const color = String(component.props.color ?? '#4f8cff')
  return (
    <ThreeCanvas
      component={component}
      deps={[color]}
      init={async (el) => {
        const THREE = await import('three')
        const stage = makeStage(THREE, el)
        const group = new THREE.Group()
        stage.scene.add(group)
        group.add(new THREE.Mesh(
          new THREE.SphereGeometry(1, 48, 48),
          new THREE.MeshBasicMaterial({ color: '#0b1f3f', transparent: true, opacity: 0.92 }),
        ))
        // 经纬度转球面坐标
        const toXYZ = (lng: number, lat: number, r: number) => {
          const phi = (lat * Math.PI) / 180
          const lambda = (lng * Math.PI) / 180
          return [r * Math.cos(phi) * Math.cos(lambda), r * Math.sin(phi), -r * Math.cos(phi) * Math.sin(lambda)] as const
        }
        // 纬线网格增加立体感
        for (let lat = -60; lat <= 60; lat += 30) {
          const pts: InstanceType<Three['Vector3']>[] = []
          for (let lng = -180; lng <= 180; lng += 6) {
            const [x, y, z] = toXYZ(lng, lat, 1.002)
            pts.push(new THREE.Vector3(x, y, z))
          }
          group.add(new THREE.Line(
            new THREE.BufferGeometry().setFromPoints(pts),
            new THREE.LineBasicMaterial({ color: '#2a3550', transparent: true, opacity: 0.5 }),
          ))
        }
        // 国家质心点云
        try {
          const geo = (await (await fetch('/maps/world.json')).json()) as {
            features: { geometry: { type: string; coordinates: number[][][] | number[][][][] } }[]
          }
          const positions: number[] = []
          for (const f of geo.features) {
            const ring = f.geometry.type === 'Polygon'
              ? (f.geometry.coordinates as number[][][])[0]
              : (f.geometry.coordinates as number[][][][])[0]?.[0]
            if (!ring?.length) continue
            let sx = 0
            let sy = 0
            for (const [lng, lat] of ring) {
              sx += lng
              sy += lat
            }
            const [x, y, z] = toXYZ(sx / ring.length, sy / ring.length, 1.01)
            positions.push(x, y, z)
          }
          const geom = new THREE.BufferGeometry()
          geom.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
          group.add(new THREE.Points(geom, new THREE.PointsMaterial({ color, size: 0.02 })))
        } catch {
          // 点云数据加载失败时仅显示球体
        }
        stage.camera.position.set(0, 0.6, 2.8)
        stage.camera.lookAt(0, 0, 0)
        stage.animate(() => {
          group.rotation.y += 0.003
        })
        return stage.dispose
      }}
    />
  )
}

interface GeoFeature {
  properties?: { name?: string }
  geometry: { type: string; coordinates: number[][][] | number[][][][] }
}

/** 3D 平面地图：GeoJSON 多边形拉伸成板块，data { name, value } 控制板块高度 */
function Map3D({ component, geoUrl }: ThreeProps & { geoUrl: string }) {
  const color = String(component.props.color ?? '#1d3d7a')
  return (
    <ThreeCanvas
      component={component}
      deps={[geoUrl, color, component.data]}
      init={async (el) => {
        const THREE = await import('three')
        const stage = makeStage(THREE, el)
        const geo = (await fetch(geoUrl).then((r) => r.json()).catch(() => null)) as { features: GeoFeature[] } | null
        if (!geo) return stage.dispose
        // 简易墨卡托投影到平面（度单位）
        const project = (lng: number, lat: number): [number, number] => [lng, (-Math.log(Math.tan(Math.PI / 4 + (lat * Math.PI) / 360)) * 180) / Math.PI]
        // 先算包围盒用于居中归一
        let minX = Infinity
        let maxX = -Infinity
        let minY = Infinity
        let maxY = -Infinity
        const walk = (ring: number[][]) => {
          for (const [lng, lat] of ring) {
            const [x, y] = project(lng, lat)
            if (x < minX) minX = x
            if (x > maxX) maxX = x
            if (y < minY) minY = y
            if (y > maxY) maxY = y
          }
        }
        for (const f of geo.features) {
          const polys = f.geometry.type === 'Polygon' ? [f.geometry.coordinates as number[][][]] : (f.geometry.coordinates as number[][][][])
          polys.forEach((p) => p[0] && walk(p[0]))
        }
        const span = Math.max(maxX - minX, maxY - minY) || 1
        const norm = (lng: number, lat: number): [number, number] => {
          const [x, y] = project(lng, lat)
          return [((x - (minX + maxX) / 2) / span) * 2, ((y - (minY + maxY) / 2) / span) * 2]
        }
        const data = (component.data?.length ? component.data : []) as { name: string; value: number }[]
        const valueByName = new Map(data.map((d) => [String(d.name), Number(d.value) || 0]))
        const maxValue = Math.max(...data.map((d) => Number(d.value) || 0), 1)
        const group = new THREE.Group()
        stage.scene.add(group)
        for (const f of geo.features) {
          const name = String(f.properties?.name ?? '')
          const value = valueByName.get(name)
          const depth = value != null ? 0.03 + (value / maxValue) * 0.25 : 0.03
          const polys = f.geometry.type === 'Polygon' ? [f.geometry.coordinates as number[][][]] : (f.geometry.coordinates as number[][][][])
          for (const poly of polys) {
            const ring = poly[0]
            if (!ring || ring.length < 3) continue
            const shape = new THREE.Shape(ring.map(([lng, lat]) => new THREE.Vector2(...norm(lng, lat))))
            const mesh = new THREE.Mesh(
              new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false }),
              new THREE.MeshBasicMaterial({ color }),
            )
            group.add(mesh)
          }
        }
        // 平铺后俯视倾斜
        group.rotation.x = -Math.PI / 2
        group.position.y = -0.1
        stage.camera.position.set(0, 1.6, 1.4)
        stage.camera.lookAt(0, 0, 0)
        stage.animate(() => undefined)
        return stage.dispose
      }}
    />
  )
}

/** 3D 平面中国地图（内置 /maps/china.json） */
export function Map3DChina({ component, scale }: ThreeProps) {
  return <Map3D component={component} scale={scale} geoUrl="/maps/china.json" />
}

/** 3D 平面世界地图（内置 /maps/world.json） */
export function Map3DWorld({ component, scale }: ThreeProps) {
  return <Map3D component={component} scale={scale} geoUrl="/maps/world.json" />
}

/** 三维城市：程序化生成的楼块阵列，缓慢环绕 */
export function City3D({ component }: ThreeProps) {
  const color = String(component.props.color ?? '#4f8cff')
  return (
    <ThreeCanvas
      component={component}
      deps={[color]}
      init={async (el) => {
        const THREE = await import('three')
        const stage = makeStage(THREE, el)
        const group = new THREE.Group()
        stage.scene.add(group)
        const base = new THREE.Color(color)
        const N = 20
        const gap = 2 / N
        for (let i = 0; i < N; i++) {
          for (let j = 0; j < N; j++) {
            if (Math.random() < 0.3) continue
            const h = 0.05 + Math.random() * 0.45
            const shade = base.clone().multiplyScalar(0.5 + h)
            const box = new THREE.Mesh(
              new THREE.BoxGeometry(gap * 0.7, h, gap * 0.7),
              new THREE.MeshBasicMaterial({ color: shade }),
            )
            box.position.set((i - N / 2) * gap, h / 2, (j - N / 2) * gap)
            group.add(box)
          }
        }
        stage.camera.position.set(1.7, 1.3, 1.7)
        stage.camera.lookAt(0, 0.1, 0)
        stage.animate(() => {
          group.rotation.y += 0.002
        })
        return stage.dispose
      }}
    />
  )
}
