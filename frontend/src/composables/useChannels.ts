import { reactive } from 'vue'
import {
  fetchSuppliers,
  fetchSourceTags,
  fetchSourceTagStats,
  fetchSupplierStats,
  fetchExpenses,
  fetchHeadhunterFees,
  fetchCandidatesBySupplier,
  fetchCandidatesBySource,
  createSupplier,
  updateSupplier,
  deleteSupplier,
  createSourceTag,
  updateSourceTag,
  deleteSourceTag,
  reorderSourceTags,
  createExpense,
  updateExpense,
  deleteExpense,
} from '@/api/channels'
import type {
  Expense,
  ExpenseCreatePayload,
  HeadhunterFeeItem,
  ReorderItem,
  SupplierCreatePayload,
  SupplierStats,
  SourceTagStat,
} from '@/api/channels'
import type { CandidateWithApplication, SourceTag, Supplier } from '@/api/types'

export interface SupplierWithStats extends Supplier {
  candidate_count: number
  hired_count: number
}

export type ChannelPanelMode = 'view' | 'create_supplier' | 'edit_supplier'

interface ChannelPanelData {
  type: 'supplier' | 'source_tag'
  mode: ChannelPanelMode
  id: number | null
  name: string
  supplier?: SupplierWithStats
  candidates: CandidateWithApplication[]
  expenses: Expense[]
  headhunterFees: HeadhunterFeeItem[]
  stats: { candidate_count: number; hired_count: number } | null
  loading: boolean
  error: string | null
}

interface ChannelsState {
  suppliers: SupplierWithStats[]
  sourceTags: SourceTag[]
  sourceTagStats: SourceTagStat[]
  loading: boolean
  error: string | null
  panel: ChannelPanelData | null
}

const state = reactive<ChannelsState>({
  suppliers: [],
  sourceTags: [],
  sourceTagStats: [],
  loading: false,
  error: null,
  panel: null,
})

