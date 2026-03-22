<template>
  <div class="app-record">
    <div class="app-record__header" @click="toggle">
      <span class="app-record__indicator">{{ expanded ? '▼' : '▶' }}</span>
      <span class="app-record__job">{{ jobTitle }}</span>
      <span class="app-record__state" :class="stateClass">{{ stateLabel }}</span>
      <span class="app-record__time">{{ headerDate }}</span>
    </div>

    <div v-if="expanded" class="app-record__body">
      <div v-if="loadingEvents" class="app-record__loading">加载中...</div>
      <div v-else-if="events.length === 0" class="app-record__empty">暂无事件</div>
      <div v-else class="app-record__timeline">
        <div v-for="event in events" :key="event.id" class="app-record__event-group">
          <div
            class="app-record__event"
            :class="{ 'app-record__event--expandable': eventHasDetail(event) }"
            @click="toggleEvent(event)"
          >
            <span
              class="app-record__event-indicator"
              :class="{ 'app-record__event-indicator--expandable': eventHasDetail(event) }"
            >
              {{ eventHasDetail(event) ? (expandedEvents.has(event.id) ? '▼' : '▶') : '●' }}
            </span>
            <span class="app-record__event-type">{{ formatEventType(event.type) }}</span>
            <span v-if="eventConclusion(event)" class="app-record__event-conclusion">{{ eventConclusion(event) }}</span>
            <span class="app-record__event-summary">{{ eventSummary(event) }}</span>
            <span v-if="event.actor_display_name" class="app-record__event-actor">{{ event.actor_display_name }}</span>
            <span class="app-record__event-time">{{ formatShortDate(event.occurred_at) }}</span>
          </div>

          <!-- 展开详情 -->
          <div v-if="expandedEvents.has(event.id)" class="app-record__event-detail">
            <!-- 面试反馈：body 全文 -->
            <template v-if="event.type === 'interview_feedback'">
              <div v-if="event.body" class="app-record__detail-text">{{ event.body }}</div>
            </template>

            <!-- 安排面试：结构化信息 -->
            <template v-else-if="event.type === 'interview_scheduled'">
              <div v-if="event.payload?.scheduled_at" class="app-record__detail-field">
                <span class="app-record__detail-label">面试时间</span>
                <span>{{ formatDateTime(event.payload.scheduled_at) }}</span>
              </div>
              <div v-if="event.payload?.meeting_type" class="app-record__detail-field">
                <span class="app-record__detail-label">形式</span>
                <span>{{ event.payload.meeting_type }}</span>
              </div>
              <div v-if="event.payload?.interviewer" class="app-record__detail-field">
                <span class="app-record__detail-label">面试官</span>
                <span>{{ event.payload.interviewer }}</span>
              </div>
              <div v-if="event.body" class="app-record__detail-text">{{ event.body }}</div>
            </template>

            <!-- Offer：全字段 -->
            <template v-else-if="event.type === 'offer_recorded'">
              <div v-if="event.payload?.monthly_salary" class="app-record__detail-field">
                <span class="app-record__detail-label">月薪</span>
                <span>¥{{ Number(event.payload.monthly_salary).toLocaleString() }}</span>
              </div>
              <div v-if="event.payload?.salary_months" class="app-record__detail-field">
                <span class="app-record__detail-label">月数</span>
                <span>{{ event.payload.salary_months }}</span>
              </div>
              <div v-if="event.payload?.monthly_salary && event.payload?.salary_months" class="app-record__detail-field">
                <span class="app-record__detail-label">现金总包</span>
                <span>¥{{ (Number(event.payload.monthly_salary) * Number(event.payload.salary_months)).toLocaleString() }}</span>
              </div>
              <div v-if="event.payload?.onboard_date" class="app-record__detail-field">
                <span class="app-record__detail-label">入职日期</span>
                <span>{{ formatDate(event.payload.onboard_date) }}</span>
              </div>
              <div v-if="event.payload?.equity_package" class="app-record__detail-field">
                <span class="app-record__detail-label">期权总包</span>
                <span>¥{{ Number(event.payload.equity_package).toLocaleString() }}</span>
              </div>
              <div v-if="event.payload?.monthly_salary && event.payload?.salary_months" class="app-record__detail-field">
                <span class="app-record__detail-label">全部总包</span>
                <span>¥{{ ((Number(event.payload.monthly_salary) * Number(event.payload.salary_months)) + (Number(event.payload.equity_package) || 0)).toLocaleString() }}</span>
              </div>
              <div v-if="event.payload?.headhunter_fee" class="app-record__detail-field">
                <span class="app-record__detail-label">猎头费</span>
                <span>¥{{ Number(event.payload.headhunter_fee).toLocaleString() }}</span>
              </div>
              <div v-if="supplier" class="app-record__detail-field">
                <span class="app-record__detail-label">猎头</span>
                <span>{{ supplier.name }}<template v-if="supplier.guarantee_months"> · 担保{{ supplier.guarantee_months }}个月</template></span>
              </div>
              <div v-if="event.body" class="app-record__detail-text">{{ event.body }}</div>
            </template>

            <!-- 流程结束：原因 + body -->
            <template v-else-if="event.type === 'application_ended'">
              <div v-if="event.payload?.reason" class="app-record__detail-field">
                <span class="app-record__detail-label">原因</span>
                <span>{{ event.payload.reason }}</span>
              </div>
              <div v-if="event.body" class="app-record__detail-text">{{ event.body }}</div>
            </template>

            <!-- 其他有 body 的事件 -->
            <template v-else>
              <div v-if="event.body" class="app-record__detail-text">{{ event.body }}</div>
            </template>
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
import { ref, reactive, watch, computed } from 'vue'
import { fetchEvents } from '@/api/pipeline'
import type { Application, EventRecord, Supplier } from '@/api/types'
import { formatShortDate, formatDateTime, formatDate } from '@/utils/date'

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
const expandedEvents = reactive(new Set<number>())

