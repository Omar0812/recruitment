<template>
  <div class="history-tab">
    <template v-if="applications.length === 0">
      <div class="history-tab__empty">暂无流程记录</div>
    </template>
    <template v-else>
      <ApplicationRecord
        v-for="app in sortedApplications"
        :key="app.id"
        :application="app"
        :job-title="jobTitles[app.job_id] || `岗位 #${app.job_id}`"
        :default-expanded="app.state === 'IN_PROGRESS'"
        :supplier="supplier"
        @go-pipeline="handleGoPipeline"
      />
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { fetchJob } from '@/api/pipeline'
import { closeCandidatePanel } from '@/composables/useCandidatePanel'
import type { Application, Supplier } from '@/api/types'
import ApplicationRecord from './ApplicationRecord.vue'

const props = defineProps<{
  applications: Application[]
  supplier?: Supplier | null
}>()

const router = useRouter()
const jobTitles = ref<Record<number, string>>({})

const sortedApplications = computed(() =>
  [...props.applications].sort((a, b) => {
    // In-progress first, then by date desc
    if (a.state === 'IN_PROGRESS' && b.state !== 'IN_PROGRESS') return -1
    if (b.state === 'IN_PROGRESS' && a.state !== 'IN_PROGRESS') return 1
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  }),
)

onMounted(async () => {
  const uniqueJobIds = [...new Set(props.applications.map(a => a.job_id))]
  const jobs = await Promise.all(uniqueJobIds.map(id => fetchJob(id).catch(() => null)))
  for (let i = 0; i < uniqueJobIds.length; i++) {
    const job = jobs[i]
    if (job) jobTitles.value[uniqueJobIds[i]] = job.title
  }
})

function handleGoPipeline(applicationId: number) {
  closeCandidatePanel()
  router.push({ name: 'pipeline', query: { expand: String(applicationId) } })
}
</script>

<style scoped>
.history-tab__empty {
  color: var(--color-text-secondary);
  font-size: 13px;
  text-align: center;
  padding: var(--space-6) 0;
}
</style>
