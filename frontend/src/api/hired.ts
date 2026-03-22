import { api } from './client'
import type { PaginatedResponse } from './types'

export interface HiredItem {
  application_id: number
  candidate_id: number
  candidate_name: string | null
  job_id: number
  job_title: string | null
  hire_date: string | null
  monthly_salary: number | null
  salary_months: number | null
  total_cash: number | null
  source: string | null
  supplier_id: number | null
}

export function fetchHired(page = 1, pageSize = 100) {
  return api.get<PaginatedResponse<HiredItem>>(`/hired?page=${page}&page_size=${pageSize}`)
}
