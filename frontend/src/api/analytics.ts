import { api } from './client'

// ── Types ──

export interface CardItem {
  key: string
  value: number | null
  delta?: number | null
  delta_percent?: number | null
  previous: number | null
  change: number | null
}

export interface TrendBucket {
  period_start?: string
  bucket: string
  new_applications: number
  hired: number
}

export interface FunnelStage {
  stage: string
  count: number
  conversion: number | null
}

export interface EndReasonItem {
  reason: string
  count: number
}

export interface EndReasonGroup {
  label: string
  total: number
  items: EndReasonItem[]
}

export interface EndReasons {
  rejected: EndReasonGroup
  withdrawn: EndReasonGroup
}

export interface OverviewData {
  cards: CardItem[]
  trend: TrendBucket[]
  funnel: FunnelStage[]
  funnel_cohort_size: number
  end_reasons: EndReasons
}

// ── Jobs ──

export interface JobFunnelItem {
  stage: string
  count: number
}

export interface JobListItem {
  id?: number
  job_id: number
  title: string
  city: string | null
  status: string
  priority?: string | null
  headcount?: number
  hired_count?: number
  funnel: JobFunnelItem[]
  pass_rate: number | null
  avg_cycle_days?: number | null
  avg_cycle: number | null
}

export interface JobListTotals {
  funnel: JobFunnelItem[]
  pass_rate: number | null
  avg_cycle: number | null
}

export interface JobsListData {
  items: JobListItem[]
  totals: JobListTotals
}

export interface StageDuration {
  stage: string
  avg_days: number | null
  sample_size: number
}

export interface SourceDistItem {
  source: string
  count: number
}

export interface JobDrilldownData {
  job: {
    id: number
    title: string
    city: string | null
    status: string
    priority: string | null
    headcount: number
    hired_count?: number
    hired_total: number
    target_onboard_date?: string | null
  }
  funnel: FunnelStage[]
  funnel_cohort_size: number
  stage_durations: StageDuration[]
  source_distribution: SourceDistItem[]
  end_reasons: EndReasons
}

// ── Channels ──

export interface ChannelListItem {
  key: string
  name: string
  type?: string
  funnel: JobFunnelItem[]
  conversion_rate: number | null
  cost_per_hire: number | null
  total_expense: number
}

export interface ChannelSection {
  key?: string
  label: string
  items: ChannelListItem[]
}

export interface ChannelsListData {
  sections: ChannelSection[]
}

export interface JobDistItem {
  job_id: number
  title: string
  count: number
}

export interface ExpenseDetail {
  platform_cost: number
  headhunter_fee: number
  total: number
}

export interface ChannelDrilldownData {
  channel: {
    key: string
    name: string
    type?: string
    section: string
    section_key?: string
    contract_status?: string | null
    contract_end?: string | null
    deleted_at?: string | null
  }
  funnel: FunnelStage[]
  funnel_cohort_size: number
  end_reasons: EndReasons
  job_distribution: JobDistItem[]
  expense_detail: ExpenseDetail
}

// ── API ──

function qs(params: Record<string, string>) {
  return '?' + new URLSearchParams(params).toString()
}

export function fetchOverview(start: string, end: string, granularity: string) {
  return api.get<OverviewData>(`/analytics/overview${qs({ start, end, granularity })}`)
}

export function fetchJobsList(start: string, end: string, filter: string) {
  return api.get<JobsListData>(`/analytics/jobs${qs({ start, end, filter })}`)
}

export function fetchJobDrilldown(jobId: number, start: string, end: string) {
  return api.get<JobDrilldownData>(`/analytics/jobs/${jobId}${qs({ start, end })}`)
}

export function fetchChannelsList(start: string, end: string) {
  return api.get<ChannelsListData>(`/analytics/channels${qs({ start, end })}`)
}

export function fetchChannelDrilldown(channelKey: string, start: string, end: string) {
  return api.get<ChannelDrilldownData>(`/analytics/channels/${channelKey}${qs({ start, end })}`)
}
