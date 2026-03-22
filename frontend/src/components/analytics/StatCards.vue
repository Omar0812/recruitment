<template>
  <div class="stat-cards">
    <div v-for="card in cards" :key="card.key" class="stat-card">
      <div class="card-label">{{ labels[card.key] || card.key }}</div>
      <div class="card-value">
        <span class="value">{{ formatValue(card) }}</span>
        <span v-if="card.change !== null" class="change" :class="changeClass(card)">
          {{ card.change > 0 ? '↑' : '↓' }}{{ Math.abs(card.change) }}%
        </span>
      </div>
      <div class="card-previous">
        {{ card.previous !== null ? `(上期 ${formatPrevious(card)})` : '' }}
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { CardItem } from '@/api/analytics'

defineProps<{ cards: CardItem[] }>()

const labels: Record<string, string> = {
  new_candidates: '新建档',
  new_applications: '新流程',
  hired: '入职',
  ended: '结束',
  avg_cycle: '周期',
  avg_cycle_days: '周期',
  total_cost: '费用',
}

const units: Record<string, string> = {
  avg_cycle: '天',
  avg_cycle_days: '天',
}

const prefixes: Record<string, string> = {
  total_cost: '¥',
}

function formatValue(card: CardItem): string {
  if (card.value === null) return '—'
  const prefix = prefixes[card.key] || ''
  const unit = units[card.key] || ''
  if (card.key === 'total_cost') {
    return `${prefix}${formatCost(card.value)}`
  }
  return `${prefix}${card.value}${unit}`
}

function formatPrevious(card: CardItem): string {
  if (card.previous === null) return '—'
  if (card.key === 'total_cost') return `¥${formatCost(card.previous)}`
  const unit = units[card.key] || ''
  return `${card.previous}${unit}`
}

function formatCost(v: number): string {
  if (v >= 10000) return `${(v / 1000).toFixed(0)}k`
  return v.toLocaleString()
}

function changeClass(card: CardItem): string {
  if (card.change === null || card.change === 0) return ''
  // 对于 avg_cycle / avg_cycle_days / ended，下降是好事
  const invertedKeys = ['avg_cycle', 'avg_cycle_days', 'ended']
  const isGood = invertedKeys.includes(card.key) ? card.change < 0 : card.change > 0
  return isGood ? 'positive' : 'negative'
}
</script>

<style scoped>
.stat-cards {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: var(--space-4);
}

.stat-card {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}

.card-label {
  font-size: 12px;
  font-weight: 300;
  color: var(--color-text-secondary);
}

.card-value {
  display: flex;
  align-items: baseline;
  gap: var(--space-2);
}

.value {
  font-size: 24px;
  font-weight: 500;
  font-family: var(--font-mono);
}

.change {
  font-size: 12px;
  font-weight: 300;
  font-family: var(--font-mono);
}

.change.positive {
  color: var(--color-material-moss);
}

.change.negative {
  color: var(--color-urgent);
}

.card-previous {
  font-size: 12px;
  font-weight: 300;
  color: var(--color-text-secondary);
  font-family: var(--font-mono);
}
</style>
