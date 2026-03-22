<template>
  <div class="action-form">
    <!-- 结构化薪资字段 -->
    <div class="salary-row">
      <div class="salary-field">
        <label class="form-label">现金月薪（元）</label>
        <input v-model.number="monthlySalary" type="number" class="form-input" placeholder="月薪" min="0" />
      </div>
      <div class="salary-field salary-field--small">
        <label class="form-label">月数</label>
        <input v-model.number="salaryMonths" type="number" class="form-input" placeholder="如13" min="1" max="24" />
      </div>
    </div>

    <div class="computed-row">
      <span class="form-label">现金总包</span>
      <span class="computed-value">{{ totalCash != null ? `¥${totalCash.toLocaleString()}` : '-' }}</span>
    </div>

    <label class="form-label">期权总包（元，选填）</label>
    <input v-model.number="equityPackage" type="number" class="form-input" placeholder="期权总包" min="0" />

    <div class="computed-row">
      <span class="form-label">全部总包</span>
      <span class="computed-value">{{ totalPackage != null ? `¥${totalPackage.toLocaleString()}` : '-' }}</span>
    </div>

    <label class="form-label">预计入职日期</label>
    <input v-model="onboardDate" type="date" class="form-input" />

    <label class="form-label">备注（选填）</label>
    <textarea v-model="notes" class="form-input" rows="2" placeholder="其他补充说明…" />

    <!-- 猎头费区域 -->
    <template v-if="candidateSupplier">
      <div class="headhunter-section">
        <div class="headhunter-section__header">猎头信息</div>
        <div class="headhunter-section__name">{{ candidateSupplier.name }}</div>
        <div v-if="candidateSupplier.contract_terms" class="headhunter-section__terms">
          <span class="form-label">合同条款</span>
          <div class="headhunter-section__terms-text">{{ candidateSupplier.contract_terms }}</div>
        </div>
        <label class="form-label">猎头费（元）</label>
        <input v-model.number="headhunterFee" type="number" class="form-input" placeholder="输入猎头费金额" min="0" />
      </div>
    </template>

    <div class="form-actions">
      <button class="btn btn--primary" @click="submit" :disabled="!canSubmit">确认</button>
      <button class="btn btn--ghost" @click="$emit('done')">取消</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { usePipeline } from '@/composables/usePipeline'
import type { Supplier } from '@/api/types'

const props = defineProps<{
  applicationId: number
  actionCode: string
  candidateSupplier?: Supplier | null
}>()

const emit = defineEmits<{ done: [] }>()
const { doAction } = usePipeline()

const monthlySalary = ref<number | undefined>(undefined)
const salaryMonths = ref<number | undefined>(undefined)
const equityPackage = ref<number | undefined>(undefined)
const onboardDate = ref('')
const notes = ref('')
const headhunterFee = ref<number | undefined>(undefined)

const totalCash = computed(() => {
  if (monthlySalary.value != null && salaryMonths.value != null) {
    return monthlySalary.value * salaryMonths.value
  }
  return null
})

const totalPackage = computed(() => {
  if (totalCash.value == null) return null
  return totalCash.value + (equityPackage.value || 0)
})

const canSubmit = computed(() => {
  return monthlySalary.value != null && monthlySalary.value > 0
    && salaryMonths.value != null && salaryMonths.value > 0
})

async function submit() {
  const payload: Record<string, any> = {
    monthly_salary: monthlySalary.value,
    salary_months: salaryMonths.value,
    total_cash: totalCash.value,
    onboard_date: onboardDate.value || undefined,
  }
  if (equityPackage.value != null && equityPackage.value > 0) {
    payload.equity_package = equityPackage.value
    payload.total_package = totalPackage.value
  }
  if (notes.value.trim()) {
    payload.notes = notes.value.trim()
  }
  if (props.candidateSupplier && headhunterFee.value != null && headhunterFee.value > 0) {
    payload.headhunter_fee = headhunterFee.value
  }
  try {
    await doAction({
      command_id: crypto.randomUUID(),
      action_code: props.actionCode,
      target: { type: 'application', id: props.applicationId },
      payload,
    })
    emit('done')
  } catch {
    // doAction 已 toast，表单保持打开
  }
}
</script>

<style scoped>
.salary-row { display: flex; gap: var(--space-2); }
.salary-field { flex: 1; display: flex; flex-direction: column; gap: 4px; }
.salary-field--small { flex: 0 0 80px; }
.computed-row {
  display: flex; align-items: center; gap: var(--space-2);
  padding: 4px 0;
}
.computed-value {
  font-size: 13px; font-weight: 500;
  color: var(--color-text-primary);
}
.headhunter-section {
  margin-top: var(--space-2);
  padding: var(--space-3);
  border: 1px solid var(--color-line);
  border-radius: 4px;
  background: rgba(26, 26, 24, 0.02);
}
.headhunter-section__header {
  font-size: 12px;
  font-weight: 500;
  color: var(--color-text-primary);
  margin-bottom: var(--space-2);
}
.headhunter-section__name {
  font-size: 13px;
  margin-bottom: var(--space-2);
}
.headhunter-section__terms {
  margin-bottom: var(--space-2);
}
.headhunter-section__terms-text {
  font-size: 12px;
  color: var(--color-text-secondary);
  white-space: pre-wrap;
  margin-top: 2px;
}
</style>
