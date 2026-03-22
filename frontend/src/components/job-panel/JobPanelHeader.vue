<template>
  <div class="panel-header">
    <div class="header-content">
      <div class="job-title">
        {{ job.title }}
        <span v-if="job.location_name" class="location">（{{ job.location_name }}）</span>
      </div>
      <div class="job-meta">
        <span class="status-badge" :class="job.status">
          {{ job.status === 'open' ? '招聘中' : '已关闭' }}
        </span>
        <span v-if="job.priority && job.status === 'open'" class="priority" :class="job.priority">
          {{ priorityLabel }}
        </span>
      </div>
    </div>
    <button class="close-btn" @click="$emit('close')">×</button>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { Job } from '@/api/types'

const props = defineProps<{
  job: Job
}>()

defineEmits<{
  close: []
}>()

const priorityLabel = computed(() => {
  const map: Record<string, string> = {
    high: '高优',
    medium: '中',
    low: '低',
  }
  return map[props.job.priority || 'medium'] || '中'
})
</script>

<style scoped>
.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: 24px;
  border-bottom: 1px solid var(--color-border);
}

.header-content {
  flex: 1;
}

.job-title {
  font-size: 20px;
  font-weight: 600;
  margin-bottom: 8px;
}

.location {
  color: var(--color-text-secondary);
  font-weight: normal;
}

.job-meta {
  display: flex;
  gap: 8px;
  align-items: center;
}

.status-badge {
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
}

.status-badge.open {
  background: var(--success-bg);
  color: var(--success-color);
}

.status-badge.closed {
  background: var(--color-text-tertiary);
  color: white;
}

.priority {
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
}

.priority.high {
  background: var(--error-bg);
  color: var(--error-color);
}

.priority.medium {
  background: var(--warning-bg);
  color: var(--warning-color);
}

.priority.low {
  background: var(--info-bg);
  color: var(--info-color);
}

.close-btn {
  width: 32px;
  height: 32px;
  border: none;
  background: none;
  font-size: 24px;
  cursor: pointer;
  color: var(--color-text-secondary);
  transition: color 0.2s;
}

.close-btn:hover {
  color: var(--color-text-primary);
}
</style>