function getErrorMessage(error: unknown): string {
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

function compareBySortOrder<T extends { sort_order: number; id: number }>(a: T, b: T) {
  if (a.sort_order !== b.sort_order) {
    return a.sort_order - b.sort_order
  }
  return a.id - b.id
}

function compareByIdDesc<T extends { id: number }>(a: T, b: T) {
  return b.id - a.id
}

function ensureUniqueName<T extends { id: number; name: string }>(
  items: T[],
  name: string,
  excludeId?: number,
) {
  if (items.some((item) => item.id !== excludeId && isSameName(item.name, name))) {
    throw new Error('已存在')
  }
}

function withSupplierStats(supplier: Supplier, stats?: SupplierStats): SupplierWithStats {
  return {
    ...supplier,
    candidate_count: stats?.candidate_count ?? 0,
    hired_count: stats?.hired_count ?? 0,
  }
}

async function loadSupplierStats(items: Supplier[]) {
  const settled = await Promise.allSettled(items.map(async (supplier) => {
    const stats = await fetchSupplierStats(supplier.id)
    return [supplier.id, stats] as const
  }))

  const statsMap = new Map<number, SupplierStats>()
  for (const result of settled) {
    if (result.status === 'fulfilled') {
      statsMap.set(result.value[0], result.value[1])
    }
  }
  return statsMap
}

function syncPanelSupplier(supplier: SupplierWithStats) {
  if (state.panel?.type !== 'supplier' || state.panel.id !== supplier.id) {
    return
  }
  state.panel.supplier = supplier
  state.panel.name = supplier.name
  state.panel.stats = {
    candidate_count: supplier.candidate_count,
    hired_count: supplier.hired_count,
  }
}

async function loadAll() {
  state.loading = true
  state.error = null
  try {
    const [suppliersRes, tags, tagStats] = await Promise.all([
      fetchSuppliers(),
      fetchSourceTags(),
      fetchSourceTagStats(),
    ])
    const supplierStats = await loadSupplierStats(suppliersRes.items)

    state.suppliers = suppliersRes.items
      .map((supplier) => withSupplierStats(supplier, supplierStats.get(supplier.id)))
      .sort(compareByIdDesc)
    state.sourceTags = [...tags].sort(compareBySortOrder)
    state.sourceTagStats = [...tagStats].sort((a, b) => a.id - b.id)
  } catch (error) {
    state.error = getErrorMessage(error)
  } finally {
    state.loading = false
  }
}

// ── Panel ──

function openCreateSupplierPanel() {
  state.panel = {
    type: 'supplier',
    mode: 'create_supplier',
    id: null,
    name: '新建猎头公司',
    candidates: [],
    expenses: [],
    headhunterFees: [],
    stats: { candidate_count: 0, hired_count: 0 },
    loading: false,
    error: null,
  }
}

function startEditingSupplier() {
  if (state.panel?.type !== 'supplier' || !state.panel.supplier) {
    return
  }
  state.panel.mode = 'edit_supplier'
  state.panel.error = null
}

function closeSupplierForm() {
  if (state.panel?.type !== 'supplier') {
    return
  }
  if (state.panel.mode === 'create_supplier') {
    state.panel = null
    return
  }
  state.panel.mode = 'view'
  state.panel.error = null
}

async function openSupplierPanel(supplier: SupplierWithStats) {
  state.panel = {
    type: 'supplier',
    mode: 'view',
    id: supplier.id,
    name: supplier.name,
    supplier,
    candidates: [],
    expenses: [],
    headhunterFees: [],
    stats: null,
    loading: true,
    error: null,
  }
  try {
    const [candidatesRes, expensesRes, stats, headhunterFees] = await Promise.all([
      fetchCandidatesBySupplier(supplier.id),
      fetchExpenses('supplier', supplier.id),
      fetchSupplierStats(supplier.id),
      fetchHeadhunterFees(supplier.id),
    ])
    if (state.panel?.id === supplier.id) {
      state.panel.candidates = candidatesRes.items
      state.panel.expenses = expensesRes.items
      state.panel.headhunterFees = headhunterFees
      state.panel.stats = stats
      state.panel.loading = false
      state.panel.error = null
      state.panel.mode = 'view'
    }
  } catch (error) {
    if (state.panel?.id === supplier.id && state.panel.type === 'supplier') {
      state.panel.loading = false
      state.panel.error = getErrorMessage(error)
    }
  }
}

async function openSourceTagPanel(tag: SourceTag) {
  const tagStat = state.sourceTagStats.find(s => s.id === tag.id)
  state.panel = {
    type: 'source_tag',
    mode: 'view',
    id: tag.id,
    name: tag.name,
    candidates: [],
    expenses: [],
    headhunterFees: [],
    stats: tagStat ? { candidate_count: tagStat.candidate_count, hired_count: tagStat.hired_count } : null,
    loading: true,
    error: null,
  }
  try {
    const [candidatesRes, expensesRes] = await Promise.all([
      fetchCandidatesBySource(tag.name),
      fetchExpenses('source_tag', tag.id),
    ])
    if (state.panel?.id === tag.id && state.panel?.type === 'source_tag') {
      state.panel.candidates = candidatesRes.items
      state.panel.expenses = expensesRes.items
      state.panel.loading = false
      state.panel.error = null
    }
  } catch (error) {
    if (state.panel?.id === tag.id && state.panel.type === 'source_tag') {
      state.panel.loading = false
      state.panel.error = getErrorMessage(error)
    }
  }
}

function closePanel() {
  state.panel = null
}

// ── Supplier CRUD ──

async function addSupplier(payload: SupplierCreatePayload) {
  const normalizedName = normalizeName(payload.name)
  ensureUniqueName(state.suppliers, normalizedName)
  const supplier = withSupplierStats(await createSupplier({
    ...payload,
    name: normalizedName,
  }))
  state.suppliers.unshift(supplier)
  state.suppliers.sort(compareByIdDesc)
  return supplier
}

async function editSupplier(id: number, payload: SupplierCreatePayload) {
  const normalizedName = normalizeName(payload.name)
  ensureUniqueName(state.suppliers, normalizedName, id)
  const previous = state.suppliers.find((item) => item.id === id)
  const supplier = withSupplierStats(await updateSupplier(id, {
    ...payload,
    name: normalizedName,
    version: previous?.version,
  }), previous ? {
    supplier_id: id,
    candidate_count: previous.candidate_count,
    hired_count: previous.hired_count,
  } : undefined)
  const idx = state.suppliers.findIndex(x => x.id === id)
  if (idx >= 0) {
    state.suppliers[idx] = supplier
  }
  syncPanelSupplier(supplier)
  return supplier
}

async function removeSupplier(id: number) {
  await deleteSupplier(id)
  state.suppliers = state.suppliers.filter(x => x.id !== id)
  if (state.panel?.id === id && state.panel?.type === 'supplier') {
    state.panel = null
  }
}

// ── SourceTag CRUD ──

async function addSourceTag(name: string, type: 'platform' | 'other' = 'platform') {
  const normalizedName = normalizeName(name)
  ensureUniqueName(state.sourceTags, normalizedName)
  const tag = await createSourceTag(normalizedName, type)
  state.sourceTags.push(tag)
  state.sourceTags.sort(compareBySortOrder)
  state.sourceTagStats.push({
    id: tag.id,
    name: tag.name,
    candidate_count: 0,
    hired_count: 0,
  })
  return tag
}

async function editSourceTag(id: number, name: string) {
  const normalizedName = normalizeName(name)
  ensureUniqueName(state.sourceTags, normalizedName, id)
  const existing = state.sourceTags.find(t => t.id === id)
  const tag = await updateSourceTag(id, normalizedName, existing?.version)
  const idx = state.sourceTags.findIndex(t => t.id === id)
  if (idx >= 0) state.sourceTags[idx] = tag
  const statsIdx = state.sourceTagStats.findIndex((item) => item.id === id)
  if (statsIdx >= 0) {
    state.sourceTagStats[statsIdx] = {
      ...state.sourceTagStats[statsIdx],
      name: tag.name,
    }
  }
  if (state.panel?.type === 'source_tag' && state.panel.id === id) {
    state.panel.name = tag.name
  }
  return tag
}

async function removeSourceTag(id: number) {
  await deleteSourceTag(id)
  state.sourceTags = state.sourceTags.filter(t => t.id !== id)
  state.sourceTagStats = state.sourceTagStats.filter((item) => item.id !== id)
  if (state.panel?.type === 'source_tag' && state.panel.id === id) {
    state.panel = null
  }
}

async function applySourceTagReorder(items: ReorderItem[]) {
  await reorderSourceTags(items)
  const sortMap = new Map(items.map((item) => [item.id, item.sort_order]))
  state.sourceTags = state.sourceTags
    .map((tag) => ({
      ...tag,
      sort_order: sortMap.get(tag.id) ?? tag.sort_order,
    }))
    .sort(compareBySortOrder)
}

// ── Expense CRUD ──

async function addExpense(payload: ExpenseCreatePayload) {
  const e = await createExpense(payload)
  if (state.panel && state.panel.type === payload.channel_type && state.panel.id === payload.channel_id) {
    state.panel.expenses.unshift(e)
  }
  return e
}

async function editExpense(expenseId: number, payload: ExpenseCreatePayload) {
  const existing = state.panel?.expenses.find(x => x.id === expenseId)
  const e = await updateExpense(expenseId, { ...payload, version: existing?.version })
  if (state.panel) {
    const idx = state.panel.expenses.findIndex(x => x.id === expenseId)
    if (idx >= 0) state.panel.expenses[idx] = e
  }
  return e
}

async function removeExpense(expenseId: number) {
  await deleteExpense(expenseId)
  if (state.panel) {
    state.panel.expenses = state.panel.expenses.filter(x => x.id !== expenseId)
  }
}

export function useChannels() {
  return {
    state,
    loadAll,
    openCreateSupplierPanel,
    openSupplierPanel,
    openSourceTagPanel,
    startEditingSupplier,
    closeSupplierForm,
    closePanel,
    addSupplier,
    editSupplier,
    removeSupplier,
    addSourceTag,
    editSourceTag,
    removeSourceTag,
    applySourceTagReorder,
    addExpense,
    editExpense,
    removeExpense,
  }
}
