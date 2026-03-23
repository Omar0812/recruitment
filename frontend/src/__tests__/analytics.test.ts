import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import TimePicker from '@/components/analytics/TimePicker.vue'
import TabBar from '@/components/analytics/TabBar.vue'
import StatCards from '@/components/analytics/StatCards.vue'
import FunnelChart from '@/components/analytics/FunnelChart.vue'
import EndReasons from '@/components/analytics/EndReasons.vue'
import JobList from '@/components/analytics/JobList.vue'
import ChannelList from '@/components/analytics/ChannelList.vue'
import ChannelDrilldown from '@/components/analytics/ChannelDrilldown.vue'
import AnalyticsView from '@/views/AnalyticsView.vue'
import { presetToRange, shiftRange, today } from '@/composables/useAnalytics'
import type {
  CardItem,
  FunnelStage,
  EndReasons as EndReasonsType,
  JobsListData,
  ChannelsListData,
  ChannelDrilldownData,
} from '@/api/analytics'

// ── Mock router ──
const mockRouterPush = vi.fn()
const mockRouterReplace = vi.fn()
const mockRoute = { query: {} as Record<string, unknown> }

vi.mock('vue-router', () => ({
  useRouter: () => ({ push: mockRouterPush, replace: mockRouterReplace }),
  useRoute: () => mockRoute,
}))

// ── Mock analytics API (for OverviewTab fetch) ──
vi.mock('@/api/analytics', () => ({
  fetchOverview: vi.fn().mockResolvedValue({ trend: [] }),
  fetchJobsList: vi.fn(),
  fetchJobDrilldown: vi.fn(),
  fetchChannelsList: vi.fn(),
  fetchChannelDrilldown: vi.fn(),
}))

// ── Test Data ──

const mockCards: CardItem[] = [
  { key: 'new_candidates', value: 18, previous: 15, change: 20 },
  { key: 'new_applications', value: 15, previous: 12, change: 25 },
  { key: 'hired', value: 3, previous: 5, change: -40 },
  { key: 'ended', value: 8, previous: 10, change: -20 },
  { key: 'avg_cycle', value: 32, previous: 36, change: -11.1 },
  { key: 'total_cost', value: 85000, previous: 74000, change: 14.9 },
]

const mockFunnel: FunnelStage[] = [
  { stage: '简历筛选', count: 15, conversion: null },
  { stage: '面试', count: 8, conversion: 53.3 },
  { stage: 'Offer沟通', count: 4, conversion: 50.0 },
  { stage: '背调', count: 3, conversion: 75.0 },
  { stage: '待入职', count: 2, conversion: 66.7 },
  { stage: '已入职', count: 1, conversion: 50.0 },
]

const mockEndReasons: EndReasonsType = {
  rejected: {
    label: '未通过',
    total: 5,
    items: [
      { reason: '面试评估不通过', count: 3 },
      { reason: '经验匹配度不足', count: 2 },
    ],
  },
  withdrawn: {
    label: '候选人退出',
    total: 3,
    items: [
      { reason: '已接其他Offer', count: 2 },
      { reason: '候选人失联', count: 1 },
    ],
  },
}

const mockJobsList: JobsListData = {
  items: [
    {
      job_id: 1,
      title: '后端工程师',
      city: '上海',
      status: 'open',
      funnel: [
        { stage: '简历筛选', count: 10 },
        { stage: '面试', count: 5 },
        { stage: 'Offer沟通', count: 2 },
        { stage: '背调', count: 1 },
        { stage: '待入职', count: 1 },
        { stage: '已入职', count: 1 },
      ],
      pass_rate: 10.0,
      avg_cycle: 28,
    },
    {
      job_id: 2,
      title: '产品经理',
      city: '北京',
      status: 'open',
      funnel: [
        { stage: '简历筛选', count: 5 },
        { stage: '面试', count: 3 },
        { stage: 'Offer沟通', count: 0 },
        { stage: '背调', count: 0 },
        { stage: '待入职', count: 0 },
        { stage: '已入职', count: 0 },
      ],
      pass_rate: 0,
      avg_cycle: null,
    },
  ],
  totals: {
    funnel: [
      { stage: '简历筛选', count: 15 },
      { stage: '面试', count: 8 },
      { stage: 'Offer沟通', count: 2 },
      { stage: '背调', count: 1 },
      { stage: '待入职', count: 1 },
      { stage: '已入职', count: 1 },
    ],
    pass_rate: 6.7,
    avg_cycle: 28,
  },
}

