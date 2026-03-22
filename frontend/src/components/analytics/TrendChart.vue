<template>
  <div class="trend-section">
    <div class="chart-header">
      <div class="chart-title">{{ chartTitle }}</div>
      <div v-if="availableGranularities && availableGranularities.length > 1" class="granularity-toggle">
        <span class="toggle-label">按</span>
        <button
          v-for="g in availableGranularities"
          :key="g"
          class="toggle-btn"
          :class="{ active: g === granularity }"
          @click="emit('update:granularity', g)"
        >{{ GRANULARITY_LABELS[g] || g }}</button>
      </div>
    </div>
    <div class="bar-chart">
      <div v-for="bucket in trend" :key="bucket.bucket" class="bar-group">
        <div class="bar-wrapper">
          <div class="bar-col">
            <span class="bar-value">{{ bucket.new_applications }}</span>
            <div class="bar bar--new" :style="{ height: barHeight(bucket.new_applications) }"></div>
          </div>
          <div class="bar-col">
            <span class="bar-value">{{ bucket.hired }}</span>
            <div class="bar bar--hired" :style="{ height: barHeight(bucket.hired) }"></div>
          </div>
        </div>
        <div class="bar-label">{{ formatLabel(bucket.bucket) }}</div>
      </div>
    </div>
    <div class="legend">
      <span class="legend-item"><span class="dot" :style="{ background: colorStone }"></span>新增</span>
      <span class="legend-item"><span class="dot" :style="{ background: colorMoss }"></span>入职</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { TrendBucket } from '@/api/analytics'

const props = defineProps<{
  trend: TrendBucket[]
  start: string
  end: string
  granularity?: string
  availableGranularities?: string[]
}>()

const emit = defineEmits<{
  (e: 'update:granularity', g: string): void
}>()

const colorStone = '#6E7682'
const colorMoss = '#6F7A69'

const GRANULARITY_LABELS: Record<string, string> = {
  day: '天',
  week: '周',
  month: '月',
  quarter: '季',
}

// 标题：本期节奏 · M.D–M.D（月日不补零）
const chartTitle = computed(() => {
  const s = props.start // YYYY-MM-DD
  const e = props.end
  const startM = Number(s.slice(5, 7))
  const startD = Number(s.slice(8, 10))
  const endM = Number(e.slice(5, 7))
  const endD = Number(e.slice(8, 10))
  return `本期节奏 · ${startM}.${startD}–${endM}.${endD}`
})

const maxVal = computed(() => {
  const vals = props.trend.map(b => Math.max(b.new_applications, b.hired))
  return Math.max(...vals, 1)
})

function barHeight(val: number): string {
  return `${Math.max((val / maxVal.value) * 100, 2)}%`
}

function formatLabel(bucket: string): string {
  if (bucket.includes('Q')) return bucket.split('-')[1]
  if (bucket.length === 7) return bucket.slice(5) // "03" from "2026-03"
  if (bucket.length === 10) {
    // day: show MM-DD
    return bucket.slice(5)
  }
  return bucket
}
</script>

<style scoped>
.trend-section {
  display: flex;
  flex-direction: column;
}

.chart-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--space-2);
}

.chart-title {
  font-size: 12px;
  font-weight: 300;
  color: var(--color-text-secondary);
}

.granularity-toggle {
  display: flex;
  align-items: center;
  gap: 2px;
}

.toggle-label {
  font-size: 11px;
  color: var(--color-text-secondary);
  margin-right: 4px;
}

.toggle-btn {
  padding: 2px 8px;
  border: 1px solid var(--color-line);
  background: transparent;
  font-size: 11px;
  color: var(--color-text-secondary);
  cursor: pointer;
}

.toggle-btn:first-of-type {
  border-radius: 4px 0 0 4px;
}

.toggle-btn:last-of-type {
  border-radius: 0 4px 4px 0;
}

.toggle-btn + .toggle-btn {
  border-left: none;
}

.toggle-btn.active {
  background: var(--color-text-primary);
  color: var(--color-bg);
  border-color: var(--color-text-primary);
}

.toggle-btn:hover:not(.active) {
  background: var(--color-bg-hover);
}

.bar-chart {
  display: flex;
  align-items: flex-end;
  gap: var(--space-2);
  height: 120px;
  flex: 1;
}

.bar-group {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.bar-wrapper {
  width: 100%;
  height: 120px;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  gap: 2px;
}

.bar-col {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-end;
  width: 45%;
  max-width: 24px;
  height: 100%;
}

.bar-value {
  font-size: 11px;
  font-weight: 300;
  color: var(--color-text-secondary);
  font-family: var(--font-mono);
  line-height: 1;
  margin-bottom: 2px;
}

.bar {
  width: 100%;
  border-radius: 2px 2px 0 0;
  transition: height 0.3s ease;
}

.bar--new {
  background: var(--color-material-stone);
}

.bar--hired {
  background: var(--color-material-moss);
}

.bar-label {
  font-size: 11px;
  font-weight: 300;
  color: var(--color-text-secondary);
  font-family: var(--font-mono);
  margin-top: var(--space-1);
  text-align: center;
}

.legend {
  display: flex;
  gap: var(--space-4);
  margin-top: var(--space-2);
  font-size: 11px;
  color: var(--color-text-secondary);
}

.legend-item {
  display: flex;
  align-items: center;
  gap: var(--space-1);
}

.dot {
  width: 8px;
  height: 2px;
  border-radius: 1px;
}
</style>
