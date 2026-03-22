<template>
  <div class="queue-bar">
    <button class="queue-nav" :disabled="currentIndex === 0" @click="$emit('prev')">‹</button>
    <span class="queue-pos">{{ currentIndex + 1 }} / {{ total }}</span>
    <button class="queue-nav" :disabled="currentIndex >= total - 1" @click="$emit('next')">›</button>
    <span class="queue-name">{{ name }}</span>
    <button class="queue-remove" @click="$emit('remove')">移除此人</button>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  currentIndex: number
  total: number
  name: string
}>()

defineEmits<{
  prev: []
  next: []
  remove: []
}>()
</script>

<style scoped>
.queue-bar {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-2) var(--space-4);
  border-bottom: 1px solid var(--color-line);
  background: rgba(26, 26, 24, 0.02);
}

.queue-nav {
  font-size: 18px;
  color: var(--color-text-secondary);
  line-height: 1;
}
.queue-nav:hover:not(:disabled) { color: var(--color-text-primary); }
.queue-nav:disabled { opacity: 0.3; cursor: not-allowed; }

.queue-pos {
  font-size: 14px;
  font-weight: 500;
  min-width: 40px;
  text-align: center;
}

.queue-name {
  flex: 1;
  font-size: 14px;
}

.queue-remove {
  font-size: 13px;
  color: var(--color-text-tertiary);
}
.queue-remove:hover { color: var(--color-urgent); }
</style>
