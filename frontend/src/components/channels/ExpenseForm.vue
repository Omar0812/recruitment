<template>
  <div class="expense-form">
    <h3>{{ editing ? '编辑费用' : '新增费用' }}</h3>
    <p v-if="error" class="form-error">{{ error }}</p>

    <div class="form-field">
      <label>归属月份</label>
      <input v-model="form.expense_month" type="month" />
    </div>
    <div class="form-field">
      <label>金额</label>
      <input v-model.number="form.amount" type="number" step="0.01" min="0" placeholder="0.00" />
    </div>
    <div class="form-field">
      <label>说明</label>
      <input v-model="form.description" type="text" placeholder="可选" />
    </div>
    <div class="form-actions">
      <button class="btn-primary" @click="handleSubmit" :disabled="submitting">
        {{ submitting ? '保存中...' : editing ? '保存' : '添加' }}
      </button>
      <button class="btn-secondary" @click="onCancel()" :disabled="submitting">取消</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { reactive, ref, watch } from 'vue'
import { expenseMonthToOccurredAt, occurredAtToExpenseMonth, type Expense, type ExpenseCreatePayload } from '@/api/channels'

const props = defineProps<{
  channelType: string
  channelId: number
  expense?: Expense
  onSubmit: (payload: ExpenseCreatePayload) => Promise<void>
  onCancel: () => void
}>()

const editing = !!props.expense
const submitting = ref(false)
const error = ref('')

const form = reactive({
  expense_month: '',
  amount: 0,
  description: '',
})

function syncForm() {
  form.expense_month = props.expense
    ? occurredAtToExpenseMonth(props.expense.occurred_at)
    : new Date().toISOString().slice(0, 7)
  form.amount = props.expense?.amount ?? 0
  form.description = props.expense?.description ?? ''
  error.value = ''
}

watch(() => props.expense, syncForm, { immediate: true })

async function handleSubmit() {
  if (!form.expense_month) {
    error.value = '请选择归属月份'
    return
  }
  if (!form.amount) {
    error.value = '请输入金额'
    return
  }

  submitting.value = true
  error.value = ''
  try {
    await props.onSubmit({
      channel_type: props.channelType,
      channel_id: props.channelId,
      amount: form.amount,
      occurred_at: expenseMonthToOccurredAt(form.expense_month),
      description: form.description.trim() || undefined,
    })
    props.onCancel()
  } catch (submitError) {
    error.value = submitError instanceof Error ? submitError.message : '保存失败，请重试'
  } finally {
    submitting.value = false
  }
}
</script>

<style scoped>
.expense-form {
  border: 1px solid var(--color-border);
  border-radius: 8px;
  padding: var(--space-4);
  margin-top: var(--space-3);
}

.expense-form h3 {
  font-size: 14px;
  font-weight: 600;
  margin: 0 0 var(--space-3);
}

.form-error {
  margin: 0 0 var(--space-3);
  font-size: 13px;
  color: var(--color-danger);
}

.form-field {
  margin-bottom: var(--space-3);
}

.form-field label {
  display: block;
  font-size: 13px;
  color: var(--color-text-secondary);
  margin-bottom: 4px;
}

.form-field input {
  width: 100%;
  padding: 8px 10px;
  border: 1px solid var(--color-border);
  border-radius: 4px;
  font-size: 14px;
  box-sizing: border-box;
}

.form-field input:focus {
  outline: none;
  border-color: var(--color-primary);
}

.form-actions {
  display: flex;
  gap: var(--space-2);
  margin-top: var(--space-3);
}

.btn-primary {
  flex: 1;
  padding: 8px;
  background: var(--color-primary);
  color: white;
  border: none;
  border-radius: 4px;
  font-size: 14px;
  cursor: pointer;
}

.btn-primary:disabled,
.btn-secondary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-secondary {
  flex: 1;
  padding: 8px;
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: 4px;
  font-size: 14px;
  cursor: pointer;
}
</style>
