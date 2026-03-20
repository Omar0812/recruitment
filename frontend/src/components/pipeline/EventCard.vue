<template>
  <div class="event-card" :class="[`event-card--${event.type}`]">
    <!-- 编辑模式 -->
    <div v-if="editing" class="event-card__edit">
      <template v-if="editFields.length > 0">
        <div v-for="field in editFields" :key="field.key" class="event-card__field">
          <label class="event-card__field-label">{{ field.label }}</label>
          <input
            v-if="field.type === 'datetime'"
            type="datetime-local"
            step="900"
            :value="editPayload[field.key]"
            class="event-card__edit-input"
            @input="editPayload[field.key] = ($event.target as HTMLInputElement).value"
          />
          <div v-else-if="field.type === 'datetime-half-hour'" class="datetime-half-hour">
            <input
              type="date"
              :value="editPayload[field.key + '__date']"
              class="event-card__edit-input"
              @input="editPayload[field.key + '__date'] = ($event.target as HTMLInputElement).value; editPayload[field.key] = joinDateTimeHalfHour(editPayload[field.key + '__date'], editPayload[field.key + '__time'])"
            />
            <select
              :value="editPayload[field.key + '__time']"
              class="event-card__edit-input"
              @change="editPayload[field.key + '__time'] = ($event.target as HTMLSelectElement).value; editPayload[field.key] = joinDateTimeHalfHour(editPayload[field.key + '__date'], editPayload[field.key + '__time'])"
            >
              <option v-for="t in TIME_HALF_HOUR_OPTIONS" :key="t" :value="t">{{ t }}</option>
            </select>
          </div>
          <input
            v-else-if="field.type === 'date'"
            type="date"
            :value="editPayload[field.key]"
            class="event-card__edit-input"
            @input="editPayload[field.key] = ($event.target as HTMLInputElement).value"
          />
          <input
            v-else-if="field.type === 'number'"
            type="number"
            :value="editPayload[field.key]"
            class="event-card__edit-input"
            min="0"
            @input="editPayload[field.key] = Number(($event.target as HTMLInputElement).value)"
          />
          <div v-else-if="field.type === 'score'" class="score-buttons">
            <button
              v-for="opt in SCORE_OPTIONS"
              :key="opt.value"
              type="button"
              class="score-btn"
              :class="{ 'score-btn--active': editPayload[field.key] === opt.value }"
              :style="editPayload[field.key] === opt.value ? { background: opt.color, color: '#fff' } : {}"
              :title="opt.label"
              @click="editPayload[field.key] = opt.value"
            >{{ opt.value }}</button>
          </div>
          <select
            v-else-if="field.type === 'select'"
            :value="editPayload[field.key]"
            class="event-card__edit-input"
            :disabled="isFieldLocked(field.key)"
            @change="editPayload[field.key] = ($event.target as HTMLSelectElement).value"
          >
            <option v-for="opt in field.options" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
          </select>
          <span v-if="field.type === 'select' && isFieldLocked(field.key)" class="event-card__field-locked">请先删除后续记录再修改</span>
          <input
            v-else-if="field.type === 'text'"
            type="text"
            :value="editPayload[field.key]"
            class="event-card__edit-input"
            @input="editPayload[field.key] = ($event.target as HTMLInputElement).value"
          />
        </div>
        <!-- Offer 自动计算值 -->
        <template v-if="props.event.type === 'offer_recorded'">
          <div class="event-card__field">
            <label class="event-card__field-label">现金总包（自动计算）</label>
            <span class="event-card__computed-value">{{ offerTotalCash.toLocaleString() }}</span>
          </div>
          <div class="event-card__field">
            <label class="event-card__field-label">全部总包（自动计算）</label>
            <span class="event-card__computed-value">{{ offerTotalPackage.toLocaleString() }}</span>
          </div>
        </template>
      </template>
      <!-- 所有事件都可编辑 body -->
      <div class="event-card__field">
        <label class="event-card__field-label">备注</label>
        <textarea
          v-model="editBody"
          class="event-card__edit-input"
          rows="2"
          placeholder="选填"
        />
      </div>
      <div class="event-card__edit-actions">
        <button class="btn btn--sm" @click="saveEdit">保存</button>
        <button class="btn btn--sm btn--ghost" @click="editing = false">取消</button>
      </div>
    </div>

    <!-- 正常展示：timeline 行 -->
    <template v-else>
      <div class="event-card__row">
        <span class="event-card__dot">●</span>
        <span class="event-card__type">{{ typeLabel }}</span>
        <span v-if="conclusion" class="event-card__conclusion">{{ conclusion }}</span>
        <span class="event-card__time">{{ formattedTime }}</span>
        <span v-if="actorName" class="event-card__actor" :class="{ 'event-card__actor--deleted': props.event.actor_deleted }">{{ actorName }}</span>
        <span v-if="inlineSummary" class="event-card__summary">{{ inlineSummary }}</span>
        <div class="event-card__menu-wrapper" @click.stop>
          <button class="event-card__menu-btn" @click="menuOpen = !menuOpen">...</button>
          <div v-if="menuOpen" class="event-card__menu" @click="menuOpen = false">
            <button class="event-card__menu-item" @click="startEdit">编辑</button>
            <button
              v-if="isLast && !isFirst"
              class="event-card__menu-item event-card__menu-item--danger"
              @click="startDelete"
            >
              删除
            </button>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, reactive, watch, onUnmounted } from 'vue'