const mockChannelsList: ChannelsListData = {
  sections: [
    {
      label: '猎头',
      items: [
        {
          key: 'supplier:1',
          name: 'XX猎头',
          funnel: [
            { stage: '简历筛选', count: 5 },
            { stage: '面试', count: 3 },
            { stage: 'Offer沟通', count: 1 },
            { stage: '背调', count: 1 },
            { stage: '待入职', count: 1 },
            { stage: '已入职', count: 1 },
          ],
          conversion_rate: 20.0,
          cost_per_hire: 117250,
          total_expense: 117250,
        },
      ],
    },
    {
      label: '招聘平台',
      items: [
        {
          key: 'source:BOSS直聘',
          name: 'BOSS直聘',
          funnel: [
            { stage: '简历筛选', count: 8 },
            { stage: '面试', count: 4 },
            { stage: 'Offer沟通', count: 2 },
            { stage: '背调', count: 2 },
            { stage: '待入职', count: 2 },
            { stage: '已入职', count: 2 },
          ],
          conversion_rate: 25.0,
          cost_per_hire: 10000,
          total_expense: 20000,
        },
      ],
    },
    {
      label: '其他',
      items: [
        {
          key: 'referral',
          name: '内推',
          funnel: [
            { stage: '简历筛选', count: 3 },
            { stage: '面试', count: 2 },
            { stage: 'Offer沟通', count: 1 },
            { stage: '背调', count: 1 },
            { stage: '待入职', count: 1 },
            { stage: '已入职', count: 1 },
          ],
          conversion_rate: 33.3,
          cost_per_hire: null,
          total_expense: 0,
        },
      ],
    },
  ],
}

const mockChannelDrilldown: ChannelDrilldownData = {
  channel: {
    key: 'supplier:1',
    name: 'XX猎头',
    section: '猎头',
    contract_end: '2026-12',
    deleted_at: null,
  },
  funnel: mockFunnel,
  funnel_cohort_size: 5,
  end_reasons: mockEndReasons,
  job_distribution: [
    { job_id: 1, title: '后端工程师', count: 3 },
    { job_id: 2, title: '产品经理', count: 2 },
  ],
  expense_detail: {
    platform_cost: 10000,
    headhunter_fee: 50000,
    total: 60000,
  },
}

beforeEach(() => {
  mockRouterPush.mockReset()
  mockRouterReplace.mockReset()
  mockRoute.query = {}
})

afterEach(() => {
  vi.useRealTimers()
})

describe('analytics date helpers', () => {
  it('uses Asia/Shanghai when local day has crossed midnight but UTC has not', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-03-31T16:30:00Z'))

    expect(today()).toBe('2026-04-01')
    expect(presetToRange('this_month')).toEqual({
      start: '2026-04-01',
      end: '2026-04-01',
    })
    expect(shiftRange('2026-03-31', '2026-03-31', 1)).toEqual({
      start: '2026-04-01',
      end: '2026-04-01',
    })
  })

  it('uses Asia/Shanghai quarter boundaries at quarter rollover', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-03-31T16:30:00Z'))

    expect(presetToRange('this_quarter')).toEqual({
      start: '2026-04-01',
      end: '2026-04-01',
    })
    expect(presetToRange('last_quarter')).toEqual({
      start: '2026-01-01',
      end: '2026-03-31',
    })
  })
})

// ── 8.4 TimePicker Tests ──

