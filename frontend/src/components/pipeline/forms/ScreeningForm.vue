<template>
  <div class="screening-form">
    <div class="screening-form__field">
      <label class="form-label">筛选人</label>
      <input
        v-model="screener"
        type="text"
        class="form-input"
        placeholder="输入筛选人姓名"
        @keyup.enter="handleConfirm"
      />
    </div>
    <div class="screening-form__actions">
      <button class="btn btn--primary" :disabled="!canConfirm || submitting" @click="handleConfirm">
        {{ submitting ? '提交中...' : '确认' }}
      </button>
      <button class="btn btn--ghost" @click="$emit('done')">取消</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { usePipeline } from '@/composables/usePipeline'

const props = defineProps<{
  applicationId: number
}>()

const emit = defineEmits<{
  done: []
}>()

const { doAction } = usePipeline()

const screener = ref('')
const submitting = ref(false)

const canConfirm = computed(() => screener.value.trim().length > 0)

async function handleConfirm() {
  if (!canConfirm.value || submitting.value) return
  submitting.value = true
  try {
    await doAction({
      command_id: crypto.randomUUID(),
      action_code: 'assign_screening',
      target: { type: 'application', id: props.applicationId },
      payload: { screener: screener.value.trim() },
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
.screening-form__field {
  margin-bottom: var(--space-3);
}

.screening-form__actions {
  display: flex;
  gap: var(--space-2);
}
</style>
