/** 协同房间成员（后端 CollabEndpoint 广播的用户摘要） */
export interface CollabPeer {
  id: number
  name: string
}

interface CollabMessage {
  type: 'hello' | 'roster' | 'saved'
  you?: CollabPeer
  users?: CollabPeer[]
  user?: CollabPeer
}

interface CollabHandlers {
  /** 在线成员名单变化（含本人） */
  onRoster?: (peers: CollabPeer[]) => void
  /** 其他人保存了新版本 */
  onSaved?: (peer: CollabPeer) => void
}

/**
 * 协同编辑客户端：连接 `/ws/collab/{projectId}/{accessToken}` 房间。
 * 服务端只做房间广播（presence + saved 中继，无 CRDT/OT 合并）；
 * 断线按 2s/4s/8s 指数退避重连，连败 5 次放弃（下次操作重新 connect）。
 */
export class CollabClient {
  private ws: WebSocket | null = null
  private closedByUser = false
  private retries = 0
  private handlers: CollabHandlers = {}
  private args: { projectId: number; token: string } | null = null
  /** 本人 id：来自服务端 hello 帧；roster 过滤自身用（编辑器直开时 authStore.user 可能为 null） */
  private selfId: number | null = null

  /** 建立连接（重复调用会先关闭旧连接） */
  connect(projectId: number, token: string, handlers: CollabHandlers) {
    this.close()
    this.closedByUser = false
    this.retries = 0
    this.handlers = handlers
    this.args = { projectId, token }
    this.open()
  }

  /** 广播「我已保存」给房间内其他人 */
  sendSaved() {
    this.send({ type: 'saved' })
  }

  /** 主动断开（不再重连） */
  close() {
    this.closedByUser = true
    const ws = this.ws
    this.ws = null
    ws?.close()
  }

  private open() {
    if (!this.args) return
    const { projectId, token } = this.args
    const proto = window.location.protocol === 'https:' ? 'wss' : 'ws'
    const ws = new WebSocket(`${proto}://${window.location.host}/ws/collab/${projectId}/${token}`)
    this.ws = ws
    ws.onmessage = (e) => {
      let msg: CollabMessage
      try {
        msg = JSON.parse(String(e.data)) as CollabMessage
      } catch {
        return
      }
      if (msg.type === 'hello' && msg.you) {
        this.selfId = msg.you.id
      } else if (msg.type === 'roster') {
        this.handlers.onRoster?.((msg.users ?? []).filter((u) => u.id !== this.selfId))
      } else if (msg.type === 'saved' && msg.user) {
        this.handlers.onSaved?.(msg.user)
      }
    }
    ws.onclose = () => {
      if (this.closedByUser || this.ws !== ws) return
      this.ws = null
      // 指数退避重连；连败 5 次后放弃，避免无效重试风暴
      if (this.retries < 5) {
        const delay = 2000 * 2 ** this.retries
        this.retries += 1
        setTimeout(() => {
          if (!this.closedByUser && !this.ws) this.open()
        }, delay)
      }
    }
  }

  private send(msg: Record<string, unknown>) {
    const ws = this.ws
    if (ws && ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(msg))
  }
}
