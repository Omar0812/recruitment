import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import BriefingPulse from '@/components/briefing/BriefingPulse.vue'
import BriefingSchedule from '@/components/briefing/BriefingSchedule.vue'
import BriefingTodos from '@/components/briefing/BriefingTodos.vue'
import BriefingFocus from '@/components/briefing/BriefingFocus.vue'
import BriefingView from '@/views/BriefingView.vue'
import type { BriefingPulse as PulseType, BriefingSchedule as ScheduleType, TodoGroup, FocusItem } from '@/api/briefing'

const { mockStashDroppedFiles } = vi.hoisted(() => ({
  mockStashDroppedFiles: vi.fn(),
}))

// ── Mock router ──
const mockPush = vi.fn()
const mockReplace = vi.fn()
vi.mock('vue-router', () => ({
  useRouter: () => ({ push: mockPush, replace: mockReplace }),
  useRoute: () => ({ query: {} }),
}))

vi.mock('@/composables/useCandidateCreate', () => ({
  stashDroppedFiles: mockStashDroppedFiles,
}))

// ── Mock composable ──
const mockLoad = vi.fn()
vi.mock('@/composables/useBriefing', () => ({
  useBriefing: () => ({
    state: {
      data: {
        pulse: { today_interviews: 3, todo_count: 5, active_applications: 12, open_jobs: 4 },
        schedule: {
          today: [
            {
              type: 'interview',
              application_id: 1,
              candidate_id: 10,
              candidate_name: '张三',
              job_id: 100,
              job_title: '后端工程师',
              scheduled_at: '2026-03-07T10:00:00',
              interview_round: 2,
              interviewer: '张总',
              meeting_type: 'Google Meet',
            },
          ],
          tomorrow: [
            {
              type: 'onboard',
              application_id: 2,
              candidate_id: 20,
              candidate_name: '李四',
              job_id: 200,
              job_title: 'PM',
              onboard_date: '2026-03-08',
            },
          ],
        },
        todos: [
          {
            type: 'screening',
            label: '待筛选',
            items: [
              { application_id: 3, candidate_name: '王五', job_title: '前端', job_priority: null, days: 2, time_label: '等待 2 天' },
            ],
            max_days: 2,
          },
          {
            type: 'feedback',
            label: '待面评',
            items: [
              { application_id: 4, candidate_name: '赵六', job_title: '后端', job_priority: 'high', interview_round: 2, days: 3, time_label: '面试于 3 天前' },
            ],
            max_days: 3,
          },
        ],
        focus: [
          {
            entity: 'job' as const,
            job_id: 300,
            job_title: '设计师',
            department: '设计部',
            priority: 'high',
            signals: ['无候选人'],
            severity: 2,
          },
          {
            entity: 'candidate' as const,
            application_id: 5,
            candidate_id: 50,
            candidate_name: '孙七',
            job_id: 400,
            job_title: 'PM',
            stage: 'Offer沟通',
            days_silent: 10,
            signals: ['10 天未联系'],
            severity: 4,
            priority: null,
          },
        ],
      },
      loading: false,
      error: null,
    },
    load: mockLoad,
  }),
}))

beforeEach(() => {
  mockPush.mockClear()
  mockLoad.mockClear()
  mockStashDroppedFiles.mockClear()
})

// ══════════════════════════════════════════════════════════════
// BriefingPulse
// ══════════════════════════════════════════════════════════════

describe('BriefingPulse', () => {
  const pulse: PulseType = { today_interviews: 3, todo_count: 5, active_applications: 12, open_jobs: 4 }

  it('渲染 4 个数字', () => {
    const w = mount(BriefingPulse, { props: { pulse } })
    expect(w.text()).toContain('3')
    expect(w.text()).toContain('5')
    expect(w.text()).toContain('12')
    expect(w.text()).toContain('4')
  })

  it('进行中可点击跳转', async () => {
    const w = mount(BriefingPulse, { props: { pulse } })
    const links = w.findAll('.pulse-item--link')
    // links[0]=今日面试(scroll-to), [1]=待办(scroll-to), [2]=进行中, [3]=open岗位
    await links[2].trigger('click')
    expect(mockPush).toHaveBeenCalledWith('/pipeline')
  })

  it('open 岗位可点击跳转', async () => {
    const w = mount(BriefingPulse, { props: { pulse } })
    const links = w.findAll('.pulse-item--link')
    await links[3].trigger('click')
    expect(mockPush).toHaveBeenCalledWith('/jobs')
  })
})

