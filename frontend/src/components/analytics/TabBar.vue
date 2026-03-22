<template>
  <div class="tab-bar">
    <button
      v-for="tab in tabs"
      :key="tab.key"
      class="tab-item"
      :class="{ active: modelValue === tab.key }"
      @click="$emit('update:modelValue', tab.key)"
    >
      {{ tab.label }}
    </button>
  </div>
</template>

<script setup lang="ts">
import type { Tab } from '@/composables/useAnalytics'

const tabs: { key: Tab; label: string }[] = [
  { key: 'overview', label: '总览' },
  { key: 'jobs', label: '岗位分析' },
  { key: 'channels', label: '渠道分析' },
]

defineProps<{ modelValue: Tab }>()
defineEmits<{ (e: 'update:modelValue', val: Tab): void }>()
</script>

<style scoped>
.tab-bar {
  display: flex;
  gap: var(--space-5);
  border-bottom: 1px solid var(--color-line);
  padding: 0;
}

.tab-item {
  padding: var(--space-2) 0;
  font-size: 15px;
  font-weight: 400;
  color: var(--color-text-secondary);
  background: none;
  border: none;
  border-bottom: 2px solid transparent;
  cursor: pointer;
  transition: color 0.15s, border-color 0.15s;
}

.tab-item:hover {
  color: var(--color-text-primary);
}

.tab-item.active {
  color: var(--color-text-primary);
  font-weight: 500;
  border-bottom-color: var(--color-text-primary);
}
</style>
