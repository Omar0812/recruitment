<template>
  <Teleport to="body">
    <Transition name="panel-fade">
      <div v-if="state.isOpen" class="panel-overlay" @click.self="close">
        <Transition name="panel-slide">
          <div v-if="state.isOpen" class="panel-drawer">
            <!-- Loading -->
            <div v-if="state.loading && !state.candidate" class="panel-loading">
              加载中...
            </div>

            <div v-else-if="state.error" class="panel-error">
              <p>{{ state.error }}</p>
              <button class="panel-retry" @click="handleRetry">重试</button>
            </div>

            <!-- Content -->
            <template v-else-if="state.candidate">
              <PanelHeader
                :candidate="state.candidate"
                :applications="state.applications"
                :return-to-job-id="state.returnToJobId"
                @close="close"
                @back="handleBackToJob"
              />

              <!-- Tabs -->
              <div class="panel-tabs">
                <button
                  v-for="tab in tabs"
                  :key="tab.id"
                  class="panel-tabs__item"
                  :class="{ 'panel-tabs__item--active': activeTab === tab.id }"
                  @click="activeTab = tab.id"
                >
                  {{ tab.label }}
                </button>
              </div>

              <!-- Tab Content -->
              <div class="panel-content">
                <BasicInfoTab
                  v-if="activeTab === 'basic'"
                  :candidate="state.candidate"
                  :editing="editing"
                  @save="handleSaveEdit"
                  @cancel="handleCancelEdit"
                />
                <ResumeTab
                  v-else-if="activeTab === 'resume'"
                  :candidate="state.candidate"
                  @refresh="refresh()"
                />
                <ApplicationHistoryTab
                  v-else-if="activeTab === 'history'"
                  :applications="state.applications"
                  :supplier="candidateSupplier"
                />
              </div>

              <!-- Blacklist Confirm -->
              <BlacklistConfirm
                v-if="showBlacklistConfirm"
                :candidate-id="state.candidate.id"
                @cancel="showBlacklistConfirm = false"
                @confirmed="onBlacklistConfirmed"
              />

              <!-- Duplicate Result -->
              <DuplicateResult
                v-if="showDuplicateResult"
                :results="duplicateResults"
                @ignore="handleIgnoreDuplicate"
                @close="showDuplicateResult = false"
              />

              <!-- Join Pipeline Inline -->
              <JoinPipelineInline
                v-if="showJoinPipeline"
                :submitting="joiningPipeline"
                :error="joinPipelineError"
                @confirm="handleJoinPipeline"
                @cancel="showJoinPipeline = false"
              />

              <!-- Action Bar -->
              <div class="panel-actions">
                <button class="panel-actions__btn" @click="handleCheckDuplicate">查重</button>
                <button class="panel-actions__btn" @click="startEditing">编辑信息</button>

                <template v-if="candidateStatus === 'hired'">
                  <button class="panel-actions__btn" :disabled="recordingLeft" @click="handleRecordLeft">
                    {{ recordingLeft ? '处理中...' : '标记离职' }}
                  </button>
                </template>
                <template v-else-if="candidateStatus === 'blacklisted'">
                  <button class="panel-actions__btn" :disabled="unblacklisting" @click="handleUnblacklist">
                    {{ unblacklisting ? '处理中...' : '解除黑名单' }}
                  </button>
                </template>
                <template v-else-if="candidateStatus === 'idle' || candidateStatus === 'left'">
                  <button class="panel-actions__btn" @click="showJoinPipeline = true">推荐到岗位</button>
                  <button class="panel-actions__btn panel-actions__btn--danger" @click="showBlacklistConfirm = true">加入黑名单</button>
                </template>
                <template v-else-if="candidateStatus === 'in_progress'">
                  <button class="panel-actions__btn panel-actions__btn--danger" @click="showBlacklistConfirm = true">加入黑名单</button>
                </template>
              </div>
            </template>
          </div>
        </Transition>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useCandidatePanel } from '@/composables/useCandidatePanel'
import { useJobPanel } from '@/composables/useJobPanel'
import { executeAction, fetchEvents } from '@/api/pipeline'
import { checkDuplicate } from '@/api/candidates'
import { fetchSupplier } from '@/api/channels'
import { formatDate } from '@/utils/date'
import type { Application, CandidateDetail, CandidateDuplicatePanelItem, Supplier } from '@/api/types'
import PanelHeader from './PanelHeader.vue'
import BasicInfoTab from './BasicInfoTab.vue'
import ResumeTab from './ResumeTab.vue'
import ApplicationHistoryTab from './ApplicationHistoryTab.vue'
import BlacklistConfirm from './BlacklistConfirm.vue'
import DuplicateResult from './DuplicateResult.vue'
import JoinPipelineInline from './JoinPipelineInline.vue'

