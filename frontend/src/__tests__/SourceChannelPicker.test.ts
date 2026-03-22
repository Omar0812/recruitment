import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'

vi.mock('@/api/channels', () => ({
  fetchSourceTags: vi.fn(),
  fetchSuppliers: vi.fn(),
  createSourceTag: vi.fn(),
  createSupplier: vi.fn(),
  splitSourceTags: (tags: Array<{ type?: string; name: string }>) => ({
    platformTags: tags.filter((tag) => tag.type === 'platform'),
    otherTags: tags.filter((tag) => tag.type === 'other'),
  }),
}))

import SourceChannelPicker from '@/components/candidate-create/SourceChannelPicker.vue'
import { createSourceTag, createSupplier, fetchSourceTags, fetchSuppliers } from '@/api/channels'

const mockFetchSourceTags = vi.mocked(fetchSourceTags)
const mockFetchSuppliers = vi.mocked(fetchSuppliers)
const mockCreateSourceTag = vi.mocked(createSourceTag)
const mockCreateSupplier = vi.mocked(createSupplier)

const sampleTags = [
  { id: 1, type: 'platform', name: 'BOSS直聘', sort_order: 1 },
  { id: 2, type: 'platform', name: '拉勾', sort_order: 2 },
  { id: 3, type: 'other', name: '线下招聘会', sort_order: 1 },
  { id: 4, type: 'other', name: '公司官网', sort_order: 2 },
]

const sampleSuppliers = [
  { id: 10, name: 'ABC猎头', type: null, contact_name: null, phone: null, email: null, notes: null, deleted_at: null, created_at: '2026-01-01T00:00:00Z', updated_at: null },
  { id: 11, name: 'XYZ人力', type: null, contact_name: null, phone: null, email: null, notes: null, deleted_at: '2025-12-31T00:00:00Z', created_at: '2025-01-01T00:00:00Z', updated_at: null },
]

function mountPicker(props = {}) {
  return mount(SourceChannelPicker, {
    props: {
      modelValue: undefined,
      supplierId: undefined,
      referredBy: undefined,
      ...props,
    },
  })
}

