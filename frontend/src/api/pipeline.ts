import { api } from './client'
import type {
  ActionCatalogItem,
  ActionExecuteResponse,
  ActionRequest,
  Application,
  EventRecord,
  EventSummary,
  Job,
  PaginatedResponse,
} from './types'

// Re-export from candidates module for backward compatibility
export { fetchCandidate } from './candidates'

export function fetchActiveApplications(page = 1, pageSize = 100) {
  return api.get<PaginatedResponse<Application>>(
    `/pipeline/active?page=${page}&page_size=${pageSize}`,
  )
}

export function fetchEvents(applicationId: number) {
  return api.get<EventRecord[]>(`/events?application_id=${applicationId}`)
}

export async function fetchEventSummaries(
  ids: number[],
): Promise<Record<number, EventSummary>> {
  if (ids.length === 0) return {}
  const raw = await api.get<Record<string, EventSummary>>(
    `/pipeline/event-summaries?application_ids=${ids.join(',')}`,
  )
  const result: Record<number, EventSummary> = {}
  for (const [k, v] of Object.entries(raw)) {
    result[Number(k)] = {
      stageDetail: (v as any).stage_detail ?? '',
      nextInterviewAt: (v as any).next_interview_at ?? null,
      hasPendingFeedback: (v as any).has_pending_feedback ?? false,
    }
  }
  return result
}

export function fetchAvailableActions(targetId: number) {
  return api.get<ActionCatalogItem[]>(
    `/actions/available?target_type=application&target_id=${targetId}`,
  )
}

export function executeAction(req: ActionRequest) {
  return api.post<ActionExecuteResponse>('/actions/execute', req)
}

export function fetchJob(id: number) {
  return api.get<Job>(`/jobs/${id}`)
}

export function updateEvent(eventId: number, data: { payload?: Record<string, any>; body?: string; version?: number }) {
  return api.put<EventRecord>(`/events/${eventId}`, data)
}
