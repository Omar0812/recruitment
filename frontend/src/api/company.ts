import { api } from './client'
import type { SourceTag } from './types'

export interface Term {
  id: number
  type: string
  name: string
  sort_order: number
  address: string | null
  version: number
}

interface TermCreatePayload {
  type: string
  name: string
  address?: string
}

export interface TermUpdatePayload {
  name: string
  address?: string
}

export interface ReorderItem {
  id: number
  sort_order: number
}

export function sortTermsByOrder(items: Term[]) {
  return [...items].sort((a, b) => {
    if (a.sort_order !== b.sort_order) {
      return a.sort_order - b.sort_order
    }
    return a.id - b.id
  })
}

export function fetchDepartments() {
  return api.get<Term[]>('/departments')
}

export function fetchLocations() {
  return api.get<Term[]>('/locations')
}

export function createDepartment(payload: TermCreatePayload) {
  return api.post<Term>('/departments', payload)
}

export function createLocation(payload: TermCreatePayload) {
  return api.post<Term>('/locations', payload)
}

export function updateTerm(termId: number, payload: TermUpdatePayload & { version?: number }) {
  return api.put<Term>(`/terms/${termId}`, payload)
}

export function deleteTerm(termId: number) {
  return api.delete<void>(`/terms/${termId}`)
}

export function reorderTerms(items: ReorderItem[]) {
  return api.patch<void>('/terms/reorder', { items })
}