describe('SourceChannelPicker', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('渲染四个渠道标签', () => {
    const wrapper = mountPicker()
    const tabs = wrapper.findAll('.channel-tab')
    expect(tabs).toHaveLength(4)
    expect(tabs[0].text()).toBe('招聘平台')
    expect(tabs[1].text()).toBe('猎头')
    expect(tabs[2].text()).toBe('内推')
    expect(tabs[3].text()).toBe('其他')
  })

  it('点击招聘平台加载标签并显示平台列表', async () => {
    mockFetchSourceTags.mockResolvedValue(sampleTags)
    const wrapper = mountPicker()

    const platformTab = wrapper.findAll('.channel-tab')[0]
    await platformTab.trigger('click')
    await flushPromises()

    expect(mockFetchSourceTags).toHaveBeenCalledTimes(1)
    expect(wrapper.text()).toContain('BOSS直聘')
    expect(wrapper.text()).toContain('拉勾')
    // 不显示 other 类型
    expect(wrapper.text()).not.toContain('线下招聘会')
  })

  it('点击猎头加载供应商并显示猎头列表', async () => {
    mockFetchSuppliers.mockResolvedValue({ items: sampleSuppliers, total: 2, page: 1, page_size: 100 })
    const wrapper = mountPicker()

    const headhunterTab = wrapper.findAll('.channel-tab')[1]
    await headhunterTab.trigger('click')
    await flushPromises()

    expect(mockFetchSuppliers).toHaveBeenCalledTimes(1)
    expect(wrapper.text()).toContain('ABC猎头')
    expect(wrapper.text()).toContain('XYZ人力')
  })

  it('点击内推显示内推输入框并 emit 内推作为来源', async () => {
    const wrapper = mountPicker()

    const referralTab = wrapper.findAll('.channel-tab')[2]
    await referralTab.trigger('click')

    expect(wrapper.emitted('update:modelValue')).toBeTruthy()
    expect(wrapper.emitted('update:modelValue')![0][0]).toBe('内推')

    // 显示内推人输入框
    const input = wrapper.find('.sub-input input')
    expect(input.exists()).toBe(true)
    expect(input.attributes('placeholder')).toBe('内推人姓名')
  })

  it('点击其他加载标签并显示其他列表', async () => {
    mockFetchSourceTags.mockResolvedValue(sampleTags)
    const wrapper = mountPicker()

    const otherTab = wrapper.findAll('.channel-tab')[3]
    await otherTab.trigger('click')
    await flushPromises()

    expect(wrapper.text()).toContain('线下招聘会')
    expect(wrapper.text()).toContain('公司官网')
    // 不显示 platform 类型
    expect(wrapper.text()).not.toContain('BOSS直聘')
  })

  it('选择平台触发 update:modelValue', async () => {
    mockFetchSourceTags.mockResolvedValue(sampleTags)
    const wrapper = mountPicker()

    await wrapper.findAll('.channel-tab')[0].trigger('click')
    await flushPromises()

    const option = wrapper.findAll('.sub-option').find((o) => o.text() === 'BOSS直聘')
    await option!.trigger('click')

    const emitted = wrapper.emitted('update:modelValue')
    expect(emitted).toBeTruthy()
    // 最后一次 emit 应该是 BOSS直聘
    expect(emitted![emitted!.length - 1][0]).toBe('BOSS直聘')
  })

  it('选择猎头触发 update:supplierId 和 update:modelValue', async () => {
    mockFetchSuppliers.mockResolvedValue({ items: sampleSuppliers, total: 2, page: 1, page_size: 100 })
    const wrapper = mountPicker()

    await wrapper.findAll('.channel-tab')[1].trigger('click')
    await flushPromises()

    const option = wrapper.findAll('.sub-option').find((o) => o.text().includes('ABC猎头'))
    await option!.trigger('click')

    const supplierEmitted = wrapper.emitted('update:supplierId')
    expect(supplierEmitted).toBeTruthy()
    expect(supplierEmitted![0][0]).toBe(10)

    const modelEmitted = wrapper.emitted('update:modelValue')
    expect(modelEmitted).toBeTruthy()
    expect(modelEmitted![modelEmitted!.length - 1][0]).toBe('ABC猎头')
  })

  it('过期猎头显示已到期标签', async () => {
    mockFetchSuppliers.mockResolvedValue({ items: sampleSuppliers, total: 2, page: 1, page_size: 100 })
    const wrapper = mountPicker()

    await wrapper.findAll('.channel-tab')[1].trigger('click')
    await flushPromises()

    const expiredBadge = wrapper.find('.expired-badge')
    expect(expiredBadge.exists()).toBe(true)
    expect(expiredBadge.text()).toBe('已到期')
  })

  it('无平台时显示暂无平台', async () => {
    mockFetchSourceTags.mockResolvedValue([])
    const wrapper = mountPicker()

    await wrapper.findAll('.channel-tab')[0].trigger('click')
    await flushPromises()

    expect(wrapper.text()).toContain('暂无平台')
  })

  it('无猎头时显示暂无猎头', async () => {
    mockFetchSuppliers.mockResolvedValue({ items: [], total: 0, page: 1, page_size: 100 })
    const wrapper = mountPicker()

    await wrapper.findAll('.channel-tab')[1].trigger('click')
    await flushPromises()

    expect(wrapper.text()).toContain('暂无猎头')
  })

  it('平台列表支持搜索过滤', async () => {
    mockFetchSourceTags.mockResolvedValue(sampleTags)
    const wrapper = mountPicker()

    await wrapper.findAll('.channel-tab')[0].trigger('click')
    await flushPromises()
    await wrapper.find('input[placeholder="搜索平台"]').setValue('拉')

    expect(wrapper.findAll('.sub-option').map((option) => option.text())).toEqual(['拉勾'])
  })

  it('其他来源支持搜索过滤', async () => {
    mockFetchSourceTags.mockResolvedValue(sampleTags)
    const wrapper = mountPicker()

    await wrapper.findAll('.channel-tab')[3].trigger('click')
    await flushPromises()
    await wrapper.find('input[placeholder="搜索其他来源"]').setValue('官网')

    expect(wrapper.findAll('.sub-option').map((option) => option.text())).toEqual(['公司官网'])
  })

  it('平台支持内联新增并自动选中', async () => {
    mockFetchSourceTags.mockResolvedValue(sampleTags)
    mockCreateSourceTag.mockResolvedValue({ id: 5, type: 'platform', name: '脉脉', sort_order: 3 })
    const wrapper = mountPicker()

    await wrapper.findAll('.channel-tab')[0].trigger('click')
    await flushPromises()
    await wrapper.findAll('.sub-add')[0].trigger('click')
    await wrapper.find('input[placeholder="平台名称"]').setValue('脉脉')
    await wrapper.findAll('button').find((button) => button.text() === '保存')!.trigger('click')
    await flushPromises()

    expect(mockCreateSourceTag).toHaveBeenCalledWith('脉脉', 'platform')
    expect(wrapper.findAll('.sub-option').map((option) => option.text())).toContain('脉脉')
    const modelEmitted = wrapper.emitted('update:modelValue')
    expect(modelEmitted).toBeTruthy()
    expect(modelEmitted![modelEmitted.length - 1][0]).toBe('脉脉')
  })

  it('猎头支持内联新增并自动选中', async () => {
    mockFetchSuppliers.mockResolvedValue({ items: sampleSuppliers, total: 2, page: 1, page_size: 100 })
    mockCreateSupplier.mockResolvedValue({
      id: 12,
      name: '新增猎头',
      type: null,
      contact_name: null,
      phone: null,
      email: null,
      notes: null,
      deleted_at: null,
      created_at: '2026-01-01T00:00:00Z',
      updated_at: null,
    })
    const wrapper = mountPicker()

    await wrapper.findAll('.channel-tab')[1].trigger('click')
    await flushPromises()
    await wrapper.findAll('.sub-add')[0].trigger('click')
    await wrapper.find('input[placeholder="猎头公司名称"]').setValue('新增猎头')
    await wrapper.findAll('button').find((button) => button.text() === '保存')!.trigger('click')
    await flushPromises()

    expect(mockCreateSupplier).toHaveBeenCalledWith('新增猎头')
    expect(wrapper.findAll('.sub-option').map((option) => option.text())).toContain('新增猎头')
    const supplierEmitted = wrapper.emitted('update:supplierId')
    expect(supplierEmitted).toBeTruthy()
    expect(supplierEmitted![supplierEmitted.length - 1][0]).toBe(12)
  })

  it('其他来源支持内联新增并自动选中', async () => {
    mockFetchSourceTags.mockResolvedValue(sampleTags)
    mockCreateSourceTag.mockResolvedValue({ id: 6, type: 'other', name: '宣讲会', sort_order: 3 })
    const wrapper = mountPicker()

    await wrapper.findAll('.channel-tab')[3].trigger('click')
    await flushPromises()
    await wrapper.findAll('.sub-add')[0].trigger('click')
    await wrapper.find('input[placeholder="来源名称"]').setValue('宣讲会')
    await wrapper.findAll('button').find((button) => button.text() === '保存')!.trigger('click')
    await flushPromises()

    expect(mockCreateSourceTag).toHaveBeenCalledWith('宣讲会', 'other')
    expect(wrapper.findAll('.sub-option').map((option) => option.text())).toContain('宣讲会')
    const modelEmitted = wrapper.emitted('update:modelValue')
    expect(modelEmitted).toBeTruthy()
    expect(modelEmitted![modelEmitted.length - 1][0]).toBe('宣讲会')
  })
})
