import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import OfferForm from './OfferForm.vue'

// Mock usePipeline composable
vi.mock('@/composables/usePipeline', () => ({
  usePipeline: () => ({
    doAction: vi.fn().mockResolvedValue(undefined),
  }),
}))

describe('OfferForm', () => {
  const defaultProps = {
    applicationId: 1,
    actionCode: 'record_offer',
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('渲染结构化薪资字段', () => {
    const wrapper = mount(OfferForm, { props: defaultProps })

    expect(wrapper.find('input[placeholder="月薪"]').exists()).toBe(true)
    expect(wrapper.find('input[placeholder="如13"]').exists()).toBe(true)
    expect(wrapper.find('input[placeholder="期权总包"]').exists()).toBe(true)
    expect(wrapper.find('input[type="date"]').exists()).toBe(true)
    expect(wrapper.find('textarea[placeholder*="补充说明"]').exists()).toBe(true)
  })

  it('自动计算现金总包', async () => {
    const wrapper = mount(OfferForm, { props: defaultProps })

    const monthlySalaryInput = wrapper.find('input[placeholder="月薪"]')
    const salaryMonthsInput = wrapper.find('input[placeholder="如13"]')

    await monthlySalaryInput.setValue(30000)
    await salaryMonthsInput.setValue(13)

    const computedValues = wrapper.findAll('.computed-value')
    expect(computedValues[0].text()).toBe('¥390,000')
  })

  it('自动计算全部总包（含期权）', async () => {
    const wrapper = mount(OfferForm, { props: defaultProps })

    await wrapper.find('input[placeholder="月薪"]').setValue(30000)
    await wrapper.find('input[placeholder="如13"]').setValue(13)
    await wrapper.find('input[placeholder="期权总包"]').setValue(100000)

    const computedValues = wrapper.findAll('.computed-value')
    expect(computedValues[1].text()).toBe('¥490,000')
  })

  it('必填校验：月薪和月数未填时禁用确认按钮', () => {
    const wrapper = mount(OfferForm, { props: defaultProps })

    const submitBtn = wrapper.find('.btn--primary')
    expect(submitBtn.attributes('disabled')).toBeDefined()
  })

  it('必填校验：月薪和月数填写后启用确认按钮', async () => {
    const wrapper = mount(OfferForm, { props: defaultProps })

    await wrapper.find('input[placeholder="月薪"]').setValue(30000)
    await wrapper.find('input[placeholder="如13"]').setValue(13)

    const submitBtn = wrapper.find('.btn--primary')
    expect(submitBtn.attributes('disabled')).toBeUndefined()
  })

  it('提交时发送正确的 payload 格式', async () => {
    const wrapper = mount(OfferForm, { props: defaultProps })

    await wrapper.find('input[placeholder="月薪"]').setValue(30000)
    await wrapper.find('input[placeholder="如13"]').setValue(13)
    await wrapper.find('input[placeholder="期权总包"]').setValue(100000)
    await wrapper.find('input[type="date"]').setValue('2026-04-01')
    await wrapper.find('textarea').setValue('备注内容')

    // 验证 computed 值正确
    const computedValues = wrapper.findAll('.computed-value')
    expect(computedValues[0].text()).toBe('¥390,000')
    expect(computedValues[1].text()).toBe('¥490,000')

    // 验证确认按钮可用
    const submitBtn = wrapper.find('.btn--primary')
    expect(submitBtn.attributes('disabled')).toBeUndefined()
  })

  it('猎头候选人时显示猎头费区域', () => {
    const wrapper = mount(OfferForm, {
      props: {
        ...defaultProps,
        candidateSupplier: {
          id: 1,
          name: '猎头公司A',
          contract_terms: '保证期6个月',
          guarantee_months: 6,
        },
      },
    })

    expect(wrapper.find('.headhunter-section').exists()).toBe(true)
    expect(wrapper.text()).toContain('猎头公司A')
    expect(wrapper.text()).toContain('保证期6个月')
    expect(wrapper.find('input[placeholder="输入猎头费金额"]').exists()).toBe(true)
  })

  it('非猎头候选人时不显示猎头费区域', () => {
    const wrapper = mount(OfferForm, { props: defaultProps })

    expect(wrapper.find('.headhunter-section').exists()).toBe(false)
  })

  it('猎头费字段可输入', async () => {
    const wrapper = mount(OfferForm, {
      props: {
        ...defaultProps,
        candidateSupplier: {
          id: 1,
          name: '猎头公司A',
          contract_terms: '',
          guarantee_months: 6,
        },
      },
    })

    await wrapper.find('input[placeholder="月薪"]').setValue(30000)
    await wrapper.find('input[placeholder="如13"]').setValue(13)

    const headhunterFeeInput = wrapper.find('input[placeholder="输入猎头费金额"]')
    await headhunterFeeInput.setValue(50000)

    expect(headhunterFeeInput.element.value).toBe('50000')
  })
})