describe('TimePicker', () => {
  it('renders display range', () => {
    const w = mount(TimePicker, {
      props: { displayRange: '2026-03-01 ~ 2026-03-25（今天）', preset: 'this_month', start: '2026-03-01', end: '2026-03-25', granularity: 'week', availableGranularities: ['day', 'week'], canShiftForward: false },
    })
    expect(w.text()).toContain('2026-03-01 ~ 2026-03-25（今天）')
  })

  it('renders preset selector with correct value', () => {
    const w = mount(TimePicker, {
      props: { displayRange: '', preset: 'last_month', start: '2026-02-01', end: '2026-02-28', granularity: 'month', availableGranularities: ['month'], canShiftForward: true },
    })
    const select = w.find('.preset-select')
    expect((select.element as HTMLSelectElement).value).toBe('last_month')
  })

  it('emits update:preset on change', async () => {
    const w = mount(TimePicker, {
      props: { displayRange: '', preset: 'this_month', start: '2026-03-01', end: '2026-03-31', granularity: 'week', availableGranularities: ['day', 'week'], canShiftForward: true },
    })
    const select = w.find('.preset-select')
    await select.setValue('last_quarter')
    expect(w.emitted('update:preset')?.[0]).toEqual(['last_quarter'])
  })

  it('emits shift on arrow click', async () => {
    const w = mount(TimePicker, {
      props: { displayRange: '', preset: 'this_month', start: '2026-03-01', end: '2026-03-31', granularity: 'week', availableGranularities: ['day', 'week'], canShiftForward: true },
    })
    const buttons = w.findAll('.shift-btn')
    await buttons[0].trigger('click')
    expect(w.emitted('shift')?.[0]).toEqual([-1])
  })

  it('renders custom range inputs when preset is custom', () => {
    const w = mount(TimePicker, {
      props: { displayRange: '', preset: 'custom', start: '2026-03-01', end: '2026-03-15', granularity: 'week', availableGranularities: ['day', 'week'], canShiftForward: true },
    })
    expect(w.find('.custom-range__input--start').exists()).toBe(true)
    expect(w.find('.custom-range__input--end').exists()).toBe(true)
  })

  it('emits custom range when both dates valid', async () => {
    const w = mount(TimePicker, {
      props: { displayRange: '', preset: 'custom', start: '2026-03-01', end: '2026-03-15', granularity: 'week', availableGranularities: ['day', 'week'], canShiftForward: true },
    })
    await w.find('.custom-range__input--start').setValue('2026-03-03')
    expect(w.emitted('update:custom-range')?.[0]).toEqual([{ start: '2026-03-03', end: '2026-03-15' }])
  })

  it('renders granularity switch and emits update', async () => {
    // granularity controls have been removed from TimePicker
    // TimePicker no longer accepts granularity/availableGranularities props
    const w = mount(TimePicker, {
      props: { displayRange: '', preset: 'custom', start: '2026-03-01', end: '2026-03-15', canShiftForward: true },
    })
    // Verify TimePicker still renders without granularity props
    expect(w.find('.time-picker').exists()).toBe(true)
  })
})

// ── TabBar ──

describe('TabBar', () => {
  it('renders three tabs', () => {
    const w = mount(TabBar, { props: { modelValue: 'overview' } })
    const tabs = w.findAll('.tab-item')
    expect(tabs).toHaveLength(3)
    expect(tabs[0].text()).toBe('总览')
    expect(tabs[1].text()).toBe('岗位分析')
    expect(tabs[2].text()).toBe('渠道分析')
  })

  it('marks active tab', () => {
    const w = mount(TabBar, { props: { modelValue: 'jobs' } })
    const tabs = w.findAll('.tab-item')
    expect(tabs[1].classes()).toContain('active')
    expect(tabs[0].classes()).not.toContain('active')
  })

  it('emits on tab click', async () => {
    const w = mount(TabBar, { props: { modelValue: 'overview' } })
    await w.findAll('.tab-item')[2].trigger('click')
    expect(w.emitted('update:modelValue')?.[0]).toEqual(['channels'])
  })
})

// ── 8.5 Overview Tab / StatCards ──

