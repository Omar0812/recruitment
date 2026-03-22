<template>
  <div class="ym-picker">
    <template v-if="!isPresent">
      <select
        class="ym-select ym-select--year"
        :value="year"
        @change="onYearChange(($event.target as HTMLSelectElement).value)"
      >
        <option value="">年</option>
        <option v-for="y in years" :key="y" :value="y">{{ y }}</option>
      </select>
      <select
        class="ym-select ym-select--month"
        :value="month"
        @change="onMonthChange(($event.target as HTMLSelectElement).value)"
      >
        <option value="">月</option>
        <option v-for="m in months" :key="m" :value="m">{{ m }}</option>
      </select>
      <button
        v-if="allowPresent"
        type="button"
        class="ym-present-btn"
        @click="onSetPresent"
      >至今</button>
    </template>
    <template v-else>
      <span class="ym-present-label">
        至今
        <button type="button" class="ym-present-clear" @click="onClearPresent">✕</button>
      </span>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  modelValue?: string // "YYYY-MM" 格式 或 "至今"
  allowPresent?: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string | undefined]
}>()

const currentYear = new Date().getFullYear()
const years = Array.from({ length: currentYear - 1990 + 6 }, (_, i) => String(1990 + i))
const months = Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0'))

const year = computed(() => {
  if (isPresent.value) return ''
  return props.modelValue?.split('-')[0] ?? ''
})
const month = computed(() => {
  if (isPresent.value) return ''
  return props.modelValue?.split('-')[1] ?? ''
})

const isPresent = computed(() => props.modelValue === '至今')

function emitValue(y: string, m: string) {
  if (y && m) {
    emit('update:modelValue', `${y}-${m}`)
  } else if (!y && !m) {
    emit('update:modelValue', undefined)
  }
  // 只选了年或只选了月时不 emit，等用户选完
}

function onYearChange(y: string) {
  emitValue(y, month.value)
}

function onMonthChange(m: string) {
  emitValue(year.value, m)
}

function onSetPresent() {
  emit('update:modelValue', '至今')
}

function onClearPresent() {
  emit('update:modelValue', undefined)
}
</script>

<style scoped>
.ym-picker {
  display: flex;
  align-items: center;
  gap: 4px;
}

.ym-select {
  padding: var(--space-2);
  border: 1px solid var(--color-line);
  border-radius: 4px;
  font-size: 13px;
  background: var(--color-bg);
  outline: none;
  color: var(--color-text-primary);
  transition: border-color 150ms;
}

.ym-select:focus {
  border-color: var(--color-text-secondary);
}

.ym-select--year {
  width: 80px;
}

.ym-select--month {
  width: 60px;
}

.ym-present-btn {
  font-size: 12px;
  color: var(--color-text-secondary);
  background: none;
  border: 1px solid var(--color-line);
  border-radius: 3px;
  padding: 4px 8px;
  cursor: pointer;
  white-space: nowrap;
}

.ym-present-btn:hover {
  color: var(--color-text-primary);
  border-color: var(--color-text-secondary);
}

.ym-present-label {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 13px;
  color: var(--color-text-primary);
  padding: var(--space-2);
  border: 1px solid var(--color-line);
  border-radius: 4px;
  background: rgba(26, 26, 24, 0.03);
}

.ym-present-clear {
  font-size: 12px;
  color: var(--color-text-tertiary);
  background: none;
  border: none;
  cursor: pointer;
  padding: 0;
  line-height: 1;
}

.ym-present-clear:hover {
  color: var(--color-urgent);
}
</style>
