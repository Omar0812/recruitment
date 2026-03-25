<template>
  <div class="screening-conclusion">
    <!-- 结论选择 -->
    <div v-if="!showRejectReasons" class="screening-conclusion__choices">
      <button
        class="screening-conclusion__btn screening-conclusion__btn--pass"
        :disabled="submitting"
        @click="handlePass"
      >
        {{ submitting ? '提交中...' : '通过' }}
      </button>
      <button
        class="screening-conclusion__btn screening-conclusion__btn--reject"
        :disabled="submitting"
        @click="showRejectReasons = true"
      >
        淘汰
      </button>
      <button class="btn btn--ghost" @click="$emit('done')">取消</button>
    </div>

    <!-- 淘汰原因 -->
    <div v-else class="screening-conclusion__reject-panel">
      <div class="screening-conclusion__reasons">
        <label
          v-for="reason in REJECTED_REASONS"
          :key="reason"
          class="screening-conclusion__reason"
        >
          <input type="radio" :value="reason" v-model="selectedReason" />
          <span>{{ reason }}</span>
        </label>
        <label class="screening-conclusion__reason">
          <input type="radio" value="__other__" v-model="selectedReason" />
          <span>其他</span>
        </label>
        <input
          v-if="selectedReason === '__other__'"
          v-model="otherReason"
          type="text"
          class="screening-conclusion__other-input"
          placeholder="请填写具体淘汰原因"
        />
        <span
          v-if="selectedReason === '__other__' && !otherReason.trim()"
          class="screening-conclusion__error"
        >请填写具体淘汰原因</span>
      </div>
      <div class="screening-conclusion__actions">
        <button
          class="btn btn--danger"
          :disabled="!canConfirmReject || submitting"
          @click="handleReject"
        >
          {{ submitting ? '提交中...' : '确认淘汰' }}
        </button>
        <button class="btn btn--ghost" @click="showRejectReasons = false">返回</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { usePipeline } from '@/composables/usePipeline'
import { REJECTED_REASONS } from '../EndFlowPanel.vue'

const props = defineProps<{
  applicationId: number
}>()

const emit = defineEmits<{
  done: []
}>()

const { doAction } = usePipeline()

const showRejectReasons = ref(false)
const selectedReason = ref('')
const otherReason = ref('')
const submitting = ref(false)

const canConfirmReject = computed(() => {
  if (!selectedReason.value) return false
  if (selectedReason.value === '__other__' && !otherReason.value.trim()) return false
  return true
})

async function handlePass() {
  if (submitting.value) return
  submitting.value = true
  try {
    await doAction({
      command_id: crypto.randomUUID(),
      action_code: 'pass_screening',
      target: { type: 'application', id: props.applicationId },
    })
    emit('done')
  } catch {
    // doAction 已 toast
  } finally {
    submitting.value = false
  }
}

async function handleReject() {
  if (!canConfirmReject.value || submitting.value) return
  const reason = selectedReason.value === '__other__'
    ? otherReason.value.trim()
    : selectedReason.value

  submitting.value = true
  try {
    await doAction({
      command_id: crypto.randomUUID(),
      action_code: 'end_application',
      target: { type: 'application', id: props.applicationId },
      payload: { outcome: 'rejected', reason },
    })
    emit('done')
  } catch {
    // doAction 已 toast
  } finally {
    submitting.value = false
  }
}
</script>

<style scoped>
.screening-conclusion__choices {
  display: flex;
  gap: var(--space-2);
}

.screening-conclusion__btn {
  font-size: 13px;
  padding: 6px 16px;
  border-radius: 4px;
  white-space: nowrap;
  transition: opacity 150ms;
}

.screening-conclusion__btn--pass {
  background: var(--color-text-primary);
  color: var(--color-bg);
}

.screening-conclusion__btn--pass:hover:not(:disabled) {
  opacity: 0.85;
}

.screening-conclusion__btn--reject {
  background: none;
  border: 1px solid var(--color-urgent);
  color: var(--color-urgent);
}

.screening-conclusion__btn--reject:hover:not(:disabled) {
  background: rgba(196, 71, 42, 0.05);
}

.screening-conclusion__btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.screening-conclusion__reject-panel {
  /* Same style as EndFlowPanel */
}

.screening-conclusion__reasons {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  margin-bottom: var(--space-3);
}

.screening-conclusion__reason {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  font-size: 13px;
  cursor: pointer;
}

.screening-conclusion__other-input {
  font: inherit;
  font-size: 13px;
  padding: 4px 8px;
  border: 1px solid var(--color-line);
  border-radius: 4px;
  margin-left: 20px;
}

.screening-conclusion__error {
  font-size: 12px;
  color: var(--color-urgent);
  margin-left: 20px;
}

.screening-conclusion__actions {
  display: flex;
  gap: var(--space-2);
}
</style>
