<template>
  <div v-if="show" class="dialog-overlay" @click.self="handleCancel">
    <div class="dialog">
      <h3>关闭岗位</h3>

      <div class="form-group">
        <label>关闭原因</label>
        <div class="radio-group">
          <label>
            <input v-model="reason" type="radio" value="招满了" @change="clearError" />
            招满了
          </label>
          <label>
            <input v-model="reason" type="radio" value="需求取消" @change="clearError" />
            需求取消
          </label>
          <label>
            <input v-model="reason" type="radio" value="other" @change="clearError" />
            其他
          </label>
        </div>
        <input
          v-if="reason === 'other'"
          v-model="customReason"
          type="text"
          placeholder="请输入关闭原因"
          class="custom-reason-input"
          :class="{ 'custom-reason-input--error': errorMessage }"
          @input="clearError"
        />
      </div>

      <div v-if="activeApplications.length > 0" class="warning">
        <p>此岗位还有 {{ activeApplications.length }} 人在流程中，</p>
        <p>关闭后将全部标记为「未通过（岗位关闭）」</p>
        <div class="candidate-list">
          <div v-for="app in activeApplications" :key="app.id" class="candidate-item">
            <div class="candidate-name">{{ app.candidate_name || '未知候选人' }}</div>
            <div class="candidate-stage">当前阶段：{{ app.stage || '未知阶段' }}</div>
          </div>
        </div>
      </div>

      <div class="dialog-actions">
        <p v-if="errorMessage" class="dialog-error">{{ errorMessage }}</p>
        <button :disabled="submitting" @click="handleCancel">取消</button>
        <button class="btn-danger" :disabled="submitting" @click="handleConfirm">
          {{ submitting ? '关闭中...' : '确认关闭' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { closeJob } from '@/api/jobs'
import { showToastUndo } from '@/composables/useToastUndo'
import type { Application } from '@/api/types'

const props = defineProps<{
  show: boolean
  jobId: number
  jobVersion?: number
  applications: readonly Application[]
}>()

const emit = defineEmits<{
  cancel: []
  confirmed: []
}>()

const reason = ref<string>('')
const customReason = ref<string>('')
const submitting = ref(false)
const errorMessage = ref('')

const activeApplications = computed(() => {
  return props.applications.filter(app => app.state === 'IN_PROGRESS')
})

watch(
  () => props.show,
  (show) => {
    if (show) {
      reason.value = ''
      customReason.value = ''
      errorMessage.value = ''
      submitting.value = false
    }
  },
)

function clearError() {
  errorMessage.value = ''
}

function handleCancel() {
  if (submitting.value) return
  clearError()
  emit('cancel')
}

async function handleConfirm() {
  if (!reason.value) {
    errorMessage.value = '请选择关闭原因'
    return
  }

  const finalReason = reason.value === 'other' ? customReason.value.trim() : reason.value.trim()
  if (!finalReason) {
    errorMessage.value = '请输入关闭原因'
    return
  }

  // 关弹窗，用 toast 延迟执行
  emit('cancel')
  showToastUndo(
    '岗位即将关闭',
    async () => {
      try {
        await closeJob(props.jobId, { reason: finalReason, version: props.jobVersion })
        emit('confirmed')
      } catch {
        // 关闭失败时静默（toast 已消失，无法展示错误）
      }
    },
  )
}
</script>

<style scoped>
.dialog-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 2000;
  display: flex;
  align-items: center;
  justify-content: center;
}

.dialog {
  background: var(--color-bg);
  padding: 24px;
  border-radius: 8px;
  width: 500px;
  max-width: 90%;
}

.dialog h3 {
  margin-bottom: 16px;
}

.form-group {
  margin-bottom: 16px;
}

.form-group label {
  display: block;
  margin-bottom: 8px;
  font-size: 14px;
}

.radio-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.radio-group label {
  display: flex;
  align-items: center;
  gap: 8px;
}

.custom-reason-input {
  margin-top: 8px;
  width: 100%;
  padding: 8px 12px;
  border: 1px solid var(--color-border);
  border-radius: 6px;
}

.custom-reason-input--error {
  border-color: var(--error-color);
}

.warning {
  padding: 12px;
  background: var(--warning-bg);
  border-radius: 6px;
  margin-bottom: 16px;
}

.warning p {
  margin: 4px 0;
  font-size: 14px;
}

.candidate-list {
  margin-top: 12px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.candidate-item {
  display: flex;
  flex-direction: column;
  gap: 2px;
  font-size: 13px;
}

.candidate-name {
  color: var(--color-text-primary);
}

.candidate-stage {
  color: var(--color-text-secondary);
}

.dialog-actions {
  display: flex;
  gap: 12px;
  align-items: center;
  justify-content: flex-end;
}

.dialog-actions button {
  padding: 10px 20px;
  border: 1px solid var(--color-border);
  background: var(--color-bg-secondary);
  border-radius: 6px;
  cursor: pointer;
}

.dialog-actions button:disabled {
  cursor: not-allowed;
  opacity: 0.7;
}

.dialog-error {
  margin: 0 auto 0 0;
  font-size: 13px;
  color: var(--error-color);
}

.btn-danger {
  background: var(--error-color);
  color: white;
  border-color: var(--error-color);
}
</style>
