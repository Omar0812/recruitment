import { describe, it, expect } from 'vitest'

// 直接测试 StageAction 的映射逻辑（不测组件渲染）
// 从 StageAction.vue 中提取的纯逻辑

interface StageActionMapping {
  code: string
  label: string
}

const STAGE_ACTION_MAP: Record<string, StageActionMapping[]> = {
  '简历筛选': [
    { code: 'pass_screening', label: '通过，安排面试' },
  ],
  '面试': [
    { code: 'schedule_interview', label: '安排面试' },
    { code: 'record_interview_feedback', label: '填写面评' },
    { code: 'advance_to_offer', label: '通过，发起 Offer' },
  ],
  'Offer沟通': [
    { code: 'start_background_check', label: '开始背调' },
    { code: 'record_offer', label: '记录 Offer' },
  ],
  '背调': [
    { code: 'record_background_check_result', label: '记录背调结果' },
  ],
  '待入职': [
    { code: 'confirm_hire', label: '确认入职' },
  ],
}

function findPrimaryAction(
  stage: string,
  availableCodes: string[],
): StageActionMapping | null {
  const mappings = STAGE_ACTION_MAP[stage] ?? []
  const available = new Set(availableCodes)
  for (const m of mappings) {
    if (available.has(m.code)) return m
  }
  return null
}

describe('StageAction 映射逻辑', () => {
  it('简历筛选 → pass_screening', () => {
    const result = findPrimaryAction('简历筛选', ['pass_screening', 'add_note'])
    expect(result).toEqual({ code: 'pass_screening', label: '通过，安排面试' })
  })

  it('面试阶段优先 schedule_interview', () => {
    const result = findPrimaryAction('面试', [
      'schedule_interview',
      'record_interview_feedback',
      'advance_to_offer',
    ])
    expect(result?.code).toBe('schedule_interview')
  })

  it('面试阶段只剩 advance_to_offer 时显示它', () => {
    const result = findPrimaryAction('面试', ['advance_to_offer', 'add_note'])
    expect(result?.code).toBe('advance_to_offer')
    expect(result?.label).toBe('通过，发起 Offer')
  })

  it('Offer沟通 → start_background_check', () => {
    const result = findPrimaryAction('Offer沟通', ['start_background_check'])
    expect(result?.code).toBe('start_background_check')
  })

  it('背调 → record_background_check_result', () => {
    const result = findPrimaryAction('背调', ['record_background_check_result'])
    expect(result?.label).toBe('记录背调结果')
  })

  it('待入职 → confirm_hire', () => {
    const result = findPrimaryAction('待入职', ['confirm_hire'])
    expect(result?.label).toBe('确认入职')
  })

  it('没有可用动作 → null', () => {
    const result = findPrimaryAction('简历筛选', ['add_note'])
    expect(result).toBeNull()
  })

  it('未知阶段 → null', () => {
    const result = findPrimaryAction('未知', ['pass_screening'])
    expect(result).toBeNull()
  })
})
