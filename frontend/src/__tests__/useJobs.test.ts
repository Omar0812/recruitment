import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/api/jobs', () => ({
  fetchJobs: vi.fn(),
}))

import { fetchJobs } from '@/api/jobs'
import { useJobs } from '@/composables/useJobs'

const mockFetchJobs = vi.mocked(fetchJobs)

function makeJob(id: number) {
  return {
    id,
    title: `岗位${id}`,
    department: '技术部',
    location_name: '上海',
    location_address: '上海市徐汇区',
    headcount: 1,
    jd: 'JD 内容',
    status: 'open',
    priority: 'high',
    target_onboard_date: null,
    notes: null,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  }
}

describe('useJobs', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    const { state } = useJobs()
    state.jobs = []
    state.loading = false
    state.initialized = false
    state.error = null
    state.status = 'open'
    state.keyword = ''
    state.total = 0
  })

  it('加载失败时记录错误状态', async () => {
    mockFetchJobs.mockRejectedValue(new Error('岗位加载失败，请重试'))
    const { state, load } = useJobs()

    await load()

    expect(state.error).toBe('岗位加载失败，请重试')
    expect(state.jobs).toEqual([])
  })

  it('重试成功后清除错误并恢复列表', async () => {
    mockFetchJobs.mockRejectedValueOnce(new Error('岗位加载失败，请重试'))
    mockFetchJobs.mockResolvedValueOnce({
      items: [makeJob(1)],
      total: 1,
      page: 1,
      page_size: 100,
    })
    const { state, load } = useJobs()

    await load()
    expect(state.error).toBe('岗位加载失败，请重试')

    await load()

    expect(state.error).toBeNull()
    expect(state.jobs).toHaveLength(1)
    expect(state.total).toBe(1)
  })
})
