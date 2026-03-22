<template>
  <div class="basic-info-tab">
    <div class="info-row">
      <div class="info-label">部门</div>
      <div class="info-value">{{ job.department || '-' }}</div>
    </div>

    <div class="info-row">
      <div class="info-label">办公地点</div>
      <div class="info-value">
        <div>{{ job.location_name || '-' }}</div>
        <div v-if="job.location_address" class="address">
          {{ job.location_address }}
          <button class="copy-btn" @click="copyAddress">复制地址</button>
          <span
            v-if="copyFeedback"
            class="copy-feedback"
            :class="`copy-feedback--${copyFeedback.type}`"
          >
            {{ copyFeedback.text }}
          </span>
        </div>
      </div>
    </div>

    <div class="info-row">
      <div class="info-label">headcount</div>
      <div class="info-value">{{ job.headcount }}</div>
    </div>

    <div class="info-row">
      <div class="info-label">优先级</div>
      <div class="info-value">{{ priorityLabel }}</div>
    </div>

    <div class="info-row">
      <div class="info-label">目标到岗日</div>
      <div class="info-value">{{ formatDate(job.target_onboard_date) || '-' }}</div>
    </div>

    <div v-if="job.notes" class="info-row">
      <div class="info-label">备注</div>
      <div class="info-value notes">{{ job.notes }}</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from 'vue'
import type { Job } from '@/api/types'
import { formatDate } from '@/utils/date'

const props = defineProps<{
  job: Job
}>()

const copyFeedback = ref<{ text: string; type: 'success' | 'error' } | null>(null)
let copyFeedbackTimer: ReturnType<typeof window.setTimeout> | null = null

const priorityLabel = computed(() => {
  const map: Record<string, string> = {
    high: '高',
    medium: '中',
    low: '低',
  }
  return map[props.job.priority || 'medium'] || '中'
})

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

async function copyAddress() {
  if (!props.job.location_address) return
  try {
    await navigator.clipboard.writeText(props.job.location_address)
    showCopyFeedback('success', '地址已复制')
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
.basic-info-tab {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.info-row {
  display: grid;
  grid-template-columns: 120px 1fr;
  gap: 16px;
}

.info-label {
  color: var(--color-text-secondary);
  font-size: 14px;
}

.info-value {
  font-size: 14px;
}

.address {
  color: var(--color-text-secondary);
  font-size: 13px;
  margin-top: 4px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.copy-btn {
  padding: 2px 8px;
  font-size: 12px;
  border: 1px solid var(--color-border);
  background: var(--color-bg-secondary);
  border-radius: 4px;
  cursor: pointer;
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

.notes {
  white-space: pre-wrap;
  color: var(--color-text-secondary);
}
</style>
