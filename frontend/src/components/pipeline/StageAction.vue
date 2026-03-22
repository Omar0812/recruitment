<template>
  <div class="stage-action">
    <!-- 主操作按钮列表 -->
    <div v-if="primaryActions.length" class="stage-action__buttons">
      <button
        v-for="action in primaryActions"
        :key="action.code"
        class="stage-action__btn"
        @click="toggleAction(action.code)"
      >
        {{ getDisplayLabel(action) }}
      </button>
    </div>

    <!-- 内联 payload 表单 -->
    <div v-if="activeAction" class="stage-action__form">
      <component
        :is="activeFormComponent"
        v-if="activeFormComponent"
        :application-id="applicationId"
        :action-code="activeAction"
        :candidate-supplier="candidateSupplier"
        @done="activeAction = null"
      />
      <!-- 无需额外表单的动作：直接确认 -->
      <div v-else class="stage-action__confirm">
        <button class="btn btn--primary" @click="doSimpleAction">确认{{ activeMapping?.label }}</button>
        <button class="btn btn--ghost" @click="activeAction = null">取消</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, type Component } from 'vue'
import type { ActionCatalogItem, EventRecord, Supplier } from '@/api/types'
import { usePipeline } from '@/composables/usePipeline'
import InterviewForm from './forms/InterviewForm.vue'
import FeedbackForm from './forms/FeedbackForm.vue'
import OfferForm from './forms/OfferForm.vue'
import BackgroundCheckForm from './forms/BackgroundCheckForm.vue'

const props = defineProps<{
  stage: string | null
  availableActions: ActionCatalogItem[]
  applicationId: number
  candidateSupplier?: Supplier | null
  interviewScheduledAt?: string | null
  events?: EventRecord[]
}>()

const { doAction } = usePipeline()
const activeAction = ref<string | null>(null)

// 阶段 × action_code → 按钮文案
interface StageActionMapping {
  code: string
  label: string
  form?: Component
}

const STAGE_ACTION_MAP: Record<string, StageActionMapping[]> = {
  '简历筛选': [
    { code: 'pass_screening', label: '通过，安排面试' },
  ],
  '面试': [
    { code: 'schedule_interview', label: '安排面试', form: InterviewForm },
    { code: 'record_interview_feedback', label: '填写面评', form: FeedbackForm },
    { code: 'advance_to_offer', label: '通过，发起 Offer' },
  ],
  'Offer沟通': [
    { code: 'start_background_check', label: '开始背调' },
  ],
  '背调': [
    { code: 'record_background_check_result', label: '记录背调结果', form: BackgroundCheckForm },
    { code: 'record_offer', label: '记录 Offer 方案', form: OfferForm },
  ],
  '待入职': [
    { code: 'confirm_hire', label: '确认入职' },
  ],
}

// 面试阶段内部状态
type InterviewState = 'no_interview' | 'awaiting_feedback' | 'passed'

const interviewState = computed<InterviewState>(() => {
  if (props.stage !== '面试') return 'no_interview'
  const events = props.events ?? []

  // 收集所有面试安排和面评
  let scheduledCount = 0
  let feedbackCount = 0
  let latestFeedbackConclusion: string | null = null

  for (const ev of events) {
    if (ev.type === 'interview_scheduled') {
      scheduledCount++
    } else if (ev.type === 'interview_feedback') {
      feedbackCount++
      latestFeedbackConclusion = (ev.payload as any)?.conclusion ?? null
    }
  }

  if (scheduledCount === 0) return 'no_interview'
  if (scheduledCount > feedbackCount) return 'awaiting_feedback'
  if (latestFeedbackConclusion === 'pass') return 'passed'
  // 面评结论非 pass（如 fail）但数量一致，也视为等待下一步操作
  return 'awaiting_feedback'
})

// 面试阶段：根据状态过滤可用 action code
const interviewAllowedCodes = computed<Set<string> | null>(() => {
  if (props.stage !== '面试') return null
  switch (interviewState.value) {
    case 'no_interview':
      return new Set(['schedule_interview'])
    case 'awaiting_feedback':
      return new Set(['record_interview_feedback'])
    case 'passed':
      return new Set(['schedule_interview', 'advance_to_offer'])
    default:
      return null
  }
})

const primaryActions = computed(() => {
  const stage = props.stage ?? ''
  const mappings = STAGE_ACTION_MAP[stage] ?? []
  const availableCodes = new Set(props.availableActions.map((a) => a.action_code))
  const allowed = interviewAllowedCodes.value

  return mappings.filter((m) => {
    if (!availableCodes.has(m.code)) return false
    if (allowed !== null && !allowed.has(m.code)) return false
    return true
  })
})

const activeMapping = computed(() =>
  primaryActions.value.find((a) => a.code === activeAction.value) ?? null,
)

const activeFormComponent = computed(() => activeMapping.value?.form ?? null)

function getDisplayLabel(action: StageActionMapping): string {
  if (action.code === 'record_interview_feedback' && props.interviewScheduledAt) {
    const scheduled = new Date(props.interviewScheduledAt)
    if (scheduled.getTime() < Date.now()) {
      return `${action.label} ⚠`
    }
  }
  return action.label
}

function toggleAction(code: string) {
  activeAction.value = activeAction.value === code ? null : code
}

async function doSimpleAction() {
  if (!activeAction.value) return
  try {
    await doAction({
      command_id: crypto.randomUUID(),
      action_code: activeAction.value,
      target: { type: 'application', id: props.applicationId },
    })
    activeAction.value = null
  } catch {
    // doAction 已 toast，保留当前操作状态
  }
}
</script>

<style scoped>
.stage-action__buttons {
  display: flex;
  gap: var(--space-2);
  flex-wrap: wrap;
}

.stage-action__btn {
  font-size: 13px;
  padding: 6px 16px;
  background: var(--color-text-primary);
  color: var(--color-bg);
  border-radius: 4px;
  white-space: nowrap;
  transition: opacity 150ms;
}

.stage-action__btn:hover {
  opacity: 0.85;
}

.stage-action__form {
  margin-top: var(--space-2);
  padding: var(--space-3);
  border: 1px solid var(--color-line);
  border-radius: 4px;
  background: var(--color-bg);
}

.stage-action__confirm {
  display: flex;
  gap: var(--space-2);
}

</style>
