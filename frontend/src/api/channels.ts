import { api } from './client'
import type { PaginatedResponse, Supplier, SourceTag } from './types'

// ── Supplier CRUD ──

export function fetchSupplier(supplierId: number) {
  return api.get<Supplier>(`/suppliers/${supplierId}`)
}

export function fetchSuppliers(includeDeleted = false) {
  return api.get<PaginatedResponse<Supplier>>(`/suppliers?page_size=100&include_deleted=${includeDeleted}`)
}

export interface SupplierCreatePayload {
  name: string
  type?: string
  contact_name?: string
  phone?: string
  email?: string
  notes?: string
  owner?: string
  guarantee_months?: number
  contract_start?: string
  contract_end?: string
  contract_terms?: string
}

export function createSupplier(payload: SupplierCreatePayload) {
  return api.post<Supplier>('/suppliers', payload)
}

export function updateSupplier(supplierId: number, payload: SupplierCreatePayload & { version?: number }) {
  return api.put<Supplier>(`/suppliers/${supplierId}`, payload)
}

export function deleteSupplier(supplierId: number) {
  return api.delete<void>(`/suppliers/${supplierId}`)
}

export interface SupplierStats {
  supplier_id: number
  candidate_count: number
  hired_count: number
}

export function fetchSupplierStats(supplierId: number) {
  return api.get<SupplierStats>(`/suppliers/${supplierId}/stats`)
}

export interface HeadhunterFeeItem {
  candidate_name: string
  headhunter_fee: number
  hire_date: string
  application_id: number
}

export function fetchHeadhunterFees(supplierId: number) {
  return api.get<HeadhunterFeeItem[]>(`/suppliers/${supplierId}/headhunter-fees`)
}

// ── SourceTag CRUD ──

export function fetchSourceTags() {
  return api.get<SourceTag[]>('/source-tags')
}

export function createSourceTag(name: string, type: 'platform' | 'other' = 'platform') {
  return api.post<SourceTag>('/source-tags', { type, name })
}

export function updateSourceTag(tagId: number, name: string, version?: number) {
  return api.put<SourceTag>(`/terms/${tagId}`, { name, version })
}

export function deleteSourceTag(tagId: number) {
  return api.delete<void>(`/terms/${tagId}`)
}

export interface SourceTagStat {
  id: number
  name: string
  candidate_count: number
  hired_count: number
}

export function fetchSourceTagStats() {
  return api.get<SourceTagStat[]>('/source-tags/stats')
}

export interface ReorderItem {
  id: number
  sort_order: number
}

export function reorderSourceTags(items: ReorderItem[]) {
  return api.patch<void>('/terms/reorder', { items })
}

// ── Expense CRUD ──

export interface Expense {
  id: number
  channel_type: string
  channel_id: number
  amount: number
  occurred_at: string
  description: string | null
  version: number
  created_at: string
  updated_at: string
}

export interface ExpenseCreatePayload {
  channel_type: string
  channel_id: number
  amount: number
  occurred_at: string
  description?: string
}

export function expenseMonthToOccurredAt(month: string) {
  return `${month}-01T00:00:00`
}

export function occurredAtToExpenseMonth(occurredAt: string) {
  return occurredAt.slice(0, 7)
}

export function fetchExpenses(channelType: string, channelId: number) {
  return api.get<PaginatedResponse<Expense>>(`/expenses?channel_type=${channelType}&channel_id=${channelId}&page_size=100`)
}

export function createExpense(payload: ExpenseCreatePayload) {
  return api.post<Expense>('/expenses', payload)
}

export function updateExpense(expenseId: number, payload: ExpenseCreatePayload & { version?: number }) {
  return api.put<Expense>(`/expenses/${expenseId}`, payload)
}

export function deleteExpense(expenseId: number) {
  return api.delete<void>(`/expenses/${expenseId}`)
}

// ── Candidates by channel ──

export function fetchCandidatesBySupplier(supplierId: number) {
  return api.get<PaginatedResponse<any>>(`/candidates?supplier_id=${supplierId}&page_size=100`)
}

export function fetchCandidatesBySource(source: string) {
  return api.get<PaginatedResponse<any>>(`/candidates?source=${encodeURIComponent(source)}&page_size=100`)
}

// ── Source tag utilities ──

export function splitSourceTags(tags: SourceTag[]) {
  return {
    platformTags: tags.filter((tag) => tag.type === 'platform'),
    otherTags: tags.filter((tag) => tag.type === 'other'),
  }
}
