import { reactive, readonly } from 'vue'
import { fetchJobDetail, fetchJobApplications } from '@/api/jobs'
import type { Job, Application } from '@/api/types'

export type JobPanelTab = 'basic' | 'jd' | 'candidates'

interface JobPanelState {
  isOpen: boolean
  mode: 'view' | 'create' | 'edit'
  jobId: number | null
  activeTab: JobPanelTab
  loading: boolean
  error: string | null
  job: Job | null
  applications: Application[]
}

const state = reactive<JobPanelState>({
  isOpen: false,
  mode: 'view',
  jobId: null,
  activeTab: 'basic',
  loading: false,
  error: null,
  job: null,
  applications: [],
})

async function loadJobData(id: number) {
  state.loading = true
  state.error = null
  try {
    const [job, appResponse] = await Promise.all([
      fetchJobDetail(id),
      fetchJobApplications(id),
    ])
    if (state.jobId === id) {
      state.job = job
      state.applications = appResponse.items
    }
  } catch (error) {
    if (state.jobId === id) {
      state.error = error instanceof Error ? error.message : '岗位详情加载失败，请重试'
    }
  } finally {
    if (state.jobId === id) {
      state.loading = false
    }
  }
}

export function openJobPanel(jobId: number, options?: { activeTab?: JobPanelTab }) {
  if (state.isOpen && state.jobId === jobId) return

  state.isOpen = true
  state.mode = 'view'
  state.jobId = jobId
  state.activeTab = options?.activeTab ?? 'basic'
  state.error = null
  state.job = null
  state.applications = []
  return loadJobData(jobId)
}

export function openCreateJobPanel() {
  state.isOpen = true
  state.mode = 'create'
  state.jobId = null
  state.activeTab = 'basic'
  state.error = null
  state.job = null
  state.applications = []
  state.loading = false
}

export function openEditJobPanel() {
  if (!state.jobId || !state.job) return
  state.mode = 'edit'
}

export function closeJobPanel() {
  state.isOpen = false
  state.mode = 'view'
  state.jobId = null
  state.activeTab = 'basic'
  state.job = null
  state.applications = []
  state.loading = false
  state.error = null
}

export async function refreshJobPanel() {
  if (state.jobId) {
    await loadJobData(state.jobId)
  }
}

export function setJobPanelActiveTab(tab: JobPanelTab) {
  state.activeTab = tab
}

export const jobPanelState = readonly(state)

export function useJobPanel() {
  return {
    state: jobPanelState,
    open: openJobPanel,
    openCreate: openCreateJobPanel,
    openEdit: openEditJobPanel,
    close: closeJobPanel,
    refresh: refreshJobPanel,
    setActiveTab: setJobPanelActiveTab,
  }
}
