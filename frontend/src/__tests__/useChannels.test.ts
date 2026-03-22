import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/api/channels', () => ({
  fetchSuppliers: vi.fn(),
  fetchSourceTags: vi.fn(),
  fetchSourceTagStats: vi.fn(),
  fetchSupplierStats: vi.fn(),
  fetchExpenses: vi.fn(),
  fetchCandidatesBySupplier: vi.fn(),
  fetchCandidatesBySource: vi.fn(),
  createSupplier: vi.fn(),
  updateSupplier: vi.fn(),
  deleteSupplier: vi.fn(),
  createSourceTag: vi.fn(),
  updateSourceTag: vi.fn(),
  deleteSourceTag: vi.fn(),
  reorderSourceTags: vi.fn(),
  createExpense: vi.fn(),
  updateExpense: vi.fn(),
  deleteExpense: vi.fn(),
}))

import {
  createSourceTag,
  fetchCandidatesBySupplier,
  fetchExpenses,
  fetchSupplierStats,
  reorderSourceTags,
} from '@/api/channels'
import { useChannels } from '@/composables/useChannels'

const mockCreateSourceTag = vi.mocked(createSourceTag)
const mockFetchCandidatesBySupplier = vi.mocked(fetchCandidatesBySupplier)
const mockFetchExpenses = vi.mocked(fetchExpenses)
const mockFetchSupplierStats = vi.mocked(fetchSupplierStats)
const mockReorderSourceTags = vi.mocked(reorderSourceTags)

const supplier = {
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
  deleted_at: null,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
  candidate_count: 0,
  hired_count: 0,
}

describe('useChannels', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    const { state } = useChannels()
    state.suppliers = []
    state.sourceTags = []
    state.sourceTagStats = []
    state.loading = false
    state.error = null
    state.panel = null
  })

  it('supplier 面板请求成功时保留空数据语义', async () => {
    mockFetchCandidatesBySupplier.mockResolvedValue({ items: [], total: 0, page: 1, page_size: 100 })
    mockFetchExpenses.mockResolvedValue({ items: [], total: 0, page: 1, page_size: 100 })
    mockFetchSupplierStats.mockResolvedValue({ supplier_id: 1, candidate_count: 0, hired_count: 0 })

    const { state, openSupplierPanel } = useChannels()
    const opening = openSupplierPanel(supplier as any)

    expect(state.panel?.loading).toBe(true)
    expect(state.panel?.error).toBeNull()

    await opening

    expect(state.panel?.loading).toBe(false)
    expect(state.panel?.error).toBeNull()
    expect(state.panel?.candidates).toEqual([])
    expect(state.panel?.expenses).toEqual([])
  })

  it('supplier 面板请求失败时记录错误而不是伪装成空数据', async () => {
    mockFetchCandidatesBySupplier.mockRejectedValue(new Error('加载渠道详情失败'))
    mockFetchExpenses.mockResolvedValue({ items: [], total: 0, page: 1, page_size: 100 })
    mockFetchSupplierStats.mockResolvedValue({ supplier_id: 1, candidate_count: 0, hired_count: 0 })

    const { state, openSupplierPanel } = useChannels()
    const opening = openSupplierPanel(supplier as any)

    expect(state.panel?.loading).toBe(true)
    expect(state.panel?.error).toBeNull()

    await opening

    expect(state.panel?.loading).toBe(false)
    expect(state.panel?.error).toBe('加载渠道详情失败')
    expect(state.panel?.candidates).toEqual([])
    expect(state.panel?.expenses).toEqual([])
  })

  it('source-tag 重名时直接阻止创建', async () => {
    const { state, addSourceTag } = useChannels()
    state.sourceTags = [
      { id: 10, type: 'platform', name: 'Boss直聘', sort_order: 0 },
    ]

    await expect(addSourceTag('Boss直聘')).rejects.toThrow('已存在')
    expect(mockCreateSourceTag).not.toHaveBeenCalled()
  })

  it('source-tag 排序后更新本地顺序', async () => {
    mockReorderSourceTags.mockResolvedValue(undefined)

    const { state, applySourceTagReorder } = useChannels()
    state.sourceTags = [
      { id: 10, type: 'platform', name: 'Boss直聘', sort_order: 0 },
      { id: 11, type: 'other', name: '内推', sort_order: 1 },
    ]

    await applySourceTagReorder([
      { id: 11, sort_order: 0 },
      { id: 10, sort_order: 1 },
    ])

    expect(state.sourceTags.map((item) => item.id)).toEqual([11, 10])
  })
})
