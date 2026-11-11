import client from './client'
import type { AiAssistResponse, AiConfig, AiConfigTestResult, AiUsage, Asset, DataSet, DataSource, FetchResult, Filter, GlobalVariable, LadVResponse, LoginResponse, Project, ProjectGroup, ShareAccess, ShareLink, ShareMeta, Snapshot, SysDict, SysDictItem, User, Workspace } from '../types'

export const authApi = {
  login: (username: string, password: string) =>
    client.post<LoginResponse>('/auth/login', { username, password }).then((r) => r.data),
  refresh: (token: string) =>
    client.post<LoginResponse>('/auth/refresh', null, { params: { token } }).then((r) => r.data),
  me: () => client.get<User>('/auth/me').then((r) => r.data),
}

export const workspaceApi = {
  list: () => client.get<Workspace[]>('/workspaces').then((r) => r.data),
  switch: (id: number) => client.post<void>(`/workspaces/${id}/switch`).then((r) => r.data),
}

export const projectApi = {
  list: (params?: { groupId?: number; type?: string; ungrouped?: boolean }) =>
    client.get<Project[]>('/projects', { params }).then((r) => r.data),
  get: (id: number) => client.get<Project>(`/projects/${id}`).then((r) => r.data),
  create: (body: { name: string; type?: string; groupId?: number }) =>
    client.post<Project>('/projects', body).then((r) => r.data),
  update: (
    id: number,
    body: Partial<{
      name: string
      canvasW: number
      canvasH: number
      canvasConfig: string
      background: string
      status: string
      thumbnail: string
      groupId: number
      clearGroup: boolean
    }>,
  ) => client.put<Project>(`/projects/${id}`, body).then((r) => r.data),
  remove: (id: number) => client.delete<void>(`/projects/${id}`).then((r) => r.data),
}

export const groupApi = {
  list: () => client.get<ProjectGroup[]>('/groups').then((r) => r.data),
  create: (body: { name: string; parentId?: number; sort?: number }) =>
    client.post<ProjectGroup>('/groups', body).then((r) => r.data),
  update: (id: number, body: Partial<{ name: string; parentId: number; sort: number }>) =>
    client.put<ProjectGroup>(`/groups/${id}`, body).then((r) => r.data),
  remove: (id: number) => client.delete<void>(`/groups/${id}`).then((r) => r.data),
}

export const dataSourceApi = {
  list: () => client.get<DataSource[]>('/datasources').then((r) => r.data),
  create: (body: { name: string; type: 'static' | 'api' | 'mysql' | 'postgres'; config: string }) =>
    client.post<DataSource>('/datasources', body).then((r) => r.data),
  update: (
    id: number,
    body: Partial<{ name: string; type: 'static' | 'api' | 'mysql' | 'postgres'; config: string }>,
  ) => client.put<DataSource>(`/datasources/${id}`, body).then((r) => r.data),
  remove: (id: number) => client.delete<void>(`/datasources/${id}`).then((r) => r.data),
  fetch: (id: number) => client.post<FetchResult>(`/datasources/${id}/fetch`).then((r) => r.data),
}

export const dataSetApi = {
  list: (sourceId?: number) =>
    client
      .get<DataSet[]>('/datasets', { params: sourceId != null ? { sourceId } : undefined })
      .then((r) => r.data),
  create: (body: { name: string; sourceId: number; transform?: string }) =>
    client.post<DataSet>('/datasets', body).then((r) => r.data),
  update: (id: number, body: Partial<{ name: string; sourceId: number; transform: string }>) =>
    client.put<DataSet>(`/datasets/${id}`, body).then((r) => r.data),
  remove: (id: number) => client.delete<void>(`/datasets/${id}`).then((r) => r.data),
  refresh: (id: number) => client.post<DataSet>(`/datasets/${id}/refresh`).then((r) => r.data),
}

export const filterApi = {
  list: () => client.get<Filter[]>('/filters').then((r) => r.data),
  create: (body: { name: string; code: string }) =>
    client.post<Filter>('/filters', body).then((r) => r.data),
  update: (id: number, body: Partial<{ name: string; code: string }>) =>
    client.put<Filter>(`/filters/${id}`, body).then((r) => r.data),
  remove: (id: number) => client.delete<void>(`/filters/${id}`).then((r) => r.data),
}

