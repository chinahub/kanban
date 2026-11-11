import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// 后端端口：默认 8080；本机 8080 被系统服务（如 Nahimic 音频驱动）占用时，
// 可用 VITE_BACKEND_PORT=8081 配合后端 --server.port=8081 启动。
const backendPort = process.env.VITE_BACKEND_PORT || '8080'
const backendTarget = `http://localhost:${backendPort}`

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    rolldownOptions: {
      output: {
        // 按库拆分重依赖 vendor chunk：图表/3D/关系图库改动少、可长期缓存，
        // 业务代码迭代不再使全量缓存失效（首屏只加载用到的部分）
        advancedChunks: {
          groups: [
            { name: 'vendor-g2', test: /node_modules[\\/]+@antv[\\/]+g2[\\/]/ },
            { name: 'vendor-d3', test: /node_modules[\\/]+d3-[\\w-]+[\\/]/ },
            { name: 'vendor-react', test: /node_modules[\\/]+(react|react-dom|react-router|react-router-dom|scheduler)[\\/]/ },
            { name: 'vendor-antd', test: /node_modules[\\/]+(@ant-design|antd|rc-[^\\/]+)[\\/]/ },
          ],
        },
      },
    },
  },
  server: {
    port: 5175,
    // summer-boot Web 层非 Servlet，无内置 CORS。开发期用 proxy 把 /api 转发到后端，
    // 浏览器只与 5175 通信，绕过跨域。生产期跨域另议（后端加 CORS 头或前置反代）。
    proxy: {
      '/api': {
        target: backendTarget,
        changeOrigin: true,
      },
      // 协同 WebSocket（/ws/collab/{projectId}/{token}）：必须开启 ws 代理
      '/ws': {
        target: backendTarget,
        ws: true,
        changeOrigin: true,
      },
    },
  },
})
