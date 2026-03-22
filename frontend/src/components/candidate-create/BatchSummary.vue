<template>
  <div class="batch-summary">
    <h2 class="summary-title">全部处理完成</h2>

    <p class="summary-stats">
      共 {{ results.length }} 人：{{ linkedCount }} 人已加入流程，{{ poolCount }} 人存入人才库
    </p>

    <ul class="summary-list">
      <li v-for="r in results" :key="r.candidate.id" class="summary-item">
        <span class="item-name">{{ r.candidate.name }}</span>
        <span class="item-dest">→ {{ r.linkedJob ? r.linkedJob.title : '人才库' }}</span>
      </li>
    </ul>

    <div class="summary-actions">
      <button class="btn-primary" @click="$emit('done')">完成</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { CandidateDetail, Job } from '@/api/types'

interface ResultItem {
  candidate: CandidateDetail
  linkedJob: Job | null
}

const props = defineProps<{
  results: ResultItem[]
}>()

defineEmits<{ done: [] }>()

const linkedCount = computed(() => props.results.filter((r) => r.linkedJob).length)
const poolCount = computed(() => props.results.filter((r) => !r.linkedJob).length)
</script>

<style scoped>
.batch-summary {
  max-width: 480px;
  margin: 0 auto;
}

.summary-title {
  font-size: 16px;
  font-weight: 500;
  margin-bottom: var(--space-3);
}

.summary-stats {
  font-size: 14px;
  color: var(--color-text-secondary);
  margin-bottom: var(--space-4);
}

.summary-list {
  margin-bottom: var(--space-5);
}

.summary-item {
  display: flex;
  justify-content: space-between;
  padding: var(--space-2) 0;
  border-bottom: 1px solid var(--color-line);
  font-size: 14px;
}

.item-name { font-weight: 500; }
.item-dest { color: var(--color-text-secondary); }

.summary-actions {
  display: flex;
  justify-content: flex-end;
}

.btn-primary {
  padding: var(--space-2) var(--space-5);
  background: var(--color-text-primary);
  color: var(--color-bg);
  border-radius: 4px;
  font-size: 14px;
  transition: opacity 150ms;
}
.btn-primary:hover { opacity: 0.85; }
</style>