export const variableApi = {
  list: (projectId: number) =>
    client.get<GlobalVariable[]>(`/projects/${projectId}/variables`).then((r) => r.data),
  create: (projectId: number, body: { name: string; value: string; description?: string }) =>
    client.post<GlobalVariable>(`/projects/${projectId}/variables`, body).then((r) => r.data),
  update: (
    projectId: number,
    id: number,
    body: Partial<{ name: string; value: string; description: string }>,
  ) => client.put<GlobalVariable>(`/projects/${projectId}/variables/${id}`, body).then((r) => r.data),
  remove: (projectId: number, id: number) =>
    client.delete<void>(`/projects/${projectId}/variables/${id}`).then((r) => r.data),
}

export const assetApi = {
  list: () => client.get<Asset[]>('/assets').then((r) => r.data),
  upload: (file: File) =>
    client
      .post<Asset>('/assets/upload', file, {
        params: { name: file.name },
        headers: { 'Content-Type': file.type || 'application/octet-stream' },
        timeout: 0,
      })
      .then((r) => r.data),
  remove: (id: number) => client.delete<void>(`/assets/${id}`).then((r) => r.data),
}

export const publishApi = {
  publish: (id: number) => client.post<Snapshot>(`/projects/${id}/publish`).then((r) => r.data),
  snapshots: (id: number) => client.get<Snapshot[]>(`/projects/${id}/snapshots`).then((r) => r.data),
  share: (id: number, body: { password?: string }) =>
    client.post<ShareLink>(`/projects/${id}/share`, body).then((r) => r.data),
}

export const shareApi = {
  meta: (token: string) => client.get<ShareMeta>(`/share/${token}`).then((r) => r.data),
  access: (token: string, body: { password?: string }) =>
    client.post<ShareAccess>(`/share/${token}`, body).then((r) => r.data),
}

export const aiApi = {
  assist: (
    projectId: number,
    body: { componentId: string; componentType: string; componentProps: string; instruction: string },
  ) => client.post<AiAssistResponse>(`/projects/${projectId}/ai-assist`, body).then((r) => r.data),
  ladv: (projectId: number, body: { image: string; canvasWidth: number; canvasHeight: number }) =>
    client
      .post<LadVResponse>(`/projects/${projectId}/ladv`, body, { timeout: 180000 })
      .then((r) => r.data),
}

// AI 平台级配置与 token 用量（仅平台管理员，系统设置页使用）
export const aiConfigApi = {
  list: () => client.get<AiConfig[]>('/ai/config').then((r) => r.data),
  save: (key: string, body: Partial<AiConfig>) =>
    client.put<AiConfig>(`/ai/config/${key}`, body).then((r) => r.data),
  test: (key: string, body: Partial<AiConfig>) =>
    client
      .post<AiConfigTestResult>(`/ai/config/${key}/test`, body, { timeout: 90000 })
      .then((r) => r.data),
}

export const aiUsageApi = {
  get: () => client.get<AiUsage>('/ai/usage').then((r) => r.data),
}

export const dictApi = {
  list: () => client.get<SysDict[]>('/dicts').then((r) => r.data),
  create: (body: { dictType: string; name: string; remark?: string; sortOrder?: number }) =>
    client.post<SysDict>('/dicts', body).then((r) => r.data),
  update: (id: number, body: { name?: string; remark?: string; sortOrder?: number }) =>
    client.put<SysDict>(`/dicts/${id}`, body).then((r) => r.data),
  remove: (id: number) => client.delete<void>(`/dicts/${id}`).then((r) => r.data),
  createItem: (
    dictId: number,
    body: { value: string; label: string; sortOrder?: number; enabled?: boolean; remark?: string; extJson?: string },
  ) => client.post<SysDictItem>(`/dicts/${dictId}/items`, body).then((r) => r.data),
  updateItem: (
    dictId: number,
    itemId: number,
    body: { label?: string; sortOrder?: number; enabled?: boolean; remark?: string; extJson?: string },
  ) => client.put<SysDictItem>(`/dicts/${dictId}/items/${itemId}`, body).then((r) => r.data),
  removeItem: (dictId: number, itemId: number) =>
    client.delete<void>(`/dicts/${dictId}/items/${itemId}`).then((r) => r.data),
}
