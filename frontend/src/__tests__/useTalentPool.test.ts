import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/api/candidates', () => ({
  fetchCandidates: vi.fn(),
  toggleStar: vi.fn(),
}))

import { fetchCandidates, toggleStar } from '@/api/candidates'
import { useTalentPool } from '@/composables/useTalentPool'

const mockFetchCandidates = vi.mocked(fetchCandidates)
const mockToggleStar = vi.mocked(toggleStar)

function makeCandidate(id: number, overrides: Record<string, any> = {}) {
  return {
    id,
    name: `候选人${id}`,
    phone: null,
    email: null,
    source: null,
    name_en: null,
    age: null,
    education: null,
    school: null,
    last_company: null,
    last_title: null,
    years_exp: null,
    skill_tags: [],
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
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    latest_application: null,
    ...overrides,
  }
}

function mockResponse(items: any[] = [], total = 0) {
  mockFetchCandidates.mockResolvedValue({
    items,
    total,
    page: 1,
    page_size: 20,
  })
}

describe('useTalentPool', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockResponse()
  })

  it('loads data on init', async () => {
    const candidates = [makeCandidate(1), makeCandidate(2)]
    mockResponse(candidates, 2)

    const { state } = useTalentPool()
    await vi.waitFor(() => expect(state.loading).toBe(false))

    expect(state.items).toHaveLength(2)
    expect(state.total).toBe(2)
    expect(mockFetchCandidates).toHaveBeenCalledTimes(1)
  })

  it('setFilters resets page and reloads', async () => {
    const { state, setFilters } = useTalentPool()
    await vi.waitFor(() => expect(state.loading).toBe(false))

    mockResponse([makeCandidate(3)], 1)
    setFilters({ education: '本科' })
    await vi.waitFor(() => expect(state.loading).toBe(false))

    expect(state.filters.education).toBe('本科')
    expect(state.page).toBe(1)
    expect(mockFetchCandidates).toHaveBeenCalledWith(
      expect.objectContaining({ education: '本科' }),
      1,
      20,
    )
  })

  it('setPage loads requested page', async () => {
    const { state, setPage } = useTalentPool()
    await vi.waitFor(() => expect(state.loading).toBe(false))

    mockResponse([makeCandidate(21)], 25)
    setPage(2)
    await vi.waitFor(() => expect(state.loading).toBe(false))

    expect(state.page).toBe(2)
    expect(mockFetchCandidates).toHaveBeenCalledWith({}, 2, 20)
  })

  it('clearFilters resets all filters', async () => {
    const { state, setFilters, clearFilters } = useTalentPool()
    await vi.waitFor(() => expect(state.loading).toBe(false))

    setFilters({ education: '硕士', starred: true })
    await vi.waitFor(() => expect(state.loading).toBe(false))

    clearFilters()
    await vi.waitFor(() => expect(state.loading).toBe(false))

    expect(state.filters).toEqual({})
  })

  it('handleToggleStar optimistically updates', async () => {
    const candidates = [makeCandidate(1, { starred: 0 })]
    mockResponse(candidates, 1)
    mockToggleStar.mockResolvedValue({ starred: true })

    const { state, handleToggleStar } = useTalentPool()
    await vi.waitFor(() => expect(state.loading).toBe(false))

    await handleToggleStar(1)
    expect(state.items[0].starred).toBe(1)
  })

  it('handleToggleStar reverts on failure', async () => {
    const candidates = [makeCandidate(1, { starred: 0 })]
    mockResponse(candidates, 1)
    mockToggleStar.mockRejectedValue(new Error('fail'))

    const { state, handleToggleStar } = useTalentPool()
    await vi.waitFor(() => expect(state.loading).toBe(false))

    await handleToggleStar(1)
    expect(state.items[0].starred).toBe(0)
  })

  it('handleToggleStar stores toast without overwriting load error', async () => {
    const candidates = [makeCandidate(1, { starred: 0 })]
    mockResponse(candidates, 1)
    mockToggleStar.mockRejectedValue(new Error('星标更新失败'))

    const { state, handleToggleStar, clearToast } = useTalentPool()
    await vi.waitFor(() => expect(state.loading).toBe(false))

    state.error = '列表加载失败'
    await handleToggleStar(1)

    expect(state.error).toBe('列表加载失败')
    expect(state.toast).toBe('星标更新失败')

    clearToast()
    expect(state.toast).toBeNull()
  })

  it('setSearch debounces', async () => {
    vi.useFakeTimers()
    const { state, setSearch } = useTalentPool()

    // Wait for initial load
    await vi.runAllTimersAsync()

    mockResponse([makeCandidate(5)], 1)
    setSearch('张')
    setSearch('张三')

    // Before debounce fires
    expect(mockFetchCandidates).toHaveBeenCalledTimes(1) // only initial

    await vi.advanceTimersByTimeAsync(300)
    expect(mockFetchCandidates).toHaveBeenCalledTimes(2)
    expect(state.filters.search).toBe('张三')

    vi.useRealTimers()
  })

  it('handles API error', async () => {
    mockFetchCandidates.mockRejectedValue(new Error('网络错误'))

    const { state } = useTalentPool()
    await vi.waitFor(() => expect(state.loading).toBe(false))

    expect(state.error).toBe('网络错误')
    expect(state.items).toHaveLength(0)
  })

  it('uses initial filters on first load', async () => {
    useTalentPool({ pipeline_status: 'none' })

    await vi.waitFor(() => {
      expect(mockFetchCandidates).toHaveBeenCalledWith(
        expect.objectContaining({ pipeline_status: 'none' }),
        1,
        20,
      )
    })
  })
})
