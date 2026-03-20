<template>
  <div class="app-record">
    <div class="app-record__header" @click="toggle">
      <span class="app-record__indicator">{{ expanded ? '▼' : '▶' }}</span>
      <span class="app-record__job">{{ jobTitle }}</span>
      <span class="app-record__state" :class="stateClass">{{ stateLabel }}</span>
      <span class="app-record__time">{{ formatShortDate(application.created_at) }}</span>
    </div>

    <div v-if="expanded" class="app-record__body">
      <div v-if="loadingEvents" class="app-record__loading">加载中...</div>
      <div v-else-if="events.length === 0" class="app-record__empty">暂无事件</div>
      <div v-else class="app-record__timeline">
        <div v-for="event in events" :key="event.id">
          <div class="app-record__event">
            <span class="app-record__event-dot">●</span>
            <span class="app-record__event-type">{{ formatEventType(event.type) }}</span>
            <span v-if="event.body" class="app-record__event-body">{{ event.body }}</span>
            <span class="app-record__event-time">{{ formatShortDate(event.occurred_at) }}</span>
          </div>
          <!-- 猎头信息（仅 offer_recorded） -->
          <div v-if="event.type === 'offer_recorded' && supplier" class="app-record__headhunter">
            <span>{{ supplier.name }}</span>
            <span v-if="supplier.guarantee_months">· 担保{{ supplier.guarantee_months }}个月</span>
            <span v-if="event.payload?.headhunter_fee">· 猎头费{{ event.payload.headhunter_fee }}元</span>
          </div>
        </div>
      </div>

      <button
        v-if="application.state === 'IN_PROGRESS'"
        class="app-record__go-pipeline"
        @click="$emit('go-pipeline', application.id)"
      >
        → 去进行中操作
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { fetchEvents } from '@/api/pipeline'
import type { Application, EventRecord, Supplier } from '@/api/types'
import { formatShortDate } from '@/utils/date'

const props = defineProps<{
  application: Application
  jobTitle: string
  defaultExpanded?: boolean
  supplier?: Supplier | null
}>()

defineEmits<{
  'go-pipeline': [applicationId: number]
}>()

const expanded = ref(props.defaultExpanded ?? false)
const events = ref<EventRecord[]>([])
const loadingEvents = ref(false)
const loaded = ref(false)

function toggle() {
  expanded.value = !expanded.value
}

watch(expanded, async (val) => {
  if (val && !loaded.value) {
    loadingEvents.value = true
    try {
      events.value = await fetchEvents(props.application.id)
      loaded.value = true
    } finally {
      loadingEvents.value = false
    }
  }
}, { immediate: true })

const STATE_LABELS: Record<string, string> = {
  IN_PROGRESS: '进行中',
  HIRED: '已入职',
  LEFT: '已离职',
  REJECTED: '未通过',
  WITHDRAWN: '已撤回',
}

const stateLabel = props.application.state
  ? (STATE_LABELS[props.application.state] ?? props.application.state)
  : ''

const stateClass = `state--${(props.application.state ?? '').toLowerCase().replace('_', '-')}`

const EVENT_TYPE_LABELS: Record<string, string> = {
  application_created: '简历筛选',
  screening_passed: '筛选通过',
  interview_scheduled: '面试安排',
  interview_feedback: '面试反馈',
  advance_to_offer: 'Offer沟通',
  start_background_check: '背调',
  background_check_result: '背调结果',
  offer_recorded: 'Offer方案',
  hire_confirmed: '确认入职',
  application_ended: '流程结束',
  left_recorded: '已离职',
  note: '备注',
}

function formatEventType(type: string) {
  return EVENT_TYPE_LABELS[type] ?? type
}
</script>

<style scoped>
.app-record {
  border-bottom: 1px solid var(--color-line);
}

.app-record:last-child {
  border-bottom: none;
}

.app-record__header {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-2) 0;
  cursor: pointer;
  font-size: 13px;
}

.app-record__header:hover {
  background: rgba(26, 26, 24, 0.03);
}

.app-record__indicator {
  font-size: 10px;
  color: var(--color-text-secondary);
  width: 14px;
  text-align: center;
}

.app-record__job {
  font-weight: 500;
  flex: 1;
}

.app-record__state {
  font-size: 12px;
  color: var(--color-text-secondary);
}

.state--in-progress { color: var(--color-material-moss); }
.state--hired { color: #2E5438; }
.state--rejected,
.state--withdrawn { color: var(--color-text-secondary); }

.app-record__time {
  font-size: 12px;
  color: var(--color-text-secondary);
  font-family: 'JetBrains Mono', monospace;
}

.app-record__body {
  padding: 0 0 var(--space-3) 14px;
}

.app-record__loading,
.app-record__empty {
  font-size: 12px;
  color: var(--color-text-secondary);
  padding: var(--space-2) 0;
}

.app-record__timeline {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.app-record__event {
  display: flex;
  align-items: baseline;
  gap: var(--space-2);
  font-size: 12px;
  padding: 2px 0;
}

.app-record__event-dot {
  color: var(--color-material-stone);
  font-size: 8px;
  flex-shrink: 0;
}

.app-record__event-type {
  min-width: 56px;
  flex-shrink: 0;
}

.app-record__event-body {
  color: var(--color-text-secondary);
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.app-record__event-time {
  color: var(--color-text-secondary);
  font-family: 'JetBrains Mono', monospace;
  flex-shrink: 0;
}

.app-record__go-pipeline {
  background: none;
  border: none;
  font-size: 12px;
  color: var(--color-material-stone);
  cursor: pointer;
  padding: var(--space-2) 0;
  margin-top: var(--space-1);
}

.app-record__go-pipeline:hover {
  color: var(--color-text-primary);
}

.app-record__headhunter {
  display: flex;
  gap: 4px;
  font-size: 11px;
  color: var(--color-text-secondary);
  margin-left: 22px;
  padding: 2px 0;
}
</style>
