import { reactive, readonly, computed } from 'vue'
import {
  fetchOverview,
  fetchJobsList,
  fetchJobDrilldown,
  fetchChannelsList,
  fetchChannelDrilldown,
} from '@/api/analytics'
import type {
  OverviewData,
  JobsListData,
  JobDrilldownData,
  ChannelsListData,
  ChannelDrilldownData,
} from '@/api/analytics'

// ── Time Presets ──

export type Preset = 'this_month' | 'last_month' | 'this_quarter' | 'last_quarter' | 'custom'
export type Granularity = 'day' | 'week' | 'month' | 'quarter'
export type Tab = 'overview' | 'jobs' | 'channels'

interface TimeRange {
  start: string   // YYYY-MM-DD
  end: string     // YYYY-MM-DD
}

const BIZ_TIME_ZONE = 'Asia/Shanghai'
const BIZ_DATE_FORMATTER = new Intl.DateTimeFormat('en-CA', {
  timeZone: BIZ_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})

function pad(value: number): string {
  return String(value).padStart(2, '0')
}

function formatDate(year: number, month: number, day: number): string {
  return `${year}-${pad(month)}-${pad(day)}`
}

function parseBizDateParts(date: Date = new Date()) {
  const parts = BIZ_DATE_FORMATTER.formatToParts(date)
  return {
    year: Number(parts.find((part) => part.type === 'year')?.value),
    month: Number(parts.find((part) => part.type === 'month')?.value),
    day: Number(parts.find((part) => part.type === 'day')?.value),
  }
}

export function today(reference: Date = new Date()): string {
  const { year, month, day } = parseBizDateParts(reference)
  return formatDate(year, month, day)
}

function firstDayOfMonth(year: number, month: number): string {
  return formatDate(year, month, 1)
}

function lastDayOfMonth(year: number, month: number): string {
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate()
  return formatDate(year, month, lastDay)
}

export function presetToRange(preset: Preset, reference: Date = new Date()): TimeRange {
  const now = parseBizDateParts(reference)
  const currentDay = formatDate(now.year, now.month, now.day)

  if (preset === 'this_month') {
    return { start: firstDayOfMonth(now.year, now.month), end: currentDay }
  }
  if (preset === 'last_month') {
    const year = now.month === 1 ? now.year - 1 : now.year
    const month = now.month === 1 ? 12 : now.month - 1
    return { start: firstDayOfMonth(year, month), end: lastDayOfMonth(year, month) }
  }
  if (preset === 'this_quarter') {
    const quarterStartMonth = Math.floor((now.month - 1) / 3) * 3 + 1
    return { start: firstDayOfMonth(now.year, quarterStartMonth), end: currentDay }
  }
  if (preset === 'last_quarter') {
    const currentQuarterStartMonth = Math.floor((now.month - 1) / 3) * 3 + 1
    const year = currentQuarterStartMonth === 1 ? now.year - 1 : now.year
    const quarterStartMonth = currentQuarterStartMonth === 1 ? 10 : currentQuarterStartMonth - 3
    const quarterEndMonth = quarterStartMonth + 2
    return {
      start: firstDayOfMonth(year, quarterStartMonth),
      end: lastDayOfMonth(year, quarterEndMonth),
    }
  }
  // custom: return current month as fallback
  return { start: firstDayOfMonth(now.year, now.month), end: currentDay }
}

// ── Granularity Rules ──

function daysBetween(start: string, end: string): number {
  const s = new Date(start)
  const e = new Date(end)
  return Math.round((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24)) + 1
}

export function allowedGranularities(start: string, end: string): Granularity[] {
  const days = daysBetween(start, end)
  if (days <= 14) return ['day']
  if (days <= 28) return ['day', 'week']
  if (days <= 90) return ['week', 'month']
  if (days <= 180) return ['week', 'month']
  if (days <= 365) return ['month']
  return ['month', 'quarter']
}

export function defaultGranularity(start: string, end: string): Granularity {
  const days = daysBetween(start, end)
  if (days <= 14) return 'day'
  if (days <= 28) return 'week'
  if (days <= 90) return 'week'
  if (days <= 180) return 'month'
  if (days <= 365) return 'month'
  return 'quarter'
}

// ── Shift (翻页) ──

function shiftDate(dateStr: string, deltaDays: number): string {
  const base = new Date(`${dateStr}T00:00:00Z`)
  base.setUTCDate(base.getUTCDate() + deltaDays)
  return base.toISOString().slice(0, 10)
}

export function shiftRange(
  start: string,
  end: string,
  direction: -1 | 1,
  reference: Date = new Date(),
): TimeRange {
  const days = daysBetween(start, end)
  const shiftedStart = shiftDate(start, direction * days)
  const shiftedEnd = shiftDate(end, direction * days)

  if (shiftedEnd > today(reference)) {
    return { start, end }
  }
  return {
    start: shiftedStart,
    end: shiftedEnd,
  }
}

