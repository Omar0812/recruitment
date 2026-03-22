import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import PipelineRow from '@/components/pipeline/PipelineRow.vue'

vi.mock('@/composables/useCandidatePanel', () => ({
  openCandidatePanel: vi.fn(),
}))

vi.mock('@/api/pipeline', () => ({
  fetchEvents: vi.fn(),
}))

import { openCandidatePanel } from '@/composables/useCandidatePanel'

const mockOpenPanel = vi.mocked(openCandidatePanel)

function makeItem(candidateId = 1) {
  return {
    application: {
      id: 10,
      candidate_id: candidateId,
      job_id: 5,
      state: 'IN_PROGRESS',
      outcome: null,
      stage: '面试',
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T00:00:00Z',
    },
    candidate: {
      id: candidateId,
      name: '李四',
      phone: null,
      email: null,
      source: null,
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T00:00:00Z',
    },
    job: {
      id: 5,
      title: '前端工程师',
      department: null,
      location: null,
      status: 'open',
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T00:00:00Z',
    },
  }
}

describe('PipelineRow 名字点击触发面板', () => {
  it('点击候选人名字打开详情面板', async () => {
    const wrapper = mount(PipelineRow, {
      props: { item: makeItem(42), expanded: false },
      global: {
        stubs: { ExpandedRow: true },
      },
    })

    await wrapper.find('.pipeline-row__name').trigger('click')
    expect(mockOpenPanel).toHaveBeenCalledWith(42)
  })

  it('点击名字不触发行展开', async () => {
    const wrapper = mount(PipelineRow, {
      props: { item: makeItem(), expanded: false },
      global: {
        stubs: { ExpandedRow: true },
      },
    })

    await wrapper.find('.pipeline-row__name').trigger('click')
    // toggle 事件不应被触发（因为 click.stop）
    expect(wrapper.emitted('toggle')).toBeFalsy()
  })
})
