import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import CandidateList from '@/components/talent-pool/CandidateList.vue'
import type { CandidateWithApplication } from '@/api/types'

function makeCandidate(id: number): CandidateWithApplication {
  return {
    id,
    name: `候选人${id}`,
    phone: null,
    email: null,
    source: null,
    name_en: null,
    age: null,
    education: null,
    school: null,
    last_company: null,
    last_title: null,
    years_exp: null,
    skill_tags: [],
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
  }
}

describe('CandidateList', () => {
  it('renders loading skeletons when loading', () => {
    const wrapper = mount(CandidateList, {
      props: { items: [], total: 0, page: 1, pageSize: 20, loading: true },
    })
    expect(wrapper.findAll('.candidate-list__skeleton').length).toBe(5)
  })

  it('renders empty state when no items', () => {
    const wrapper = mount(CandidateList, {
      props: { items: [], total: 0, page: 1, pageSize: 20, loading: false },
    })
    expect(wrapper.text()).toContain('暂无候选人')
  })

  it('renders candidate cards', () => {
    const items = [makeCandidate(1), makeCandidate(2), makeCandidate(3)]
    const wrapper = mount(CandidateList, {
      props: { items, total: 3, page: 1, pageSize: 20, loading: false },
    })
    expect(wrapper.findAll('.candidate-card').length).toBe(3)
  })

  it('shows pagination when multiple pages', () => {
    const items = [makeCandidate(1)]
    const wrapper = mount(CandidateList, {
      props: { items, total: 25, page: 1, pageSize: 20, loading: false },
    })
    expect(wrapper.find('.candidate-list__pagination').exists()).toBe(true)
    expect(wrapper.text()).toContain('1 / 2')
  })

  it('hides pagination when single page', () => {
    const items = [makeCandidate(1)]
    const wrapper = mount(CandidateList, {
      props: { items, total: 1, page: 1, pageSize: 20, loading: false },
    })
    expect(wrapper.find('.candidate-list__pagination').exists()).toBe(false)
  })

  it('emits page on next click', async () => {
    const wrapper = mount(CandidateList, {
      props: { items: [makeCandidate(1)], total: 25, page: 1, pageSize: 20, loading: false },
    })
    const btns = wrapper.findAll('.pagination__btn')
    await btns[1].trigger('click') // next button
    expect(wrapper.emitted('page')).toEqual([[2]])
  })

  it('disables prev button on first page', () => {
    const wrapper = mount(CandidateList, {
      props: { items: [makeCandidate(1)], total: 25, page: 1, pageSize: 20, loading: false },
    })
    const prevBtn = wrapper.findAll('.pagination__btn')[0]
    expect((prevBtn.element as HTMLButtonElement).disabled).toBe(true)
  })

  it('disables next button on last page', () => {
    const wrapper = mount(CandidateList, {
      props: { items: [makeCandidate(1)], total: 25, page: 2, pageSize: 20, loading: false },
    })
    const nextBtn = wrapper.findAll('.pagination__btn')[1]
    expect((nextBtn.element as HTMLButtonElement).disabled).toBe(true)
  })

  it('emits select when card clicked', async () => {
    const wrapper = mount(CandidateList, {
      props: { items: [makeCandidate(42)], total: 1, page: 1, pageSize: 20, loading: false },
    })
    await wrapper.find('.candidate-card').trigger('click')
    expect(wrapper.emitted('select')).toEqual([[42]])
  })

  it('emits toggle-star from card', async () => {
    const wrapper = mount(CandidateList, {
      props: { items: [makeCandidate(7)], total: 1, page: 1, pageSize: 20, loading: false },
    })
    await wrapper.find('.star-button').trigger('click')
    expect(wrapper.emitted('toggle-star')).toEqual([[7]])
  })
})
