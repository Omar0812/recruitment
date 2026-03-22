import { afterEach, describe, expect, it, vi } from 'vitest'

import { ApiError, api } from '@/api/client'

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('api client', () => {
  it('将 fetch 网络异常转换为 ApiError', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')))

    await expect(api.get('/health')).rejects.toEqual(
      expect.objectContaining<ApiError>({
        name: 'ApiError',
        code: 'network_error',
        message: '网络异常，请检查连接后重试',
      }),
    )
  })

  it('兼容只返回 detail 的历史错误体', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ detail: 'Application not found' }), {
          status: 404,
          headers: { 'Content-Type': 'application/json' },
        }),
      ),
    )

    await expect(api.get('/legacy')).rejects.toEqual(
      expect.objectContaining<ApiError>({
        name: 'ApiError',
        code: 'http_404',
        message: 'Application not found',
      }),
    )
  })
})
