import { reactive, readonly } from 'vue'
import { fetchBriefing } from '@/api/briefing'
import type { BriefingData } from '@/api/briefing'

interface BriefingState {
  data: BriefingData | null
  loading: boolean
  error: string | null
}

const state = reactive<BriefingState>({
  data: null,
  loading: false,
  error: null,
})

async function load() {
  state.loading = true
  state.error = null
  try {
    state.data = await fetchBriefing()
  } catch (e: any) {
    state.error = e.message ?? '加载失败'
  } finally {
    state.loading = false
  }
}

export function useBriefing() {
  return {
    state: readonly(state),
    load,
  }
}
