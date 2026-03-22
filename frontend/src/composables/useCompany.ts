import { reactive } from 'vue'
import {
  fetchDepartments,
  fetchLocations,
  createDepartment,
  createLocation,
  sortTermsByOrder,
  updateTerm,
  deleteTerm,
  reorderTerms,
} from '@/api/company'
import type { Term, TermUpdatePayload } from '@/api/company'

interface CompanyState {
  departments: Term[]
  locations: Term[]
  loading: boolean
  error: string | null
}

const state = reactive<CompanyState>({
  departments: [],
  locations: [],
  loading: false,
  error: null,
})

function getErrorMessage(error: unknown) {
  if (error instanceof Error && error.message) {
    return error.message
  }
  return '加载失败，请稍后重试'
}

function normalizeName(name: string) {
  return name.trim()
}

function isSameName(a: string, b: string) {
  return a.trim().toLowerCase() === b.trim().toLowerCase()
}

function ensureUniqueName(items: Term[], name: string, excludeId?: number) {
  if (items.some((item) => item.id !== excludeId && isSameName(item.name, name))) {
    throw new Error('已存在')
  }
}

async function loadDepartments() {
  state.departments = sortTermsByOrder(await fetchDepartments())
}

async function loadLocations() {
  state.locations = sortTermsByOrder(await fetchLocations())
}

async function loadAll() {
  state.loading = true
  state.error = null
  try {
    await Promise.all([loadDepartments(), loadLocations()])
  } catch (error) {
    state.error = getErrorMessage(error)
  } finally {
    state.loading = false
  }
}

async function addDepartment(name: string) {
  const normalizedName = normalizeName(name)
  ensureUniqueName(state.departments, normalizedName)
  const term = await createDepartment({ type: 'department', name: normalizedName })
  state.departments.push(term)
  state.departments = sortTermsByOrder(state.departments)
  return term
}

async function addLocation(name: string, address?: string) {
  const normalizedName = normalizeName(name)
  ensureUniqueName(state.locations, normalizedName)
  const term = await createLocation({
    type: 'location',
    name: normalizedName,
    address: address?.trim() || undefined,
  })
  state.locations.push(term)
  state.locations = sortTermsByOrder(state.locations)
  return term
}

async function update(termId: number, payload: TermUpdatePayload) {
  const target = state.departments.find((item) => item.id === termId)
    ?? state.locations.find((item) => item.id === termId)
  if (!target) {
    throw new Error('词条不存在')
  }

  const normalizedName = normalizeName(payload.name)
  const collection = target.type === 'location' ? state.locations : state.departments
  ensureUniqueName(collection, normalizedName, termId)

  const updated = await updateTerm(termId, {
    name: normalizedName,
    address: payload.address?.trim() || undefined,
    version: target.version,
  })
  // Update in departments
  const dIdx = state.departments.findIndex(t => t.id === termId)
  if (dIdx >= 0) state.departments[dIdx] = updated
  // Update in locations
  const lIdx = state.locations.findIndex(t => t.id === termId)
  if (lIdx >= 0) state.locations[lIdx] = updated
  state.departments = sortTermsByOrder(state.departments)
  state.locations = sortTermsByOrder(state.locations)
  return updated
}

async function remove(termId: number) {
  await deleteTerm(termId)
  state.departments = state.departments.filter(t => t.id !== termId)
  state.locations = state.locations.filter(t => t.id !== termId)
}

async function reorder(items: { id: number; sort_order: number }[]) {
  await reorderTerms(items)
  // Update local sort orders
  for (const item of items) {
    const dept = state.departments.find(t => t.id === item.id)
    if (dept) dept.sort_order = item.sort_order
    const loc = state.locations.find(t => t.id === item.id)
    if (loc) loc.sort_order = item.sort_order
  }
  // Re-sort
  state.departments = sortTermsByOrder(state.departments)
  state.locations = sortTermsByOrder(state.locations)
}

export function useCompany() {
  return {
    state,
    loadAll,
    addDepartment,
    addLocation,
    update,
    remove,
    reorder,
  }
}
