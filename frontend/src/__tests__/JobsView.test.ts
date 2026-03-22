import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import JobsView from '@/views/JobsView.vue'
import { useJobs } from '@/composables/useJobs'
import { useJobPanel } from '@/composables/useJobPanel'

vi.mock('@/composables/useJobs')
vi.mock('@/composables/useJobPanel')

const mockReplace = vi.fn()

vi.mock('vue-router', () => ({
  useRoute: () => ({
    query: {},
  }),
  useRouter: () => ({
    replace: mockReplace,
  }),
}))

describe('JobsView', () => {
  const mockJobs = [
    {
      id: 1,
      title: '前端工程师',
      department: '技术部',
      location_name: '北京',
      location_address: '北京市朝阳区',
      headcount: 2,
      jd: 'JD 内容',
      status: 'open',
      priority: 'high',
      target_onboard_date: null,
      notes: null,
      created_at: '2026-03-01T00:00:00',
      updated_at: '2026-03-01T00:00:00',
    },
  ]

  beforeEach(() => {
    mockReplace.mockReset()

    vi.mocked(useJobs).mockReturnValue({
      state: {
        jobs: mockJobs,
        loading: false,
        initialized: true,
        error: null,
        status: 'all',
        keyword: '',
        total: 1,
      },
      setStatus: vi.fn(),
      setKeyword: vi.fn(),
      load: vi.fn(),
    } as any)

    vi.mocked(useJobPanel).mockReturnValue({
      state: {
        isOpen: false,
        mode: 'view',
        jobId: null,
        activeTab: 'basic',
        loading: false,
        job: null,
        applications: [],
      },
      open: vi.fn(),
      openCreate: vi.fn(),
      close: vi.fn(),
      refresh: vi.fn(),
      setActiveTab: vi.fn(),
    } as any)
  })

  it('渲染岗位列表页', () => {
    const wrapper = mount(JobsView)
    expect(wrapper.find('h1').text()).toBe('岗位')
    expect(wrapper.find('.btn-primary').text()).toBe('+ 新建岗位')
  })

  it('点击新建岗位按钮打开创建表单', async () => {
    const openCreate = vi.fn()
    vi.mocked(useJobPanel).mockReturnValue({
      state: {
        isOpen: false,
        mode: 'view',
        jobId: null,
        activeTab: 'basic',
        loading: false,
        job: null,
        applications: [],
      },
      open: vi.fn(),
      openCreate,
      close: vi.fn(),
      refresh: vi.fn(),
      setActiveTab: vi.fn(),
    } as any)

    const wrapper = mount(JobsView)
    await wrapper.find('.btn-primary').trigger('click')
    expect(openCreate).toHaveBeenCalled()
  })

  it('请求失败时显示错误态并支持重试', async () => {
    const load = vi.fn()
    vi.mocked(useJobs).mockReturnValue({
      state: {
        jobs: [],
        loading: false,
        initialized: true,
        error: '岗位加载失败，请重试',
        status: 'all',
        keyword: '',
        total: 0,
      },
      setStatus: vi.fn(),
      setKeyword: vi.fn(),
      load,
    } as any)

    const wrapper = mount(JobsView)
    expect(wrapper.find('.error-state').text()).toContain('岗位加载失败，请重试')
    expect(wrapper.text()).not.toContain('暂无岗位')

    await wrapper.find('.btn-secondary').trigger('click')
    expect(load).toHaveBeenCalled()
  })
})
