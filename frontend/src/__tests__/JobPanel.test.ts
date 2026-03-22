import { describe, it, expect, vi, beforeEach } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { defineComponent } from 'vue'
import JobPanel from '@/components/job-panel/JobPanel.vue'
import { useJobs } from '@/composables/useJobs'
import { useJobPanel } from '@/composables/useJobPanel'

vi.mock('@/composables/useJobPanel')
vi.mock('@/composables/useJobs')

describe('JobPanel', () => {
  const mockJob = {
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
  }

  beforeEach(() => {
    vi.mocked(useJobPanel).mockReturnValue({
      state: {
        isOpen: false,
        mode: 'view',
        jobId: null,
        activeTab: 'basic',
        loading: false,
        error: null,
        job: null,
        applications: [],
      },
      open: vi.fn(),
      openCreate: vi.fn(),
      close: vi.fn(),
      refresh: vi.fn(),
      setActiveTab: vi.fn(),
    } as any)

    vi.mocked(useJobs).mockReturnValue({
      state: {
        jobs: [],
        loading: false,
        initialized: true,
        error: null,
        status: 'open',
        keyword: '',
        total: 0,
      },
      setStatus: vi.fn(),
      setKeyword: vi.fn(),
      refresh: vi.fn().mockResolvedValue(undefined),
      load: vi.fn(),
    } as any)
  })

  it('创建模式显示创建表单', () => {
    vi.mocked(useJobPanel).mockReturnValue({
      state: {
        isOpen: true,
        mode: 'create',
        jobId: null,
        activeTab: 'basic',
        loading: false,
        error: null,
        job: null,
        applications: [],
      },
      open: vi.fn(),
      openCreate: vi.fn(),
      close: vi.fn(),
      refresh: vi.fn(),
      setActiveTab: vi.fn(),
    } as any)

    const wrapper = mount(JobPanel, {
      global: {
        stubs: {
          Teleport: true,
          JobCreateForm: true,
        },
      },
    })

    expect(wrapper.findComponent({ name: 'JobCreateForm' }).exists()).toBe(true)
  })

  it('查看模式显示岗位详情', () => {
    vi.mocked(useJobPanel).mockReturnValue({
      state: {
        isOpen: true,
        mode: 'view',
        jobId: 1,
        activeTab: 'basic',
        loading: false,
        error: null,
        job: mockJob,
        applications: [],
      },
      open: vi.fn(),
      openCreate: vi.fn(),
      close: vi.fn(),
      refresh: vi.fn(),
      setActiveTab: vi.fn(),
    } as any)

    const wrapper = mount(JobPanel, {
      global: {
        stubs: {
          Teleport: true,
          JobPanelHeader: true,
          BasicInfoTab: true,
          JDTab: true,
          CandidatesTab: true,
          JobPanelActions: true,
          CloseJobDialog: true,
        },
      },
    })

    expect(wrapper.findComponent({ name: 'JobPanelHeader' }).exists()).toBe(true)
  })

  it('创建成功后刷新岗位列表并切换到新岗位详情', async () => {
    const open = vi.fn().mockResolvedValue(undefined)
    const refreshJobs = vi.fn().mockResolvedValue(undefined)

    vi.mocked(useJobPanel).mockReturnValue({
      state: {
        isOpen: true,
        mode: 'create',
        jobId: null,
        activeTab: 'basic',
        loading: false,
        error: null,
        job: null,
        applications: [],
      },
      open,
      openCreate: vi.fn(),
      close: vi.fn(),
      refresh: vi.fn(),
      setActiveTab: vi.fn(),
    } as any)

    vi.mocked(useJobs).mockReturnValue({
      state: {
        jobs: [],
        loading: false,
        initialized: true,
        error: null,
        status: 'open',
        keyword: '',
        total: 0,
      },
      setStatus: vi.fn(),
      setKeyword: vi.fn(),
      refresh: refreshJobs,
      load: vi.fn(),
    } as any)

    const wrapper = mount(JobPanel, {
      global: {
        stubs: {
          Teleport: true,
          JobCreateForm: defineComponent({
            name: 'JobCreateForm',
            emits: ['created'],
            template: '<button class="emit-created" @click="$emit(\'created\', 9)">created</button>',
          }),
        },
      },
    })

    await wrapper.find('.emit-created').trigger('click')
    await flushPromises()

    expect(refreshJobs).toHaveBeenCalled()
    expect(open).toHaveBeenCalledWith(9)
  })

  it('加载失败时显示错误态并支持重试', async () => {
    const refresh = vi.fn().mockResolvedValue(undefined)
    vi.mocked(useJobPanel).mockReturnValue({
      state: {
        isOpen: true,
        mode: 'view',
        jobId: 1,
        activeTab: 'basic',
        loading: false,
        error: '岗位详情加载失败，请重试',
        job: null,
        applications: [],
      },
      open: vi.fn(),
      openCreate: vi.fn(),
      close: vi.fn(),
      refresh,
      setActiveTab: vi.fn(),
    } as any)

    const wrapper = mount(JobPanel, {
      global: {
        stubs: {
          Teleport: true,
          JobCreateForm: true,
        },
      },
    })

    expect(wrapper.find('.panel-error').text()).toContain('岗位详情加载失败，请重试')

    await wrapper.find('.panel-retry').trigger('click')
    expect(refresh).toHaveBeenCalled()
  })
})
