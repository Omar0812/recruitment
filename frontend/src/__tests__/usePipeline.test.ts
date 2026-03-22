import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock API 模块
vi.mock('@/api/pipeline', () => ({
  fetchActiveApplications: vi.fn(),
  fetchCandidate: vi.fn(),
  fetchJob: vi.fn(),
  fetchEvents: vi.fn(),
  fetchAvailableActions: vi.fn(),
  executeAction: vi.fn(),
}))

import {
  fetchActiveApplications,
  fetchCandidate,
  fetchJob,
  fetchEvents,
  fetchAvailableActions,
} from '@/api/pipeline'
import { usePipeline } from '@/composables/usePipeline'

const mockFetchActive = vi.mocked(fetchActiveApplications)
const mockFetchCandidate = vi.mocked(fetchCandidate)
const mockFetchJob = vi.mocked(fetchJob)
const mockFetchEvents = vi.mocked(fetchEvents)
const mockFetchAvailableActions = vi.mocked(fetchAvailableActions)

function makeApp(id: number, candidateId: number, jobId: number) {
  return {
    id,
    candidate_id: candidateId,
    job_id: jobId,
    state: 'IN_PROGRESS',
    outcome: null,
    stage: '简历筛选',
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  }
}

function makeCandidate(id: number, name: string) {
  return {
    id,
    name,
    phone: null,
    email: null,
    source: null,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  }
}

function makeJob(id: number, title: string) {
  return {
    id,
    title,
    department: null,
    location: null,
    status: 'open',
    hired_count: 0,
    stage_distribution: {},
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  }
}