// ── State ──

interface AnalyticsState {
  // Time
  preset: Preset
  start: string
  end: string
  granularity: Granularity

  // Tab
  activeTab: Tab

  // Data
  overview: OverviewData | null
  jobsList: JobsListData | null
  jobDrilldown: JobDrilldownData | null
  channelsList: ChannelsListData | null
  channelDrilldown: ChannelDrilldownData | null

  // Drill-down state
  selectedJobId: number | null
  selectedChannelKey: string | null

  // Jobs filter
  jobsFilter: string

  // Loading
  loading: boolean
  error: string | null
}

const initialRange = presetToRange('this_month')

const state = reactive<AnalyticsState>({
  preset: 'this_month',
  start: initialRange.start,
  end: initialRange.end,
  granularity: defaultGranularity(initialRange.start, initialRange.end),

  activeTab: 'overview',

  overview: null,
  jobsList: null,
  jobDrilldown: null,
  channelsList: null,
  channelDrilldown: null,

  selectedJobId: null,
  selectedChannelKey: null,

  jobsFilter: 'open',

  loading: false,
  error: null,
})

// ── Actions ──

async function loadCurrentTab() {
  state.loading = true
  state.error = null
  try {
    if (state.activeTab === 'overview') {
      state.overview = await fetchOverview(state.start, state.end, state.granularity)
    } else if (state.activeTab === 'jobs') {
      if (state.selectedJobId !== null) {
        state.jobDrilldown = await fetchJobDrilldown(state.selectedJobId, state.start, state.end)
      } else {
        state.jobsList = await fetchJobsList(state.start, state.end, state.jobsFilter)
      }
    } else if (state.activeTab === 'channels') {
      if (state.selectedChannelKey !== null) {
        state.channelDrilldown = await fetchChannelDrilldown(state.selectedChannelKey, state.start, state.end)
      } else {
        state.channelsList = await fetchChannelsList(state.start, state.end)
      }
    }
  } catch (e: any) {
    state.error = e.message ?? '加载失败'
  } finally {
    state.loading = false
  }
}

function setPreset(preset: Preset) {
  state.preset = preset
  if (preset !== 'custom') {
    const range = presetToRange(preset)
    state.start = range.start
    state.end = range.end
    state.granularity = defaultGranularity(range.start, range.end)
  }
  loadCurrentTab()
}

function setCustomRange(start: string, end: string) {
  state.preset = 'custom'
  state.start = start
  state.end = end
  state.granularity = defaultGranularity(start, end)
  loadCurrentTab()
}

function setGranularity(g: Granularity) {
  state.granularity = g
  if (state.activeTab === 'overview') {
    loadCurrentTab()
  }
}

function shift(direction: -1 | 1) {
  const newRange = shiftRange(state.start, state.end, direction)
  if (newRange.start === state.start && newRange.end === state.end) return
  state.preset = 'custom'
  state.start = newRange.start
  state.end = newRange.end
  state.granularity = defaultGranularity(newRange.start, newRange.end)
  loadCurrentTab()
}

function setTab(tab: Tab) {
  state.activeTab = tab
  state.selectedJobId = null
  state.selectedChannelKey = null
  loadCurrentTab()
}

function drillIntoJob(jobId: number) {
  state.selectedJobId = jobId
  loadCurrentTab()
}

function drillIntoChannel(channelKey: string) {
  state.selectedChannelKey = channelKey
  loadCurrentTab()
}

function backFromDrilldown() {
  state.selectedJobId = null
  state.selectedChannelKey = null
  loadCurrentTab()
}

function setJobsFilter(filter: string) {
  state.jobsFilter = filter
  loadCurrentTab()
}

// ── Computed ──

const displayRange = computed(() => {
  const s = state.start
  const e = state.end
  const todayStr = today()
  const endLabel = e === todayStr ? `${e}（今天）` : e
  return `${s} ~ ${endLabel}`
})

const canShiftForward = computed(() => {
  const shifted = shiftRange(state.start, state.end, 1)
  return shifted.start !== state.start || shifted.end !== state.end
})

const availableGranularities = computed(() => allowedGranularities(state.start, state.end))

// ── Export ──

export function useAnalytics() {
  return {
    state: readonly(state),
    displayRange,
    canShiftForward,
    availableGranularities,
    loadCurrentTab,
    setPreset,
    setCustomRange,
    setGranularity,
    shift,
    setTab,
    drillIntoJob,
    drillIntoChannel,
    backFromDrilldown,
    setJobsFilter,
    allowedGranularities,
    defaultGranularity,
  }
}
