import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import CandidatesTab from '@/components/job-panel/CandidatesTab.vue'
import { useCandidatePanel } from '@/composables/useCandidatePanel'
import { useJobPanel } from '@/composables/useJobPanel'

vi.mock('@/composables/useCandidatePanel')
vi.mock('@/composables/useJobPanel')

describe('CandidatesTab', () => {
  const mockApplications = [
    {
      id: 1,
      candidate_id: 101,
      candidate_name: '张三',
      job_id: 1,
      state: 'IN_PROGRESS',
      stage: '初筛',
      outcome: null,
      created_at: '2026-03-01T00:00:00',
      updated_at: '2026-03-01T00:00:00',
    },
    {
      id: 2,
      candidate_id: 102,
      candidate_name: '李四',
      job_id: 1,
      state: 'IN_PROGRESS',
      stage: '面试',
      outcome: null,
      created_at: '2026-03-01T00:00:00',
      updated_at: '2026-03-01T00:00:00',
    },
  ]

  it('按阶段分组显示候选人', () => {
    vi.mocked(useCandidatePanel).mockReturnValue({
      state: {
        isOpen: false,
        candidateId: null,
        loading: false,
        candidate: null,
        applications: [],
        returnToJobId: null,
      },
      open: vi.fn(),
      close: vi.fn(),
      refresh: vi.fn(),
    } as any)

    vi.mocked(useJobPanel).mockReturnValue({
      state: {
        isOpen: true,
        mode: 'view',
        jobId: 1,
        activeTab: 'candidates',
        loading: false,
        job: null,
        applications: [],
      },
      open: vi.fn(),
      openCreate: vi.fn(),
      close: vi.fn(),
      refresh: vi.fn(),
    } as any)

    const wrapper = mount(CandidatesTab, {
      props: {
        applications: mockApplications,
      },
    })

    expect(wrapper.findAll('.stage-group')).toHaveLength(2)
    expect(wrapper.text()).toContain('张三')
    expect(wrapper.text()).toContain('李四')
    expect(wrapper.text()).toContain('进行中')
    expect(wrapper.text()).toContain('当前阶段：初筛')
  })

  it('点击候选人打开候选人面板', async () => {
    const openCandidate = vi.fn()
    const closeJob = vi.fn()

    vi.mocked(useCandidatePanel).mockReturnValue({
      state: {
        isOpen: false,
        candidateId: null,
        loading: false,
        candidate: null,
        applications: [],
        returnToJobId: null,
      },
      open: openCandidate,
      close: vi.fn(),
      refresh: vi.fn(),
    } as any)

    vi.mocked(useJobPanel).mockReturnValue({
      state: {
        isOpen: true,
        mode: 'view',
        jobId: 1,
        activeTab: 'candidates',
        loading: false,
        job: null,
        applications: [],
      },
      open: vi.fn(),
      openCreate: vi.fn(),
      close: closeJob,
      refresh: vi.fn(),
    } as any)

    const wrapper = mount(CandidatesTab, {
      props: {
        applications: mockApplications,
      },
    })

    await wrapper.find('.candidate-name').trigger('click')
    expect(closeJob).toHaveBeenCalled()
    expect(openCandidate).toHaveBeenCalledWith(101, { returnToJobId: 1 })
  })
})
