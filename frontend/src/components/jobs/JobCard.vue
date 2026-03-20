<template>
  <div class="job-card" @click="$emit('click')">
    <div class="card-header">
      <div class="title-block">
        <div class="job-title">
          {{ job.title }}
          <span v-if="job.location_name" class="location">（{{ job.location_name }}）</span>
        </div>
        <div class="meta-line">
          <span class="meta-item">{{ statusLabel }}</span>
          <span v-if="priorityLabel && job.status === 'open'" class="meta-item">{{ priorityLabel }}</span>
          <span v-if="job.status === 'closed' && job.close_reason" class="meta-item">
            {{ job.close_reason }}
          </span>
        </div>
      </div>
    </div>

    <div class="card-body">
      <div v-if="showProgress" class="progress-row">
        <div class="progress-bar">
          <div class="progress-fill" :style="{ width: progressPercent + '%' }" />
        </div>
        <span class="progress-label">{{ job.hired_count }}/{{ job.headcount }} 到岗</span>
      </div>
      <div v-if="stageText || footerText" class="stage-footer-row">
        <span v-if="stageText" class="stage-distribution">{{ stageText }}</span>
        <span
          v-if="footerText"
          class="footer-text"
          :class="{ 'footer-text--urgent': isDeadlineUrgent }"
        >{{ footerText }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { Job } from '@/api/types'
import { formatShortDate } from '@/utils/date'

const props = defineProps<{
  job: Job
}>()

defineEmits<{
  click: []
}>()

const statusLabel = computed(() => {
  return props.job.status === 'open' ? '招聘中' : '已关闭'
})

const priorityLabel = computed(() => {
  const map: Record<string, string> = {
    high: '高优',
    medium: '',
    low: '低优',
  }
  return map[props.job.priority || ''] ?? ''
})

// 到岗进度
const showProgress = computed(() => {
  return props.job.headcount > 0
})

const progressPercent = computed(() => {
  if (!props.job.headcount) return 0
  return Math.min(100, Math.round((props.job.hired_count / props.job.headcount) * 100))
})

// 阶段分布文案
const stageText = computed(() => {
  const dist = props.job.stage_distribution
  if (!dist) return ''
  const entries = Object.entries(dist)
  if (entries.length === 0) return ''
  // 简化阶段名显示
  const shortName: Record<string, string> = {
    '简历筛选': '筛选',
    '面试': '面试',
    'Offer沟通': 'Offer',
    '背调': '背调',
    '待入职': '待入职',
  }
  return entries
    .map(([stage, count]) => `${shortName[stage] || stage}${count}`)
    .join(' · ')
})

const daysRemaining = computed(() => {
  if (!props.job.target_onboard_date) return null
  const target = new Date(props.job.target_onboard_date)
  const now = new Date()
  const diff = target.getTime() - now.getTime()
  return Math.ceil(diff / (1000 * 60 * 60 * 24))
})

const isDeadlineUrgent = computed(() => {
  return props.job.status === 'open' && (daysRemaining.value ?? 0) < 0
})

const footerText = computed(() => {
  if (props.job.status === 'open' && props.job.target_onboard_date) {
    const relative = formatDeadline(daysRemaining.value)
    return `目标 ${formatShortDate(props.job.target_onboard_date)} · ${relative}`
  }
  if (props.job.status === 'closed' && props.job.closed_at) {
    return `${formatShortDate(props.job.created_at)} ~ ${formatShortDate(props.job.closed_at)}`
  }
  return ''
})

function formatDeadline(days: number | null) {
  if (days === null) return ''
  if (days < 0) return `已超 ${Math.abs(days)} 天`
  if (days === 0) return '今天'
  return `剩 ${days} 天`
}
</script>

<style scoped>
.job-card {
  padding: 16px;
  border: 1px solid var(--color-line, rgba(26, 26, 24, 0.12));
  border-radius: 4px;
  background: var(--color-bg, #fafaf9);
  cursor: pointer;
  transition: border-color 150ms ease, background-color 150ms ease;
}

.job-card:hover {
  border-color: rgba(26, 26, 24, 0.24);
  background: rgba(26, 26, 24, 0.02);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}

.title-block {
  min-width: 0;
}

.job-title {
  color: var(--color-text-primary, #1a1a18);
  font-size: 15px;
  font-weight: 500;
  line-height: 1.5;
}

.location {
  color: var(--color-text-secondary, rgba(26, 26, 24, 0.6));
  font-weight: 400;
}

.meta-line {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 4px;
  color: var(--color-text-secondary, rgba(26, 26, 24, 0.6));
  font-size: 12px;
}

.meta-item:not(:last-child)::after {
  content: '·';
  margin-left: 8px;
}

.card-body {
  margin-top: 12px;
}

.progress-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.progress-bar {
  flex: 1;
  height: 6px;
  background: var(--color-line, rgba(26, 26, 24, 0.12));
  border-radius: 3px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: var(--color-material-moss, #6F7A69);
  border-radius: 3px;
  transition: width 300ms ease;
}

.progress-label {
  flex-shrink: 0;
  font-size: 13px;
  color: var(--color-text-primary, #1a1a18);
  font-weight: 400;
}

.stage-distribution {
  font-size: 12px;
  color: var(--color-text-secondary, rgba(26, 26, 24, 0.6));
}

.stage-footer-row {
  display: flex;
  align-items: center;
  margin-top: 4px;
}

.footer-text {
  margin-left: auto;
  color: var(--color-text-secondary, rgba(26, 26, 24, 0.6));
  font-size: 12px;
  line-height: 1.5;
}

.footer-text--urgent {
  color: var(--color-urgent, #c4472a);
}
</style>
