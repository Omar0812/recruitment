import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'

vi.mock('@/api/jobs', () => ({
  fetchOpenJobs: vi.fn(),
}))

import JobLinkStep from '@/components/candidate-create/JobLinkStep.vue'
import { fetchOpenJobs } from '@/api/jobs'

const mockFetchOpenJobs = vi.mocked(fetchOpenJobs)

const sampleJobs = [
  { id: 1, title: '前端工程师', department: '技术部', location: '北京', status: 'open', created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z' },
  { id: 2, title: '产品经理', department: null, location: '上海', status: 'open', created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z' },
]

function mountJobLink(props = {}) {
  return mount(JobLinkStep, {
    props: {
      candidateName: '张三',
      submitting: false,
      error: null,
      ...props,
    },
  })
}

describe('JobLinkStep', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('显示候选人名字', async () => {
    mockFetchOpenJobs.mockResolvedValue({ items: sampleJobs, total: 2, page: 1, page_size: 100 })
    const wrapper = mountJobLink()
    await flushPromises()

    expect(wrapper.text()).toContain('张三已建档')
  })

  it('加载并显示开放岗位', async () => {
    mockFetchOpenJobs.mockResolvedValue({ items: sampleJobs, total: 2, page: 1, page_size: 100 })
    const wrapper = mountJobLink()
    await flushPromises()

    const select = wrapper.find('.select-input')
    expect(select.exists()).toBe(true)

    const options = select.findAll('option')
    // 默认项 + 2个岗位
    expect(options).toHaveLength(3)
    expect(options[1].text()).toContain('前端工程师')
    expect(options[1].text()).toContain('技术部')
    expect(options[2].text()).toBe('产品经理')
  })

  it('选择岗位后点击加入流程触发 link 事件', async () => {
    mockFetchOpenJobs.mockResolvedValue({ items: sampleJobs, total: 2, page: 1, page_size: 100 })
    const wrapper = mountJobLink()
    await flushPromises()

    // 选择岗位 — happy-dom 下 setValue 会将 :value 绑定的 number 转为 string
    const select = wrapper.find('.select-input')
    await select.setValue('1')
    await flushPromises()

    const linkBtn = wrapper.find('.btn-primary')
    expect((linkBtn.element as HTMLButtonElement).disabled).toBe(false)
    await linkBtn.trigger('click')

    expect(wrapper.emitted('link')).toBeTruthy()
    // happy-dom select v-model 可能返回字符串 "1"
    const emittedValue = wrapper.emitted('link')![0][0]
    expect(Number(emittedValue)).toBe(1)
  })

  it('点击跳过触发 skip 事件', async () => {
    mockFetchOpenJobs.mockResolvedValue({ items: sampleJobs, total: 2, page: 1, page_size: 100 })
    const wrapper = mountJobLink()
    await flushPromises()

    const skipBtn = wrapper.findAll('button').find((b) => b.text().includes('跳过'))
    await skipBtn!.trigger('click')

    expect(wrapper.emitted('skip')).toBeTruthy()
  })

  it('未选择岗位时加入流程按钮禁用', async () => {
    mockFetchOpenJobs.mockResolvedValue({ items: sampleJobs, total: 2, page: 1, page_size: 100 })
    const wrapper = mountJobLink()
    await flushPromises()

    const linkBtn = wrapper.find('.btn-primary')
    expect((linkBtn.element as HTMLButtonElement).disabled).toBe(true)
  })

  it('无开放岗位时显示提示', async () => {
    mockFetchOpenJobs.mockResolvedValue({ items: [], total: 0, page: 1, page_size: 100 })
    const wrapper = mountJobLink()
    await flushPromises()

    expect(wrapper.text()).toContain('当前无开放岗位')
  })

  it('显示错误信息', async () => {
    mockFetchOpenJobs.mockResolvedValue({ items: sampleJobs, total: 2, page: 1, page_size: 100 })
    const wrapper = mountJobLink({ error: '加入流程失败' })
    await flushPromises()

    expect(wrapper.text()).toContain('加入流程失败')
  })

  it('提交中按钮显示处理中', async () => {
    mockFetchOpenJobs.mockResolvedValue({ items: sampleJobs, total: 2, page: 1, page_size: 100 })
    const wrapper = mountJobLink({ submitting: true })
    await flushPromises()

    expect(wrapper.text()).toContain('处理中...')
  })
})
