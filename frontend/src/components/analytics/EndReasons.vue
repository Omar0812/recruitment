<template>
  <div class="end-reasons">
    <div class="end-reasons-title">结束原因（{{ total }}人）</div>
    <div v-for="group in groups" :key="group.label" class="reason-group">
      <div class="group-header">{{ group.label }} {{ group.total }}</div>
      <div v-for="item in group.items" :key="item.reason" class="reason-row">
        <span class="reason-name">{{ item.reason }}</span>
        <div class="reason-bar-track">
          <div class="reason-bar" :style="{ width: barWidth(item.count) }"></div>
        </div>
        <span class="reason-count">{{ item.count }}</span>
      </div>
      <div v-if="!group.items.length" class="empty">—</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { EndReasons } from '@/api/analytics'

const props = defineProps<{ endReasons: EndReasons }>()

const groups = computed(() => [props.endReasons.rejected, props.endReasons.withdrawn])
const total = computed(() => props.endReasons.rejected.total + props.endReasons.withdrawn.total)
const maxCount = computed(() => {
  const all = [...props.endReasons.rejected.items, ...props.endReasons.withdrawn.items]
  return Math.max(...all.map(i => i.count), 1)
})

function barWidth(count: number): string {
  return `${Math.max((count / maxCount.value) * 100, 4)}%`
}
</script>

<style scoped>
.end-reasons {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.end-reasons-title {
  font-size: 12px;
  font-weight: 300;
  color: var(--color-text-secondary);
}

.reason-group {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}

.group-header {
  font-size: 13px;
  font-weight: 400;
  color: var(--color-text-primary);
}

.reason-row {
  display: grid;
  grid-template-columns: 120px 1fr 32px;
  align-items: center;
  gap: var(--space-2);
  padding-left: var(--space-3);
}

.reason-name {
  font-size: 12px;
  font-weight: 300;
  color: var(--color-text-secondary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.reason-bar-track {
  height: 12px;
  overflow: hidden;
}

.reason-bar {
  height: 100%;
  background: var(--color-material-clay);
  border-radius: 2px;
  transition: width 0.3s ease;
}

.reason-count {
  font-size: 12px;
  font-family: var(--font-mono);
  font-weight: 300;
  text-align: right;
}

.empty {
  font-size: 12px;
  color: var(--color-text-secondary);
  padding-left: var(--space-3);
}
</style>
