<template>
  <div class="hired-view">
    <h1>已入职</h1>

    <div v-if="state.loading" class="loading">加载中...</div>

    <div v-else-if="state.error" class="error-state">
      <p>{{ state.error }}</p>
      <button class="retry-button" @click="load">重试</button>
    </div>

    <div v-else-if="state.items.length === 0" class="empty-state">
      <p>暂无已入职人员</p>
    </div>

    <table v-else class="hired-table">
      <thead>
        <tr>
          <th>姓名</th>
          <th>岗位</th>
          <th>入职日期</th>
          <th>年总包</th>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="item in state.items"
          :key="item.application_id"
          class="hired-row"
          @click="openCandidate(item.candidate_id)"
        >
          <td class="name-cell">{{ item.candidate_name || '-' }}</td>
          <td>{{ item.job_title || '-' }}</td>
          <td>{{ formatHireDate(item.hire_date) }}</td>
          <td>{{ formatTotalCash(item.total_cash, item.monthly_salary, item.salary_months) }}</td>
        </tr>
      </tbody>
    </table>

    <p v-if="state.total > 0" class="total-hint">共 {{ state.total }} 人</p>
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import { useHired } from '@/composables/useHired'
import { useCandidatePanel } from '@/composables/useCandidatePanel'
import { formatDate } from '@/utils/date'

const { state, load } = useHired()
const { open: openCandidatePanel } = useCandidatePanel()

function openCandidate(candidateId: number) {
  openCandidatePanel(candidateId)
}

function formatHireDate(dateStr: string | null) {
  if (!dateStr) return '-'
  const s = formatDate(dateStr)
  return s ? `${s} 入职` : '-'
}

function formatTotalCash(total: number | null, monthly: number | null, months: number | null) {
  if (total != null) return `¥${total.toLocaleString()}`
  if (monthly != null && months != null) return `¥${(monthly * months).toLocaleString()}`
  if (monthly != null) return `¥${monthly.toLocaleString()}/月`
  return '-'
}

onMounted(() => {
  load()
})
</script>

<style scoped>
.hired-view {
  max-width: 900px;
}

.hired-view h1 {
  font-size: 24px;
  font-weight: 600;
  margin: 0 0 var(--space-4);
}

.loading {
  color: var(--color-text-secondary);
  font-size: 14px;
  padding: var(--space-5) 0;
}

.empty-state {
  text-align: center;
  padding: var(--space-7) 0;
  color: var(--color-text-secondary);
}

.error-state {
  text-align: center;
  padding: var(--space-7) 0;
  color: var(--color-text-secondary);
}

.empty-state p {
  font-size: 14px;
  margin: 0;
}

.error-state p {
  font-size: 14px;
  margin: 0 0 var(--space-3);
}

.retry-button {
  border: 1px solid var(--color-line);
  background: transparent;
  color: var(--color-text-primary);
  border-radius: 999px;
  padding: 6px 14px;
  font-size: 13px;
  cursor: pointer;
}

.hired-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 14px;
}

.hired-table th {
  text-align: left;
  padding: 10px 12px;
  font-weight: 500;
  font-size: 12px;
  color: var(--color-text-secondary);
  border-bottom: 1px solid var(--color-border);
  white-space: nowrap;
}

.hired-row {
  cursor: pointer;
  transition: background 0.15s;
}

.hired-row:hover {
  background: var(--color-bg-hover);
}

.hired-row td {
  padding: 10px 12px;
  border-bottom: 1px solid var(--color-border);
  white-space: nowrap;
}

.name-cell {
  font-weight: 500;
}

.total-hint {
  color: var(--color-text-tertiary);
  font-size: 12px;
  margin-top: var(--space-3);
}
</style>
