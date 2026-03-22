<template>
  <form class="supplier-form" @submit.prevent="handleSubmit">
    <p v-if="error" class="form-error">{{ error }}</p>

    <div class="form-grid">
      <div class="form-field form-field--full">
        <label>猎头公司名称 *</label>
        <input v-model="form.name" type="text" placeholder="输入公司名称" />
      </div>

      <div class="form-field">
        <label>联系人</label>
        <input v-model="form.contact_name" type="text" placeholder="可选" />
      </div>

      <div class="form-field">
        <label>电话</label>
        <input v-model="form.phone" type="text" placeholder="可选" />
      </div>

      <div class="form-field">
        <label>邮箱</label>
        <input v-model="form.email" type="email" placeholder="可选" />
      </div>

      <div class="form-field">
        <label>担保期（月）</label>
        <input v-model.number="form.guarantee_months" type="number" min="0" placeholder="可选" />
      </div>

      <div class="form-field">
        <label>合同开始</label>
        <input v-model="form.contract_start" type="date" />
      </div>

      <div class="form-field">
        <label>合同结束</label>
        <input v-model="form.contract_end" type="date" />
      </div>

      <div class="form-field form-field--full">
        <label>合同条款</label>
        <textarea v-model="form.contract_terms" rows="4" placeholder="可选"></textarea>
      </div>

      <div class="form-field form-field--full">
        <label>备注</label>
        <textarea v-model="form.notes" rows="4" placeholder="可选"></textarea>
      </div>
    </div>

    <div class="form-actions">
      <button type="button" class="btn-secondary" :disabled="submitting" @click="onCancel()">取消</button>
      <button type="submit" class="btn-primary" :disabled="submitting">
        {{ submitting ? '保存中...' : mode === 'create' ? '创建' : '保存' }}
      </button>
    </div>
  </form>
</template>

<script setup lang="ts">
import { reactive, ref, watch } from 'vue'
import type { SupplierCreatePayload } from '@/api/channels'
import type { SupplierWithStats } from '@/composables/useChannels'

const props = defineProps<{
  mode: 'create' | 'edit'
  supplier?: SupplierWithStats
  onSubmit: (payload: SupplierCreatePayload) => Promise<void>
  onCancel: () => void
}>()

const submitting = ref(false)
const error = ref('')

const form = reactive({
  name: '',
  contact_name: '',
  phone: '',
  email: '',
  guarantee_months: undefined as number | undefined,
  contract_start: '',
  contract_end: '',
  contract_terms: '',
  notes: '',
})

function syncForm() {
  form.name = props.supplier?.name ?? ''
  form.contact_name = props.supplier?.contact_name ?? ''
  form.phone = props.supplier?.phone ?? ''
  form.email = props.supplier?.email ?? ''
  form.guarantee_months = props.supplier?.guarantee_months ?? undefined
  form.contract_start = props.supplier?.contract_start ?? ''
  form.contract_end = props.supplier?.contract_end ?? ''
  form.contract_terms = props.supplier?.contract_terms ?? ''
  form.notes = props.supplier?.notes ?? ''
  error.value = ''
}

watch(() => props.supplier, syncForm, { immediate: true })

function normalizeOptional(value: string) {
  const trimmed = value.trim()
  return trimmed ? trimmed : undefined
}

async function handleSubmit() {
  if (!form.name.trim()) {
    error.value = '请输入猎头公司名称'
    return
  }

  submitting.value = true
  error.value = ''
  try {
    await props.onSubmit({
      name: form.name.trim(),
      type: 'headhunter',
      contact_name: normalizeOptional(form.contact_name),
      phone: normalizeOptional(form.phone),
      email: normalizeOptional(form.email),
      guarantee_months: form.guarantee_months,
      contract_start: form.contract_start || undefined,
      contract_end: form.contract_end || undefined,
      contract_terms: normalizeOptional(form.contract_terms),
      notes: normalizeOptional(form.notes),
    })
  } catch (submitError) {
    error.value = submitError instanceof Error ? submitError.message : '保存失败，请重试'
  } finally {
    submitting.value = false
  }
}
</script>

<style scoped>
.supplier-form {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.form-error {
  margin: 0;
  font-size: 13px;
  color: var(--color-danger);
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--space-3);
}

.form-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.form-field--full {
  grid-column: 1 / -1;
}

.form-field label {
  font-size: 13px;
  color: var(--color-text-secondary);
}

.form-field input,
.form-field textarea {
  width: 100%;
  box-sizing: border-box;
  padding: 10px 12px;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  font-size: 14px;
}

.form-field textarea {
  resize: vertical;
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: var(--space-2);
}

.btn-primary,
.btn-secondary {
  border-radius: 6px;
  font-size: 14px;
  padding: 9px 14px;
  cursor: pointer;
}

.btn-primary {
  border: 1px solid var(--color-primary);
  background: var(--color-primary);
  color: white;
}

.btn-secondary {
  border: 1px solid var(--color-border);
  background: var(--color-bg);
}

.btn-primary:disabled,
.btn-secondary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