// ══════════════════════════════════════════════════════════════
// BriefingSchedule
// ══════════════════════════════════════════════════════════════

describe('BriefingSchedule', () => {
  const schedule: ScheduleType = {
    today: [
      {
        type: 'interview',
        application_id: 1,
        candidate_id: 10,
        candidate_name: '张三',
        job_id: 100,
        job_title: '后端工程师',
        scheduled_at: '2026-03-07T10:00:00',
        interview_round: 2,
        interviewer: '张总',
      },
    ],
    tomorrow: [
      {
        type: 'onboard',
        application_id: 2,
        candidate_id: 20,
        candidate_name: '李四',
        job_id: 200,
        job_title: 'PM',
        onboard_date: '2026-03-08',
      },
    ],
  }

  it('渲染今日面试', () => {
    const w = mount(BriefingSchedule, { props: { schedule } })
    expect(w.text()).toContain('张三')
    expect(w.text()).toContain('二面')
    expect(w.text()).toContain('后端工程师')
    expect(w.text()).toContain('张总')
  })

  it('渲染明天分隔线和条目', () => {
    const w = mount(BriefingSchedule, { props: { schedule } })
    expect(w.text()).toContain('── 明天 ──')
    expect(w.text()).toContain('李四')
    expect(w.text()).toContain('入职')
  })

  it('今日入职条目显示明确文案和说明', () => {
    const onboardToday: ScheduleType = {
      today: [
        {
          type: 'onboard',
          application_id: 8,
          candidate_id: 80,
          candidate_name: '周八',
          job_id: 800,
          job_title: 'HRBP',
          onboard_date: '2026-03-09',
          meeting_type: '9:30 到岗办理',
        },
      ],
      tomorrow: [],
    }

    const w = mount(BriefingSchedule, { props: { schedule: onboardToday } })
    expect(w.text()).toContain('今日入职')
    expect(w.text()).toContain('9:30 到岗办理')
  })

  it('点击条目跳转 pipeline', async () => {
    const w = mount(BriefingSchedule, { props: { schedule } })
    await w.find('.schedule-item').trigger('click')
    expect(mockPush).toHaveBeenCalledWith({
      path: '/pipeline',
      query: { expand: '1' },
    })
  })

  it('空日程显示提示', () => {
    const empty: ScheduleType = { today: [], tomorrow: [] }
    const w = mount(BriefingSchedule, { props: { schedule: empty } })
    expect(w.text()).toContain('今明两日暂无日程安排')
  })
})

// ══════════════════════════════════════════════════════════════
// BriefingTodos
// ══════════════════════════════════════════════════════════════

describe('BriefingTodos', () => {
  const todos: TodoGroup[] = [
    {
      type: 'screening',
      label: '待筛选',
      items: [
        { application_id: 3, candidate_name: '王五', job_title: '前端', days: 2, time_label: '等待 2 天' },
      ],
      max_days: 2,
    },
    {
      type: 'feedback',
      label: '待面评',
      items: [
        { application_id: 4, candidate_name: '赵六', job_title: '后端', job_priority: 'high', interview_round: 2, days: 3, time_label: '面试于 3 天前' },
      ],
      max_days: 3,
    },
  ]

  it('渲染待筛选聚合行', () => {
    const w = mount(BriefingTodos, { props: { todos } })
    expect(w.text()).toContain('待筛选')
    expect(w.text()).toContain('1 份')
  })

  it('渲染待面评逐条', () => {
    const w = mount(BriefingTodos, { props: { todos } })
    expect(w.text()).toContain('赵六')
    expect(w.text()).toContain('面试于 3 天前')
  })

  it('高优标签显示', () => {
    const w = mount(BriefingTodos, { props: { todos } })
    expect(w.find('.todo-priority').text()).toBe('高优')
  })

  it('待分配点击跳转人才库无流程筛选', async () => {
    const unassigned: TodoGroup[] = [
      {
        type: 'unassigned',
        label: '待分配',
        items: [
          { candidate_name: '待分配候选人', days: 1, time_label: '等待 1 天' },
        ],
        max_days: 1,
      },
    ]

    const w = mount(BriefingTodos, { props: { todos: unassigned } })
    await w.find('.todo-row--aggregate').trigger('click')
    expect(mockPush).toHaveBeenCalledWith({
      path: '/talent-pool',
      query: { pipeline_status: 'none' },
    })
  })

  it('空待办显示完成提示', () => {
    const w = mount(BriefingTodos, { props: { todos: [] } })
    expect(w.text()).toContain('全部处理完毕 ✓')
  })
})

