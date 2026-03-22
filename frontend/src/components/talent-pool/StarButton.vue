<template>
  <button
    class="star-button"
    :class="{ 'star-button--active': active }"
    :title="active ? '取消收藏' : '收藏'"
    @click.stop="$emit('toggle')"
  >
    <svg viewBox="0 0 20 20" class="star-button__icon">
      <path
        v-if="active"
        d="M10 1l2.39 4.84 5.34.78-3.87 3.77.91 5.33L10 13.27l-4.77 2.45.91-5.33L2.27 6.62l5.34-.78L10 1z"
        fill="currentColor"
      />
      <path
        v-else
        d="M10 1l2.39 4.84 5.34.78-3.87 3.77.91 5.33L10 13.27l-4.77 2.45.91-5.33L2.27 6.62l5.34-.78L10 1z"
        fill="none"
        stroke="currentColor"
        stroke-width="1.2"
      />
    </svg>
  </button>
</template>

<script setup lang="ts">
defineProps<{
  active: boolean
}>()

defineEmits<{
  toggle: []
}>()
</script>

<style scoped>
.star-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border: none;
  background: transparent;
  cursor: pointer;
  border-radius: 4px;
  color: var(--color-text-secondary, rgba(26,26,24,0.60));
  opacity: 0;
  transition: opacity 0.15s, color 0.15s;
}

.star-button:hover {
  background: rgba(26,26,24,0.06);
}

.star-button--active {
  color: var(--color-material-clay, #9A7E66);
  opacity: 1;
}

.star-button__icon {
  width: 16px;
  height: 16px;
}
</style>