const { state, close, refresh } = useCandidatePanel()
const { open: openJobPanel } = useJobPanel()
const router = useRouter()

const activeTab = ref<'basic' | 'resume' | 'history'>('basic')
const showBlacklistConfirm = ref(false)
const showDuplicateResult = ref(false)
const duplicateResults = ref<CandidateDuplicatePanelItem[]>([])
const recordingLeft = ref(false)
const showJoinPipeline = ref(false)
const joiningPipeline = ref(false)
const joinPipelineError = ref<string | null>(null)
const unblacklisting = ref(false)
const editing = ref(false)

// 按需加载候选人关联的猎头
const candidateSupplier = ref<Supplier | null>(null)

watch(
  () => state.candidate?.supplier_id,
  async (supplierId) => {
    if (supplierId) {
      try {
        candidateSupplier.value = await fetchSupplier(supplierId)
      } catch {
        candidateSupplier.value = null
      }
    } else {
      candidateSupplier.value = null
    }
  },
  { immediate: true },
)

const tabs = [
  { id: 'basic' as const, label: '基本信息' },
  { id: 'resume' as const, label: '简历' },
  { id: 'history' as const, label: '流程记录' },
]

const candidateStatus = computed(() => {
  if (!state.candidate) return 'idle'
  if (state.candidate.blacklisted) return 'blacklisted'

  const hasInProgress = state.applications.some(a => a.state === 'IN_PROGRESS')
  if (hasInProgress) return 'in_progress'

  const hasHired = state.applications.some(a => a.state === 'HIRED')
  if (hasHired) return 'hired'

  const hasLeft = state.applications.some(a => a.state === 'LEFT')
  if (hasLeft) return 'left'

  return 'idle'
})

const latestHiredApplication = computed<Application | null>(() => {
  const hiredApplications = state.applications
    .filter((application) => application.state === 'HIRED')
    .sort((left, right) => {
      return new Date(right.updated_at).getTime() - new Date(left.updated_at).getTime()
    })

  return hiredApplications[0] ?? null
})

function formatMatchReasons(reasons: string[]) {
  const labels: Record<string, string> = {
    name: '姓名相同',
    phone: '手机相同',
    email: '邮箱相同',
  }

  const formatted = reasons
    .map((reason) => labels[reason] ?? reason)
    .filter(Boolean)

  return formatted.length > 0 ? formatted : ['疑似重复']
}

async function handleCheckDuplicate() {
  if (!state.candidate) return
  const currentCandidate = state.candidate
  const result = await checkDuplicate({
    name: currentCandidate.name,
    phone: currentCandidate.phone ?? undefined,
    email: currentCandidate.email ?? undefined,
  })
  duplicateResults.value = result.matches
    .filter((match) => match.candidate_id !== currentCandidate.id)
    .map((match) => ({
      id: match.candidate_id,
      display_id: match.display_id,
      name: match.name,
      phone: match.phone,
      email: match.email,
      last_company: match.last_company,
      last_title: match.last_title,
      match_reasons: formatMatchReasons(match.match_reasons),
      last_application: match.last_application ? {
        job_title: match.last_application.job_title,
        outcome: match.last_application.outcome,
      } : null,
    }))
  showDuplicateResult.value = true
}

function handleIgnoreDuplicate(candidateId: number) {
  duplicateResults.value = duplicateResults.value.filter((candidate) => candidate.id !== candidateId)
}

function handleBackToJob() {
  if (state.returnToJobId) {
    close()
    openJobPanel(state.returnToJobId, { activeTab: 'candidates' })
  }
}

async function handleRecordLeft() {
  if (!latestHiredApplication.value || recordingLeft.value) return

  // 担保期检查
  if (candidateSupplier.value?.guarantee_months) {
    const supplier = candidateSupplier.value
    try {
      const events = await fetchEvents(latestHiredApplication.value.id)
      const hireEvent = events.find(e => e.type === 'hire_confirmed')
      if (hireEvent) {
        const hireDate = new Date(hireEvent.occurred_at)
        const guaranteeEnd = new Date(hireDate)
        guaranteeEnd.setMonth(guaranteeEnd.getMonth() + supplier.guarantee_months!)
        if (new Date() < guaranteeEnd) {
          const endStr = formatDate(guaranteeEnd.toISOString())
          const confirmed = window.confirm(
            `⚠️ 该候选人由猎头「${supplier.name}」推荐，担保期至 ${endStr}。\n\n担保期内离职可能涉及猎头费退还，确定标记离职吗？`
          )
          if (!confirmed) return
        }
      }
    } catch {
      // 获取事件失败时不阻塞离职操作
    }
  }

  recordingLeft.value = true
  try {
    await executeAction({
      command_id: crypto.randomUUID(),
      action_code: 'record_left',
      target: { type: 'application', id: latestHiredApplication.value.id },
      payload: {},
      actor: { type: 'human' },
    })
    await refresh({ markMutation: true })
  } finally {
    recordingLeft.value = false
  }
}

