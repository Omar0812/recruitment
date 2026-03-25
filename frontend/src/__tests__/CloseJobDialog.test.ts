import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import CloseJobDialog from '@/components/job-panel/CloseJobDialog.vue'
import { closeJob } from '@/api/jobs'

vi.mock('@/api/jobs')
vi.mock('@/composables/useToastUndo')

import { showToastUndo } from '@/composables/useToastUndo'

describe('CloseJobDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('未选择关闭原因时在弹窗内显示错误提示', async () => {
    const wrapper = mount(CloseJobDialog, {
      props: {
        show: true,
        jobId: 1,
        applications: [],
      },
    })

    await wrapper.find('.btn-danger').trigger('click')

    expect(wrapper.text()).toContain('请选择关闭原因')
    expect(closeJob).not.toHaveBeenCalled()
  })

  it('确认关闭后 emit cancel 并调用 showToastUndo', async () => {
    const wrapper = mount(CloseJobDialog, {
      props: {
        show: true,
        jobId: 1,
        applications: [],
      },
    })

    await wrapper.find('input[type="radio"][value="招满了"]').setValue(true)
    await wrapper.find('.btn-danger').trigger('click')
    await flushPromises()

    // 弹窗关闭（emit cancel）
    expect(wrapper.emitted('cancel')).toBeTruthy()
    // 不直接调 closeJob，而是通过 toast 延迟
    expect(closeJob).not.toHaveBeenCalled()
    expect(showToastUndo).toHaveBeenCalledWith(
      '岗位即将关闭',
      expect.any(Function),
      undefined,
      '确认关闭'
    )
  })

  it('选择其他原因但未填写文本时显示弹窗内错误', async () => {
    const wrapper = mount(CloseJobDialog, {
      props: {
        show: true,
        jobId: 1,
        applications: [],
      },
    })

    await wrapper.find('input[type="radio"][value="other"]').setValue(true)
    await wrapper.find('.btn-danger').trigger('click')

    expect(wrapper.text()).toContain('请输入关闭原因')
    expect(closeJob).not.toHaveBeenCalled()
  })

  it('有进行中候选人时显示真实姓名和当前阶段', () => {
    const wrapper = mount(CloseJobDialog, {
      props: {
        show: true,
        jobId: 1,
        applications: [
          {
            id: 8,
            candidate_id: 101,
            candidate_name: '王五',
            job_id: 1,
            state: 'IN_PROGRESS',
            outcome: null,
            stage: '终面',
            created_at: '2026-03-01T00:00:00Z',
            updated_at: '2026-03-01T00:00:00Z',
          },
        ],
      },
    })

    expect(wrapper.text()).toContain('王五')
    expect(wrapper.text()).toContain('当前阶段：终面')
  })
})