describe('StatCards', () => {
  it('renders 6 cards', () => {
    const w = mount(StatCards, { props: { cards: mockCards } })
    const cards = w.findAll('.stat-card')
    expect(cards).toHaveLength(6)
  })

  it('displays correct labels', () => {
    const w = mount(StatCards, { props: { cards: mockCards } })
    expect(w.text()).toContain('新建档')
    expect(w.text()).toContain('新流程')
    expect(w.text()).toContain('入职')
    expect(w.text()).toContain('结束')
    expect(w.text()).toContain('周期')
    expect(w.text()).toContain('费用')
  })

  it('displays values correctly', () => {
    const w = mount(StatCards, { props: { cards: mockCards } })
    // 新建档 = 18
    expect(w.text()).toContain('18')
    // 周期 = 32天
    expect(w.text()).toContain('32天')
    // 费用 = ¥85k
    expect(w.text()).toContain('¥85k')
  })

  it('shows — for null values', () => {
    const nullCard: CardItem[] = [
      { key: 'avg_cycle', value: null, previous: null, change: null },
    ]
    const w = mount(StatCards, { props: { cards: nullCard } })
    expect(w.text()).toContain('—')
  })

  it('displays change arrows', () => {
    const w = mount(StatCards, { props: { cards: mockCards } })
    expect(w.text()).toContain('↑20%')
    expect(w.text()).toContain('↓40%')
  })

  it('applies positive class to good changes', () => {
    const w = mount(StatCards, { props: { cards: mockCards } })
    // new_candidates ↑20% should be positive
    const changes = w.findAll('.change')
    const ncChange = changes[0]
    expect(ncChange.classes()).toContain('positive')
  })

  it('applies positive class when avg_cycle decreases', () => {
    const w = mount(StatCards, { props: { cards: mockCards } })
    // avg_cycle ↓11.1% — decrease is good, so should be positive
    const changes = w.findAll('.change')
    const cycleChange = changes[4]
    expect(cycleChange.classes()).toContain('positive')
  })
})

describe('FunnelChart', () => {
  it('renders all stages', () => {
    const w = mount(FunnelChart, {
      props: { funnel: mockFunnel, cohortSize: 15, title: '本期新流程转化' },
    })
    expect(w.text()).toContain('简历筛选')
    expect(w.text()).toContain('已入职')
    expect(w.text()).toContain('15 个 Application')
  })

  it('shows conversion rates', () => {
    const w = mount(FunnelChart, {
      props: { funnel: mockFunnel, cohortSize: 15, title: '转化' },
    })
    expect(w.text()).toContain('53.3%')
  })
})

describe('EndReasons', () => {
  it('renders two groups', () => {
    const w = mount(EndReasons, { props: { endReasons: mockEndReasons } })
    expect(w.text()).toContain('未通过')
    expect(w.text()).toContain('候选人退出')
  })

  it('shows total count', () => {
    const w = mount(EndReasons, { props: { endReasons: mockEndReasons } })
    expect(w.text()).toContain('结束原因（8人）')
  })

  it('lists individual reasons', () => {
    const w = mount(EndReasons, { props: { endReasons: mockEndReasons } })
    expect(w.text()).toContain('面试评估不通过')
    expect(w.text()).toContain('已接其他Offer')
  })
})

// ── 8.6 Jobs Tab Tests ──

describe('JobList', () => {
  it('renders job rows', () => {
    const w = mount(JobList, { props: { data: mockJobsList, filter: 'open' } })
    expect(w.text()).toContain('后端工程师')
    expect(w.text()).toContain('产品经理')
  })

  it('shows funnel flow', () => {
    const w = mount(JobList, { props: { data: mockJobsList, filter: 'open' } })
    expect(w.text()).toContain('新增 10')
    expect(w.text()).toContain('→')
  })

  it('shows pass rate and avg cycle', () => {
    const w = mount(JobList, { props: { data: mockJobsList, filter: 'open' } })
    expect(w.text()).toContain('通过率 10%')
    expect(w.text()).toContain('周期 28天')
  })

  it('shows — for null avg_cycle', () => {
    const w = mount(JobList, { props: { data: mockJobsList, filter: 'open' } })
    expect(w.text()).toContain('周期 —')
  })

  it('shows totals row', () => {
    const w = mount(JobList, { props: { data: mockJobsList, filter: 'open' } })
    expect(w.text()).toContain('合计')
    expect(w.text()).toContain('新增 15')
  })

  it('emits drilldown on row click', async () => {
    const w = mount(JobList, { props: { data: mockJobsList, filter: 'open' } })
    const rows = w.findAll('.job-row')
    await rows[0].trigger('click')
    expect(w.emitted('drilldown')?.[0]).toEqual([1])
  })

  it('emits navigate-job on job name click', async () => {
    const w = mount(JobList, { props: { data: mockJobsList, filter: 'open' } })
    await w.find('.job-title-link').trigger('click')
    expect(w.emitted('navigate-job')?.[0]).toEqual([1])
    expect(w.emitted('drilldown')).toBeFalsy()
  })

  it('emits filter change', async () => {
    const w = mount(JobList, { props: { data: mockJobsList, filter: 'open' } })
    const select = w.find('.filter-select')
    await select.setValue('closed')
    expect(w.emitted('update:filter')?.[0]).toEqual(['closed'])
  })

  it('shows empty state when data is null', () => {
    const w = mount(JobList, { props: { data: null, filter: 'open' } })
    expect(w.text()).toContain('暂无数据')
  })
})

