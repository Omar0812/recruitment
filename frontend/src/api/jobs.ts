import { api } from './client'
import type { Application, Job, PaginatedResponse, CreateJobPayload, CloseJobPayload } from './types'

export function fetchOpenJobs() {
  return api.get<PaginatedResponse<Job>>('/jobs?status=open&page_size=100')
}

interface FetchJobsParams {
  status?: 'open' | 'closed' | 'all'
  keyword?: string
  page?: number
  page_size?: number
}

export function fetchJobs(params: FetchJobsParams = {}) {
  const { status = 'open', keyword, page = 1, page_size = 100 } = params
  const queryParams = new URLSearchParams({
    page: page.toString(),
    page_size: page_size.toString(),
  })

  if (status !== 'all') {
    queryParams.append('status', status)
  }

  if (keyword) {
    queryParams.append('keyword', keyword)
  }

  return api.get<PaginatedResponse<Job>>(`/jobs?${queryParams.toString()}`)
}

export function fetchJobDetail(jobId: number) {
  return api.get<Job>(`/jobs/${jobId}`)
}

export function fetchJobApplications(jobId: number) {
  return api.get<PaginatedResponse<Application>>(`/applications?job_id=${jobId}&page_size=100`)
}

export function createJob(payload: CreateJobPayload) {
  return api.post<Job>('/jobs', payload)
}

export function updateJob(jobId: number, data: Partial<CreateJobPayload> & { version?: number }) {
  return api.put<Job>(`/jobs/${jobId}`, data)
}

export function closeJob(jobId: number, payload: CloseJobPayload) {
  return api.post<Job>(`/jobs/${jobId}/close`, payload)
}
