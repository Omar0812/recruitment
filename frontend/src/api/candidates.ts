import { api } from './client'
import type {
  Application,
  AttachmentEntry,
  CandidateCreatePayload,
  CandidateDetail,
  CandidateWithApplication,
  DuplicateCheckRequest,
  DuplicateCheckResponse,
  PaginatedResponse,
  TalentPoolFilters,
} from './types'

export function fetchCandidate(id: number) {
  return api.get<CandidateDetail>(`/candidates/${id}`)
}

export function createCandidate(payload: CandidateCreatePayload) {
  return api.post<CandidateDetail>('/candidates', payload)
}

export function updateCandidate(candidateId: number, payload: CandidateCreatePayload & { version?: number }) {
  return api.put<CandidateDetail>(`/candidates/${candidateId}`, payload)
}

export function fetchCandidateApplications(candidateId: number) {
  return api.get<PaginatedResponse<Application>>(
    `/applications?candidate_id=${candidateId}&page_size=100`,
  )
}

export function checkDuplicate(params: DuplicateCheckRequest) {
  return api.post<DuplicateCheckResponse>('/candidates/check-duplicate', params)
}

export function fetchCandidates(
  filters: TalentPoolFilters = {},
  page = 1,
  pageSize = 20,
) {
  const toList = (value?: string | string[]) => {
    if (Array.isArray(value)) return value.filter(Boolean)
    if (value) return [value]
    return []
  }

  const qs = new URLSearchParams()
  qs.set('page', String(page))
  qs.set('page_size', String(pageSize))
  if (filters.search) qs.set('search', filters.search)
  for (const source of toList(filters.source)) qs.append('source', source)
  const tags = toList(filters.tags)
  if (tags.length) qs.set('tags', tags.join(','))
  if (filters.education) qs.set('education', filters.education)
  if (filters.years_exp_min != null) qs.set('years_exp_min', String(filters.years_exp_min))
  if (filters.years_exp_max != null) qs.set('years_exp_max', String(filters.years_exp_max))
  if (filters.age_min != null) qs.set('age_min', String(filters.age_min))
  if (filters.age_max != null) qs.set('age_max', String(filters.age_max))
  if (filters.pipeline_status) qs.set('pipeline_status', filters.pipeline_status)
  if (filters.starred) qs.set('starred', 'true')
  if (filters.blacklist) qs.set('blacklist', filters.blacklist)
  return api.get<PaginatedResponse<CandidateWithApplication>>(`/candidates?${qs.toString()}`)
}

export async function fetchCandidateSkillOptions() {
  return api.get<string[]>('/candidates/skill-options')
}

export function toggleStar(candidateId: number) {
  return api.patch<{ starred: boolean }>(`/candidates/${candidateId}/star`)
}

export function addAttachment(
  candidateId: number,
  payload: { file_path: string; label?: string; type?: string },
) {
  return api.post<{ attachments: AttachmentEntry[] }>(
    `/candidates/${candidateId}/attachments`,
    payload,
  )
}

export function removeAttachment(candidateId: number, filePath: string) {
  return api.delete<{ attachments: AttachmentEntry[] }>(
    `/candidates/${candidateId}/attachments`,
    { file_path: filePath },
  )
}
