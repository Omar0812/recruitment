<template>
  <div class="jd-tab">
    <div class="jd-header">
      <button class="copy-btn" @click="copyJD">复制</button>
      <span
        v-if="copyFeedback"
        class="copy-feedback"
        :class="`copy-feedback--${copyFeedback.type}`"
      >
        {{ copyFeedback.text }}
      </span>
    </div>
    <div class="jd-content">
      {{ job.jd || '暂无 JD' }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { onBeforeUnmount, ref } from 'vue'
import type { Job } from '@/api/types'

const props = defineProps<{
  job: Job
}>()

const copyFeedback = ref<{ text: string; type: 'success' | 'error' } | null>(null)
let copyFeedbackTimer: ReturnType<typeof window.setTimeout> | null = null

function showCopyFeedback(type: 'success' | 'error', text: string) {
  copyFeedback.value = { type, text }
  if (copyFeedbackTimer) {
    window.clearTimeout(copyFeedbackTimer)
  }
  copyFeedbackTimer = window.setTimeout(() => {
    copyFeedback.value = null
    copyFeedbackTimer = null
  }, 2500)
}

async function copyJD() {
  if (!props.job.jd) return
  try {
    await navigator.clipboard.writeText(props.job.jd)
    showCopyFeedback('success', 'JD 已复制')
  } catch {
    showCopyFeedback('error', '复制失败，请重试')
  }
}

onBeforeUnmount(() => {
  if (copyFeedbackTimer) {
    window.clearTimeout(copyFeedbackTimer)
  }
})
</script>

<style scoped>
.jd-tab {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.jd-header {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: 8px;
}

.copy-btn {
  padding: 6px 16px;
  border: 1px solid var(--color-border);
  background: var(--color-bg-secondary);
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.2s;
}

.copy-btn:hover {
  border-color: var(--color-primary);
  color: var(--color-primary);
}

.copy-feedback {
  font-size: 12px;
}

.copy-feedback--success {
  color: var(--success-color);
}

.copy-feedback--error {
  color: var(--error-color);
}

.jd-content {
  white-space: pre-wrap;
  line-height: 1.6;
  font-size: 14px;
  color: var(--color-text-primary);
  padding: 16px;
  background: var(--color-bg-secondary);
  border-radius: 6px;
  border: 1px solid var(--color-border);
}
</style>
