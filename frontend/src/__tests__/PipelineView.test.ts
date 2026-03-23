import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'

const pipelineApi = vi.hoisted(() => ({
  fetchActiveApplications: vi.fn(),
  fetchEventSummaries: vi.fn(),
  fetchEvents: vi.fn(),
  fetchAvailableActions: vi.fn(),
  executeAction: vi.fn(),
}))

const routerMocks = vi.hoisted(() => ({
  query: {} as Record<string, string>,
  replace: vi.fn(),
}))

vi.mock('@/api/pipeline', () => pipelineApi)

vi.mock('vue-router', () => ({
  useRoute: () => ({ query: routerMocks.query }),
  useRouter: () => ({ replace: routerMocks.replace }),
}))

vi.mock('@/components/pipeline/PipelineRow.vue', () => ({
  default: {
    props: ['item'],
    template: '<div class="pipeline-row-stub">{{ item.candidate.name }}</div>',
  },
}))

function makeApp(id: number, candidateId: number, jobId: number, candidateName = '', jobTitle = '') {
  return {
    id,
    candidate_id: candidateId,
    candidate_name: candidateName,
    job_id: jobId,
    job_title: jobTitle,
    state: 'IN_PROGRESS',
    outcome: null,
    stage: '简历筛选',
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  }
}

describe('PipelineView', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
    routerMocks.query = {}
  })

  async function mountView() {
    const { default: PipelineView } = await import('@/views/PipelineView.vue')
    const wrapper = mount(PipelineView)
    await flushPromises()
    return wrapper
  }

  it('加载失败时展示错误提示而不是空状态', async () => {
    pipelineApi.fetchActiveApplications.mockRejectedValueOnce(new Error('列表加载失败'))

    const wrapper = await mountView()

    expect(wrapper.get('[role="alert"]').text()).toContain('列表加载失败')
    expect(wrapper.find('.pipeline-retry').exists()).toBe(true)
    expect(wrapper.text()).not.toContain('暂无进行中的候选人')
  })

  it('成功返回空列表时展示空状态而不是错误态', async () => {
    pipelineApi.fetchActiveApplications.mockResolvedValueOnce({
      items: [],
      total: 0,
      page: 1,
      page_size: 100,
    })
    pipelineApi.fetchEventSummaries.mockResolvedValue({})

    const wrapper = await mountView()

    expect(wrapper.text()).toContain('暂无进行中的候选人')
    expect(wrapper.find('[role="alert"]').exists()).toBe(false)
    expect(wrapper.find('.pipeline-retry').exists()).toBe(false)
  })

  it('点击重试后恢复列表', async () => {
    pipelineApi.fetchActiveApplications
      .mockRejectedValueOnce(new Error('列表加载失败'))
      .mockResolvedValueOnce({
        items: [makeApp(1, 10, 20, '张三', '前端工程师')],
        total: 1,
        page: 1,
        page_size: 100,
      })
    pipelineApi.fetchEventSummaries.mockResolvedValue({})

    const wrapper = await mountView()
    expect(wrapper.get('[role="alert"]').text()).toContain('列表加载失败')

    await wrapper.get('.pipeline-retry').trigger('click')
    await flushPromises()

    expect(pipelineApi.fetchActiveApplications).toHaveBeenCalledTimes(2)
    expect(wrapper.find('[role="alert"]').exists()).toBe(false)
    expect(wrapper.text()).toContain('张三')
  })

  describe('分组视图', () => {
    function setupTwoApps() {
      pipelineApi.fetchActiveApplications.mockResolvedValue({
        items: [
          { ...makeApp(1, 10, 20, '张三', '前端工程师'), stage: '简历筛选' },
          { ...makeApp(2, 11, 21, '李四', '后端工程师'), stage: '面试' },
        ],
        total: 2,
        page: 1,
        page_size: 100,
      })
      pipelineApi.fetchEventSummaries.mockResolvedValue({})
    }

    it('切换按钮组可见且默认全部激活', async () => {
      setupTwoApps()
      const wrapper = await mountView()

      const buttons = wrapper.findAll('.view-switch-btn')
      expect(buttons).toHaveLength(3)
      expect(buttons[0].text()).toBe('全部')
      expect(buttons[1].text()).toBe('按岗位')
      expect(buttons[2].text()).toBe('按阶段')
      expect(buttons[0].classes()).toContain('active')
    })

    it('按岗位分组渲染 section header', async () => {
      setupTwoApps()
      const wrapper = await mountView()

      await wrapper.findAll('.view-switch-btn')[1].trigger('click')
      await flushPromises()

      const headers = wrapper.findAll('.pipeline-group-header')
      expect(headers.length).toBe(2)
      const labels = headers.map((h) => h.find('.group-label').text())
      expect(labels).toContain('前端工程师')
      expect(labels).toContain('后端工程师')
    })

    it('点击 section header 折叠/展开', async () => {
      setupTwoApps()
      const wrapper = await mountView()

      await wrapper.findAll('.view-switch-btn')[2].trigger('click')
      await flushPromises()

      const header = wrapper.find('.pipeline-group-header')
      expect(header.exists()).toBe(true)

      // 折叠前有行
      let rows = wrapper.findAll('.pipeline-row-stub')
      expect(rows.length).toBe(2)

      // 折叠第一组
      await header.trigger('click')
      await flushPromises()
      rows = wrapper.findAll('.pipeline-row-stub')
      expect(rows.length).toBe(1)

      // 展开
      await header.trigger('click')
      await flushPromises()
      rows = wrapper.findAll('.pipeline-row-stub')
      expect(rows.length).toBe(2)
    })
  })
})
