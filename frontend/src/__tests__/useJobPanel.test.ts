import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/api/jobs', () => ({
  fetchJobDetail: vi.fn(),
  fetchJobApplications: vi.fn(),
}))

import { fetchJobDetail, fetchJobApplications } from '@/api/jobs'
import {
  openJobPanel,
  closeJobPanel,
  jobPanelState,
  refreshJobPanel,
  setJobPanelActiveTab,
} from '@/composables/useJobPanel'

const mockFetchJobDetail = vi.mocked(fetchJobDetail)
const mockFetchJobApplications = vi.mocked(fetchJobApplications)

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

describe('useJobPanel', () => {
  beforeEach(() => {
    closeJobPanel()
    vi.clearAllMocks()
  })

  it('openJobPanel 打开面板并加载岗位数据', async () => {
    mockFetchJobDetail.mockResolvedValue(makeJob(1))
    mockFetchJobApplications.mockResolvedValue({ items: [], total: 0, page: 1, page_size: 100 })

    await openJobPanel(1)

    expect(jobPanelState.isOpen).toBe(true)
    expect(jobPanelState.jobId).toBe(1)
    expect(jobPanelState.activeTab).toBe('basic')
    expect(jobPanelState.error).toBeNull()
    expect(jobPanelState.job?.id).toBe(1)
  })

  it('加载失败时记录错误状态', async () => {
    mockFetchJobDetail.mockRejectedValue(new Error('岗位详情加载失败，请重试'))
    mockFetchJobApplications.mockResolvedValue({ items: [], total: 0, page: 1, page_size: 100 })

    await openJobPanel(1)

    expect(jobPanelState.error).toBe('岗位详情加载失败，请重试')
    expect(jobPanelState.job).toBeNull()
  })

  it('重试成功后清除错误并恢复数据', async () => {
    mockFetchJobDetail.mockRejectedValueOnce(new Error('岗位详情加载失败，请重试'))
    mockFetchJobApplications.mockResolvedValue({ items: [], total: 0, page: 1, page_size: 100 })

    await openJobPanel(1)
    expect(jobPanelState.error).toBe('岗位详情加载失败，请重试')

    mockFetchJobDetail.mockResolvedValueOnce(makeJob(1))

    await refreshJobPanel()

    expect(jobPanelState.error).toBeNull()
    expect(jobPanelState.job?.id).toBe(1)
  })

  it('支持显式恢复到候选人 tab，并在关闭时重置', async () => {
    mockFetchJobDetail.mockResolvedValue(makeJob(1))
    mockFetchJobApplications.mockResolvedValue({ items: [], total: 0, page: 1, page_size: 100 })

    await openJobPanel(1, { activeTab: 'candidates' })
    expect(jobPanelState.activeTab).toBe('candidates')

    setJobPanelActiveTab('jd')
    expect(jobPanelState.activeTab).toBe('jd')

    closeJobPanel()
    expect(jobPanelState.activeTab).toBe('basic')
  })
})