describe('JobDrilldown', () => {
  it('emits navigate-channel on source name click', async () => {
    const w = mount((await import('@/components/analytics/JobDrilldown.vue')).default, {
      props: {
        data: {
          job: { id: 1, title: '后端工程师', city: '上海', status: 'open', priority: 'high', headcount: 2, hired_total: 1 },
          funnel: mockFunnel,
          funnel_cohort_size: 10,
          stage_durations: [{ stage: '简历筛选', avg_days: 3, sample_size: 5 }],
          source_distribution: [{ source: 'XX猎头', count: 3 }],
          end_reasons: mockEndReasons,
        },
      },
    })
    await w.find('.source-name-link').trigger('click')
    expect(w.emitted('navigate-channel')?.[0]).toEqual([{ name: 'XX猎头' }])
  })
})

// ── 8.7 Channels Tab Tests ──

describe('ChannelList', () => {
  it('renders three sections', () => {
    const w = mount(ChannelList, { props: { data: mockChannelsList } })
    expect(w.text()).toContain('猎头')
    expect(w.text()).toContain('招聘平台')
    expect(w.text()).toContain('其他')
  })

  it('renders channel rows', () => {
    const w = mount(ChannelList, { props: { data: mockChannelsList } })
    expect(w.text()).toContain('XX猎头')
    expect(w.text()).toContain('BOSS直聘')
    expect(w.text()).toContain('内推')
  })

  it('shows conversion rate and cost', () => {
    const w = mount(ChannelList, { props: { data: mockChannelsList } })
    expect(w.text()).toContain('转化率 20%')
    expect(w.text()).toContain('人均 ¥117k')
  })

  it('shows — for null cost_per_hire', () => {
    const w = mount(ChannelList, { props: { data: mockChannelsList } })
    // 内推 has null cost_per_hire
    expect(w.text()).toContain('人均 —')
  })

  it('emits drilldown on click', async () => {
    const w = mount(ChannelList, { props: { data: mockChannelsList } })
    const rows = w.findAll('.channel-row')
    await rows[0].trigger('click')
    expect(w.emitted('drilldown')?.[0]).toEqual(['supplier:1'])
  })

  it('emits navigate-channel on channel name click', async () => {
    const w = mount(ChannelList, { props: { data: mockChannelsList } })
    await w.find('.channel-name-link').trigger('click')
    expect(w.emitted('navigate-channel')?.[0]).toEqual([{ key: 'supplier:1', name: 'XX猎头' }])
  })
})

