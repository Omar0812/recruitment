import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/api/hired', () => ({
  fetchHired: vi.fn(),
}))

import { fetchHired } from '@/api/hired'
import { useHired } from '@/composables/useHired'

const mockFetchHired = vi.mocked(fetchHired)

describe('useHired', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    const { state } = useHired()
    state.items = []
    state.loading = false
    state.error = null
    state.total = 0
  })

  it('加载失败时记录错误状态', async () => {
    mockFetchHired.mockRejectedValue(new Error('已入职列表加载失败，请重试'))
    const { state, load } = useHired()

    await load()

    expect(state.error).toBe('已入职列表加载失败，请重试')
    expect(state.items).toEqual([])
  })

  it('重试成功后清除错误并恢复列表', async () => {
    mockFetchHired.mockRejectedValueOnce(new Error('已入职列表加载失败，请重试'))
    mockFetchHired.mockResolvedValueOnce({
      items: [
        {
          application_id: 1,
          candidate_id: 10,
          candidate_name: '张三',
          job_id: 5,
          job_title: '前端工程师',
          onboard_date: '2026-03-01T00:00:00',
          hire_date: '2026-03-01',
          monthly_salary: 30000,
          salary_months: 13,
          total_cash: 390000,
          source: 'Boss直聘',
          supplier_id: null,
        },
      ],
      total: 1,
      page: 1,
      page_size: 100,
    })
    const { state, load } = useHired()

    await load()
    expect(state.error).toBe('已入职列表加载失败，请重试')

    await load()

    expect(state.error).toBeNull()
    expect(state.items).toHaveLength(1)
    expect(state.total).toBe(1)
  })

  it('成功加载后按入职日期倒序兜底排序，缺失或非法日期排后', async () => {
    mockFetchHired.mockResolvedValue({
      items: [
        {
          application_id: 1,
          candidate_id: 10,
          candidate_name: '最晚入职',
          job_id: 5,
          job_title: '前端工程师',
          hire_date: '2026-03-18',
          monthly_salary: 30000,
          salary_months: 13,
          total_cash: 390000,
          source: 'Boss直聘',
          supplier_id: null,
        },
        {
          application_id: 2,
          candidate_id: 11,
          candidate_name: '缺失日期',
          job_id: 5,
          job_title: '后端工程师',
          hire_date: null,
          monthly_salary: 28000,
          salary_months: 14,
          total_cash: 392000,
          source: '内推',
          supplier_id: null,
        },
        {
          application_id: 3,
          candidate_id: 12,
          candidate_name: '较早入职',
          job_id: 5,
          job_title: '设计师',
          hire_date: '2026-02-01',
          monthly_salary: 25000,
          salary_months: 13,
          total_cash: 325000,
          source: '拉勾',
          supplier_id: null,
        },
        {
          application_id: 4,
          candidate_id: 13,
          candidate_name: '非法日期',
          job_id: 5,
          job_title: '产品经理',
          hire_date: 'invalid-date',
          monthly_salary: 32000,
          salary_months: 13,
          total_cash: 416000,
          source: '猎头',
          supplier_id: null,
        },
      ],
      total: 4,
      page: 1,
      page_size: 100,
    })

    const { state, load } = useHired()

    await load()

    expect(state.items.map((item) => item.candidate_name)).toEqual([
      '最晚入职',
      '较早入职',
      '缺失日期',
      '非法日期',
    ])
  })
})
