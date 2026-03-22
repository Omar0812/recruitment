<template>
  <div class="funnel-chart">
    <div class="funnel-title">
      {{ title }}（{{ cohortSize }} 个 Application）
    </div>
    <div class="funnel-bars">
      <div v-for="(stage, i) in funnel" :key="stage.stage" class="funnel-row">
        <div class="stage-name">{{ stage.stage }}</div>
        <div class="bar-track">
          <div class="bar-fill" :style="{ width: barWidth(stage.count) }"></div>
        </div>
        <div class="stage-count">{{ stage.count }}</div>
        <div class="conversion" v-if="i > 0 && stage.conversion !== null">
          {{ stage.conversion }}% ↓
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { FunnelStage } from '@/api/analytics'

const props = defineProps<{
  funnel: FunnelStage[]
  cohortSize: number
  title: string
}>()

const maxCount = computed(() => Math.max(...props.funnel.map(s => s.count), 1))

function barWidth(count: number): string {
  return `${Math.max((count / maxCount.value) * 100, 2)}%`
}
</script>

<style scoped>
.funnel-chart {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.funnel-title {
  font-size: 12px;
  font-weight: 300;
  color: var(--color-text-secondary);
}

.funnel-bars {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.funnel-row {
  display: grid;
  grid-template-columns: 56px 1fr 32px 56px;
  align-items: center;
  gap: var(--space-2);
  height: 24px;
}

.stage-name {
  font-size: 12px;
  font-weight: 300;
  color: var(--color-text-secondary);
  white-space: nowrap;
}

.bar-track {
  height: 16px;
  background: rgba(26, 26, 24, 0.04);
  border-radius: 2px;
  overflow: hidden;
}

.bar-fill {
  height: 100%;
  background: var(--color-material-stone);
  border-radius: 2px;
  transition: width 0.3s ease;
}

.stage-count {
  font-size: 13px;
  font-weight: 400;
  font-family: var(--font-mono);
  text-align: right;
}

.conversion {
  font-size: 11px;
  font-weight: 300;
  color: var(--color-text-secondary);
  font-family: var(--font-mono);
}
</style>
