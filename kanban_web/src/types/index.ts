// 对应后端 DTO（cn.kanban.dto）

export interface User {
  id: number
  username: string
  email: string | null
  displayName: string | null
  isPlatformAdmin: boolean
}

export interface Workspace {
  id: number
  code: string
  name: string
  description: string | null
  isSystem: boolean
  createdAt: string
}

export interface LoginResponse {
  accessToken: string
  refreshToken: string
  expiresIn: number
  user: User
}

export interface Project {
  id: number
  groupId: number | null
  name: string
  type: string // PC | MOBILE | CITY3D
  canvasW: number
  canvasH: number
  canvasConfig: string | null
  background: string | null
  status: string // DRAFT | PUBLISHED | TRASHED
  thumbnail: string | null
  creatorId: number
  createdAt: string
  updatedAt: string
}

export interface ProjectGroup {
  id: number
  parentId: number | null
  name: string
  sort: number
  createdAt: string
}

export interface ApiError {
  status: number
  error: string
  message: string
}

export type SelectedGroup =
  | { kind: 'all' }
  | { kind: 'ungrouped' }
  | { kind: 'group'; id: number }

export interface DataSource {
  id: number
  name: string
  type: 'static' | 'api' | 'mysql' | 'postgres' | 'mysql' | 'postgres'
  config: string
  creatorId: number
  createdAt: string
  updatedAt: string
}

export interface DataSet {
  id: number
  sourceId: number | null
  name: string
  transform: string | null
  data: string | null
  lastRefreshAt: string | null
  creatorId: number
  createdAt: string
  updatedAt: string
}

export interface FetchResult {
  type: string
  data: string
}

export interface Filter {
  id: number
  name: string
  code: string
  creatorId: number
  createdAt: string
  updatedAt: string
}

export interface GlobalVariable {
  id: number
  projectId: number
  name: string
  description: string | null
  source: string
  value: string
  createdAt: string
  updatedAt: string
}

export interface Asset {
  id: number
  name: string
  type: string
  contentType: string | null
  url: string
  size: number
  createdAt: string
}

export interface Snapshot {
  id: number
  projectId: number
  version: number
  createdBy: number | null
  createdAt: string
}

export interface ShareLink {
  id: number
  token: string
  url: string
  hasPassword: boolean
  snapshotId: number | null
  createdAt: string
}

export interface ShareMeta {
  projectId: number
  projectName: string
  canvasW: number
  canvasH: number
  requirePassword: boolean
}

export interface ShareAccess {
  config: string
  variables: GlobalVariable[] | null
}

export interface AiAssistResponse {
  changes: string
  source: string
  raw: string
  logId: number | null
  error: string | null
}

export interface LadVResponse {
  components: string | null
  raw: string | null
  logId: number | null
  error: string | null
}

// AI 平台级配置（系统设置页；apiKey 为脱敏串，保存时留空表示不修改）
export interface AiConfig {
  key: 'ladv' | 'assistant'
  baseUrl: string
  apiKey: string
  model: string
  timeoutSeconds: number
  maxTokens: number
  configured: boolean
  updatedAt: string | null
}

export interface AiSourceUsage {
  source: string
  calls: number
  totalTokens: number
}

export interface AiDayUsage {
  day: string
  calls: number
  totalTokens: number
}

export interface AiUsage {
  totalCalls: number
  totalTokens: number
  promptTokens: number
  completionTokens: number
  bySource: AiSourceUsage[]
  byDay: AiDayUsage[]
}

// AI 配置连通性测试结果
export interface AiConfigTestResult {
  success: boolean
  message: string
  latencyMs: number
}

// 数据字典项
export interface SysDictItem {
  id: number
  value: string
  label: string
  sortOrder: number
  enabled: boolean
  remark: string | null
  /** 扩展属性 JSON 字符串（如 {"color":"green"} / {"defaultPort":3306} / {"disabled":true}） */
  extJson: string | null
}

// 数据字典类型（含全部字典项，含停用项）
export interface SysDict {
  id: number
  dictType: string
  name: string
  remark: string | null
  isSystem: boolean
  sortOrder: number
  items: SysDictItem[]
}
