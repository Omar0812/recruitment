<template>
  <div class="job-filters">
    <div class="filter-tabs">
      <button
        v-for="option in statusOptions"
        :key="option.value"
        :class="['filter-tab', { active: modelStatus === option.value }]"
        @click="$emit('update:status', option.value)"
      >
        {{ option.label }}
      </button>
    </div>
    <div class="search-box">
      <input
        type="text"
        :value="modelKeyword"
        @input="$emit('update:keyword', ($event.target as HTMLInputElement).value)"
        placeholder="搜索岗位名称"
        class="search-input"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  modelStatus: 'open' | 'closed' | 'all'
  modelKeyword: string
}>()

defineEmits<{
  'update:status': [value: 'open' | 'closed' | 'all']
  'update:keyword': [value: string]
}>()

const statusOptions = [
  { value: 'open' as const, label: '招聘中' },
  { value: 'closed' as const, label: '已关闭' },
  { value: 'all' as const, label: '全部' },
]
</script>

<style scoped>
.job-filters {
  display: flex;
  gap: 16px;
  align-items: center;
  margin-bottom: 24px;
}

.filter-tabs {
  display: flex;
  gap: 8px;
}

.filter-tab {
  padding: 8px 16px;
  border: 1px solid var(--color-border);
  background: var(--color-bg-secondary);
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
}

.filter-tab:hover {
  background: var(--color-bg-hover);
}

.filter-tab.active {
  background: var(--color-primary);
  color: white;
  border-color: var(--color-primary);
}

.search-box {
  flex: 1;
  max-width: 400px;
}

.search-input {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid var(--color-border);
  border-radius: 6px;
  background: var(--color-bg-secondary);
}

.search-input:focus {
  outline: none;
  border-color: var(--color-primary);
}
</style>
