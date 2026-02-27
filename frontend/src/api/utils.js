import { ref } from 'vue'

/**
 * Wraps an async fn with a loading ref.
 * Usage: const [loading, run] = withLoading(async () => { ... })
 */
export function withLoading(fn) {
  const loading = ref(false)
  const run = async (...args) => {
    loading.value = true
    try {
      return await fn(...args)
    } finally {
      loading.value = false
    }
  }
  return [loading, run]
}

/**
 * Debounce a function call.
 */
export function debounce(fn, delay = 250) {
  let timer
  return (...args) => {
    clearTimeout(timer)
    timer = setTimeout(() => fn(...args), delay)
  }
}

/**
 * Format datetime string to locale string.
 */
export function formatDate(dt) {
  if (!dt) return ''
  return new Date(dt).toLocaleString('zh-CN', {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit',
  })
}

/**
 * Format date only (no time).
 */
export function formatDateOnly(dt) {
  if (!dt) return ''
  return new Date(dt).toLocaleDateString('zh-CN', {
    year: 'numeric', month: '2-digit', day: '2-digit',
  })
}