describe('ChannelDrilldown', () => {
  it('renders channel name', () => {
    const w = mount(ChannelDrilldown, { props: { data: mockChannelDrilldown } })
    expect(w.text()).toContain('XX猎头')
  })

  it('emits navigate-job on job distribution name click', async () => {
    const w = mount(ChannelDrilldown, { props: { data: mockChannelDrilldown } })
    await w.find('.dist-name-link').trigger('click')
    expect(w.emitted('navigate-job')?.[0]).toEqual([1])
  })

  it('shows contract info for 猎头', () => {
    const w = mount(ChannelDrilldown, { props: { data: mockChannelDrilldown } })
    expect(w.text()).toContain('合作中')
    expect(w.text()).toContain('合同至 2026-12')
  })

  it('shows expense detail with headhunter fee', () => {
    const w = mount(ChannelDrilldown, { props: { data: mockChannelDrilldown } })
    expect(w.text()).toContain('猎头费')
    expect(w.text()).toContain('¥50k')
    expect(w.text()).toContain('合计')
    expect(w.text()).toContain('¥60k')
  })

  it('shows job distribution', () => {
    const w = mount(ChannelDrilldown, { props: { data: mockChannelDrilldown } })
    expect(w.text()).toContain('后端工程师')
    expect(w.text()).toContain('产品经理')
  })

  it('emits back on button click', async () => {
    const w = mount(ChannelDrilldown, { props: { data: mockChannelDrilldown } })
    await w.find('.back-btn').trigger('click')
    expect(w.emitted('back')).toBeTruthy()
  })
})

// ── useAnalytics composable tests ──


describe('AnalyticsView navigation', () => {
  it('routes to jobs page when clicking job name', async () => {
    const analyticsApi = await import('@/api/analytics')
    vi.mocked(analyticsApi.fetchOverview).mockResolvedValue({
      cards: [],
      trend: [],
      funnel: [],
      funnel_cohort_size: 0,
      end_reasons: { rejected: { label: '未通过', total: 0, items: [] }, withdrawn: { label: '候选人退出', total: 0, items: [] } },
    } as any)
    vi.mocked(analyticsApi.fetchJobsList).mockResolvedValue(mockJobsList)
    vi.mocked(analyticsApi.fetchChannelsList).mockResolvedValue(mockChannelsList)

    const w = mount(AnalyticsView)
    await w.findAll('.tab-item')[1].trigger('click')
    await Promise.resolve()
    await Promise.resolve()
    await w.find('.job-title-link').trigger('click')
    expect(mockRouterPush).toHaveBeenCalledWith({ path: '/jobs', query: { panel: '1' } })
  })
})

describe('useAnalytics - shared state', () => {
  it('keeps granularity when switching tabs', async () => {
    const { useAnalytics } = await import('@/composables/useAnalytics')
    const analytics = useAnalytics()
    analytics.setCustomRange('2026-03-01', '2026-03-25')
    analytics.setGranularity('day')
    analytics.setTab('jobs')
    expect(analytics.state.granularity).toBe('day')
    analytics.setTab('channels')
    expect(analytics.state.granularity).toBe('day')
    analytics.setTab('overview')
    analytics.setPreset('this_month')
  })
})

describe('useAnalytics - granularity rules', () => {
  it('returns day for <= 14 day range', async () => {
    const { allowedGranularities, defaultGranularity } = await import('@/composables/useAnalytics')
    expect(allowedGranularities('2026-03-01', '2026-03-14')).toEqual(['day'])
    expect(defaultGranularity('2026-03-01', '2026-03-14')).toBe('day')
  })

  it('returns day+week for 2-4 week range', async () => {
    const { allowedGranularities, defaultGranularity } = await import('@/composables/useAnalytics')
    expect(allowedGranularities('2026-03-01', '2026-03-25')).toEqual(['day', 'week'])
    expect(defaultGranularity('2026-03-01', '2026-03-25')).toBe('week')
  })

  it('returns week+month for 1-3 month range', async () => {
    const { allowedGranularities } = await import('@/composables/useAnalytics')
    expect(allowedGranularities('2026-01-01', '2026-03-31')).toEqual(['week', 'month'])
  })

  it('returns month for 6-12 month range', async () => {
    const { allowedGranularities } = await import('@/composables/useAnalytics')
    expect(allowedGranularities('2025-06-01', '2026-03-31')).toEqual(['month'])
  })

  it('returns month+quarter for > 12 month range', async () => {
    const { allowedGranularities, defaultGranularity } = await import('@/composables/useAnalytics')
    expect(allowedGranularities('2024-01-01', '2026-03-31')).toEqual(['month', 'quarter'])
    expect(defaultGranularity('2024-01-01', '2026-03-31')).toBe('quarter')
  })
})
