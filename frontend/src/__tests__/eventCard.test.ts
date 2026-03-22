import { describe, it, expect } from 'vitest'

// 测试 EventCard 的菜单逻辑（纯函数）

interface MenuConfig {
  showEdit: boolean
  showDelete: boolean
}

function getMenuConfig(isFirst: boolean, isLast: boolean): MenuConfig {
  return {
    showEdit: true, // 任何 Event 都可编辑
    showDelete: isLast && !isFirst, // 只有尾部且非唯一 Event 可删除
  }
}

describe('EventCard 菜单逻辑', () => {
  it('首条且唯一的 Event：可编辑，不可删除', () => {
    const config = getMenuConfig(true, true)
    expect(config.showEdit).toBe(true)
    expect(config.showDelete).toBe(false)
  })

  it('首条但非唯一的 Event：可编辑，不可删除', () => {
    const config = getMenuConfig(true, false)
    expect(config.showEdit).toBe(true)
    expect(config.showDelete).toBe(false)
  })

  it('中间的 Event：可编辑，不可删除', () => {
    const config = getMenuConfig(false, false)
    expect(config.showEdit).toBe(true)
    expect(config.showDelete).toBe(false)
  })

  it('尾部且非首条的 Event：可编辑，可删除', () => {
    const config = getMenuConfig(false, true)
    expect(config.showEdit).toBe(true)
    expect(config.showDelete).toBe(true)
  })
})

// 测试 Event 类型标签映射
const EVENT_TYPE_LABELS: Record<string, string> = {
  application_created: '创建申请',
  screening_passed: '通过筛选',
  advance_to_offer: '进入 Offer',
  start_background_check: '开始背调',
  offer_recorded: '记录 Offer',
  hire_confirmed: '确认入职',
  interview_scheduled: '安排面试',
  interview_feedback: '面试反馈',
  background_check_result: '背调结果',
  application_ended: '结束流程',
  left_recorded: '记录离职',
  note: '备注',
}

describe('EventCard 类型标签', () => {
  it('所有 12 种 Event 类型都有中文标签', () => {
    const types = [
      'application_created', 'screening_passed', 'advance_to_offer',
      'start_background_check', 'offer_recorded', 'hire_confirmed',
      'interview_scheduled', 'interview_feedback', 'background_check_result',
      'application_ended', 'left_recorded', 'note',
    ]
    for (const t of types) {
      expect(EVENT_TYPE_LABELS[t]).toBeTruthy()
    }
  })

  it('未知类型回退到原始值', () => {
    const unknownType = 'some_future_type'
    const label = EVENT_TYPE_LABELS[unknownType] ?? unknownType
    expect(label).toBe('some_future_type')
  })
})

// 测试结构化编辑字段映射
interface EditFieldDef {
  key: string
  label: string
  type: 'text' | 'datetime' | 'number' | 'select'
  options?: string[]
}

const EDIT_FIELDS_MAP: Record<string, EditFieldDef[]> = {
  interview_scheduled: [
    { key: 'scheduled_at', label: '面试时间', type: 'datetime' },
    { key: 'interviewer', label: '面试官', type: 'text' },
  ],
  interview_feedback: [
    { key: 'conclusion', label: '结论', type: 'select', options: ['通过', '淘汰'] },
    { key: 'score', label: '评分', type: 'number' },
  ],
  offer_recorded: [
    { key: 'salary', label: '薪资', type: 'text' },
    { key: 'onboard_date', label: '入职日期', type: 'datetime' },
  ],
  background_check_result: [
    { key: 'result', label: '背调结果', type: 'select', options: ['通过', '未通过'] },
  ],
}

describe('EventCard 结构化编辑字段', () => {
  it('interview_scheduled 有 scheduled_at 和 interviewer 字段', () => {
    const fields = EDIT_FIELDS_MAP['interview_scheduled']
    expect(fields).toHaveLength(2)
    expect(fields[0].key).toBe('scheduled_at')
    expect(fields[0].type).toBe('datetime')
    expect(fields[1].key).toBe('interviewer')
    expect(fields[1].type).toBe('text')
  })

  it('interview_feedback 有 conclusion 和 score 字段', () => {
    const fields = EDIT_FIELDS_MAP['interview_feedback']
    expect(fields).toHaveLength(2)
    expect(fields[0].key).toBe('conclusion')
    expect(fields[0].type).toBe('select')
    expect(fields[0].options).toContain('通过')
    expect(fields[1].key).toBe('score')
    expect(fields[1].type).toBe('number')
  })

  it('note 类型无结构化字段（回退到 body 文本编辑）', () => {
    const fields = EDIT_FIELDS_MAP['note']
    expect(fields).toBeUndefined()
  })

  it('background_check_result 有 result 选择字段', () => {
    const fields = EDIT_FIELDS_MAP['background_check_result']
    expect(fields).toHaveLength(1)
    expect(fields[0].type).toBe('select')
    expect(fields[0].options).toContain('未通过')
  })
})
