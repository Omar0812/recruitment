<template>
  <div class="time-picker">
    <div class="time-picker__top-row">
      <div class="time-range">{{ displayRange }}</div>
      <div class="time-controls">
        <select class="preset-select" :value="preset" @change="onPresetChange">
          <option value="this_month">本月</option>
          <option value="last_month">上月</option>
          <option value="this_quarter">本季度</option>
          <option value="last_quarter">上季度</option>
          <option value="custom">自定义</option>
        </select>
        <button class="shift-btn" @click="$emit('shift', -1)">←</button>
        <button class="shift-btn" :disabled="!canShiftForward" @click="$emit('shift', 1)">→</button>
      </div>
    </div>

    <div v-if="preset === 'custom'" class="custom-range">
      <label class="custom-range__field">
        <span class="custom-range__label">开始</span>
        <input class="custom-range__input custom-range__input--start" type="date" :value="start" @change="onCustomRangeChange('start', $event)" />
      </label>
      <label class="custom-range__field">
        <span class="custom-range__label">结束</span>
        <input class="custom-range__input custom-range__input--end" type="date" :value="end" @change="onCustomRangeChange('end', $event)" />
      </label>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Preset } from '@/composables/useAnalytics'

const props = defineProps<{
  displayRange: string
  preset: Preset
  start: string
  end: string
  canShiftForward: boolean
}>()

const emit = defineEmits<{
  (e: 'update:preset', val: Preset): void
  (e: 'update:custom-range', payload: { start: string; end: string }): void
  (e: 'shift', direction: -1 | 1): void
}>()

function onPresetChange(ev: Event) {
  const val = (ev.target as HTMLSelectElement).value as Preset
  emit('update:preset', val)
}

function onCustomRangeChange(kind: 'start' | 'end', ev: Event) {
  const value = (ev.target as HTMLInputElement).value
  const nextStart = kind === 'start' ? value : props.start
  const nextEnd = kind === 'end' ? value : props.end
  if (!nextStart || !nextEnd || nextStart > nextEnd) return
  emit('update:custom-range', { start: nextStart, end: nextEnd })
}
</script>

<style scoped>
.time-picker {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: var(--space-2);
}

.time-picker__top-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-4);
  width: 100%;
}

.time-range {
  font-size: 13px;
  font-weight: 300;
  color: var(--color-text-secondary);
  font-family: var(--font-mono);
}

.time-controls {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.preset-select {
  font-size: 13px;
  font-weight: 400;
  padding: var(--space-1) var(--space-2);
  border: 1px solid var(--color-line);
  border-radius: 4px;
  background: transparent;
  color: var(--color-text-primary);
  cursor: pointer;
  outline: none;
}

.preset-select:focus,
.custom-range__input:focus {
  border-color: var(--color-text-secondary);
}

.shift-btn {
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--color-line);
  border-radius: 4px;
  background: transparent;
  color: var(--color-text-primary);
  cursor: pointer;
  font-size: 13px;
}

.shift-btn:hover:not(:disabled) {
  background: var(--color-line);
}

.shift-btn:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

.custom-range {
  display: flex;
  align-items: center;
  gap: var(--space-3);
}

.custom-range__field {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.custom-range__label {
  font-size: 12px;
  color: var(--color-text-secondary);
}

.custom-range__input {
  min-width: 132px;
  font-size: 12px;
  padding: 4px 8px;
  border: 1px solid var(--color-line);
  border-radius: 4px;
  background: transparent;
  color: var(--color-text-primary);
  outline: none;
}
</style>
