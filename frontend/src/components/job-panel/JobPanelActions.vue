<template>
  <div class="panel-actions">
    <button class="panel-actions__btn" @click="$emit('edit')">编辑</button>
    <button class="panel-actions__btn panel-actions__btn--danger" @click="$emit('close-job')">
      关闭岗位
    </button>
  </div>
</template>

<script setup lang="ts">
import type { Job } from '@/api/types'

defineProps<{
  job: Job
}>()

defineEmits<{
  edit: []
  'close-job': []
}>()
</script>

<style scoped>
.panel-actions {
  display: flex;
  gap: 12px;
  padding: 16px 24px;
  border-top: 1px solid var(--color-border);
  background: var(--color-bg);
}

.panel-actions__btn {
  flex: 1;
  padding: 10px 16px;
  border: 1px solid var(--color-border);
  background: var(--color-bg-secondary);
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.2s;
}

.panel-actions__btn:hover {
  border-color: var(--color-primary);
  color: var(--color-primary);
}

.panel-actions__btn--danger:hover {
  border-color: var(--error-color);
  color: var(--error-color);
}
</style>
