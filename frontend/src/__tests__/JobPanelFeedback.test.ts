import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { defineComponent } from 'vue'
import BasicInfoTab from '@/components/job-panel/BasicInfoTab.vue'
import JDTab from '@/components/job-panel/JDTab.vue'
import JobPanel from '@/components/job-panel/JobPanel.vue'
import { useJobs } from '@/composables/useJobs'
import { useJobPanel } from '@/composables/useJobPanel'

vi.mock('@/composables/useJobPanel')
vi.mock('@/composables/useJobs')

const mockJob = {
  id: 1,
  title: '前端工程师',
  department: '技术部',
  location_name: '北京',
  location_address: '北京市朝阳区望京 SOHO',
  headcount: 2,
  jd: 'JD 内容',
  priority: 'high',
  target_onboard_date: null,
  notes: null,
  status: 'open',
  close_reason: null,
  closed_at: null,
  created_at: '2026-03-01T00:00:00Z',
  updated_at: '2026-03-01T00:00:00Z',
}

describe('岗位面板反馈', () => {
  beforeEach(() => {
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: {
        writeText: vi.fn(),
      },
    })

    vi.mocked(useJobPanel).mockReturnValue({
      state: {
        isOpen: true,
        mode: 'view',
        jobId: 1,
        activeTab: 'basic',
        loading: false,
        job: mockJob,
        applications: [],
      },
      open: vi.fn(),
      openCreate: vi.fn(),
      openEdit: vi.fn(),
      close: vi.fn(),
      refresh: vi.fn(),
      setActiveTab: vi.fn(),
    } as never)

    vi.mocked(useJobs).mockReturnValue({
      state: {
        jobs: [],
        loading: false,
        initialized: true,
        status: 'open',
        keyword: '',
        total: 0,
      },
      setStatus: vi.fn(),
      setKeyword: vi.fn(),
      refresh: vi.fn().mockResolvedValue(undefined),
      load: vi.fn(),
    } as never)
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('复制地址成功后显示明确反馈', async () => {
    const writeText = vi.mocked(navigator.clipboard.writeText)
    writeText.mockResolvedValue()

    const wrapper = mount(BasicInfoTab, {
      props: {
        job: mockJob,
      },
    })

    await wrapper.find('.copy-btn').trigger('click')
    await flushPromises()

    expect(writeText).toHaveBeenCalledWith('北京市朝阳区望京 SOHO')
    expect(wrapper.text()).toContain('地址已复制')

    wrapper.unmount()
  })

  it('复制 JD 失败后显示明确反馈', async () => {
    const writeText = vi.mocked(navigator.clipboard.writeText)
    writeText.mockRejectedValue(new Error('copy failed'))

    const wrapper = mount(JDTab, {
      props: {
        job: mockJob,
      },
    })

    await wrapper.find('.copy-btn').trigger('click')
    await flushPromises()

    expect(writeText).toHaveBeenCalledWith('JD 内容')
    expect(wrapper.text()).toContain('复制失败，请重试')

    wrapper.unmount()
  })

  it('岗位面板编辑调用 openEdit 且关闭成功显示反馈', async () => {
    const refresh = vi.fn()
    const refreshJobs = vi.fn().mockResolvedValue(undefined)
    const openEdit = vi.fn()
    vi.mocked(useJobPanel).mockReturnValue({
      state: {
        isOpen: true,
        mode: 'view',
        jobId: 1,
        activeTab: 'basic',
        loading: false,
        job: mockJob,
        applications: [],
      },
      open: vi.fn(),
      openCreate: vi.fn(),
      openEdit,
      close: vi.fn(),
      refresh,
      setActiveTab: vi.fn(),
    } as never)

    vi.mocked(useJobs).mockReturnValue({
      state: {
        jobs: [],
        loading: false,
        initialized: true,
        status: 'open',
        keyword: '',
        total: 0,
      },
      setStatus: vi.fn(),
      setKeyword: vi.fn(),
      refresh: refreshJobs,
      load: vi.fn(),
    } as never)

    const wrapper = mount(JobPanel, {
      global: {
        stubs: {
          Teleport: true,
          JobPanelHeader: true,
          BasicInfoTab: true,
          JDTab: true,
          CandidatesTab: true,
          JobCreateForm: true,
          JobPanelActions: defineComponent({
            name: 'JobPanelActions',
            emits: ['edit', 'close-job'],
            template: `
              <div>
                <button class="trigger-edit" @click="$emit('edit')">edit</button>
                <button class="trigger-close" @click="$emit('close-job')">close</button>
              </div>
            `,
          }),
          CloseJobDialog: defineComponent({
            name: 'CloseJobDialog',
            props: {
              show: {
                type: Boolean,
                required: true,
              },
            },
            emits: ['confirmed'],
            template: `<button v-if="show" class="trigger-confirm" @click="$emit('confirmed')">confirm</button>`,
          }),
        },
      },
    })

    await wrapper.find('.trigger-edit').trigger('click')
    expect(openEdit).toHaveBeenCalled()

    await wrapper.find('.trigger-close').trigger('click')
    await wrapper.find('.trigger-confirm').trigger('click')
    await flushPromises()

    expect(wrapper.text()).toContain('岗位已关闭')
    expect(refresh).toHaveBeenCalled()
    expect(refreshJobs).toHaveBeenCalled()
  })
})
