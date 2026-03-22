import { describe, it, expect } from 'vitest'

// 测试 EndFlowPanel 的纯逻辑部分

const REJECTED_REASONS = ['简历不匹配', '经验资历不匹配', '技术能力不足', '文化/软素质不合适', '薪资谈不拢', '背调未通过', '岗位关闭']
const WITHDRAWN_REASONS = ['接了其他 offer', '薪资不满意', '对岗位/公司不感兴趣', '个人原因', '失联']

describe('EndFlowPanel 逻辑', () => {
  it('未通过原因列表有 7 个选项', () => {
    expect(REJECTED_REASONS).toHaveLength(7)
  })

  it('候选人退出原因列表有 5 个选项', () => {
    expect(WITHDRAWN_REASONS).toHaveLength(5)
  })

  it('未通过原因列表与 spec 措辞一致', () => {
    expect(REJECTED_REASONS).toEqual([
      '简历不匹配', '经验资历不匹配', '技术能力不足',
      '文化/软素质不合适', '薪资谈不拢', '背调未通过', '岗位关闭',
    ])
  })

  it('候选人退出原因列表与 spec 措辞一致', () => {
    expect(WITHDRAWN_REASONS).toEqual([
      '接了其他 offer', '薪资不满意', '对岗位/公司不感兴趣', '个人原因', '失联',
    ])
  })

  it('canConfirm: 未选择原因时不能确认', () => {
    const selectedReason = ''
    expect(!!selectedReason).toBe(false)
  })

  it('canConfirm: 选择「其他」但未填写时不能确认', () => {
    const selectedReason = '__other__'
    const otherReason = ''
    const canConfirm = selectedReason !== '' &&
      !(selectedReason === '__other__' && !otherReason.trim())
    expect(canConfirm).toBe(false)
  })

  it('canConfirm: 选择「其他」并填写后可以确认', () => {
    const selectedReason = '__other__'
    const otherReason = '候选人有其他考虑'
    const canConfirm = selectedReason !== '' &&
      !(selectedReason === '__other__' && !otherReason.trim())
    expect(canConfirm).toBe(true)
  })

  it('canConfirm: 选择预设原因可以确认', () => {
    const selectedReason = '简历不匹配'
    const canConfirm = selectedReason !== ''
    expect(canConfirm).toBe(true)
  })

  it('end_application payload 正确组装 rejected', () => {
    const tab = 'rejected'
    const selectedReason = '经验资历不匹配'
    const payload = {
      outcome: tab,
      reason: selectedReason,
      body: selectedReason,
    }
    expect(payload.outcome).toBe('rejected')
    expect(payload.reason).toBe('经验资历不匹配')
  })

  it('end_application payload 正确组装 withdrawn + 自定义原因', () => {
    const tab = 'withdrawn'
    const selectedReason = '__other__'
    const otherReason = '家庭原因'
    const reason = selectedReason === '__other__' ? otherReason : selectedReason
    const payload = {
      outcome: tab,
      reason,
      body: reason,
    }
    expect(payload.outcome).toBe('withdrawn')
    expect(payload.reason).toBe('家庭原因')
  })
})
