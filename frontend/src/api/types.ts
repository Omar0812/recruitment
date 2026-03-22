// ── 后端 Schema 对齐 ──

export interface Application {
  id: number
  candidate_id: number
  candidate_name: string | null
  job_id: number
  job_title: string | null
  state: string
  outcome: string | null
  stage: string | null
  created_at: string
  updated_at: string
}

export interface EventRecord {
  id: number
  application_id: number
  type: string
  occurred_at: string
  actor_type: string
  actor_id: number | null
  actor_display_name: string | null
  actor_deleted: boolean
  payload: Record<string, any> | null
  body: string | null
  version: number
  created_at: string
  updated_at: string
}

export interface Candidate {
  id: number
  name: string
  phone: string | null
  email: string | null
  source: string | null
  version: number
  created_at: string
  updated_at: string
}

export interface AttachmentEntry {
  file_path: string
  label: string
  type: string
  created_at: string
}

export interface CandidateDetail extends Candidate {
  name_en: string | null
  age: number | null
  education: string | null
  school: string | null
  last_company: string | null
  last_title: string | null
  years_exp: number | null
  skill_tags: string[]
  education_list: EducationEntry[]
  work_experience: WorkExperienceEntry[]
  project_experience: ProjectExperienceEntry[]
  notes: string | null
  blacklisted: boolean
  blacklist_reason: string | null
  blacklist_note: string | null
  resume_path: string | null
  attachments: AttachmentEntry[]
  starred: number
  supplier_id: number | null
  referred_by: string | null
  merged_into: number | null
}

export interface EducationEntry {
  school?: string
  degree?: string
  major?: string
  start?: string
  end?: string
}

export interface WorkExperienceEntry {
  company?: string
  title?: string
  start?: string
  end?: string
  description?: string
}

export interface ProjectExperienceEntry {
  name?: string
  role?: string
  start?: string
  end?: string
  description?: string
}

export interface CandidateDuplicatePanelItem {
  id: number
  display_id: string
  name: string
  phone: string | null
  email: string | null
  last_company: string | null
  last_title: string | null
  match_reasons: string[]
  is_blacklisted: boolean
  active_link: ActiveLink | null
  source: string | null
  attachments_count: number
  applications_count: number
  last_application: {
    job_title: string
    outcome: string | null
  } | null
}

// ── 查重 API（新版 intake 流程） ──

export interface DuplicateCheckRequest {
  name?: string
  phone?: string
  email?: string
}

export interface ActiveLink {
  application_id: number
  job_id: number
  job_title: string
  stage: string
}

export interface DuplicateMatch {
  candidate_id: number
  display_id: string
  name: string
  phone: string | null
  email: string | null
  last_company: string | null
  last_title: string | null
  match_reasons: string[]
  match_level: string
  is_blacklisted: boolean
  blacklist_reason: string | null
  last_application: {
    job_title: string
    outcome: string | null
    stage: string | null
    ended_at: string | null
  } | null
  active_link: ActiveLink | null
}

export interface DuplicateCheckResponse {
  matches: DuplicateMatch[]
  requires_decision: boolean
  has_blocking_in_progress_match: boolean
}

// ── Intake Resolve ──

export interface CandidateCreatePayload {
  name: string
  phone?: string
  email?: string
  source?: string
  name_en?: string
  age?: number
  education?: string
  school?: string
  last_company?: string
  last_title?: string
  years_exp?: number
  skill_tags?: string[]
  education_list?: EducationEntry[]
  work_experience?: WorkExperienceEntry[]
  project_experience?: ProjectExperienceEntry[]
  notes?: string
  resume_path?: string
  supplier_id?: number
  referred_by?: string
}

export interface IntakeResolveRequest {
  decision: 'create_new' | 'merge_existing'
  incoming: CandidateCreatePayload
  existing_candidate_id?: number
  overwrite_resume?: boolean
}

export interface IntakeResolveResponse {
  action: 'created' | 'merged'
  candidate: CandidateDetail
  active_link: ActiveLink | null
}

