import { reactive, readonly } from 'vue'
import { fetchCandidate, fetchCandidateApplications } from '@/api/candidates'
import type { Application, CandidateDetail } from '@/api/types'

interface CandidatePanelState {
  isOpen: boolean
  candidateId: number | null
  loading: boolean
  error: string | null
  candidate: CandidateDetail | null
  applications: Application[]
  returnToJobId: number | null
}

interface CandidatePanelMutationState {
  version: number
  candidateId: number | null
}

const state = reactive<CandidatePanelState>({
  isOpen: false,
  candidateId: null,
  loading: false,
  error: null,
  candidate: null,
  applications: [],
  returnToJobId: null,
})

const mutationState = reactive<CandidatePanelMutationState>({
  version: 0,
  candidateId: null,
})

async function loadCandidateData(id: number) {
  state.loading = true
  state.error = null
  try {
    const [candidate, appResponse] = await Promise.all([
      fetchCandidate(id),
      fetchCandidateApplications(id),
    ])
    // Only update if still viewing the same candidate
    if (state.candidateId === id) {
      state.candidate = candidate
      state.applications = appResponse.items
    }
  } catch (error) {
    if (state.candidateId === id) {
      state.error = error instanceof Error ? error.message : '候选人详情加载失败，请重试'
    }
  } finally {
    if (state.candidateId === id) {
      state.loading = false
    }
  }
}

export function openCandidatePanel(candidateId: number, options?: { returnToJobId?: number }) {
  if (state.isOpen && state.candidateId === candidateId) return

  state.isOpen = true
  state.candidateId = candidateId
  state.error = null
  state.candidate = null
  state.applications = []
  state.returnToJobId = options?.returnToJobId ?? null
  loadCandidateData(candidateId)
}

export function closeCandidatePanel() {
  state.isOpen = false
  state.candidateId = null
  state.candidate = null
  state.applications = []
  state.loading = false
  state.error = null
  state.returnToJobId = null
}

function markCandidatePanelMutation(candidateId: number) {
  mutationState.version += 1
  mutationState.candidateId = candidateId
}

export async function refreshCandidatePanel(options?: { markMutation?: boolean }) {
  if (state.candidateId) {
    const candidateId = state.candidateId
    await loadCandidateData(candidateId)
    if (options?.markMutation) {
      markCandidatePanelMutation(candidateId)
    }
  }
}

export const candidatePanelState = readonly(state)
export const candidatePanelMutationState = readonly(mutationState)

export function useCandidatePanel() {
  return {
    state: candidatePanelState,
    mutation: candidatePanelMutationState,
    open: openCandidatePanel,
    close: closeCandidatePanel,
    refresh: refreshCandidatePanel,
  }
}
