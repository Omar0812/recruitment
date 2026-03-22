import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import JobCard from '@/components/jobs/JobCard.vue'

const baseJob = {
  id: 1,
  title: '前端工程师',
  department: '技术部',
  location_name: '北京',
  location_address: '北京市朝阳区',
  headcount: 2,
  jd: 'JD 内容',
  priority: 'high',
  target_onboard_date: '2026-03-20T00:00:00Z',
  notes: null,
  status: 'open',
  close_reason: null,
  closed_at: null,
  hired_count: 0,
  stage_distribution: {},
  created_at: '2026-03-01T00:00:00Z',
  updated_at: '2026-03-01T00:00:00Z',
}

describe('JobCard', () => {
  it('有编制时显示进度条，hired_count=0 显示 0/N 到岗', () => {
    const wrapper = mount(JobCard, {
      props: { job: baseJob },
    })

    expect(wrapper.text()).toContain('招聘中')
    expect(wrapper.text()).toContain('P0')
    expect(wrapper.text()).toContain('0/2 到岗')
    expect(wrapper.find('.progress-bar').exists()).toBe(true)
    expect(wrapper.find('.progress-fill').attributes('style')).toContain('width: 0%')
  })

  it('hired_count > 0 时进度条有宽度', () => {
    const wrapper = mount(JobCard, {
      props: {
        job: { ...baseJob, hired_count: 1 },
      },
    })

    expect(wrapper.text()).toContain('1/2 到岗')
    expect(wrapper.find('.progress-fill').attributes('style')).toContain('width: 50%')
  })

  it('headcount=0 时不显示进度条，显示编制文案', () => {
    const wrapper = mount(JobCard, {
      props: {
        job: { ...baseJob, headcount: 0, hired_count: 0 },
      },
    })

    expect(wrapper.text()).toContain('编制 0 人')
    expect(wrapper.find('.progress-bar').exists()).toBe(false)
  })

  it('有阶段分布时显示分布文案', () => {
    const wrapper = mount(JobCard, {
      props: {
        job: {
          ...baseJob,
          stage_distribution: { '简历筛选': 1, '面试': 2 },
        },
      },
    })

    expect(wrapper.text()).toContain('筛选1')
    expect(wrapper.text()).toContain('面试2')
    expect(wrapper.find('.stage-distribution').exists()).toBe(true)
  })

  it('无活跃候选人时不显示阶段分布', () => {
    const wrapper = mount(JobCard, {
      props: { job: baseJob },
    })

    expect(wrapper.find('.stage-distribution').exists()).toBe(false)
  })

  it('已关闭岗位展示关闭摘要', () => {
    const wrapper = mount(JobCard, {
      props: {
        job: {
          ...baseJob,
          status: 'closed',
          close_reason: '招满了',
          closed_at: '2026-03-15T00:00:00Z',
        },
      },
    })

    expect(wrapper.text()).toContain('已关闭')
    expect(wrapper.text()).toContain('招满了')
    expect(wrapper.text()).toContain('03-01 ~ 03-15')
    expect(wrapper.find('.card-footer--urgent').exists()).toBe(false)
  })
})