// ══════════════════════════════════════════════════════════════
// BriefingFocus
// ══════════════════════════════════════════════════════════════

describe('BriefingFocus', () => {
  const focus: FocusItem[] = [
    {
      entity: 'job',
      job_id: 300,
      job_title: '设计师',
      department: '设计部',
      priority: 'high',
      signals: ['无候选人'],
      severity: 2,
    },
    {
      entity: 'candidate',
      application_id: 5,
      candidate_id: 50,
      candidate_name: '孙七',
      job_id: 400,
      job_title: 'PM',
      stage: 'Offer沟通',
      days_silent: 10,
      signals: ['10 天未联系'],
      severity: 4,
      priority: null,
    },
  ]

  it('渲染岗位信号', () => {
    const w = mount(BriefingFocus, { props: { focus } })
    expect(w.text()).toContain('设计师')
    expect(w.text()).toContain('无候选人')
  })

  it('渲染候选人信号', () => {
    const w = mount(BriefingFocus, { props: { focus } })
    expect(w.text()).toContain('孙七')
    expect(w.text()).toContain('10 天未联系')
  })

  it('岗位条目点击跳转 jobs 页', async () => {
    const w = mount(BriefingFocus, { props: { focus } })
    await w.findAll('.focus-row')[0].trigger('click')
    expect(mockPush).toHaveBeenCalledWith({
      path: '/jobs',
      query: { panel: '300' },
    })
  })

  it('候选人条目点击跳转 pipeline', async () => {
    const w = mount(BriefingFocus, { props: { focus } })
    await w.findAll('.focus-row')[1].trigger('click')
    expect(mockPush).toHaveBeenCalledWith({
      path: '/pipeline',
      query: { expand: '5' },
    })
  })

  it('空关注显示一切正常', () => {
    const w = mount(BriefingFocus, { props: { focus: [] } })
    expect(w.text()).toContain('一切正常')
  })
})

// ══════════════════════════════════════════════════════════════
// BriefingView
// ══════════════════════════════════════════════════════════════

describe('BriefingView', () => {
  it('加载时调用 load', () => {
    mount(BriefingView)
    expect(mockLoad).toHaveBeenCalled()
  })

  it('渲染标题和日期', () => {
    const w = mount(BriefingView)
    expect(w.text()).toContain('今日简报')
    // Date format: yyyy-mm-dd 周X
    expect(w.text()).toMatch(/\d{4}-\d{2}-\d{2}/)
  })

  it('渲染四个 section', () => {
    const w = mount(BriefingView)
    expect(w.text()).toContain('📅 日程')
    expect(w.text()).toContain('📋 待办')
    expect(w.text()).toContain('👁 关注')
  })

  it('拖拽显示 overlay', async () => {
    const w = mount(BriefingView)
    await w.find('.briefing-view').trigger('dragover')
    expect(w.find('.drop-overlay').exists()).toBe(true)
    expect(w.text()).toContain('释放文件以新建候选人')
  })

  it('拖拽离开隐藏 overlay', async () => {
    const w = mount(BriefingView)
    await w.find('.briefing-view').trigger('dragover')
    await w.find('.briefing-view').trigger('dragleave')
    expect(w.find('.drop-overlay').exists()).toBe(false)
  })

  it('拖拽文件后跳到新建候选人并交接文件', async () => {
    const w = mount(BriefingView)
    const file = new File(['resume'], '张三.pdf', { type: 'application/pdf' })

    await w.find('.briefing-view').trigger('drop', {
      dataTransfer: {
        files: [file],
      },
    })

    expect(mockStashDroppedFiles).toHaveBeenCalledWith([file])
    expect(mockPush).toHaveBeenCalledWith('/candidate/create')
  })
})
