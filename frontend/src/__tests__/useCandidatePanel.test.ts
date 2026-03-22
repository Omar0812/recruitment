import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/api/candidates', () => ({
  fetchCandidate: vi.fn(),
  fetchCandidateApplications: vi.fn(),
  checkDuplicate: vi.fn(),
}))

import { fetchCandidate, fetchCandidateApplications } from '@/api/candidates'
import {
  openCandidatePanel,
  closeCandidatePanel,
  candidatePanelState,
  refreshCandidatePanel,
} from '@/composables/useCandidatePanel'

const mockFetchCandidate = vi.mocked(fetchCandidate)
const mockFetchApplications = vi.mocked(fetchCandidateApplications)

function makeCandidate(id: number) {
  return {
    id,
    name: `候选人${id}`,
    phone: '13800000000',
    email: null,
    source: null,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    name_en: null,
    age: 28,
    education: '本科',
    school: '清华大学',
    last_company: '字节跳动',
    last_title: '后端工程师',
    years_exp: 5,
    skill_tags: ['Go', 'Python'],
    education_list: [],
    work_experience: [],
    project_experience: [],
    notes: null,
    blacklisted: false,
    blacklist_reason: null,
    blacklist_note: null,
    resume_path: null,
    starred: 0,
    supplier_id: null,
    referred_by: null,
    merged_into: null,
  }
}

describe('useCandidatePanel', () => {
  beforeEach(() => {
    closeCandidatePanel()
    vi.clearAllMocks()
  })

  it('初始状态为关闭', () => {
    expect(candidatePanelState.isOpen).toBe(false)
    expect(candidatePanelState.candidateId).toBeNull()
    expect(candidatePanelState.error).toBeNull()
    expect(candidatePanelState.candidate).toBeNull()
  })

  it('openCandidatePanel 打开面板并设置 candidateId', async () => {
    const candidate = makeCandidate(1)
    mockFetchCandidate.mockResolvedValue(candidate)
    mockFetchApplications.mockResolvedValue({ items: [], total: 0, page: 1, page_size: 100 })

    openCandidatePanel(1)

    expect(candidatePanelState.isOpen).toBe(true)
    expect(candidatePanelState.candidateId).toBe(1)
    expect(candidatePanelState.loading).toBe(true)

    // Wait for data load
    await vi.waitFor(() => {
      expect(candidatePanelState.loading).toBe(false)
    })

    expect(candidatePanelState.candidate).toEqual(candidate)
    expect(candidatePanelState.applications).toEqual([])
  })

  it('加载失败时记录错误状态', async () => {
    mockFetchCandidate.mockRejectedValue(new Error('候选人详情加载失败，请重试'))
    mockFetchApplications.mockResolvedValue({ items: [], total: 0, page: 1, page_size: 100 })

    openCandidatePanel(1)

    await vi.waitFor(() => {
      expect(candidatePanelState.loading).toBe(false)
    })

    expect(candidatePanelState.error).toBe('候选人详情加载失败，请重试')
    expect(candidatePanelState.candidate).toBeNull()
  })

  it('重试成功后清除错误并恢复数据', async () => {
    mockFetchCandidate.mockRejectedValueOnce(new Error('候选人详情加载失败，请重试'))
    mockFetchApplications.mockResolvedValue({ items: [], total: 0, page: 1, page_size: 100 })

    openCandidatePanel(1)
    await vi.waitFor(() => {
      expect(candidatePanelState.loading).toBe(false)
    })

    mockFetchCandidate.mockResolvedValueOnce(makeCandidate(1))

    await refreshCandidatePanel()

    expect(candidatePanelState.error).toBeNull()
    expect(candidatePanelState.candidate?.id).toBe(1)
  })

  it('closeCandidatePanel 关闭面板并清空状态', async () => {
    mockFetchCandidate.mockResolvedValue(makeCandidate(1))
    mockFetchApplications.mockResolvedValue({ items: [], total: 0, page: 1, page_size: 100 })

    openCandidatePanel(1)
    await vi.waitFor(() => expect(candidatePanelState.loading).toBe(false))

    closeCandidatePanel()

    expect(candidatePanelState.isOpen).toBe(false)
    expect(candidatePanelState.candidateId).toBeNull()
    expect(candidatePanelState.candidate).toBeNull()
    expect(candidatePanelState.applications).toEqual([])
  })

  it('重复打开相同候选人不重新加载', () => {
    mockFetchCandidate.mockResolvedValue(makeCandidate(1))
    mockFetchApplications.mockResolvedValue({ items: [], total: 0, page: 1, page_size: 100 })

    openCandidatePanel(1)
    openCandidatePanel(1)

    expect(mockFetchCandidate).toHaveBeenCalledTimes(1)
  })

  it('切换候选人时重置数据并重新加载', async () => {
    const c1 = makeCandidate(1)
    const c2 = makeCandidate(2)
    mockFetchCandidate.mockResolvedValueOnce(c1).mockResolvedValueOnce(c2)
    mockFetchApplications.mockResolvedValue({ items: [], total: 0, page: 1, page_size: 100 })

    openCandidatePanel(1)
    await vi.waitFor(() => expect(candidatePanelState.loading).toBe(false))

    openCandidatePanel(2)
    expect(candidatePanelState.candidateId).toBe(2)
    expect(candidatePanelState.candidate).toBeNull() // Reset before load

    await vi.waitFor(() => expect(candidatePanelState.loading).toBe(false))
    expect(candidatePanelState.candidate?.id).toBe(2)
  })

  it('加载候选人的 Applications', async () => {
    mockFetchCandidate.mockResolvedValue(makeCandidate(1))
    const apps = [
      { id: 10, candidate_id: 1, job_id: 5, state: 'IN_PROGRESS', outcome: null, stage: '面试', created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z' },
    ]
    mockFetchApplications.mockResolvedValue({ items: apps, total: 1, page: 1, page_size: 100 })

    openCandidatePanel(1)
    await vi.waitFor(() => expect(candidatePanelState.loading).toBe(false))

    expect(candidatePanelState.applications).toEqual(apps)
  })
})
