<template>
  <div class="blacklist-confirm">
    <div class="blacklist-confirm__title">确认加入黑名单</div>

    <div class="blacklist-confirm__reasons">
      <label class="blacklist-confirm__label">原因</label>
      <div class="blacklist-confirm__options">
        <label
          v-for="reason in reasons"
          :key="reason"
          class="blacklist-confirm__option"
        >
          <input
            v-model="selectedReason"
            type="radio"
            :value="reason"
            name="blacklist-reason"
          />
          {{ reason }}
        </label>
      </div>
    </div>

    <div class="blacklist-confirm__note-field">
      <label class="blacklist-confirm__label">备注（选填）</label>
      <textarea
        v-model="note"
        class="blacklist-confirm__textarea"
        rows="2"
        placeholder="补充说明..."
      />
    </div>

    <div class="blacklist-confirm__actions">
      <button class="blacklist-confirm__btn" @click="$emit('cancel')">取消</button>
      <button
        class="blacklist-confirm__btn blacklist-confirm__btn--confirm"
        :disabled="!selectedReason || submitting"
        @click="handleConfirm"
      >
        确认拉黑
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { executeAction } from '@/api/pipeline'

const props = defineProps<{
  candidateId: number
}>()

const emit = defineEmits<{
  cancel: []
  confirmed: []
}>()

const reasons = ['简历造假', '态度问题', '背调不通过', '多次爽约', '其他']
const selectedReason = ref('')
const note = ref('')
const submitting = ref(false)

async function handleConfirm() {
  if (!selectedReason.value || submitting.value) return
  submitting.value = true
  try {
    await executeAction({
      command_id: crypto.randomUUID(),
      action_code: 'blacklist_candidate',
      target: { type: 'candidate', id: props.candidateId },
      payload: {
        reason: selectedReason.value,
        note: note.value || undefined,
      },
    })
    emit('confirmed')
  } finally {
    submitting.value = false
  }
}
</script>

<style scoped>
.blacklist-confirm {
  padding: var(--space-3) var(--space-5);
  border-top: 1px solid var(--color-line);
  background: rgba(196, 71, 42, 0.03);
}

.blacklist-confirm__title {
  font-size: 13px;
  font-weight: 500;
  margin-bottom: var(--space-3);
}

.blacklist-confirm__label {
  font-size: 12px;
  color: var(--color-text-secondary);
  display: block;
  margin-bottom: var(--space-1);
}

.blacklist-confirm__options {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-bottom: var(--space-3);
}

.blacklist-confirm__option {
  font-size: 13px;
  display: flex;
  align-items: center;
  gap: var(--space-1);
  cursor: pointer;
}

.blacklist-confirm__note-field {
  margin-bottom: var(--space-3);
}

.blacklist-confirm__textarea {
  width: 100%;
  font-size: 13px;
  padding: var(--space-2);
  border: 1px solid var(--color-line);
  border-radius: 3px;
  background: var(--color-bg);
  resize: none;
  font-family: inherit;
}

.blacklist-confirm__textarea:focus {
  outline: none;
  border-color: var(--color-text-secondary);
}

.blacklist-confirm__actions {
  display: flex;
  justify-content: flex-end;
  gap: var(--space-2);
}

.blacklist-confirm__btn {
  font-size: 13px;
  padding: 6px 12px;
  border: 1px solid var(--color-line);
  background: none;
  border-radius: 3px;
  cursor: pointer;
}

.blacklist-confirm__btn--confirm {
  background: var(--color-urgent);
  color: #fff;
  border-color: var(--color-urgent);
}

.blacklist-confirm__btn--confirm:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
