import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'

import ChannelPanel from '@/components/channels/ChannelPanel.vue'

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
  contract_terms: '保证期内免费替换',
  deleted_at: null,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
  candidate_count: 5,
  hired_count: 2,
}

const defaultProps = {
  onClose: () => {},
  onStartEditSupplier: () => {},
  onSubmitSupplier: async () => {},
  onCancelSupplierForm: () => {},
  onDeleteSupplier: async () => {},
  onOpenCandidate: () => {},
  onStartAddExpense: () => {},
  onEditExpense: () => {},
  onDeleteExpense: async () => {},
}

describe('ChannelPanel', () => {
  it('加载失败时展示明确错误提示而不是空状态', () => {
    const wrapper = mount(ChannelPanel, {
      props: {
        ...defaultProps,
        panel: {
          type: 'supplier',
          id: 1,
          name: '猎头A',
          supplier,
          candidates: [],
          expenses: [],
          headhunterFees: [],
          stats: null,
          loading: false,
          error: '加载失败，请稍后重试',
        },
      },
    })

    expect(wrapper.get('[role="alert"]').text()).toBe('加载失败，请稍后重试')
    expect(wrapper.text()).not.toContain('暂无候选人')
    expect(wrapper.text()).not.toContain('暂无费用记录')
  })

  it('成功加载但无数据时展示空状态', () => {
    const wrapper = mount(ChannelPanel, {
      props: {
        ...defaultProps,
        panel: {
          type: 'supplier',
          id: 1,
          name: '猎头A',
          supplier,
          candidates: [],
          expenses: [],
          headhunterFees: [],
          stats: null,
          loading: false,
          error: null,
        },
      },
    })

    expect(wrapper.text()).toContain('暂无候选人')
    expect(wrapper.text()).toContain('暂无费用记录')
  })

  it('展示候选人分组和费用累计总额', async () => {
    const wrapper = mount(ChannelPanel, {
      props: {
        ...defaultProps,
        panel: {
          type: 'supplier',
          mode: 'view',
          id: 1,
          name: '猎头A',
          supplier,
          candidates: [
            { id: 11, name: '进行中候选人', latest_application: { job_title: '前端工程师', state: 'IN_PROGRESS', stage: '面试', outcome: null } },
            { id: 12, name: '已入职候选人', latest_application: { job_title: '后端工程师', state: 'HIRED', stage: null, outcome: null } },
            { id: 13, name: '已结束候选人', latest_application: { job_title: '产品经理', state: 'REJECTED', stage: '筛选', outcome: '不合适' } },
          ],
          expenses: [
            { id: 1, channel_type: 'supplier', channel_id: 1, amount: 1000, occurred_at: '2026-01-01T00:00:00', description: '一月服务费', created_at: '2026-01-01T00:00:00', updated_at: '2026-01-01T00:00:00' },
            { id: 2, channel_type: 'supplier', channel_id: 1, amount: 2000, occurred_at: '2026-02-01T00:00:00', description: '二月服务费', created_at: '2026-02-01T00:00:00', updated_at: '2026-02-01T00:00:00' },
          ],
          headhunterFees: [],
          stats: { candidate_count: 3, hired_count: 1 },
          loading: false,
          error: null,
        },
      },
    })

    expect(wrapper.text()).toContain('进行中')
    expect(wrapper.text()).toContain('已入职')
    expect(wrapper.text()).toContain('累计 ¥3,000')

    await wrapper.find('.candidate-group__header--button').trigger('click')
    expect(wrapper.text()).toContain('已结束候选人')
  })

  it('混合展示猎头费和手动费用，猎头费行只读', () => {
    const wrapper = mount(ChannelPanel, {
      props: {
        ...defaultProps,
        panel: {
          type: 'supplier',
          mode: 'view',
          id: 1,
          name: '猎头A',
          supplier,
          candidates: [],
          expenses: [
            { id: 1, channel_type: 'supplier', channel_id: 1, amount: 10000, occurred_at: '2026-01-01T00:00:00', description: '签约金', created_at: '2026-01-01T00:00:00', updated_at: '2026-01-01T00:00:00' },
          ],
          headhunterFees: [
            { candidate_name: '张三', headhunter_fee: 107250, hire_date: '2026-03-01', application_id: 42 },
            { candidate_name: '李四', headhunter_fee: 85000, hire_date: '2026-02-15', application_id: 43 },
          ],
          stats: { candidate_count: 5, hired_count: 2 },
          loading: false,
          error: null,
        },
      },
    })

    // 猎头费行展示
    expect(wrapper.text()).toContain('张三入职·猎头费')
    expect(wrapper.text()).toContain('李四入职·猎头费')
    expect(wrapper.text()).toContain('¥107,250')
    expect(wrapper.text()).toContain('¥85,000')

    // 手动费用行
    expect(wrapper.text()).toContain('签约金')
    expect(wrapper.text()).toContain('¥10,000')

    // 累计总额 = 107250 + 85000 + 10000 = 202250
    expect(wrapper.text()).toContain('累计 ¥202,250')

    // 猎头费行无编辑/删除按钮（3行费用，只有1行手动费用有 expense-actions）
    const expenseRows = wrapper.findAll('.expense-row')
    expect(expenseRows.length).toBe(3)

    // 手动费用行有编辑/删除
    const manualRows = expenseRows.filter(row => row.find('.expense-actions').exists())
    expect(manualRows.length).toBe(1)
  })

  it('无猎头费时不展示猎头费行', () => {
    const wrapper = mount(ChannelPanel, {
      props: {
        ...defaultProps,
        panel: {
          type: 'supplier',
          mode: 'view',
          id: 1,
          name: '猎头A',
          supplier,
          candidates: [],
          expenses: [
            { id: 1, channel_type: 'supplier', channel_id: 1, amount: 5000, occurred_at: '2026-01-01T00:00:00', description: '服务费', created_at: '2026-01-01T00:00:00', updated_at: '2026-01-01T00:00:00' },
          ],
          headhunterFees: [],
          stats: { candidate_count: 2, hired_count: 0 },
          loading: false,
          error: null,
        },
      },
    })

    expect(wrapper.text()).not.toContain('入职·猎头费')
    expect(wrapper.text()).toContain('累计 ¥5,000')
  })
})
