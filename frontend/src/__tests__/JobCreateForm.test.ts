import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import JobCreateForm from '@/components/job-panel/JobCreateForm.vue'
import { createJob } from '@/api/jobs'
import { createDepartment, createLocation, fetchDepartments, fetchLocations } from '@/api/company'

vi.mock('@/api/jobs')
vi.mock('@/api/company')

describe('JobCreateForm', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    vi.mocked(fetchDepartments).mockResolvedValue([
      { id: 1, type: 'department', name: '技术部', sort_order: 0, address: null },
    ])
    vi.mocked(fetchLocations).mockResolvedValue([
      { id: 2, type: 'location', name: '北京', sort_order: 0, address: '北京市朝阳区' },
    ])
    vi.mocked(createDepartment).mockResolvedValue({
      id: 3,
      type: 'department',
      name: '产品部',
      sort_order: 1,
      address: null,
    })
    vi.mocked(createLocation).mockResolvedValue({
      id: 4,
      type: 'location',
      name: '上海',
      sort_order: 1,
      address: '上海市静安区',
    })
  })

  it('缺少必填字段时显示面板内错误提示', async () => {
    const wrapper = mount(JobCreateForm)
    await flushPromises()

    await wrapper.find('form').trigger('submit.prevent')
    await flushPromises()

    expect(wrapper.text()).toContain('请填写所有必填字段')
    expect(createJob).not.toHaveBeenCalled()
  })

  it('创建失败时显示用户可见错误提示', async () => {
    vi.mocked(createJob).mockRejectedValue(new Error('创建失败，请重试'))

    const wrapper = mount(JobCreateForm)
    await flushPromises()

    await wrapper.find('input[type="text"]').setValue('后端工程师')
    await wrapper.find('select').setValue('技术部')

    const selects = wrapper.findAll('select')
    await selects[1].setValue('北京')
    await flushPromises()

    const numberInput = wrapper.find('input[type="number"]')
    await numberInput.setValue('2')
    await wrapper.find('textarea').setValue('负责后端开发')

    await wrapper.find('form').trigger('submit.prevent')
    await flushPromises()

    expect(createJob).toHaveBeenCalled()
    expect(wrapper.text()).toContain('创建失败，请重试')
  })

  it('支持内联新增部门并自动选中', async () => {
    const wrapper = mount(JobCreateForm)
    await flushPromises()

    const toggleButton = wrapper.findAll('button').find(button => button.text() === '+ 新增部门')
    expect(toggleButton).toBeTruthy()
    await toggleButton!.trigger('click')

    const newDepartmentInput = wrapper.find('input[placeholder="输入新部门名称"]')
    await newDepartmentInput.setValue('产品部')
    await wrapper.find('.inline-actions .btn--primary').trigger('click')
    await flushPromises()

    expect(createDepartment).toHaveBeenCalledWith({
      type: 'department',
      name: '产品部',
    })
    expect((wrapper.findAll('select')[0].element as HTMLSelectElement).value).toBe('产品部')
  })

  it('支持内联新增地点并自动带入地址', async () => {
    const wrapper = mount(JobCreateForm)
    await flushPromises()

    const toggleButton = wrapper.findAll('button').find(button => button.text() === '+ 新增地点')
    expect(toggleButton).toBeTruthy()
    await toggleButton!.trigger('click')

    const inlineInputs = wrapper.findAll('.inline-create input')
    await inlineInputs[0].setValue('上海')
    await inlineInputs[1].setValue('上海市静安区')
    await wrapper.find('.inline-actions .btn--primary').trigger('click')
    await flushPromises()

    expect(createLocation).toHaveBeenCalledWith({
      type: 'location',
      name: '上海',
      address: '上海市静安区',
    })

    const selects = wrapper.findAll('select')
    expect((selects[1].element as HTMLSelectElement).value).toBe('上海')
    expect((wrapper.find('input[readonly]').element as HTMLInputElement).value).toBe('上海市静安区')
  })

  it('允许地点地址为空时新增地点并创建岗位', async () => {
    vi.mocked(createLocation).mockResolvedValueOnce({
      id: 5,
      type: 'location',
      name: '杭州',
      sort_order: 2,
      address: null,
    })
    vi.mocked(createJob).mockResolvedValueOnce({
      id: 9,
      title: '招聘运营',
      department: '技术部',
      location_name: '杭州',
      location_address: null,
      headcount: 1,
      jd: '负责招聘流程运营',
      priority: 'medium',
      target_onboard_date: null,
      notes: null,
      status: 'open',
      close_reason: null,
      closed_at: null,
      created_at: '2026-03-09T00:00:00Z',
      updated_at: '2026-03-09T00:00:00Z',
    })

    const wrapper = mount(JobCreateForm)
    await flushPromises()

    const toggleButton = wrapper.findAll('button').find(button => button.text() === '+ 新增地点')
    expect(toggleButton).toBeTruthy()
    await toggleButton!.trigger('click')

    const inlineInputs = wrapper.findAll('.inline-create input')
    await inlineInputs[0].setValue('杭州')
    await wrapper.find('.inline-actions .btn--primary').trigger('click')
    await flushPromises()

    expect(createLocation).toHaveBeenCalledWith({
      type: 'location',
      name: '杭州',
    })

    await wrapper.find('input[type="text"]').setValue('招聘运营')

    const selects = wrapper.findAll('select')
    await selects[0].setValue('技术部')
    await flushPromises()

    await wrapper.find('input[type="number"]').setValue('1')
    await wrapper.find('textarea').setValue('负责招聘流程运营')

    await wrapper.find('form').trigger('submit.prevent')
    await flushPromises()

    expect(createJob).toHaveBeenCalledTimes(1)
    const payload = vi.mocked(createJob).mock.calls[0][0]
    expect(payload).toMatchObject({
      title: '招聘运营',
      department: '技术部',
      location_name: '杭州',
      headcount: 1,
      jd: '负责招聘流程运营',
      priority: 'medium',
    })
    expect(payload).not.toHaveProperty('location_address')
    expect(wrapper.text()).not.toContain('请填写所有必填字段')
  })

  it('部门和地点选项按 sort_order 顺序展示', async () => {
    vi.mocked(fetchDepartments).mockResolvedValue([
      { id: 2, type: 'department', name: '产品部', sort_order: 2, address: null },
      { id: 1, type: 'department', name: '技术部', sort_order: 0, address: null },
      { id: 3, type: 'department', name: '运营部', sort_order: 1, address: null },
    ])
    vi.mocked(fetchLocations).mockResolvedValue([
      { id: 6, type: 'location', name: '上海', sort_order: 1, address: '上海市静安区' },
      { id: 5, type: 'location', name: '北京', sort_order: 0, address: '北京市朝阳区' },
    ])

    const wrapper = mount(JobCreateForm)
    await flushPromises()

    const selects = wrapper.findAll('select')
    const departmentOptions = Array.from((selects[0].element as HTMLSelectElement).options).slice(1).map(option => option.text)
    const locationOptions = Array.from((selects[1].element as HTMLSelectElement).options).slice(1).map(option => option.text)

    expect(departmentOptions).toEqual(['技术部', '运营部', '产品部'])
    expect(locationOptions).toEqual(['北京', '上海'])
  })
})
