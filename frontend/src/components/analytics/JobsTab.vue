<template>
  <div class="jobs-tab">
    <JobDrilldown
      v-if="selectedJobId !== null"
      :data="jobDrilldown"
      @back="$emit('back')"
      @navigate-channel="$emit('navigate-channel', $event)"
    />
    <JobList
      v-else
      :data="jobsList"
      :filter="filter"
      @drilldown="$emit('drilldown', $event)"
      @navigate-job="$emit('navigate-job', $event)"
      @update:filter="$emit('update:filter', $event)"
    />
  </div>
</template>

<script setup lang="ts">
import type { JobsListData, JobDrilldownData } from '@/api/analytics'
import JobList from './JobList.vue'
import JobDrilldown from './JobDrilldown.vue'

defineProps<{
  jobsList: JobsListData | null
  jobDrilldown: JobDrilldownData | null
  selectedJobId: number | null
  filter: string
}>()

defineEmits<{
  (e: 'drilldown', jobId: number): void
  (e: 'navigate-job', jobId: number): void
  (e: 'navigate-channel', payload: { name: string }): void
  (e: 'back'): void
  (e: 'update:filter', val: string): void
}>()
</script>

<style scoped>
.jobs-tab {
  /* pass-through container */
}
</style>
