import { reactive } from 'vue'
import { fetchHired } from '@/api/hired'
import type { HiredItem } from '@/api/hired'

interface HiredState {
  items: HiredItem[]
  loading: boolean
  error: string | null
  total: number
}

const state = reactive<HiredState>({
  items: [],
  loading: false,
  error: null,
  total: 0,
})

function parseHireDateTimestamp(hireDate: string | null): number | null {
  if (!hireDate) {
    return null
  }

  const timestamp = Date.parse(hireDate)
  return Number.isNaN(timestamp) ? null : timestamp
}

function sortHiredItems(items: HiredItem[]) {
  return items
    .map((item, index) => ({ item, index }))
    .sort((left, right) => {
      const leftTimestamp = parseHireDateTimestamp(left.item.hire_date)
      const rightTimestamp = parseHireDateTimestamp(right.item.hire_date)

      if (leftTimestamp == null && rightTimestamp == null) {
        return left.index - right.index
      }

      if (leftTimestamp == null) {
        return 1
      }

      if (rightTimestamp == null) {
        return -1
      }

      if (leftTimestamp === rightTimestamp) {
        return left.index - right.index
      }

      return rightTimestamp - leftTimestamp
    })
    .map(({ item }) => item)
}

async function load() {
  state.loading = true
  state.error = null
  try {
    const res = await fetchHired()
    state.items = sortHiredItems(res.items)
    state.total = res.total
  } catch (error) {
    state.error = error instanceof Error ? error.message : '已入职列表加载失败，请重试'
  } finally {
    state.loading = false
  }
}

export function useHired() {
  return {
    state,
    load,
  }
}
