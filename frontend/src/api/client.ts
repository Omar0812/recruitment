import type { ResumeParseResult } from './types'

export const BASE_URL = '/api/v1'
const TOKEN_KEY = 'auth_token'

export class ApiError extends Error {
  code: string

  constructor(code: string, message: string) {
    super(message)
    this.code = code
    this.name = 'ApiError'
  }
}

export function getAuthHeaders(): Record<string, string> {
  const token = localStorage.getItem(TOKEN_KEY)
  return token ? { 'Authorization': `Bearer ${token}` } : {}
}

export function handle401(status: number): void {
  if (status === 401) {
    localStorage.removeItem(TOKEN_KEY)
    const currentPath = window.location.pathname
    if (currentPath !== '/login' && currentPath !== '/register') {
      window.location.href = `/login?redirect=${encodeURIComponent(currentPath)}`
    }
  }
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const url = `${BASE_URL}${path}`
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }

  const token = localStorage.getItem(TOKEN_KEY)
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  const options: RequestInit = { method, headers }

  if (body !== undefined) {
    options.body = JSON.stringify(body)
  }

  let response: Response
  try {
    response = await fetch(url, options)
  } catch {
    throw new ApiError('network_error', '网络异常，请检查连接后重试')
  }

  if (response.status === 401) {
    handle401(response.status)
    throw new ApiError('unauthorized', '登录已过期，请重新登录')
  }

  if (!response.ok) {
    let error: { code?: string; message?: string; detail?: any } | null = null
    try {
      error = await response.json()
    } catch {
      throw new ApiError(`http_${response.status}`, `HTTP ${response.status}`)
    }
    if (response.status === 409 && error?.detail?.code === 'VERSION_CONFLICT') {
      throw new ApiError('VERSION_CONFLICT', error.detail.message ?? '该记录刚被修改过，请刷新')
    }
    throw new ApiError(
      error?.code ?? `http_${response.status}`,
      error?.message ?? (typeof error?.detail === 'string' ? error.detail : null) ?? `HTTP ${response.status}`,
    )
  }

  if (response.status === 204) {
    return undefined as T
  }

  return response.json()
}

export const api = {
  get: <T>(path: string) => request<T>('GET', path),
  post: <T>(path: string, body?: unknown) => request<T>('POST', path, body),
  put: <T>(path: string, body?: unknown) => request<T>('PUT', path, body),
  patch: <T>(path: string, body?: unknown) => request<T>('PATCH', path, body),
  delete: <T>(path: string, body?: unknown) => request<T>('DELETE', path, body),
}

// ── File operations (migrated from files.ts) ──

export async function parseResume(filePath: string): Promise<ResumeParseResult> {
  return api.post<ResumeParseResult>('/files/parse', { file_path: filePath })
}

/**
 * 用 fetch + auth header 获取文件二进制，返回 blob URL。
 * 调用方需在不再使用时调用 URL.revokeObjectURL() 释放内存。
 */
export async function fetchFileAsBlob(filePath: string): Promise<string> {
  const normalizedPath = filePath.replace(/^\/+/, '')
  const res = await fetch(`${BASE_URL}/files/${normalizedPath}`, {
    headers: getAuthHeaders(),
  })

  if (res.status === 401) {
    handle401(res.status)
    throw new ApiError('unauthorized', '登录已过期，请重新登录')
  }

  if (!res.ok) {
    throw new ApiError(`http_${res.status}`, `文件加载失败：HTTP ${res.status}`)
  }

  const blob = await res.blob()
  return URL.createObjectURL(blob)
}
