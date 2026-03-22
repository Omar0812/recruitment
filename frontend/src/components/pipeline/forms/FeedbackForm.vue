<template>
  <div class="action-form">
    <label class="form-label">结论</label>
    <select v-model="conclusion" class="form-input">
      <option value="">请选择</option>
      <option value="pass">通过</option>
      <option value="reject">淘汰</option>
    </select>
    <label class="form-label">评分</label>
    <div class="score-buttons">
      <button
        v-for="opt in SCORE_OPTIONS"
        :key="opt.value"
        type="button"
        class="score-btn"
        :class="{ 'score-btn--active': score === opt.value }"
        :style="score === opt.value ? { background: opt.color, color: '#fff' } : {}"
        :title="opt.label"
        @click="score = opt.value"
      >{{ opt.value }}</button>
    </div>
    <label class="form-label">备注</label>
    <textarea v-model="note" class="form-input" rows="2" placeholder="面试评价" />
    <div class="form-actions">
      <button class="btn btn--primary" @click="submit" :disabled="!canSubmit">确认</button>
      <button class="btn btn--ghost" @click="$emit('done')">取消</button>
    </div>

    <!-- 面评淘汰 → 选择淘汰原因 -->
    <div v-if="conclusion === 'reject'" class="feedback-reject">
      <p class="feedback-reject__hint">面评结论为「淘汰」，提交后将自动结束流程</p>
      <label class="form-label">淘汰原因</label>
      <div class="feedback-reject__reasons">
        <label
          v-for="reason in REJECTED_REASONS"
          :key="reason"
          class="feedback-reject__reason"
        >
          <input type="radio" :value="reason" v-model="rejectReason" />
          <span>{{ reason }}</span>
        </label>
        <label class="feedback-reject__reason">
          <input type="radio" value="__other__" v-model="rejectReason" />
          <span>其他</span>
        </label>
        <input
          v-if="rejectReason === '__other__'"
          v-model="otherRejectReason"
          type="text"
          class="form-input"
          placeholder="请输入原因"
        />
        <span
          v-if="rejectReason === '__other__' && !otherRejectReason.trim()"
          class="feedback-reject__validation"
        >请填写具体淘汰原因</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { usePipeline } from '@/composables/usePipeline'
import { REJECTED_REASONS } from '@/components/pipeline/EndFlowPanel.vue'
import { SCORE_OPTIONS } from '@/utils/constants'

const props = defineProps<{
  applicationId: number
  actionCode: string
}>()

const emit = defineEmits<{ done: [] }>()
const { doAction } = usePipeline()

const conclusion = ref('')
const score = ref<number | undefined>()
const note = ref('')
const rejectReason = ref('')
const otherRejectReason = ref('')

const canSubmit = computed(() => {
  if (!conclusion.value) return false
  if (conclusion.value === 'reject' && !rejectReason.value) return false
  if (conclusion.value === 'reject' && rejectReason.value === '__other__' && !otherRejectReason.value.trim()) return false
  return true
})

async function submit() {
  try {
    // 先记录面评
    await doAction({
      command_id: crypto.randomUUID(),
      action_code: props.actionCode,
      target: { type: 'application', id: props.applicationId },
      payload: {
        conclusion: conclusion.value,
        score: score.value,
        body: note.value || undefined,
      },
    })

    // 淘汰 → 自动触发 end_application
    if (conclusion.value === 'reject') {
      const reason = rejectReason.value === '__other__'
        ? otherRejectReason.value.trim()
        : rejectReason.value

      await doAction({
        command_id: crypto.randomUUID(),
        action_code: 'end_application',
        target: { type: 'application', id: props.applicationId },
        payload: {
          outcome: 'rejected',
          reason,
          body: reason,
        },
      })
    }

    emit('done')
  } catch {
    // doAction 已 toast，表单保持打开
  }
}
</script>

<style scoped>
.feedback-reject { margin-top: var(--space-2); padding: var(--space-2); border: 1px solid var(--color-urgent); border-radius: 4px; }
.feedback-reject__hint { font-size: 12px; color: var(--color-urgent); margin-bottom: var(--space-2); }
.feedback-reject__reasons { display: flex; flex-direction: column; gap: var(--space-2); }
.feedback-reject__reason { display: flex; align-items: center; gap: var(--space-2); font-size: 13px; cursor: pointer; }
.feedback-reject__validation { font-size: 12px; color: var(--color-urgent); margin-top: 2px; }
.score-buttons { display: flex; gap: 6px; }
.score-btn {
  width: 32px; height: 32px; border-radius: 4px;
  font-size: 13px; font-weight: 600; cursor: pointer;
  background: var(--color-bg-secondary, #f5f5f4);
  color: var(--color-text-secondary);
  transition: all 150ms;
}
.score-btn:hover { opacity: 0.8; }
.score-btn--active { color: #fff; }
</style>