async function onBlacklistConfirmed() {
  showBlacklistConfirm.value = false
  await refresh({ markMutation: true })
}

async function handleJoinPipeline(jobId: number) {
  if (!state.candidate || joiningPipeline.value) return

  joiningPipeline.value = true
  joinPipelineError.value = null

  try {
    const result = await executeAction({
      command_id: crypto.randomUUID(),
      action_code: 'create_application',
      target: { type: 'candidate', id: state.candidate.id },
      payload: { job_id: jobId },
      actor: { type: 'human' },
    })
    showJoinPipeline.value = false
    close()
    router.push({ path: '/pipeline', query: { expand: String(result.target_id) } })
  } catch (e: any) {
    joinPipelineError.value = e.message || '推荐失败'
  } finally {
    joiningPipeline.value = false
  }
}

async function handleUnblacklist() {
  if (!state.candidate || unblacklisting.value) return

  unblacklisting.value = true
  try {
    await executeAction({
      command_id: crypto.randomUUID(),
      action_code: 'unblacklist_candidate',
      target: { type: 'candidate', id: state.candidate.id },
      payload: {},
      actor: { type: 'human' },
    })
    await refresh({ markMutation: true })
  } finally {
    unblacklisting.value = false
  }
}

function startEditing() {
  editing.value = true
  activeTab.value = 'basic'
}

async function handleSaveEdit(formData: Record<string, unknown>) {
  if (!state.candidate) return

  await executeAction({
    command_id: crypto.randomUUID(),
    action_code: 'update_candidate',
    target: { type: 'candidate', id: state.candidate.id },
    payload: formData,
    actor: { type: 'human' },
  })
  editing.value = false
  await refresh({ markMutation: true })
}

function handleCancelEdit() {
  editing.value = false
}

function handleRetry() {
  void refresh()
}
</script>

<style scoped>
.panel-overlay {
  position: fixed;
  inset: 0;
  background: rgba(26, 26, 24, 0.3);
  z-index: 100;
  display: flex;
  justify-content: flex-end;
}

.panel-drawer {
  width: 480px;
  max-width: 90vw;
  height: 100%;
  background: var(--color-bg);
  display: flex;
  flex-direction: column;
  border-left: 1px solid var(--color-line);
}

.panel-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  flex: 1;
  color: var(--color-text-secondary);
  font-size: 14px;
}

.panel-error {
  display: flex;
  flex: 1;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--space-3);
  padding: var(--space-6);
  color: var(--color-text-secondary);
  text-align: center;
}

.panel-error p {
  margin: 0;
}

.panel-retry {
  border: 1px solid var(--color-line);
  background: transparent;
  color: var(--color-text-primary);
  border-radius: 999px;
  padding: 6px 14px;
  font-size: 13px;
  cursor: pointer;
}

.panel-tabs {
  display: flex;
  border-bottom: 1px solid var(--color-line);
  padding: 0 var(--space-5);
}

.panel-tabs__item {
  background: none;
  border: none;
  padding: var(--space-2) var(--space-3);
  font-size: 13px;
  color: var(--color-text-secondary);
  cursor: pointer;
  border-bottom: 2px solid transparent;
  margin-bottom: -1px;
}

.panel-tabs__item--active {
  color: var(--color-text-primary);
  font-weight: 500;
  border-bottom-color: var(--color-text-primary);
}

.panel-content {
  flex: 1;
  overflow-y: auto;
  padding: var(--space-4) var(--space-5);
}

.panel-actions {
  display: flex;
  gap: var(--space-2);
  padding: var(--space-3) var(--space-5);
  border-top: 1px solid var(--color-line);
  flex-shrink: 0;
}

.panel-actions__btn {
  font-size: 13px;
  padding: 6px 12px;
  border: 1px solid var(--color-line);
  background: none;
  border-radius: 3px;
  cursor: pointer;
  color: var(--color-text-primary);
}

.panel-actions__btn:hover:not(:disabled) {
  background: rgba(26, 26, 24, 0.04);
}

.panel-actions__btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.panel-actions__btn--danger {
  color: var(--color-urgent);
  border-color: var(--color-urgent);
}

/* Transitions */
.panel-fade-enter-active,
.panel-fade-leave-active {
  transition: opacity 150ms;
}

.panel-fade-enter-from,
.panel-fade-leave-to {
  opacity: 0;
}

.panel-slide-enter-active,
.panel-slide-leave-active {
  transition: transform 150ms;
}

.panel-slide-enter-from,
.panel-slide-leave-to {
  transform: translateX(100%);
}
</style>
