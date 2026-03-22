<template>
  <div class="candidates-tab">
    <div v-if="activeApplications.length === 0" class="empty">暂无候选人</div>
    <div v-else class="stage-groups">
      <div v-for="group in stageGroups" :key="group.stage" class="stage-group">
        <div class="stage-header">{{ group.stage }} {{ group.applications.length }}</div>
        <div class="candidate-list">
          <div
            v-for="app in group.applications"
            :key="app.id"
            class="candidate-item"
          >
            <div class="candidate-main">
              <button
                v-if="app.candidate_name"
                type="button"
                class="candidate-name"
                @click="handleCandidateClick(app.candidate_id)"
              >
                {{ app.candidate_name }}
              </button>
              <div v-else class="candidate-name candidate-name--missing">未知候选人</div>
              <div class="candidate-status">{{ formatStatusText(app) }}</div>
            </div>
            <div class="candidate-stage">{{ formatStageText(app) }}</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useCandidatePanel } from '@/composables/useCandidatePanel'
import { useJobPanel } from '@/composables/useJobPanel'
import type { Application } from '@/api/types'

const props = defineProps<{
  applications: readonly Application[]
}>()

const { open: openCandidatePanel } = useCandidatePanel()
const { state: jobPanelState, close: closeJobPanel } = useJobPanel()

const activeApplications = computed(() => {
  return props.applications.filter(app => app.state === 'IN_PROGRESS')
})

const stageGroups = computed(() => {
  const groups: Record<string, Application[]> = {}

  activeApplications.value.forEach(app => {
    const stage = app.stage || '未知阶段'
    if (!groups[stage]) {
      groups[stage] = []
    }
    groups[stage].push(app)
  })

  return Object.entries(groups).map(([stage, applications]) => ({
    stage,
    applications,
  }))
})

function handleCandidateClick(candidateId: number) {
  const jobId = jobPanelState.jobId
  if (jobId) {
    closeJobPanel()
    openCandidatePanel(candidateId, { returnToJobId: jobId })
  }
}

function formatStatusText(application: Application) {
  if (application.state === 'IN_PROGRESS') return '进行中'
  if (application.state === 'HIRED') return '已入职'
  if (application.state === 'LEFT') return '已离职'
  if (application.state === 'WITHDRAWN') return '候选人已退出'
  if (application.state === 'REJECTED') {
    return application.outcome ? `未通过 · ${application.outcome}` : '未通过'
  }
  return '状态未知'
}

function formatStageText(application: Application) {
  return `当前阶段：${application.stage || '未知阶段'}`
}
</script>

<style scoped>
.candidates-tab {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.empty {
  text-align: center;
  padding: 48px;
  color: var(--color-text-secondary);
}

.stage-groups {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.stage-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.stage-header {
  font-size: 14px;
  font-weight: 500;
  color: var(--color-text-secondary);
}

.candidate-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.candidate-item {
  padding: 12px;
  border: 1px solid var(--color-border);
  border-radius: 6px;
  background: var(--color-bg-secondary);
  transition: all 0.2s;
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
}

.candidate-item:hover {
  border-color: var(--color-primary);
}

.candidate-main {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.candidate-name {
  font-size: 14px;
  font-weight: 500;
  padding: 0;
  border: none;
  background: none;
  color: var(--color-text-primary);
  cursor: pointer;
  text-align: left;
}

.candidate-name:hover {
  color: var(--color-primary);
}

.candidate-name--missing {
  cursor: default;
  color: var(--color-text-secondary);
}

.candidate-status {
  font-size: 13px;
  color: var(--color-text-secondary);
}

.candidate-stage {
  font-size: 12px;
  color: var(--color-text-tertiary);
  white-space: nowrap;
}
</style>
