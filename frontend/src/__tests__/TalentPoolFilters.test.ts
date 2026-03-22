import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import TalentPoolFilters from '@/components/talent-pool/TalentPoolFilters.vue'
import type { TalentPoolFilters as FilterType } from '@/api/types'

function mountFilters(filters: FilterType = {}, sourceOptions: string[] = [], skillOptions: string[] = []) {
  return mount(TalentPoolFilters, {
    props: { filters, sourceOptions, skillOptions },
  })
}

describe('TalentPoolFilters', () => {
  it('renders search input', () => {
    const wrapper = mountFilters()
    expect(wrapper.find('.filters__search-input').exists()).toBe(true)
  })

  it('renders all filter controls', () => {
    const wrapper = mountFilters()
    const selects = wrapper.findAll('.filters__select')
    // education, years_exp, age, pipeline_status, blacklist = 5 selects
    expect(selects.length).toBe(5)
    // Plus multi-select inputs and starred toggle
    expect(wrapper.find('.filters__tag-input').exists()).toBe(true)
    expect(wrapper.find('.filters__source-input').exists()).toBe(true)
    expect(wrapper.find('.filters__toggle').exists()).toBe(true)
  })

  it('emits search on input', async () => {
    const wrapper = mountFilters()
    const input = wrapper.find('.filters__search-input')
    await input.setValue('张三')
    await input.trigger('input')
    expect(wrapper.emitted('search')).toBeTruthy()
  })

  it('emits update on education change', async () => {
    const wrapper = mountFilters()
    const selects = wrapper.findAll('.filters__select')
    const educationSelect = selects[0]
    await educationSelect.setValue('本科')
    expect(wrapper.emitted('update')).toBeTruthy()
    const payload = (wrapper.emitted('update')![0] as FilterType[])[0]
    expect(payload.education).toBe('本科')
  })

  it('adds skill tags as multi-select values', async () => {
    const wrapper = mountFilters({}, [], ['Go', 'Vue'])
    const input = wrapper.find('.filters__tag-input')
    await input.setValue('Go')
    await input.trigger('keydown', { key: 'Enter' })

    const payload = wrapper.emitted('update')!.at(-1)![0] as FilterType
    expect(payload.tags).toEqual(['Go'])
  })

  it('renders skill options in multi-select menu', async () => {
    const wrapper = mountFilters({}, [], ['Go', 'Vue'])
    await wrapper.find('.filters__tag-input').trigger('focus')
    const options = wrapper.findAll('.filter-multi-select__option')
    expect(options.map((option) => option.text())).toEqual(['Go', 'Vue'])
  })

  it('selects multiple source options from source picker', async () => {
    const wrapper = mountFilters({}, ['猎聘', 'Boss直聘', '内推'])
    await wrapper.find('.filters__source-input').trigger('focus')
    const options = wrapper.findAll('.filter-multi-select__option')
    await options[0].trigger('mousedown')
    await wrapper.setProps({ filters: { source: ['猎聘'] } })
    await wrapper.find('.filters__source-input').trigger('focus')
    await wrapper.findAll('.filter-multi-select__option')[0].trigger('mousedown')

    const payload = wrapper.emitted('update')!.at(-1)![0] as FilterType
    expect(payload.source).toEqual(['猎聘', 'Boss直聘'])
  })

  it('emits custom years and age ranges', async () => {
    const wrapper = mountFilters()
    await wrapper.find('.filters__range-input--years-min').setValue('2.5')
    await wrapper.setProps({ filters: { years_exp_min: 2.5 } })
    await wrapper.find('.filters__range-input--years-max').setValue('4.5')
    await wrapper.setProps({ filters: { years_exp_min: 2.5, years_exp_max: 4.5 } })
    await wrapper.find('.filters__range-input--age-min').setValue('26')
    await wrapper.setProps({ filters: { years_exp_min: 2.5, years_exp_max: 4.5, age_min: 26 } })
    await wrapper.find('.filters__range-input--age-max').setValue('32')

    const payload = wrapper.emitted('update')!.at(-1)![0] as FilterType
    expect(payload.years_exp_min).toBe(2.5)
    expect(payload.years_exp_max).toBe(4.5)
    expect(payload.age_min).toBe(26)
    expect(payload.age_max).toBe(32)
  })

  it('shows active filter tags when filters applied', () => {
    const wrapper = mountFilters({ education: '硕士', starred: true })
    const tags = wrapper.findAll('.filters__active-tag')
    expect(tags.length).toBe(2)
    expect(tags[0].text()).toContain('学历: 硕士')
    expect(tags[1].text()).toContain('只看星标')
  })

  it('does not show active filter tags when no filters', () => {
    const wrapper = mountFilters()
    expect(wrapper.find('.filters__active').exists()).toBe(false)
  })

  it('emits clear on clear-all button', async () => {
    const wrapper = mountFilters({ education: '本科' })
    await wrapper.find('.filters__clear-all').trigger('click')
    expect(wrapper.emitted('clear')).toBeTruthy()
  })

  it('emits update when clearing individual filter tag', async () => {
    const wrapper = mountFilters({ education: '硕士', starred: true })
    const clearBtns = wrapper.findAll('.filters__active-tag-clear')
    await clearBtns[0].trigger('click')
    const payload = (wrapper.emitted('update')![0] as FilterType[])[0]
    expect(payload.education).toBeUndefined()
    expect(payload.starred).toBe(true)
  })

  it('renders source options in multi-select menu', async () => {
    const wrapper = mountFilters({}, ['猎聘', 'Boss直聘', '内推'])
    await wrapper.find('.filters__source-input').trigger('focus')
    const options = wrapper.findAll('.filter-multi-select__option')
    expect(options).toHaveLength(3)
  })

  it('shows years_exp active tag', () => {
    const wrapper = mountFilters({ years_exp_min: 3, years_exp_max: 5 })
    const tags = wrapper.findAll('.filters__active-tag')
    expect(tags.length).toBe(1)
    expect(tags[0].text()).toContain('年限')
  })

  it('shows age active tag', () => {
    const wrapper = mountFilters({ age_min: 25, age_max: 30 })
    const tags = wrapper.findAll('.filters__active-tag')
    expect(tags.length).toBe(1)
    expect(tags[0].text()).toContain('年龄')
  })

  it('shows pipeline_status active tag', () => {
    const wrapper = mountFilters({ pipeline_status: 'in_progress' })
    const tags = wrapper.findAll('.filters__active-tag')
    expect(tags.length).toBe(1)
    expect(tags[0].text()).toContain('进行中')
  })

  it('shows blacklist active tag', () => {
    const wrapper = mountFilters({ blacklist: 'exclude' })
    const tags = wrapper.findAll('.filters__active-tag')
    expect(tags.length).toBe(1)
    expect(tags[0].text()).toContain('排除黑名单')
  })
})
