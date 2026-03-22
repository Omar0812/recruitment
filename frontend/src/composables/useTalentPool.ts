import { reactive } from 'vue'
import { fetchCandidates, toggleStar } from '../api/candidates'
import type { CandidateWithApplication, TalentPoolFilters } from '../api/types'

interface TalentPoolState {
  items: CandidateWithApplication[]
  total: number
  page: number
  pageSize: number
  loading: boolean
  error: string | null
  toast: string | null
  filters: TalentPoolFilters
}

// 注意：与其他 composable 的模块级单例不同，useTalentPool 使用组件级实例模式。
// 原因：人才库的筛选条件和分页状态需要独立——不同调用方可以持有各自的筛选/分页状态互不干扰。
// 其他 composable（usePipeline、useJobs 等）使用模块级单例，适用于全局共享的状态场景。
export function useTalentPool(initialFilters: TalentPoolFilters = {}) {
  const state = reactive<TalentPoolState>({
    items: [],
    total: 0,
    page: 1,
    pageSize: 20,
    loading: false,
    error: null,
    toast: null,
    filters: { ...initialFilters },
  })

  let debounceTimer: ReturnType<typeof setTimeout> | null = null

  async function load() {
    state.loading = true
    state.error = null
    try {
      const res = await fetchCandidates(state.filters, state.page, state.pageSize)
      state.items = res.items
      state.total = res.total
    } catch (e: any) {
      state.error = e.message ?? '加载失败'
    } finally {
      state.loading = false
    }
  }

  function setFilters(filters: TalentPoolFilters) {
    state.filters = { ...filters }
    state.page = 1
    load()
  }

  function setSearch(search: string) {
    if (debounceTimer) clearTimeout(debounceTimer)
    debounceTimer = setTimeout(() => {
      state.filters = { ...state.filters, search: search || undefined }
      state.page = 1
      load()
    }, 300)
  }

  function setPage(page: number) {
    state.page = page
    load()
  }

  function clearFilters() {
    state.filters = {}
    state.page = 1
    load()
  }

  async function handleToggleStar(candidateId: number) {
    const item = state.items.find((c) => c.id === candidateId)
    if (!item) return

    // Optimistic update
    const prev = item.starred
    item.starred = prev ? 0 : 1

    try {
      await toggleStar(candidateId)
    } catch (error) {
      // Revert on failure
      item.starred = prev
      state.toast = error instanceof Error && error.message
        ? error.message
        : '星标更新失败，请稍后重试'
    }
  }

  function clearToast() {
    state.toast = null
  }

  // Load on mount
  load()

  return {
    state,
    load,
    setFilters,
    setSearch,
    setPage,
    clearFilters,
    handleToggleStar,
    clearToast,
  }
}