function toggle() {
  expanded.value = !expanded.value
}

async function loadEventsIfNeeded() {
  if (loaded.value || loadingEvents.value) return
  loadingEvents.value = true
  try {
    events.value = await fetchEvents(props.application.id)
    loaded.value = true
  } finally {
    loadingEvents.value = false
  }
}

// 展开时加载 events
watch(expanded, (val) => {
  if (val) loadEventsIfNeeded()
}, { immediate: true })

// HIRED 自动加载 events（获取 hire_date 用于 header）
if (props.application.state === 'HIRED') {
  loadEventsIfNeeded()
}

// ── Application header ──

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

// HIRED 显示 hire_date，其余显示 created_at
const headerDate = computed(() => {
  if (props.application.state === 'HIRED') {
    const hireEvent = events.value.find(e => e.type === 'hire_confirmed')
    const hireDate = hireEvent?.payload?.hire_date
    if (hireDate) return formatShortDate(hireDate)
  }
  return formatShortDate(props.application.created_at)
})

// ── 事件类型标签 ──

const EVENT_TYPE_LABELS: Record<string, string> = {
  application_created: '简历筛选',
  screening_passed: '筛选通过',
  interview_scheduled: '安排面试',
  interview_feedback: '面试反馈',
  advance_to_offer: 'Offer沟通',
  start_background_check: '背调',
  background_check_result: '背调结果',
  offer_recorded: '记录Offer',
  hire_confirmed: '确认入职',
  application_ended: '流程结束',
  left_recorded: '已离职',
  note: '备注',
}

function formatEventType(type: string) {
  return EVENT_TYPE_LABELS[type] ?? type
}

// ── 结论（紧跟事件类型后） ──

const CONCLUSION_MAP: Record<string, string> = { pass: '通过', reject: '淘汰' }
const BG_RESULT_MAP: Record<string, string> = { pass: '通过', fail: '未通过' }
const OUTCOME_MAP: Record<string, string> = { rejected: '淘汰', withdrawn: '候选人退出' }

function eventConclusion(event: EventRecord): string {
  const p = event.payload
  switch (event.type) {
    case 'interview_feedback':
      return CONCLUSION_MAP[p?.conclusion] ?? ''
    case 'background_check_result':
      return BG_RESULT_MAP[p?.result] ?? ''
    case 'application_ended':
      return OUTCOME_MAP[p?.outcome] ?? ''
    default:
      return ''
  }
}

// ── 内联摘要（从 payload 提取关键信息） ──

