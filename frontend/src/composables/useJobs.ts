import { reactive } from 'vue'
import { fetchJobs } from '@/api/jobs'
import type { Job } from '@/api/types'

interface JobsState {
  jobs: Job[]
  loading: boolean
  initialized: boolean
  error: string | null
  status: 'open' | 'closed' | 'all'
  keyword: string
  total: number
}

const state = reactive<JobsState>({
  jobs: [],
  loading: false,
  initialized: false,
  error: null,
  status: 'open',
  keyword: '',
  total: 0,
})

async function loadJobs() {
  state.initialized = true
  state.loading = true
  state.error = null
  try {
    const response = await fetchJobs({
      status: state.status,
      keyword: state.keyword || undefined,
    })
    state.jobs = response.items
    state.total = response.total
  } catch (error) {
    state.error = error instanceof Error ? error.message : '岗位加载失败，请重试'
  } finally {
    state.loading = false
  }
}

export function setStatus(status: 'open' | 'closed' | 'all') {
  state.status = status
  return loadJobs()
}

export function setKeyword(keyword: string) {
  state.keyword = keyword
  return loadJobs()
}

export function refreshJobs() {
  if (!state.initialized) {
    return Promise.resolve()
  }
  return loadJobs()
}

export function useJobs() {
  return {
    state,
    setStatus,
    setKeyword,
    refresh: refreshJobs,
    load: loadJobs,
  }
}
