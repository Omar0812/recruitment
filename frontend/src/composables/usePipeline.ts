import { reactive, readonly, ref, computed } from 'vue'
import {
  fetchActiveApplications,
  fetchEvents,
  fetchEventSummaries,
  fetchAvailableActions,
  executeAction,
} from '@/api/pipeline'
import { showErrorToast } from '@/utils/toast'
import type {
  ActionCatalogItem,
  ActionExecuteResponse,
  ActionRequest,
  CandidateDetail,
  EventRecord,
  EventSummary,
  Job,
  PipelineItem,
} from '@/api/types'

interface PipelineState {
  items: PipelineItem[]
  loading: boolean
  error: string | null
  expandedId: number | null
  expandedEvents: EventRecord[]
  expandedActions: ActionCatalogItem[]
  expandedLoading: boolean
}

const state = reactive<PipelineState>({
  items: [],
  loading: false,
  error: null,
  expandedId: null,
  expandedEvents: [],
  expandedActions: [],
  expandedLoading: false,
})

// 事件摘要（行 header 展示用）
const eventSummaryMap = reactive(new Map<number, EventSummary>())

const INTERVIEW_ROUND_LABELS = ['一面', '二面', '三面', '四面', '五面']

function computeEventSummary(stage: string | null, events: EventRecord[]): EventSummary {
  const scheduled = events.filter(e => e.type === 'interview_scheduled')
  const feedbacks = events.filter(e => e.type === 'interview_feedback')

  const roundCount = scheduled.length
  const feedbackCount = feedbacks.length
  const now = Date.now()

  // 判断是否有未完成面评的面试
  const pendingInterview = roundCount > feedbackCount ? scheduled[scheduled.length - 1] : null
  const pendingScheduledAt = pendingInterview?.payload?.scheduled_at as string | undefined
  const hasPendingFeedback = !!(pendingScheduledAt && new Date(pendingScheduledAt).getTime() < now)

  // 阶段细节
  let stageDetail = stage ?? ''
  if (stage === '面试') {
    const roundLabel = INTERVIEW_ROUND_LABELS[Math.max(roundCount - 1, 0)] ?? `${roundCount}面`
    if (roundCount > feedbackCount) {
      // 有未完成面评的面试
      if (hasPendingFeedback) {
        stageDetail = `${roundLabel}待面评`
      } else {
        stageDetail = `${roundLabel}安排中`
      }
    } else if (feedbackCount > 0) {
      const lastFeedback = feedbacks[feedbacks.length - 1]
      const conclusion = lastFeedback?.payload?.conclusion
      stageDetail = conclusion === 'pass' ? `${roundLabel}通过` : `${roundLabel}淘汰`
    } else {
      stageDetail = '面试'
    }
  }

  return {
    stageDetail,
    nextInterviewAt: (roundCount > feedbackCount && pendingScheduledAt) ? pendingScheduledAt : null,
    hasPendingFeedback,
  }
}

// ── 分组视图 ──

export type GroupMode = 'all' | 'byJob' | 'byStage'

export interface PipelineGroup {
  key: string
  label: string
  items: PipelineItem[]
}

const groupMode = ref<GroupMode>('all')
const collapsedKeys = reactive(new Set<string>())

// 阶段排序权重（与后端 STAGE_ORDER 一致）
const STAGE_ORDER: string[] = ['简历筛选', '面试', 'Offer沟通', '背调', '待入职']

function buildGroups(items: PipelineItem[], mode: GroupMode): PipelineGroup[] {
  if (mode === 'all') {
    return [{ key: '__all__', label: '', items }]
  }

  const map = new Map<string, PipelineItem[]>()
  const keyLabel = new Map<string, string>()

  for (const item of items) {
    let key: string
    let label: string
    if (mode === 'byJob') {
      key = String(item.job.id)
      label = item.job.title
    } else {
      key = item.application.stage || '未知'
      label = key
    }
    if (!map.has(key)) {
      map.set(key, [])
      keyLabel.set(key, label)
    }
    map.get(key)!.push(item)
  }

  const groups: PipelineGroup[] = []
  for (const [key, groupItems] of map) {
    groups.push({ key, label: keyLabel.get(key)!, items: groupItems })
  }

  // 按阶段模式按 STAGE_ORDER 排序
  if (mode === 'byStage') {
    groups.sort((a, b) => {
      const ai = STAGE_ORDER.indexOf(a.label)
      const bi = STAGE_ORDER.indexOf(b.label)
      return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi)
    })
  }

  return groups
}

