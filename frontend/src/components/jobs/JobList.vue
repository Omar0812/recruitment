<template>
  <div class="job-list">
    <div v-if="loading" class="loading">加载中...</div>
    <div v-else-if="jobs.length === 0" class="empty">暂无岗位</div>
    <div v-else class="job-grid">
      <JobCard
        v-for="job in jobs"
        :key="job.id"
        :job="job"
        @click="$emit('job-click', job.id)"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import JobCard from './JobCard.vue'
import type { Job } from '@/api/types'

defineProps<{
  jobs: Job[]
  loading: boolean
}>()

defineEmits<{
  'job-click': [jobId: number]
}>()
</script>

<style scoped>
.job-list {
  min-height: 200px;
}

.loading,
.empty {
  text-align: center;
  padding: 48px;
  color: var(--color-text-secondary);
}

.job-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(400px, 1fr));
  gap: 16px;
}
</style>
