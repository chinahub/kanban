import { useEffect, useRef, useState } from 'react'
import type { CanvasComponent } from '../../types/editor'

interface PlayerProps {
  component: CanvasComponent
  scale?: number
}

/**
 * 流播放器：按地址后缀选择播放引擎（.m3u8 → hls.js，.flv → mpegts.js，其余走原生 video）。
 * hls.js / mpegts.js 均为动态 import，不进主包。浏览器无法直接播 RTMP，需服务端转流。
 */
export function StreamPlayer({ component, scale = 1 }: PlayerProps) {
  const url = String(component.props.url ?? '')
  const videoRef = useRef<HTMLVideoElement>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    const video = videoRef.current
    if (!video || !url) return
    let cleanup: (() => void) | undefined
    setError('')
    const lower = url.toLowerCase()
    if (lower.includes('.m3u8')) {
      void import('hls.js').then(({ default: Hls }) => {
        if (!Hls.isSupported()) {
          // Safari 原生支持 HLS
          video.src = url
          return
        }
        const hls = new Hls()
        hls.loadSource(url)
        hls.attachMedia(video)
        hls.on(Hls.Events.ERROR, (_e, data) => {
          if (data.fatal) setError(`流加载失败：${data.details}`)
        })
        cleanup = () => hls.destroy()
      }).catch(() => setError('hls.js 加载失败'))
    } else if (lower.includes('.flv')) {
      void import('mpegts.js').then(({ default: mpegts }): void => {
        if (!mpegts.isSupported()) {
          setError('当前浏览器不支持 MSE，无法播放 FLV 流')
          return
        }
        const player = mpegts.createPlayer({ type: 'flv', isLive: true, url })
        player.attachMediaElement(video)
        player.load()
        void Promise.resolve(player.play()).catch(() => undefined)
        cleanup = () => player.destroy()
      }).catch(() => setError('mpegts.js 加载失败'))
    } else {
      video.src = url
    }
    return () => cleanup?.()
  }, [url])

  if (!url) {
    return (
      <div style={{ width: '100%', height: '100%', border: '1px dashed #2a3550', borderRadius: 4, color: '#7f8db3', fontSize: 13 * scale, display: 'flex', alignItems: 'center', justifyContent: 'center', boxSizing: 'border-box' }}>
        请在样式面板配置流地址（.m3u8 / .flv）
      </div>
    )
  }
  return (
    <div style={{ width: '100%', height: '100%', position: 'relative', background: '#000' }}>
      <video
        ref={videoRef}
        style={{ width: '100%', height: '100%', objectFit: 'contain' }}
        autoPlay={Boolean(component.props.autoplay)}
        muted={Boolean(component.props.muted ?? true)}
        controls
      />
      {error && (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#f5576c', fontSize: 13 * scale, background: 'rgba(0,0,0,0.6)' }}>
          {error}
        </div>
      )}
    </div>
  )
}

/** RTMP 视频流播放器：浏览器不能直接播 RTMP，props.url 需填转流后的 HTTP-FLV/HLS 地址 */
export function RtmpPlayer({ component, scale = 1 }: PlayerProps) {
  const url = String(component.props.url ?? '')
  if (!url) {
    return (
      <div style={{ width: '100%', height: '100%', border: '1px dashed #2a3550', borderRadius: 4, color: '#7f8db3', fontSize: 13 * scale, display: 'flex', alignItems: 'center', justifyContent: 'center', boxSizing: 'border-box', padding: 8, textAlign: 'center' }}>
        浏览器无法直接播放 RTMP，请填转流后的 HTTP-FLV（.flv）或 HLS（.m3u8）地址
      </div>
    )
  }
  return <StreamPlayer component={component} scale={scale} />
}