describe('usePipeline', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
  })

  it('loadPipeline 加载数据并做客户端 join', async () => {
    mockFetchActive.mockResolvedValue({
      items: [makeApp(1, 10, 20), makeApp(2, 11, 20)],
      total: 2,
      page: 1,
      page_size: 100,
    })
    mockFetchCandidate.mockImplementation(async (id) =>
      id === 10
        ? makeCandidate(10, '张三')
        : makeCandidate(11, '李四'),
    )
    mockFetchJob.mockResolvedValue(makeJob(20, '前端工程师'))

    const { state, loadPipeline } = usePipeline()
    await loadPipeline()

    expect(state.items).toHaveLength(2)
    expect(state.items[0].candidate.name).toBe('张三')
    expect(state.items[0].job.title).toBe('前端工程师')
    expect(state.items[1].candidate.name).toBe('李四')
    // 同一个 jobId 只请求一次
    expect(mockFetchJob).toHaveBeenCalledTimes(1)
  })

  it('expand 切换展开状态 + 懒加载 events', async () => {
    mockFetchActive.mockResolvedValue({
      items: [makeApp(1, 10, 20)],
      total: 1,
      page: 1,
      page_size: 100,
    })
    mockFetchCandidate.mockResolvedValue(makeCandidate(10, '张三'))
    mockFetchJob.mockResolvedValue(makeJob(20, '前端'))

    const events = [
      {
        id: 100,
        application_id: 1,
        type: 'application_created',
        occurred_at: '2026-01-01T00:00:00Z',
        actor_type: 'human',
        payload: null,
        body: null,
        created_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-01-01T00:00:00Z',
      },
    ]
    mockFetchEvents.mockResolvedValue(events)
    mockFetchAvailableActions.mockResolvedValue([
      { action_code: 'pass_screening', target_type: 'application' },
    ])

    const { state, loadPipeline, expand } = usePipeline()
    await loadPipeline()

    // 展开
    await expand(1)
    expect(state.expandedId).toBe(1)
    expect(state.expandedEvents).toHaveLength(1)
    expect(state.expandedActions).toHaveLength(1)

    // 再点击同一行 → 折叠
    await expand(1)
    expect(state.expandedId).toBeNull()
  })

  it('loading 状态正确切换', async () => {
    let resolve!: (v: any) => void
    mockFetchActive.mockReturnValue(new Promise((r) => { resolve = r }))

    const { state, loadPipeline } = usePipeline()
    expect(state.loading).toBe(false)

    const promise = loadPipeline()
    expect(state.loading).toBe(true)

    resolve({ items: [], total: 0, page: 1, page_size: 100 })
    await promise
    expect(state.loading).toBe(false)
  })

  it('loadPipeline 失败后写入 error，并在成功重试后清空', async () => {
    mockFetchActive.mockRejectedValueOnce(new Error('加载进行中列表失败'))

    const { state, loadPipeline } = usePipeline()
    await loadPipeline()

    expect(state.error).toBe('加载进行中列表失败')
    expect(state.items).toEqual([])
    expect(state.loading).toBe(false)

    mockFetchActive.mockResolvedValueOnce({
      items: [makeApp(1, 10, 20)],
      total: 1,
      page: 1,
      page_size: 100,
    })
    mockFetchCandidate.mockResolvedValueOnce(makeCandidate(10, '张三'))
    mockFetchJob.mockResolvedValueOnce(makeJob(20, '前端工程师'))

    await loadPipeline()

    expect(state.error).toBeNull()
    expect(state.items).toHaveLength(1)
    expect(state.items[0].candidate.name).toBe('张三')
  })

  describe('分组视图', () => {
    async function loadTwoItems() {
      const { fetchActiveApplications, fetchCandidate, fetchJob } = await import('@/api/pipeline')
      const { usePipeline } = await import('@/composables/usePipeline')

      vi.mocked(fetchActiveApplications).mockResolvedValue({
        items: [
          { ...makeApp(1, 10, 20), stage: '简历筛选' },
          { ...makeApp(2, 11, 21), stage: '面试' },
        ],
        total: 2,
        page: 1,
        page_size: 100,
      })
      vi.mocked(fetchCandidate).mockImplementation(async (id) =>
        id === 10 ? makeCandidate(10, '张三') : makeCandidate(11, '李四'),
      )
      vi.mocked(fetchJob).mockImplementation(async (id) =>
        id === 20 ? makeJob(20, '前端工程师') : makeJob(21, '后端工程师'),
      )
      const pipeline = usePipeline()
      await pipeline.loadPipeline()
      return pipeline
    }

    it('默认 groupMode 为 all，groupedItems 返回单个组', async () => {
      const { groupMode, groupedItems } = await loadTwoItems()
      expect(groupMode.value).toBe('all')
      expect(groupedItems.value).toHaveLength(1)
      expect(groupedItems.value[0].items).toHaveLength(2)
    })

    it('按岗位分组', async () => {
      const { setGroupMode, groupedItems } = await loadTwoItems()
      setGroupMode('byJob')
      expect(groupedItems.value).toHaveLength(2)
      expect(groupedItems.value.map((g) => g.label).sort()).toEqual(['前端工程师', '后端工程师'])
      expect(groupedItems.value.every((g) => g.items.length === 1)).toBe(true)
    })

    it('按阶段分组且按 STAGE_ORDER 排序', async () => {
      const { setGroupMode, groupedItems } = await loadTwoItems()
      setGroupMode('byStage')
      expect(groupedItems.value).toHaveLength(2)
      expect(groupedItems.value[0].label).toBe('简历筛选')
      expect(groupedItems.value[1].label).toBe('面试')
    })

    it('切换 groupMode 清空 collapsedKeys 和 expandedId', async () => {
      const { fetchEvents, fetchAvailableActions } = await import('@/api/pipeline')
      vi.mocked(fetchEvents).mockResolvedValue([])
      vi.mocked(fetchAvailableActions).mockResolvedValue([])

      const { setGroupMode, toggleCollapse, isCollapsed, state, expand, groupedItems } = await loadTwoItems()
      setGroupMode('byJob')

      const key = groupedItems.value[0].key
      toggleCollapse(key)
      expect(isCollapsed(key)).toBe(true)

      await expand(1)
      expect(state.expandedId).toBe(1)

      setGroupMode('byStage')
      expect(isCollapsed(key)).toBe(false)
      expect(state.expandedId).toBeNull()
    })

    it('toggleCollapse 切换折叠状态', async () => {
      const { setGroupMode, toggleCollapse, isCollapsed, groupedItems } = await loadTwoItems()
      setGroupMode('byJob')
      const key = groupedItems.value[0].key

      expect(isCollapsed(key)).toBe(false)
      toggleCollapse(key)
      expect(isCollapsed(key)).toBe(true)
      toggleCollapse(key)
      expect(isCollapsed(key)).toBe(false)
    })
  })
})
