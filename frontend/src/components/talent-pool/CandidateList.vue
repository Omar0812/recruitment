<template>
  <div class="candidate-list">
    <!-- Loading skeleton -->
    <div v-if="loading" class="candidate-list__loading">
      <div v-for="i in 5" :key="i" class="candidate-list__skeleton" />
    </div>

    <!-- Empty state -->
    <div v-else-if="!items.length" class="candidate-list__empty">
      <p class="candidate-list__empty-text">暂无候选人</p>
      <p class="candidate-list__empty-hint">尝试调整筛选条件或添加新候选人</p>
    </div>

    <!-- Card list -->
    <template v-else>
      <CandidateCard
        v-for="c in items"
        :key="c.id"
        :candidate="c"
        @select="$emit('select', $event)"
        @toggle-star="$emit('toggle-star', $event)"
      />
    </template>

    <!-- Pagination -->
    <div v-if="totalPages > 1" class="candidate-list__pagination">
      <button
        class="pagination__btn"
        :disabled="page <= 1"
        @click="$emit('page', page - 1)"
      >上一页</button>
      <span class="pagination__info">{{ page }} / {{ totalPages }}</span>
      <button
        class="pagination__btn"
        :disabled="page >= totalPages"
        @click="$emit('page', page + 1)"
      >下一页</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { CandidateWithApplication } from '@/api/types'
import CandidateCard from './CandidateCard.vue'

const props = defineProps<{
  items: CandidateWithApplication[]
  total: number
  page: number
  pageSize: number
  loading: boolean
}>()

defineEmits<{
  select: [id: number]
  'toggle-star': [id: number]
  page: [page: number]
}>()

const totalPages = computed(() => Math.max(1, Math.ceil(props.total / props.pageSize)))
</script>

<style scoped>
.candidate-list__loading {
  padding: 16px;
}

.candidate-list__skeleton {
  height: 64px;
  margin-bottom: 8px;
  border-radius: 6px;
  background: linear-gradient(90deg, rgba(26,26,24,0.04) 25%, rgba(26,26,24,0.08) 50%, rgba(26,26,24,0.04) 75%);
  background-size: 200% 100%;
  animation: skeleton-pulse 1.5s infinite ease-in-out;
}

@keyframes skeleton-pulse {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

.candidate-list__empty {
  padding: 48px 16px;
  text-align: center;
}

.candidate-list__empty-text {
  font-size: 15px;
  color: var(--color-text-primary, #1A1A18);
  margin: 0 0 4px;
}

.candidate-list__empty-hint {
  font-size: 13px;
  color: var(--color-text-secondary, rgba(26,26,24,0.60));
  margin: 0;
}

.candidate-list__pagination {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
  padding: 12px 16px;
  border-top: 1px solid var(--color-line, rgba(26,26,24,0.12));
}

.pagination__btn {
  padding: 4px 12px;
  font-size: 13px;
  border: 1px solid var(--color-line, rgba(26,26,24,0.12));
  border-radius: 4px;
  background: #fff;
  cursor: pointer;
  color: var(--color-text-primary, #1A1A18);
}

.pagination__btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.pagination__info {
  font-size: 13px;
  color: var(--color-text-secondary, rgba(26,26,24,0.60));
}
</style>
