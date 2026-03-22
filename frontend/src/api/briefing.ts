import { api } from './client'

// ── Types ──

export interface BriefingPulse {
  today_interviews: number
  todo_count: number
  active_applications: number
  open_jobs: number
}

export interface ScheduleItem {
  type: 'interview' | 'onboard'
  application_id: number
  candidate_id: number
  candidate_name: string
  job_id: number
  job_title: string
  scheduled_at?: string
  onboard_date?: string
  interview_round?: number
  interviewer?: string
  meeting_type?: string
}

export interface BriefingSchedule {
  today: ScheduleItem[]
  tomorrow: ScheduleItem[]
}

export interface TodoItem {
  candidate_id?: number
  candidate_name: string
  application_id?: number
  job_id?: number
  job_title?: string
  job_priority?: string | null
  interview_round?: number
  days: number
  time_label: string
}

export interface TodoGroup {
  type: string
  label: string
  items: TodoItem[]
  max_days: number
}

export interface FocusItem {
  entity: 'job' | 'candidate'
  job_id: number
  job_title: string
  department?: string | null
  priority?: string | null
  signals: string[]
  severity: number
  hired_count?: number
  headcount?: number
  // candidate-level fields
  application_id?: number
  candidate_id?: number
  candidate_name?: string
  stage?: string
  days_silent?: number
}

export interface BriefingData {
  pulse: BriefingPulse
  schedule: BriefingSchedule
  todos: TodoGroup[]
  focus: FocusItem[]
}

// ── API ──

export function fetchBriefing() {
  return api.get<BriefingData>('/briefing/today')
}
