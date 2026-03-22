import { describe, it, expect, vi, beforeEach } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'

const jobsApi = vi.hoisted(() => ({
  fetchOpenJobs: vi.fn(),
}))

vi.mock('@/api/jobs', () => ({
  fetchOpenJobs: jobsApi.fetchOpenJobs,
}))

import JoinPipelineInline from '@/components/candidate-panel/JoinPipelineInline.vue'

beforeEach(() => {
  vi.clearAllMocks()
})

describe('JoinPipelineInline', () => {
  it('加载岗位列表并显示下拉', async () => {
    jobsApi.fetchOpenJobs.mockResolvedValue({
      items: [
        { id: 1, title: '前端工程师', department: '研发部' },
        { id: 2, title: '后端工程师', department: null },
      ],
    })

    const wrapper = mount(JoinPipelineInline, {
      props: { submitting: false, error: null },
    })
    await flushPromises()

    const options = wrapper.findAll('option')
    expect(options.length).toBe(3) // placeholder + 2 jobs
    expect(wrapper.text()).toContain('前端工程师 · 研发部')
    expect(wrapper.text()).toContain('后端工程师')
  })

  it('无开放岗位时确认按钮禁用', async () => {
    jobsApi.fetchOpenJobs.mockResolvedValue({ items: [] })

    const wrapper = mount(JoinPipelineInline, {
      props: { submitting: false, error: null },
    })
    await flushPromises()

    expect(wrapper.text()).toContain('当前无开放岗位')
    const confirmBtn = wrapper.find('.join-pipeline-inline__btn--primary')
    expect((confirmBtn.element as HTMLButtonElement).disabled).toBe(true)
  })

  it('选择岗位后确认触发 confirm 事件', async () => {
    jobsApi.fetchOpenJobs.mockResolvedValue({
      items: [{ id: 5, title: '产品经理', department: '产品部' }],
    })

    const wrapper = mount(JoinPipelineInline, {
      props: { submitting: false, error: null },
    })
    await flushPromises()

    // Use wrapper.vm to set the reactive value directly
    ;(wrapper.vm as any).selectedJobId = 5
    await flushPromises()

    const confirmBtn = wrapper.find('.join-pipeline-inline__btn--primary')
    expect((confirmBtn.element as HTMLButtonElement).disabled).toBe(false)
    await confirmBtn.trigger('click')

    const emitted = wrapper.emitted('confirm')
    expect(emitted).toBeTruthy()
    expect(emitted![0][0]).toBe(5)
  })

  it('点击取消触发 cancel 事件', async () => {
    jobsApi.fetchOpenJobs.mockResolvedValue({ items: [] })

    const wrapper = mount(JoinPipelineInline, {
      props: { submitting: false, error: null },
    })
    await flushPromises()

    const cancelBtn = wrapper.findAll('.join-pipeline-inline__btn').find((b) => b.text() === '取消')
    await cancelBtn!.trigger('click')

    expect(wrapper.emitted('cancel')).toBeTruthy()
  })

  it('显示错误信息', async () => {
    jobsApi.fetchOpenJobs.mockResolvedValue({ items: [] })

    const wrapper = mount(JoinPipelineInline, {
      props: { submitting: false, error: '加入流程失败' },
    })
    await flushPromises()

    expect(wrapper.text()).toContain('加入流程失败')
  })
})