import { usePipeline } from '@/composables/usePipeline'
import { updateEvent } from '@/api/pipeline'
import { showToastUndo } from '@/composables/useToastUndo'
import type { EventRecord } from '@/api/types'
import { formatDateTime, formatDate } from '@/utils/date'

const props = defineProps<{
  event: EventRecord
  events: EventRecord[]
  isFirst: boolean
  isLast: boolean
  applicationId: number
}>()

const { doAction, refreshExpanded } = usePipeline()

const EVENT_TYPE_LABELS: Record<string, string> = {
  application_created: '创建申请',
  screening_passed: '通过筛选',
  advance_to_offer: '进入 Offer',
  start_background_check: '开始背调',
  offer_recorded: '记录 Offer',
  hire_confirmed: '确认入职',
  interview_scheduled: '安排面试',
  interview_feedback: '面试反馈',
  background_check_result: '背调结果',
  application_ended: '结束流程',
  left_recorded: '记录离职',
  note: '备注',
}

interface EditFieldDef {
  key: string
  label: string
  type: 'text' | 'datetime' | 'number' | 'select' | 'score' | 'datetime-half-hour' | 'date'
  options?: { value: string; label: string }[]
}

const EDIT_FIELDS_MAP: Record<string, EditFieldDef[]> = {
  interview_scheduled: [
    { key: 'scheduled_at', label: '面试时间', type: 'datetime-half-hour' },
    { key: 'interviewer', label: '面试官', type: 'text' },
    { key: 'meeting_type', label: '面试形式', type: 'select', options: [{ value: '现场', label: '现场' }, { value: '视频', label: '视频' }, { value: '电话', label: '电话' }] },
  ],
  interview_feedback: [
    { key: 'conclusion', label: '结论', type: 'select', options: [{ value: 'pass', label: '通过' }, { value: 'reject', label: '淘汰' }] },
    { key: 'score', label: '评分', type: 'score' },
  ],
  offer_recorded: [
    { key: 'monthly_salary', label: '现金月薪', type: 'number' },
    { key: 'salary_months', label: '发薪月数', type: 'number' },
    { key: 'onboard_date', label: '入职日期', type: 'date' },
    { key: 'equity_package', label: '期权总包', type: 'number' },
    { key: 'headhunter_fee', label: '猎头费', type: 'number' },
  ],
  background_check_result: [
    { key: 'result', label: '背调结果', type: 'select', options: [{ value: 'pass', label: '通过' }, { value: 'fail', label: '未通过' }] },
  ],
  application_ended: [
    { key: 'outcome', label: '结束原因', type: 'select', options: [{ value: 'rejected', label: '淘汰' }, { value: 'withdrawn', label: '候选人退出' }] },
    { key: 'reason', label: '具体原因', type: 'text' },
  ],
}

const typeLabel = computed(() => EVENT_TYPE_LABELS[props.event.type] ?? props.event.type)

const actorName = computed(() => props.event.actor_display_name ?? (props.event.actor_id != null ? '—' : null))

// 结论/状态：显示在 typeLabel 后面
const CONCLUSION_MAP: Record<string, string> = {
  pass: '通过',
  reject: '淘汰',
}
const BG_RESULT_MAP: Record<string, string> = {
  pass: '通过',
  fail: '未通过',
}

// 评分 4 档定义
const SCORE_OPTIONS = [
  { value: 1, label: '淘汰', color: 'var(--color-urgent, #e53e3e)' },
  { value: 2, label: '通过，一般', color: '#dd6b20' },
  { value: 3, label: '通过，良好', color: 'var(--color-primary, #3b82f6)' },
  { value: 4, label: '通过，优秀', color: '#16a34a' },
] as const

// 30 分钟档时间选项
const TIME_HALF_HOUR_OPTIONS = Array.from({ length: 48 }, (_, i) => {
  const h = String(Math.floor(i / 2)).padStart(2, '0')
  const m = i % 2 === 0 ? '00' : '30'
  return `${h}:${m}`
})

