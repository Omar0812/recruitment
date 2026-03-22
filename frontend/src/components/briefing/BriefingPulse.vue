<template>
  <div class="briefing-pulse">
    <div class="pulse-item pulse-item--link" @click="emit('scroll-to', 'schedule')">
      <span class="pulse-label">今日面试</span>
      <span class="pulse-value">{{ pulse.today_interviews }}</span>
    </div>
    <div class="pulse-divider" />
    <div class="pulse-item pulse-item--link" @click="emit('scroll-to', 'todos')">
      <span class="pulse-label">待办</span>
      <span class="pulse-value">{{ pulse.todo_count }}</span>
    </div>
    <div class="pulse-divider" />
    <div class="pulse-item pulse-item--link" @click="router.push('/pipeline')">
      <span class="pulse-label">进行中</span>
      <span class="pulse-value">{{ pulse.active_applications }}</span>
    </div>
    <div class="pulse-divider" />
    <div class="pulse-item pulse-item--link" @click="router.push('/jobs')">
      <span class="pulse-label">open 岗位</span>
      <span class="pulse-value">{{ pulse.open_jobs }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'
import type { BriefingPulse } from '@/api/briefing'

defineProps<{
  pulse: BriefingPulse
}>()

const emit = defineEmits<{
  (e: 'scroll-to', section: 'schedule' | 'todos'): void
}>()

const router = useRouter()
</script>

<style scoped>
.briefing-pulse {
  display: flex;
  align-items: center;
  gap: var(--space-6, 24px);
  padding: var(--space-4, 16px) 0;
  border-bottom: 1px solid var(--color-line, rgba(26,26,24,0.12));
}

.pulse-item {
  display: flex;
  align-items: baseline;
  gap: var(--space-2, 8px);
}

.pulse-item--link {
  cursor: pointer;
}

.pulse-item--link:hover .pulse-value {
  text-decoration: underline;
}

.pulse-label {
  font-size: 13px;
  font-weight: 300;
  color: var(--color-text-secondary, rgba(26,26,24,0.60));
}

.pulse-value {
  font-size: 18px;
  font-weight: 500;
  font-family: 'Inter', sans-serif;
  color: var(--color-text-primary, #1A1A18);
}

.pulse-divider {
  width: 1px;
  height: 16px;
  background: var(--color-line, rgba(26,26,24,0.12));
}
</style>