function eventSummary(event: EventRecord): string {
  const p = event.payload
  const body = event.body

  switch (event.type) {
    case 'interview_scheduled': {
      const parts: string[] = []
      if (p?.scheduled_at) parts.push(formatDateTime(p.scheduled_at))
      if (p?.meeting_type) parts.push(p.meeting_type)
      if (p?.interviewer) parts.push(`${p.interviewer}主面`)
      return parts.join(' · ')
    }
    case 'interview_feedback': {
      const parts: string[] = []
      if (body) parts.push(body)
      if (p?.score) parts.push(`${p.score}分`)
      return parts.join(' · ')
    }
    case 'offer_recorded': {
      if (!p) return body ?? ''
      const parts: string[] = []
      if (p.monthly_salary != null && p.salary_months != null) {
        parts.push(`¥${Number(p.monthly_salary).toLocaleString()}×${p.salary_months}`)
      } else if (p.monthly_salary != null) {
        parts.push(`¥${Number(p.monthly_salary).toLocaleString()}`)
      }
      if (p.onboard_date) parts.push(`入职${formatDate(p.onboard_date)}`)
      return parts.join(' · ')
    }
    case 'application_ended':
      return p?.reason ?? body ?? ''
    default:
      return body ?? ''
  }
}

// ── 是否有可展开详情 ──

function eventHasDetail(event: EventRecord): boolean {
  if (event.body) return true
  const p = event.payload
  if (!p) return false
  switch (event.type) {
    case 'interview_scheduled':
      return !!(p.scheduled_at || p.meeting_type || p.interviewer)
    case 'offer_recorded':
      return !!(p.monthly_salary || p.salary_months || p.onboard_date || p.equity_package || p.headhunter_fee)
    case 'application_ended':
      return !!p.reason
    default:
      return false
  }
}

// ── 展开/折叠事件 ──

function toggleEvent(event: EventRecord) {
  if (!eventHasDetail(event)) return
  if (expandedEvents.has(event.id)) {
    expandedEvents.delete(event.id)
  } else {
    expandedEvents.add(event.id)
  }
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
  flex-shrink: 0;
}

.app-record__job {
  font-weight: 500;
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.app-record__state {
  font-size: 12px;
  color: var(--color-text-secondary);
  flex-shrink: 0;
}

.state--in-progress { color: var(--color-material-moss); }
.state--hired { color: #2E5438; }
.state--rejected,
.state--withdrawn { color: var(--color-text-secondary); }

.app-record__time {
  font-size: 12px;
  color: var(--color-text-secondary);
  font-family: 'JetBrains Mono', monospace;
  flex-shrink: 0;
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

/* ── 事件行 ── */
.app-record__event {
  display: flex;
  align-items: baseline;
  gap: var(--space-2);
  font-size: 12px;
  padding: 2px 0;
}

.app-record__event--expandable {
  cursor: pointer;
}

.app-record__event--expandable:hover {
  background: rgba(26, 26, 24, 0.03);
}

.app-record__event-indicator {
  color: var(--color-material-stone);
  font-size: 8px;
  flex-shrink: 0;
  width: 12px;
  text-align: center;
}

.app-record__event-indicator--expandable {
  font-size: 9px;
  cursor: pointer;
}

.app-record__event-type {
  flex-shrink: 0;
  white-space: nowrap;
}

.app-record__event-conclusion {
  flex-shrink: 0;
  white-space: nowrap;
  color: var(--color-text-secondary);
}

.app-record__event-summary {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--color-text-secondary);
}

.app-record__event-actor {
  flex-shrink: 0;
  white-space: nowrap;
  color: var(--color-text-secondary);
  font-size: 11px;
}

.app-record__event-time {
  flex-shrink: 0;
  color: var(--color-text-secondary);
  font-family: 'JetBrains Mono', monospace;
}

/* ── 展开详情区 ── */
.app-record__event-detail {
  padding: var(--space-1) 0 var(--space-2) 20px;
  font-size: 12px;
}

.app-record__detail-field {
  display: flex;
  gap: var(--space-2);
  padding: 1px 0;
  color: var(--color-text-primary);
}

.app-record__detail-label {
  color: var(--color-text-secondary);
  min-width: 56px;
  flex-shrink: 0;
}

.app-record__detail-text {
  color: var(--color-text-primary);
  white-space: pre-wrap;
  word-break: break-word;
  line-height: 1.6;
  padding: var(--space-1) 0;
}

/* ── 底部操作 ── */
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
</style>