/** 将 ISO datetime 拆为 { date, time }，time 向下取整到 30 分钟档 */
function splitDateTimeHalfHour(val: string): { date: string; time: string } {
  if (!val) return { date: '', time: '09:00' }
  const d = val.slice(0, 10)
  const t = val.slice(11, 16)
  if (!t) return { date: d, time: '09:00' }
  const [hh, mm] = t.split(':').map(Number)
  const rounded = mm < 30 ? '00' : '30'
  return { date: d, time: `${String(hh).padStart(2, '0')}:${rounded}` }
}

/** 合并 date + time 为 ISO datetime string */
function joinDateTimeHalfHour(date: string, time: string): string {
  if (!date) return ''
  return `${date}T${time || '09:00'}`
}

const conclusion = computed(() => {
  const p = props.event.payload
  switch (props.event.type) {
    case 'screening_passed':
      return '通过'
    case 'interview_feedback':
      return CONCLUSION_MAP[p?.conclusion] ?? ''
    case 'background_check_result':
      return BG_RESULT_MAP[p?.result] ?? ''
    case 'application_ended':
      return props.event.payload?.outcome === 'hired' ? '已入职' : ''
    default:
      return ''
  }
})

// 日期：YYYY-MM-DD HH:mm
const formattedTime = computed(() => formatDateTime(props.event.occurred_at))

// 内联摘要：从 payload 提取关键信息拼成一行
const inlineSummary = computed(() => {
  const p = props.event.payload
  const body = props.event.body

  switch (props.event.type) {
    case 'interview_scheduled': {
      const parts: string[] = []
      if (p?.scheduled_at) {
        parts.push(formatDateTime(p.scheduled_at))
      }
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
      const parts: string[] = []
      if (p?.monthly_salary) parts.push(`¥${Number(p.monthly_salary).toLocaleString()}`)
      if (p?.salary_months) parts.push(`× ${p.salary_months}`)
      if (p?.onboard_date) {
        parts.push(`入职 ${formatDate(p.onboard_date)}`)
      }
      return parts.join(' · ')
    }
    case 'application_ended':
      return p?.reason ?? body ?? ''
    default:
      return body ?? ''
  }
})

// 结论字段 → 后续依赖事件类型映射
const CONCLUSION_DEPENDENCY_MAP: Record<string, { field: string; dependsOn: string }> = {
  interview_feedback: { field: 'conclusion', dependsOn: 'advance_to_offer' },
  background_check_result: { field: 'result', dependsOn: 'offer_recorded' },
}

/** 检查结论字段是否被锁定（后续已有依赖事件） */
function isFieldLocked(fieldKey: string): boolean {
  const dep = CONCLUSION_DEPENDENCY_MAP[props.event.type]
  if (!dep || dep.field !== fieldKey) return false
  const eventTime = props.event.occurred_at
  return props.events.some(
    (e) => e.type === dep.dependsOn && e.occurred_at > eventTime,
  )
}

// 编辑
const editing = ref(false)
const editBody = ref('')
const editPayload = reactive<Record<string, any>>({})

const editFields = computed(() => EDIT_FIELDS_MAP[props.event.type] ?? [])

// Offer 编辑时的自动计算值
const offerTotalCash = computed(() => {
  const m = Number(editPayload.monthly_salary) || 0
  const n = Number(editPayload.salary_months) || 0
  return m * n
})
const offerTotalPackage = computed(() => {
  return offerTotalCash.value + (Number(editPayload.equity_package) || 0)
})

function startEdit() {
  const fields = EDIT_FIELDS_MAP[props.event.type]
  if (fields) {
    const p = props.event.payload ?? {}
    for (const f of fields) {
      editPayload[f.key] = p[f.key] ?? ''
      if (f.type === 'datetime-half-hour') {
        const { date, time } = splitDateTimeHalfHour(p[f.key] ?? '')
        editPayload[f.key + '__date'] = date
        editPayload[f.key + '__time'] = time
      }
    }
  }
  editBody.value = props.event.body ?? ''
  editing.value = true
}

async function saveEdit() {
  const fields = EDIT_FIELDS_MAP[props.event.type]
  const update: Record<string, any> = { version: props.event.version, body: editBody.value }
  if (fields) {
    const payload: Record<string, any> = {}
    for (const f of fields) {
      payload[f.key] = editPayload[f.key]
    }
    update.payload = payload
  }
  await updateEvent(props.event.id, update)
  editing.value = false
  refreshExpanded()
}

// 删除
const menuOpen = ref(false)

// click-outside 关闭菜单
function onDocumentClick() { menuOpen.value = false }
watch(menuOpen, (open) => {
  if (open) {
    document.addEventListener('click', onDocumentClick)
  } else {
    document.removeEventListener('click', onDocumentClick)
  }
})
onUnmounted(() => document.removeEventListener('click', onDocumentClick))

