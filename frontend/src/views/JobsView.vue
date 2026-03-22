<template>
  <div class="jobs-view">
    <div class="view-header">
      <h1>岗位</h1>
      <button class="btn-primary" @click="handleCreateJob">+ 新建岗位</button>
    </div>

    <JobFilters
      :model-status="jobsState.status"
      :model-keyword="jobsState.keyword"
      @update:status="handleStatusChange"
      @update:keyword="handleKeywordChange"
    />

    <div v-if="jobsState.error" class="error-state">
      <p>{{ jobsState.error }}</p>
      <button class="btn-secondary" @click="load">重试</button>
    </div>

    <JobList
      v-else
      :jobs="jobsState.jobs"
      :loading="jobsState.loading"
      @job-click="handleJobClick"
    />
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useJobs } from '@/composables/useJobs'
import { useJobPanel } from '@/composables/useJobPanel'
import JobFilters from '@/components/jobs/JobFilters.vue'
import JobList from '@/components/jobs/JobList.vue'

const { state: jobsState, setStatus, setKeyword, load } = useJobs()
const { open: openJobPanel, openCreate: openCreateJobPanel } = useJobPanel()
const route = useRoute()
const router = useRouter()

function handleStatusChange(status: 'open' | 'closed' | 'all') {
  setStatus(status)
}

function handleKeywordChange(keyword: string) {
  setKeyword(keyword)
}

function handleJobClick(jobId: number) {
  openJobPanel(jobId)
}

function handleCreateJob() {
  openCreateJobPanel()
}

onMounted(async () => {
  await load()
  const panelId = route?.query?.panel
  if (panelId) {
    const id = Number(panelId)
    if (!isNaN(id)) {
      openJobPanel(id)
      void router?.replace({ query: {} })
    }
  }
})
</script>

<style scoped>
.jobs-view {
  padding: 24px;
}

.view-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.view-header h1 {
  font-size: 24px;
  font-weight: 600;
  margin: 0;
}

.btn-primary {
  padding: 10px 20px;
  background: var(--color-primary);
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  transition: opacity 0.2s;
}

.btn-primary:hover {
  opacity: 0.9;
}

.btn-secondary {
  padding: 8px 16px;
  background: transparent;
  color: var(--color-primary);
  border: 1px solid var(--color-primary);
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
}

.error-state {
  padding: 48px 24px;
  text-align: center;
  color: var(--color-text-secondary);
  border: 1px solid var(--color-line);
  border-radius: 12px;
  background: var(--color-bg);
}

.error-state p {
  margin: 0 0 16px;
}
</style>
