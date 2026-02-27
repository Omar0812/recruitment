import { defineStore } from 'pinia'
import { ref } from 'vue'
import { insightsApi } from '../api/insights'

export const useTodayStore = defineStore('today', () => {
  const todayItems = ref([])
  const weekSummary = ref({
    in_progress: 0,
    interviews_this_week: 0,
    offers_pending: 0,
    hired_this_week: 0,
  })
  const loading = ref(false)

  async function fetchToday() {
    loading.value = true
    try {
      const data = await insightsApi.getToday()
      todayItems.value = data.today || []
      weekSummary.value = data.week_summary || {}
    } finally {
      loading.value = false
    }
  }

  return { todayItems, weekSummary, loading, fetchToday }
})