function startDelete() {
  showToastUndo('已删除该记录', () => {
    doAction({
      command_id: crypto.randomUUID(),
      action_code: 'delete_event',
      target: { type: 'application', id: props.applicationId },
      payload: { event_id: props.event.id },
    })
  })
}
</script>

<style scoped>
.event-card {
  padding: var(--space-1) 0;
}

/* ── timeline 行 ── */
.event-card__row {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  font-size: 13px;
  line-height: 1.6;
}

.event-card__dot {
  color: var(--color-text-secondary);
  font-size: 8px;
  flex-shrink: 0;
  line-height: 1;
}

.event-card__type {
  font-weight: 500;
  white-space: nowrap;
  color: var(--color-text-primary);
}

.event-card__conclusion {
  white-space: nowrap;
  color: var(--color-text-secondary);
}

.event-card__time {
  white-space: nowrap;
  color: var(--color-text-secondary);
}

.event-card__actor {
  white-space: nowrap;
  color: var(--color-text-secondary);
  font-size: 12px;
}

.event-card__actor--deleted {
  opacity: 0.5;
}

.event-card__summary {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--color-text-secondary);
}

/* ── [...] 菜单 ── */
.event-card__menu-wrapper {
  position: relative;
  flex-shrink: 0;
  margin-left: auto;
}

.event-card__menu-btn {
  font-size: 14px;
  padding: 0 4px;
  color: var(--color-text-secondary);
  line-height: 1;
  letter-spacing: 1px;
  transition: color 150ms;
}

.event-card__menu-btn:hover {
  color: var(--color-text-primary);
}

.event-card__menu {
  position: absolute;
  right: 0;
  top: 100%;
  background: var(--color-bg);
  border: 1px solid var(--color-line);
  border-radius: 4px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.08);
  z-index: 10;
  min-width: 80px;
}

.event-card__menu-item {
  display: block;
  width: 100%;
  text-align: left;
  padding: var(--space-2) var(--space-3);
  font-size: 13px;
}

.event-card__menu-item:hover {
  background: rgba(26, 26, 24, 0.05);
}

.event-card__menu-item--danger {
  color: var(--color-urgent);
}

/* ── 结论色彩 ── */
.event-card--screening_passed .event-card__conclusion { color: #2E5438; }
.event-card--interview_feedback .event-card__conclusion { color: #2E5438; }
.event-card--application_ended .event-card__type { color: var(--color-urgent); }

/* ── 编辑模式 ── */
.event-card__edit {
  padding: var(--space-2) 0 var(--space-2) var(--space-4);
}

.event-card__field {
  margin-bottom: var(--space-2);
}

.event-card__field-label {
  display: block;
  font-size: 12px;
  color: var(--color-text-secondary);
  margin-bottom: 2px;
}

.event-card__edit-input {
  width: 100%;
  font: inherit;
  font-size: 13px;
  padding: var(--space-2);
  border: 1px solid var(--color-line);
  border-radius: 4px;
  resize: vertical;
  line-height: 1.5;
}

select.event-card__edit-input {
  resize: none;
}

select.event-card__edit-input:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.event-card__field-locked {
  font-size: 11px;
  color: var(--color-urgent, #e53e3e);
  margin-top: 2px;
}

.event-card__computed-value {
  font-size: 13px;
  color: var(--color-text-secondary);
  padding: 5px 0;
}

.event-card__edit-actions {
  display: flex;
  gap: var(--space-2);
  margin-top: var(--space-2);
}

/* 通用按钮 */
.btn {
  font-size: 13px;
  padding: 4px 12px;
  border-radius: 4px;
  cursor: pointer;
  transition: opacity 150ms;
}

.btn:hover { opacity: 0.85; }

.btn--sm {
  padding: 3px 10px;
  font-size: 12px;
}

.btn--ghost {
  background: transparent;
  color: var(--color-text-secondary);
}

.btn--danger {
  background: var(--color-urgent);
  color: white;
}

/* 评分 4 档按钮 */
.score-buttons {
  display: flex;
  gap: 6px;
}

.score-btn {
  width: 32px;
  height: 32px;
  border-radius: 4px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  background: var(--color-bg-secondary, #f5f5f4);
  color: var(--color-text-secondary);
  transition: all 150ms;
}

.score-btn:hover {
  opacity: 0.8;
}

.score-btn--active {
  color: #fff;
}

/* 日期 + 时间下拉组合 */
.datetime-half-hour {
  display: flex;
  gap: 6px;
}

.datetime-half-hour .event-card__edit-input {
  flex: 1;
}
</style>
