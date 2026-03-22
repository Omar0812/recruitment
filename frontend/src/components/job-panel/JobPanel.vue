<template>
  <Teleport to="body">
    <Transition name="panel-fade">
      <div v-if="state.isOpen" class="panel-overlay" @click.self="close">
        <Transition name="panel-slide">
          <div v-if="state.isOpen" class="panel-drawer">
            <div v-if="state.loading && !state.job" class="panel-loading">
              加载中...
            </div>

            <div v-else-if="state.error" class="panel-error">
              <p>{{ state.error }}</p>
              <button class="panel-retry" @click="handleRetry">重试</button>
            </div>

            <JobCreateForm
              v-else-if="state.mode === 'create'"
              @cancel="close"
              @created="handleJobCreated"
            />

            <JobCreateForm
              v-else-if="state.mode === 'edit' && state.job"
              :initial-data="state.job"
              @cancel="handleEditCancel"
              @saved="handleJobSaved"
            />

            <template v-else-if="state.job">
              <JobPanelHeader :job="state.job" @close="close" />

              <div class="panel-tabs">
                <button
                  v-for="tab in tabs"
                  :key="tab.id"
                  class="panel-tabs__item"
                  :class="{ 'panel-tabs__item--active': state.activeTab === tab.id }"
                  @click="setActiveTab(tab.id)"
                >
                  {{ tab.label }}
                </button>
              </div>

              <div
                v-if="panelFeedback"
                class="panel-feedback"
                :class="`panel-feedback--${panelFeedback.type}`"
              >
                {{ panelFeedback.text }}
              </div>

              <div class="panel-content">
                <BasicInfoTab v-if="state.activeTab === 'basic'" :job="state.job" />
                <JDTab v-else-if="state.activeTab === 'jd'" :job="state.job" />
                <CandidatesTab
                  v-else-if="state.activeTab === 'candidates'"
                  :applications="state.applications"
                />
              </div>

              <JobPanelActions
                v-if="state.job.status === 'open'"
                :job="state.job"
                @edit="handleEdit"
                @close-job="showCloseDialog = true"
              />

              <CloseJobDialog
                :show="showCloseDialog"
                :job-id="state.job.id"
                :job-version="state.job.version"
                :applications="state.applications"
                @cancel="showCloseDialog = false"
                @confirmed="handleCloseConfirmed"
              />
            </template>
          </div>
        </Transition>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { useJobs } from '@/composables/useJobs'
import { useJobPanel } from '@/composables/useJobPanel'
import JobPanelHeader from './JobPanelHeader.vue'
import BasicInfoTab from './BasicInfoTab.vue'
import JDTab from './JDTab.vue'
import CandidatesTab from './CandidatesTab.vue'
import JobPanelActions from './JobPanelActions.vue'
import CloseJobDialog from './CloseJobDialog.vue'
import JobCreateForm from './JobCreateForm.vue'

const { state, close, refresh, open, openEdit, setActiveTab } = useJobPanel()
const { refresh: refreshJobs } = useJobs()

const showCloseDialog = ref(false)
const panelFeedback = ref<{ text: string; type: 'success' | 'info' } | null>(null)

const tabs = [
  { id: 'basic' as const, label: '基本信息' },
  { id: 'jd' as const, label: 'JD' },
  { id: 'candidates' as const, label: '候选人' },
]

watch(
  () => [state.isOpen, state.jobId, state.mode] as const,
  () => {
    showCloseDialog.value = false
    panelFeedback.value = null
  },
)

function handleEdit() {
  openEdit()
}

function handleEditCancel() {
  if (state.jobId) {
    void open(state.jobId)
  }
}

async function handleJobSaved(_jobId: number) {
  await Promise.all([
    refresh(),
    refreshJobs(),
  ])
}

async function handleJobCreated(jobId: number) {
  await refreshJobs()
  await open(jobId)
}

async function handleCloseConfirmed() {
  showCloseDialog.value = false
  await Promise.all([
    refresh(),
    refreshJobs(),
  ])
  panelFeedback.value = {
    type: 'success',
    text: '岗位已关闭',
  }
}

function handleRetry() {
  void refresh()
}
</script>

<style scoped>
.panel-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 1000;
  display: flex;
  justify-content: flex-end;
}

.panel-drawer {
  width: 600px;
  background: var(--color-bg);
  height: 100%;
  display: flex;
  flex-direction: column;
  box-shadow: -2px 0 8px rgba(0, 0, 0, 0.1);
}

.panel-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: var(--color-text-secondary);
}

.panel-error {
  display: flex;
  flex: 1;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 32px;
  color: var(--color-text-secondary);
  text-align: center;
}

.panel-error p {
  margin: 0;
}

.panel-retry {
  border: 1px solid var(--color-border);
  background: transparent;
  color: var(--color-text-primary);
  border-radius: 999px;
  padding: 6px 14px;
  font-size: 13px;
  cursor: pointer;
}

.panel-tabs {
  display: flex;
  border-bottom: 1px solid var(--color-border);
  padding: 0 24px;
}

.panel-tabs__item {
  padding: 12px 16px;
  border: none;
  background: none;
  cursor: pointer;
  color: var(--color-text-secondary);
  border-bottom: 2px solid transparent;
  transition: all 0.2s;
}

.panel-tabs__item:hover {
  color: var(--color-text-primary);
}

.panel-tabs__item--active {
  color: var(--color-primary);
  border-bottom-color: var(--color-primary);
}

.panel-content {
  flex: 1;
  overflow-y: auto;
  padding: 24px;
}

.panel-feedback {
  margin: 16px 24px 0;
  padding: 10px 12px;
  border-radius: 8px;
  font-size: 13px;
}

.panel-feedback--success {
  background: var(--success-bg);
  color: var(--success-color);
}

.panel-feedback--info {
  background: var(--info-bg);
  color: var(--info-color);
}

.panel-fade-enter-active,
.panel-fade-leave-active {
  transition: opacity 0.3s;
}

.panel-fade-enter-from,
.panel-fade-leave-to {
  opacity: 0;
}

.panel-slide-enter-active,
.panel-slide-leave-active {
  transition: transform 0.3s;
}

.panel-slide-enter-from,
.panel-slide-leave-to {
  transform: translateX(100%);
}
</style>
