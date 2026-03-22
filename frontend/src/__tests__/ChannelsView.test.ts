import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import ChannelsView from '@/views/ChannelsView.vue'
import { useChannels } from '@/composables/useChannels'
import { useCandidatePanel } from '@/composables/useCandidatePanel'

const mockRoute = { query: {} as Record<string, unknown> }
const mockReplace = vi.fn()

vi.mock('vue-router', () => ({
  useRoute: () => mockRoute,
  useRouter: () => ({ replace: mockReplace }),
}))

vi.mock('@/composables/useChannels')
vi.mock('@/composables/useCandidatePanel')

describe('ChannelsView', () => {
  const mockSuppliers = [
    {
      id: 1,
      name: '猎头A',
      type: 'headhunter',
      contact_name: '李四',
      phone: '13800138000',
      email: null,
      notes: null,
      owner: null,
      guarantee_months: 3,
      contract_start: '2026-01-01',
      contract_end: '2026-12-31',
      contract_terms: null,
      candidate_count: 5,
      hired_count: 2,
      deleted_at: null,
      created_at: '2026-01-01T00:00:00',
      updated_at: null,
    },
  ]

  const mockSourceTags = [
    { id: 10, type: 'platform', name: 'Boss直聘', sort_order: 0 },
    { id: 11, type: 'other', name: '内推', sort_order: 1 },
  ]

  const mockTagStats = [
    { id: 10, name: 'Boss直聘', candidate_count: 5, hired_count: 2 },
    { id: 11, name: '内推', candidate_count: 3, hired_count: 1 },
  ]

  function buildChannelsMock(overrides: Record<string, unknown> = {}) {
    return {
      state: {
        suppliers: mockSuppliers,
        sourceTags: mockSourceTags,
        sourceTagStats: mockTagStats,
        loading: false,
        error: null,
        panel: null,
      },
      loadAll: vi.fn(),
      openCreateSupplierPanel: vi.fn(),
      openSupplierPanel: vi.fn(),
      openSourceTagPanel: vi.fn(),
      startEditingSupplier: vi.fn(),
      closeSupplierForm: vi.fn(),
      closePanel: vi.fn(),
      addSupplier: vi.fn(),
      editSupplier: vi.fn(),
      removeSupplier: vi.fn(),
      addSourceTag: vi.fn(),
      editSourceTag: vi.fn(),
      removeSourceTag: vi.fn(),
      applySourceTagReorder: vi.fn(),
      addExpense: vi.fn(),
      editExpense: vi.fn(),
      removeExpense: vi.fn(),
      ...overrides,
    } as any
  }

  beforeEach(() => {
    mockRoute.query = {}
    mockReplace.mockReset()
    vi.mocked(useChannels).mockReturnValue(buildChannelsMock())

    vi.mocked(useCandidatePanel).mockReturnValue({
      state: { isOpen: false, candidateId: null, loading: false, candidate: null, applications: [], returnToJobId: null },
      open: vi.fn(),
      close: vi.fn(),
      refresh: vi.fn(),
    } as any)
  })

  it('渲染渠道页标题', () => {
    const wrapper = mount(ChannelsView)
    expect(wrapper.find('h1').text()).toBe('渠道')
  })

  it('无面板时显示选择提示', () => {
    const wrapper = mount(ChannelsView)
    expect(wrapper.find('.no-selection').text()).toContain('选择一个渠道')
  })

  it('加载时显示加载状态', () => {
    vi.mocked(useChannels).mockReturnValue(buildChannelsMock({
      state: {
        suppliers: [],
        sourceTags: [],
        sourceTagStats: [],
        loading: true,
        error: null,
        panel: null,
      },
    }))

    const wrapper = mount(ChannelsView)
    expect(wrapper.find('.loading').text()).toBe('加载中...')
  })

  it('挂载时调用 loadAll', () => {
    const loadAll = vi.fn()
    vi.mocked(useChannels).mockReturnValue(buildChannelsMock({
      state: {
        suppliers: [],
        sourceTags: [],
        sourceTagStats: [],
        loading: false,
        error: null,
        panel: null,
      },
      loadAll,
    }))

    mount(ChannelsView)
    expect(loadAll).toHaveBeenCalled()
  })

  it('有面板时渲染 ChannelPanel', () => {
    vi.mocked(useChannels).mockReturnValue(buildChannelsMock({
      state: {
        suppliers: mockSuppliers,
        sourceTags: mockSourceTags,
        sourceTagStats: mockTagStats,
        loading: false,
        error: null,
        panel: {
          type: 'supplier',
          mode: 'view',
          id: 1,
          name: '猎头A',
          supplier: mockSuppliers[0],
          candidates: [],
          expenses: [],
          stats: { candidate_count: 5, hired_count: 2 },
          loading: false,
          error: null,
        },
      },
    }))

    const wrapper = mount(ChannelsView)
    expect(wrapper.findComponent({ name: 'ChannelPanel' }).exists()).toBe(true)
  })

  it('点击猎头 Section 的新增按钮时打开 supplier 表单面板', async () => {
    const channelsMock = buildChannelsMock()
    vi.mocked(useChannels).mockReturnValue(channelsMock)

    const wrapper = mount(ChannelsView)
    const addButton = wrapper.findAll('button').find((button) => button.text() === '+ 新增')

    expect(addButton).toBeTruthy()
    await addButton!.trigger('click')

    expect(channelsMock.openCreateSupplierPanel).toHaveBeenCalled()
  })

  it('带渠道 query 挂载时自动打开对应 supplier 面板', async () => {
    const openSupplierPanel = vi.fn().mockResolvedValue(undefined)
    vi.mocked(useChannels).mockReturnValue(buildChannelsMock({ openSupplierPanel }))
    mockRoute.query = { panel_type: 'supplier', panel_id: '1' }

    mount(ChannelsView)
    await flushPromises()

    expect(openSupplierPanel).toHaveBeenCalledWith(expect.objectContaining({ id: 1, name: '猎头A' }))
    expect(mockReplace).toHaveBeenCalledWith({ query: {} })
  })
})
