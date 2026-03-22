import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import StageAction from '../StageAction.vue'

// Mock usePipeline
vi.mock('@/composables/usePipeline', () => ({
  usePipeline: () => ({
    doAction: vi.fn().mockResolvedValue(undefined),
  }),
}))

// Mock form components
vi.mock('../forms/InterviewForm.vue', () => ({ default: { template: '<div class="mock-interview-form" />' } }))
vi.mock('../forms/FeedbackForm.vue', () => ({ default: { template: '<div class="mock-feedback-form" />' } }))
vi.mock('../forms/OfferForm.vue', () => ({ default: { template: '<div class="mock-offer-form" />' } }))
vi.mock('../forms/BackgroundCheckForm.vue', () => ({ default: { template: '<div class="mock-bg-form" />' } }))

function makeAction(code: string) {
  return { action_code: code, target_type: 'application' }
}

function makeEvent(type: string, payload: Record<string, any> = {}) {
  return {
    id: Math.random(),
    application_id: 1,
    type,
    occurred_at: '2026-03-10T10:00:00Z',
    actor_type: 'human',
    payload,
    body: null,
    created_at: '2026-03-10T10:00:00Z',
    updated_at: '2026-03-10T10:00:00Z',
  }
}

describe('StageAction', () => {
  describe('映射修正', () => {
    it('背调阶段显示 record_offer（背调通过后）', () => {
      const wrapper = mount(StageAction, {
        props: {
          stage: '背调',
          availableActions: [
            makeAction('record_background_check_result'),
            makeAction('record_offer'),
          ],
          applicationId: 1,
          events: [],
        },
      })
      const buttons = wrapper.findAll('.stage-action__btn')
      const labels = buttons.map((b) => b.text())
      expect(labels).toContain('记录背调结果')
      expect(labels).toContain('记录 Offer 方案')
    })

    it('Offer沟通阶段只显示开始背调', () => {
      const wrapper = mount(StageAction, {
        props: {
          stage: 'Offer沟通',
          availableActions: [
            makeAction('start_background_check'),
            makeAction('record_offer'),  // 后端可能返回但前端不应映射
          ],
          applicationId: 1,
          events: [],
        },
      })
      const buttons = wrapper.findAll('.stage-action__btn')
      expect(buttons).toHaveLength(1)
      expect(buttons[0].text()).toBe('开始背调')
    })
  })

  describe('面试阶段状态感知', () => {
    it('无面试时只显示安排面试', () => {
      const wrapper = mount(StageAction, {
        props: {
          stage: '面试',
          availableActions: [
            makeAction('schedule_interview'),
            makeAction('record_interview_feedback'),
            makeAction('advance_to_offer'),
          ],
          applicationId: 1,
          events: [],
        },
      })
      const buttons = wrapper.findAll('.stage-action__btn')
      expect(buttons).toHaveLength(1)
      expect(buttons[0].text()).toBe('安排面试')
    })

    it('已安排面试但无面评时只显示填写面评', () => {
      const wrapper = mount(StageAction, {
        props: {
          stage: '面试',
          availableActions: [
            makeAction('schedule_interview'),
            makeAction('record_interview_feedback'),
            makeAction('advance_to_offer'),
          ],
          applicationId: 1,
          events: [
            makeEvent('interview_scheduled', { scheduled_at: '2026-03-15T10:00:00Z' }),
          ],
        },
      })
      const buttons = wrapper.findAll('.stage-action__btn')
      expect(buttons).toHaveLength(1)
      expect(buttons[0].text()).toBe('填写面评')
    })

    it('面评通过后显示安排下一轮和发起Offer两个按钮', () => {
      const wrapper = mount(StageAction, {
        props: {
          stage: '面试',
          availableActions: [
            makeAction('schedule_interview'),
            makeAction('record_interview_feedback'),
            makeAction('advance_to_offer'),
          ],
          applicationId: 1,
          events: [
            makeEvent('interview_scheduled', { scheduled_at: '2026-03-15T10:00:00Z' }),
            makeEvent('interview_feedback', { conclusion: 'pass' }),
          ],
        },
      })
      const buttons = wrapper.findAll('.stage-action__btn')
      expect(buttons).toHaveLength(2)
      const labels = buttons.map((b) => b.text())
      expect(labels).toContain('安排面试')
      expect(labels).toContain('通过，发起 Offer')
    })
  })

  describe('多按钮交互', () => {
    it('点击按钮展开对应 form，点击另一个按钮切换', async () => {
      const wrapper = mount(StageAction, {
        props: {
          stage: '背调',
          availableActions: [
            makeAction('record_background_check_result'),
            makeAction('record_offer'),
          ],
          applicationId: 1,
          events: [],
        },
      })
      const buttons = wrapper.findAll('.stage-action__btn')
      expect(buttons).toHaveLength(2)

      // 点击第一个按钮
      await buttons[0].trigger('click')
      expect(wrapper.find('.stage-action__form').exists()).toBe(true)

      // 点击第二个按钮应切换
      await buttons[1].trigger('click')
      expect(wrapper.find('.stage-action__form').exists()).toBe(true)

      // 再次点击同一个按钮应关闭
      await buttons[1].trigger('click')
      expect(wrapper.find('.stage-action__form').exists()).toBe(false)
    })
  })
})
