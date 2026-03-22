import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import HiredView from '@/views/HiredView.vue'
import { useHired } from '@/composables/useHired'
import { useCandidatePanel } from '@/composables/useCandidatePanel'

vi.mock('@/composables/useHired')
vi.mock('@/composables/useCandidatePanel')

describe('HiredView', () => {
  const mockItems = [
    {
      application_id: 1,
      candidate_id: 10,
      candidate_name: '张三',
      job_id: 5,
      job_title: '前端工程师',
      hire_date: '2026-03-01',
      monthly_salary: 30000,
      salary_months: 13,
      total_cash: 390000,
      source: 'Boss直聘',
      supplier_id: null,
    },
  ]

  beforeEach(() => {
    vi.mocked(useHired).mockReturnValue({
      state: {
        items: mockItems,
        loading: false,
        error: null,
        total: 1,
      },
      load: vi.fn(),
    } as any)

    vi.mocked(useCandidatePanel).mockReturnValue({
      state: { isOpen: false, candidateId: null, loading: false, candidate: null, applications: [], returnToJobId: null },
      open: vi.fn(),
      close: vi.fn(),
      refresh: vi.fn(),
    } as any)
  })

  it('渲染已入职页标题', () => {
    const wrapper = mount(HiredView)
    expect(wrapper.find('h1').text()).toBe('已入职')
  })

  it('渲染已入职列表', () => {
    const wrapper = mount(HiredView)
    const rows = wrapper.findAll('.hired-row')
    expect(rows.length).toBe(1)
    expect(rows[0].find('.name-cell').text()).toBe('张三')
  })

  it('点击行打开候选人面板', async () => {
    const openFn = vi.fn()
    vi.mocked(useCandidatePanel).mockReturnValue({
      state: { isOpen: false, candidateId: null, loading: false, candidate: null, applications: [], returnToJobId: null },
      open: openFn,
      close: vi.fn(),
      refresh: vi.fn(),
    } as any)

    const wrapper = mount(HiredView)
    await wrapper.find('.hired-row').trigger('click')
    expect(openFn).toHaveBeenCalledWith(10)
  })

  it('空状态显示', () => {
    vi.mocked(useHired).mockReturnValue({
      state: { items: [], loading: false, error: null, total: 0 },
      load: vi.fn(),
    } as any)

    const wrapper = mount(HiredView)
    expect(wrapper.find('.empty-state').text()).toContain('暂无已入职人员')
    expect(wrapper.text()).not.toContain('暂无已入职记录')
  })

  it('加载时显示加载状态', () => {
    vi.mocked(useHired).mockReturnValue({
      state: { items: [], loading: true, error: null, total: 0 },
      load: vi.fn(),
    } as any)

    const wrapper = mount(HiredView)
    expect(wrapper.find('.loading').text()).toBe('加载中...')
  })

  it('请求失败时显示错误态并支持重试', async () => {
    const load = vi.fn()
    vi.mocked(useHired).mockReturnValue({
      state: {
        items: [],
        loading: false,
        error: '已入职列表加载失败，请重试',
        total: 0,
      },
      load,
    } as any)

    const wrapper = mount(HiredView)
    expect(wrapper.find('.error-state').text()).toContain('已入职列表加载失败，请重试')
    expect(wrapper.text()).not.toContain('暂无已入职记录')

    await wrapper.find('.retry-button').trigger('click')
    expect(load).toHaveBeenCalled()
  })
})