// ── SourceTag / Supplier ──

export interface SourceTag {
  id: number
  type: string
  name: string
  sort_order: number
  version: number
}

export interface Supplier {
  id: number
  name: string
  type: string | null
  contact_name: string | null
  phone: string | null
  email: string | null
  notes: string | null
  owner: string | null
  guarantee_months: number | null
  contract_start: string | null
  contract_end: string | null
  contract_terms: string | null
  version: number
  deleted_at: string | null
  created_at: string
  updated_at: string | null
}

// ── File Upload ──

export interface FileUploadResult {
  file_id: string
  file_path: string
  sha256: string
}

// ── 简历 AI 解析 ──

interface ResumeParseEducation {
  degree?: string
  school?: string
  major?: string
  period?: string
}

interface ResumeParseWork {
  company?: string
  title?: string
  period?: string
  description?: string
}

interface ResumeParseProject {
  name?: string
  role?: string
  period?: string
  description?: string
}

export interface ResumeParseResult {
  name?: string
  name_en?: string
  phone?: string
  email?: string
  age?: number
  years_exp?: number
  skill_tags?: string[]
  education_list?: ResumeParseEducation[]
  work_experience?: ResumeParseWork[]
  project_experience?: ResumeParseProject[]
  error?: string
  error_type?: string
}

export interface Job {
  id: number
  title: string
  department: string | null
  location_name: string | null
  location_address: string | null
  headcount: number
  jd: string | null
  priority: string | null
  target_onboard_date: string | null
  notes: string | null
  status: string
  close_reason: string | null
  closed_at: string | null
  hired_count: number
  stage_distribution: Record<string, number>
  version: number
  created_at: string
  updated_at: string
}

interface JobWithApplications extends Job {
  applications: Application[]
}

export interface CreateJobPayload {
  title: string
  department: string
  location_name: string
  location_address?: string
  headcount: number
  jd: string
  priority?: string
  target_onboard_date?: string
  notes?: string
}

export interface CloseJobPayload {
  reason: string
  version?: number
}

export interface PaginatedResponse<T> {
  items: T[]
  total: number
  page: number
  page_size: number
}

export interface ActionCatalogItem {
  action_code: string
  target_type: string
}

type ActionTargetType = 'application' | 'candidate' | 'job' | 'supplier' | 'term' | 'expense'
type ActorType = 'human' | 'copilot' | 'agent' | 'system'

export interface ActionRequest {
  command_id: string
  action_code: string
  target: { type: ActionTargetType; id: number }
  payload?: Record<string, any>
  actor?: { type: ActorType }
}

export interface ActionExecuteResponse {
  ok: boolean
  command_id: string
  action_code: string
  target_type: string
  target_id: number
  event_ids: number[]
  state_before: string | null
  state_after: string | null
  stage_before: string | null
  stage_after: string | null
  error_code: string | null
  error_message: string | null
  message: string | null
}

// ── 人才库 ──

export interface LatestApplication {
  job_title: string
  state: string
  stage: string | null
  outcome: string | null
  status_changed_at?: string | null
  hire_date?: string | null
}

export interface CandidateWithApplication extends CandidateDetail {
  latest_application: LatestApplication | null
}

export interface TalentPoolFilters {
  search?: string
  source?: string | string[]
  tags?: string | string[]
  education?: string
  years_exp_min?: number
  years_exp_max?: number
  age_min?: number
  age_max?: number
  pipeline_status?: string
  starred?: boolean
  blacklist?: string
}

// ── 前端组装后的展示类型 ──

export interface PipelineItem {
  application: Application
  candidate: CandidateDetail
  job: Job
}

export interface EventSummary {
  stageDetail: string        // 如 "二面安排中"、"一面待面评"、"Offer沟通"
  nextInterviewAt: string | null  // 最近未完成面试的 scheduled_at
  hasPendingFeedback: boolean     // 面试时间已过且无面评
}
