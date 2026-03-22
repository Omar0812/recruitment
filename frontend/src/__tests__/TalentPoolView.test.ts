import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, type VueWrapper } from '@vue/test-utils'
import { createRouter, createMemoryHistory } from 'vue-router'
import TalentPoolView from '@/views/TalentPoolView.vue'

vi.mock('@/api/candidates', () => ({
  fetchCandidates: vi.fn(),
  fetchCandidateSkillOptions: vi.fn(),
  toggleStar: vi.fn(),
  fetchCandidate: vi.fn(),
  fetchCandidateApplications: vi.fn(),
  checkDuplicate: vi.fn(),
}))

vi.mock('@/api/channels', () => ({
  fetchSourceTags: vi.fn(),
  fetchSuppliers: vi.fn(),
}))

import {
  fetchCandidate,
  fetchCandidateApplications,
  fetchCandidates,
  fetchCandidateSkillOptions,
  toggleStar,
} from '@/api/candidates'
import { fetchSourceTags, fetchSuppliers } from '@/api/channels'
import {
  candidatePanelState,
  closeCandidatePanel,
  refreshCandidatePanel,
} from '@/composables/useCandidatePanel'

const mockFetchCandidate = vi.mocked(fetchCandidate)
const mockFetchApplications = vi.mocked(fetchCandidateApplications)
const mockFetch = vi.mocked(fetchCandidates)
const mockToggle = vi.mocked(toggleStar)
const mockFetchCandidateSkillOptions = vi.mocked(fetchCandidateSkillOptions)
const mockFetchSourceTags = vi.mocked(fetchSourceTags)
const mockFetchSuppliers = vi.mocked(fetchSuppliers)

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

const mountedWrappers: VueWrapper[] = []

async function mountView() {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [{ path: '/talent-pool', component: TalentPoolView }],
  })
  router.push('/talent-pool')
  await router.isReady()

  const wrapper = mount(TalentPoolView, {
    global: { plugins: [router] },
  })
  mountedWrappers.push(wrapper)
  return wrapper
}

async function mountViewAt(path: string) {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [{ path: '/talent-pool', component: TalentPoolView }],
  })
  router.push(path)
  await router.isReady()

  const wrapper = mount(TalentPoolView, {
    global: { plugins: [router] },
  })
  mountedWrappers.push(wrapper)
  return { wrapper, router }
}

describe('TalentPoolView', () => {
  beforeEach(() => {
    closeCandidatePanel()
    vi.clearAllMocks()
    mockFetch.mockResolvedValue({
      items: [makeCandidate(1), makeCandidate(2)],
      total: 2,
      page: 1,
      page_size: 20,
    })
    mockFetchCandidate.mockResolvedValue(makeCandidate(1))
    mockFetchApplications.mockResolvedValue({ items: [], total: 0, page: 1, page_size: 100 })
    mockFetchSourceTags.mockResolvedValue([{ id: 1, type: 'platform', name: '猎聘', sort_order: 1 }])
    mockFetchCandidateSkillOptions.mockResolvedValue(['Vue', 'Go'])
    mockFetchSuppliers.mockResolvedValue({
      items: [{ id: 1, name: '锐仕方达', type: null, contact_name: null, phone: null, email: null, notes: null, deleted_at: null, created_at: '2026-01-01T00:00:00Z', updated_at: null }],
      total: 1,
      page: 1,
      page_size: 100,
    })
  })

  afterEach(() => {
    while (mountedWrappers.length) {
      mountedWrappers.pop()!.unmount()
    }
  })

  it('renders filters and list', async () => {
    const wrapper = await mountView()
    await vi.waitFor(() => {
      expect(wrapper.find('.talent-pool-filters').exists()).toBe(true)
    })
    expect(wrapper.find('.candidate-list').exists() || wrapper.findAll('.candidate-card').length > 0).toBe(true)
  })

  it('loads candidates on mount', async () => {
    await mountView()
    await vi.waitFor(() => {
      expect(mockFetch).toHaveBeenCalledTimes(1)
    })
  })

  it('opens panel on card click', async () => {
    const wrapper = await mountView()
    await vi.waitFor(() => {
      expect(wrapper.findAll('.candidate-card').length).toBeGreaterThan(0)
    })
    await wrapper.find('.candidate-card').trigger('click')
    await vi.waitFor(() => {
      expect(candidatePanelState.isOpen).toBe(true)
      expect(candidatePanelState.candidateId).toBe(1)
    })
  })

  it('shows toast when star toggle fails', async () => {
    mockToggle.mockRejectedValue(new Error('星标更新失败'))
    const wrapper = await mountView()
    await vi.waitFor(() => {
      expect(wrapper.findAll('.star-button').length).toBeGreaterThan(0)
    })
    await wrapper.find('.star-button').trigger('click')
    await vi.waitFor(() => {
      expect(wrapper.find('.talent-pool-view__toast').text()).toContain('星标更新失败')
    })
  })

  it('filter update triggers reload', async () => {
    const wrapper = await mountView()
    await vi.waitFor(() => {
      expect(wrapper.find('.talent-pool-filters').exists()).toBe(true)
    })

    mockFetch.mockResolvedValue({ items: [], total: 0, page: 1, page_size: 20 })
    const selects = wrapper.findAll('.filters__select')
    await selects[0].setValue('本科') // education

    await vi.waitFor(() => {
      expect(mockFetch).toHaveBeenCalledTimes(2) // initial + filter
    })
  })

  it('加载并展示技能筛选候选选项', async () => {
    const wrapper = await mountView()
    await vi.waitFor(() => {
      expect(mockFetchCandidateSkillOptions).toHaveBeenCalledTimes(1)
    })

    await wrapper.find('.filters__tag-input').trigger('focus')
    const options = wrapper.findAll('.filter-multi-select__option')
    expect(options.map((option) => option.text())).toContain('Vue')
    expect(options.map((option) => option.text())).toContain('Go')
  })

  it('reloads list after candidate panel mutation', async () => {
    const wrapper = await mountView()
    await vi.waitFor(() => {
      expect(wrapper.findAll('.candidate-card').length).toBeGreaterThan(0)
    })

    await wrapper.find('.candidate-card').trigger('click')
    await vi.waitFor(() => {
      expect(candidatePanelState.isOpen).toBe(true)
    })

    mockFetch.mockResolvedValueOnce({ items: [], total: 0, page: 1, page_size: 20 })
    const fetchCallsBeforeMutation = mockFetch.mock.calls.length
    await refreshCandidatePanel({ markMutation: true })

    await vi.waitFor(() => {
      expect(mockFetch).toHaveBeenCalledTimes(fetchCallsBeforeMutation + 1)
    })
  })

  it('读取 pipeline_status query 初始化无流程筛选', async () => {
    const { wrapper } = await mountViewAt('/talent-pool?pipeline_status=none')

    await vi.waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        expect.objectContaining({ pipeline_status: 'none' }),
        1,
        20,
      )
    })

    expect(wrapper.text()).toContain('流程: 无流程')
  })

  it('路由 query 变化时同步刷新 pipeline_status 筛选', async () => {
    const { router } = await mountViewAt('/talent-pool')

    await vi.waitFor(() => {
      expect(mockFetch).toHaveBeenCalledTimes(1)
    })

    await router.push('/talent-pool?pipeline_status=ended')

    await vi.waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        expect.objectContaining({ pipeline_status: 'ended' }),
        1,
        20,
      )
    })
  })
})
