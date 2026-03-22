import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import CandidateCard from '@/components/talent-pool/CandidateCard.vue'
import type { CandidateWithApplication } from '@/api/types'

function makeCandidate(overrides: Partial<CandidateWithApplication> = {}): CandidateWithApplication {
  return {
    id: 1,
    name: '张三',
    phone: '13900000000',
    email: 'z@test.com',
    source: '猎聘',
    name_en: null,
    age: 28,
    education: '本科',
    school: '北大',
    last_company: 'ABC公司',
    last_title: '高级工程师',
    years_exp: 5,
    skill_tags: ['Python', 'Go', 'Vue', 'React'],
    education_list: [],
    work_experience: [],
    project_experience: [],
    notes: null,
    blacklisted: false,
    blacklist_reason: null,
    blacklist_note: null,
    resume_path: null,
    starred: 0,
    supplier_id: null,
    referred_by: null,
    merged_into: null,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    latest_application: null,
    ...overrides,
  }
}

describe('CandidateCard', () => {
  it('renders candidate name', () => {
    const wrapper = mount(CandidateCard, {
      props: { candidate: makeCandidate() },
    })
    expect(wrapper.text()).toContain('张三')
  })

  it('renders line2 with title, company, years', () => {
    const wrapper = mount(CandidateCard, {
      props: { candidate: makeCandidate() },
    })
    expect(wrapper.text()).toContain('高级工程师')
    expect(wrapper.text()).toContain('ABC公司')
    expect(wrapper.text()).toContain('5年')
  })

  it('renders max 3 skill tags', () => {
    const wrapper = mount(CandidateCard, {
      props: { candidate: makeCandidate() },
    })
    const tags = wrapper.findAll('.candidate-card__tag')
    expect(tags).toHaveLength(3)
    expect(tags[0].text()).toBe('Python')
    expect(tags[2].text()).toBe('Vue')
  })

  it('shows IN_PROGRESS status', () => {
    const wrapper = mount(CandidateCard, {
      props: {
        candidate: makeCandidate({
          latest_application: { job_title: '后端工程师', state: 'IN_PROGRESS', stage: '面试', outcome: null },
        }),
      },
    })
    expect(wrapper.text()).toContain('进行中 · 面试')
  })

  it('shows HIRED status', () => {
    const wrapper = mount(CandidateCard, {
      props: {
        candidate: makeCandidate({
          latest_application: {
            job_title: '前端工程师',
            state: 'HIRED',
            stage: null,
            outcome: null,
            status_changed_at: '2026-03-08T08:00:00Z',
            hire_date: '2026-03-08',
          },
        }),
      },
    })
    expect(wrapper.text()).toContain('前端工程师 · 03-08入职')
  })

  it('falls back to generic hired text when status date is missing', () => {
    const wrapper = mount(CandidateCard, {
      props: {
        candidate: makeCandidate({
          latest_application: { job_title: '前端工程师', state: 'HIRED', stage: null, outcome: null },
        }),
      },
    })
    expect(wrapper.text()).toContain('前端工程师 · 已入职')
  })

  it('shows LEFT status', () => {
    const wrapper = mount(CandidateCard, {
      props: {
        candidate: makeCandidate({
          latest_application: { job_title: '产品经理', state: 'LEFT', stage: null, outcome: null },
        }),
      },
    })
    expect(wrapper.text()).toContain('上次：产品经理 · 已离职')
  })

  it('shows REJECTED status', () => {
    const wrapper = mount(CandidateCard, {
      props: {
        candidate: makeCandidate({
          latest_application: { job_title: '设计师', state: 'REJECTED', stage: '面试', outcome: '不合适' },
        }),
      },
    })
    expect(wrapper.text()).toContain('上次：设计师 · 面试 · 不合适')
  })

  it('shows empty status when no application', () => {
    const wrapper = mount(CandidateCard, {
      props: { candidate: makeCandidate({ latest_application: null }) },
    })
    const status = wrapper.find('.candidate-card__status')
    expect(status.text()).toBe('')
  })

  it('shows blacklist tag', () => {
    const wrapper = mount(CandidateCard, {
      props: {
        candidate: makeCandidate({ blacklisted: true, blacklist_reason: '简历造假' }),
      },
    })
    expect(wrapper.find('.candidate-card__blacklist-tag').text()).toBe('黑名单')
    expect(wrapper.text()).toContain('简历造假')
  })

  it('does not show blacklist tag for non-blacklisted', () => {
    const wrapper = mount(CandidateCard, {
      props: { candidate: makeCandidate() },
    })
    expect(wrapper.find('.candidate-card__blacklist-tag').exists()).toBe(false)
  })

  it('emits select on card click', async () => {
    const wrapper = mount(CandidateCard, {
      props: { candidate: makeCandidate({ id: 42 }) },
    })
    await wrapper.trigger('click')
    expect(wrapper.emitted('select')).toEqual([[42]])
  })

  it('emits toggle-star on star click', async () => {
    const wrapper = mount(CandidateCard, {
      props: { candidate: makeCandidate({ id: 7 }) },
    })
    await wrapper.find('.star-button').trigger('click')
    expect(wrapper.emitted('toggle-star')).toEqual([[7]])
    // Should NOT emit select (stopPropagation)
    expect(wrapper.emitted('select')).toBeUndefined()
  })

  it('shows active star for starred candidate', () => {
    const wrapper = mount(CandidateCard, {
      props: { candidate: makeCandidate({ starred: 1 }) },
    })
    expect(wrapper.find('.star-button--active').exists()).toBe(true)
  })
})