const groupedItems = computed(() => buildGroups(state.items, groupMode.value))

function setGroupMode(mode: GroupMode) {
  groupMode.value = mode
  collapsedKeys.clear()
  state.expandedId = null
}

function toggleCollapse(key: string) {
  if (collapsedKeys.has(key)) {
    collapsedKeys.delete(key)
  } else {
    collapsedKeys.add(key)
  }
}

function isCollapsed(key: string): boolean {
  return collapsedKeys.has(key)
}

function getPipelineErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message
  }
  return '加载失败，请稍后重试'
}

async function loadPipeline() {
  state.loading = true
  state.error = null
  try {
    const res = await fetchActiveApplications()
    const apps = res.items

    // 直接从 app 对象读取 candidate_name 和 job_title 构建 PipelineItem
    state.items = apps.map((app) => ({
      application: app,
      candidate: { id: app.candidate_id, name: app.candidate_name ?? '' } as CandidateDetail,
      job: { id: app.job_id, title: app.job_title ?? '' } as Job,
    }))

    // 批量获取事件摘要（行 header 用）——单次请求替代 N+1
    try {
      const ids = apps.map(a => a.id)
      const summaries = await fetchEventSummaries(ids)
      for (const [id, summary] of Object.entries(summaries)) {
        eventSummaryMap.set(Number(id), summary)
      }
    } catch {
      // 摘要获取失败不阻塞列表显示
    }
  } catch (error) {
    state.items = []
    state.error = getPipelineErrorMessage(error)
  } finally {
    state.loading = false
  }
}

async function expand(applicationId: number) {
  if (state.expandedId === applicationId) {
    state.expandedId = null
    return
  }

  state.expandedId = applicationId
  state.expandedLoading = true
  state.expandedEvents = []
  state.expandedActions = []

  try {
    const [events, actions] = await Promise.all([
      fetchEvents(applicationId),
      fetchAvailableActions(applicationId),
    ])
    // 后端返回 occurred_at DESC，前端需要正序展示
    state.expandedEvents = events.reverse()
    state.expandedActions = actions
  } finally {
    state.expandedLoading = false
  }
}

async function refreshExpanded() {
  if (state.expandedId === null) return
  const id = state.expandedId
  const [events, actions] = await Promise.all([
    fetchEvents(id),
    fetchAvailableActions(id),
  ])
  state.expandedEvents = events.reverse()
  state.expandedActions = actions
}

async function doAction(req: ActionRequest): Promise<ActionExecuteResponse> {
  try {
    const res = await executeAction(req)
    // 刷新列表和展开行
    await Promise.all([loadPipeline(), refreshExpanded()])
    return res
  } catch (error) {
    showErrorToast(getPipelineErrorMessage(error))
    throw error
  }
}

function removeItem(applicationId: number) {
  state.items = state.items.filter((i) => i.application.id !== applicationId)
  if (state.expandedId === applicationId) {
    state.expandedId = null
  }
}

function restoreItem(item: PipelineItem) {
  if (!state.items.find((i) => i.application.id === item.application.id)) {
    state.items.push(item)
  }
}

export function usePipeline() {
  return {
    state: readonly(state),
    groupMode: readonly(groupMode),
    groupedItems,
    collapsedKeys: readonly(collapsedKeys),
    loadPipeline,
    expand,
    refreshExpanded,
    doAction,
    removeItem,
    restoreItem,
    setGroupMode,
    toggleCollapse,
    isCollapsed,
    getEventSummary: (applicationId: number) => eventSummaryMap.get(applicationId) ?? null,
  }
}
