import { describe, it, expect, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'

vi.mock('@/api/channels', () => ({
  fetchSourceTags: vi.fn(),
  fetchSuppliers: vi.fn(),
  createSourceTag: vi.fn(),
  createSupplier: vi.fn(),
  splitSourceTags: (tags: Array<{ type?: string; name: string }>) => ({
    platformTags: tags.filter((tag) => tag.type === 'platform'),
    otherTags: tags.filter((tag) => tag.type === 'other'),
  }),
}))

vi.mock('@/api/files', () => ({
  uploadFile: vi.fn(),
  fetchFileAsBlob: vi.fn(),
}))

import CandidateForm from '@/components/candidate-create/CandidateForm.vue'
import { fetchFileAsBlob } from '@/api/files'
import type { CandidateCreatePayload } from '@/api/types'

function makeForm(overrides: Partial<CandidateCreatePayload> = {}): CandidateCreatePayload {
  return {
    name: '',
    phone: undefined,
    email: undefined,
    source: undefined,
    name_en: undefined,
    age: undefined,
    education: undefined,
    school: undefined,
    last_company: undefined,
    last_title: undefined,
    years_exp: undefined,
    skill_tags: [],
    education_list: [{}],
    work_experience: [{}],
    project_experience: [],
    notes: undefined,
    resume_path: undefined,
    supplier_id: undefined,
    referred_by: undefined,
    ...overrides,
  }
}

function mountForm(formOverrides: Partial<CandidateCreatePayload> = {}, propsOverrides = {}) {
  return mount(CandidateForm, {
    props: {
      form: makeForm(formOverrides),
      submitting: false,
      parsing: false,
      error: null,
      ...propsOverrides,
    },
  })
}

describe('CandidateForm', () => {
  it('渲染所有表单区域', () => {
    const wrapper = mountForm()
    const text = wrapper.text()
    expect(text).toContain('基本信息')
    expect(text).toContain('教育经历')
    expect(text).toContain('工作经历')
    expect(text).toContain('项目经历')
    expect(text).toContain('技能标签')
    expect(text).toContain('备注')
  })

  it('无姓名时校验失败不触发 submit', async () => {
    const wrapper = mountForm({ source: 'BOSS直聘' })
    const submitBtn = wrapper.findAll('button').find((b) => b.text() === '确认建档')
    await submitBtn!.trigger('click')

    expect(wrapper.emitted('submit')).toBeFalsy()
    expect(wrapper.text()).toContain('姓名不能为空')
  })

  it('无来源时校验失败不触发 submit', async () => {
    const wrapper = mountForm({ name: '张三' })
    const submitBtn = wrapper.findAll('button').find((b) => b.text() === '确认建档')
    await submitBtn!.trigger('click')

    expect(wrapper.emitted('submit')).toBeFalsy()
    expect(wrapper.text()).toContain('来源渠道不能为空')
  })

  it('姓名和来源都有时触发 submit', async () => {
    const wrapper = mountForm({ name: '张三', source: 'BOSS直聘' })
    const submitBtn = wrapper.findAll('button').find((b) => b.text() === '确认建档')
    await submitBtn!.trigger('click')

    expect(wrapper.emitted('submit')).toBeTruthy()
  })

  it('点击取消触发 cancel', async () => {
    const wrapper = mountForm()
    const cancelBtn = wrapper.findAll('button').find((b) => b.text() === '取消')
    await cancelBtn!.trigger('click')

    expect(wrapper.emitted('cancel')).toBeTruthy()
  })

  it('添加教育经历条目', async () => {
    const form = makeForm()
    const wrapper = mount(CandidateForm, {
      props: { form, submitting: false, error: null },
    })

    expect(form.education_list).toHaveLength(1)

    const addBtn = wrapper.findAll('button').find((b) => b.text() === '+ 添加教育经历')
    await addBtn!.trigger('click')

    expect(form.education_list).toHaveLength(2)
  })

  it('移除教育经历条目（多于1条时）', async () => {
    const form = makeForm({ education_list: [{}, {}] })
    const wrapper = mount(CandidateForm, {
      props: { form, submitting: false, error: null },
    })

    expect(form.education_list).toHaveLength(2)

    // 找到教育经历区域的移除按钮
    const removeButtons = wrapper.findAll('.entry-remove')
    await removeButtons[0].trigger('click')

    expect(form.education_list).toHaveLength(1)
  })

  it('添加工作经历条目', async () => {
    const form = makeForm()
    const wrapper = mount(CandidateForm, {
      props: { form, submitting: false, error: null },
    })

    expect(form.work_experience).toHaveLength(1)

    const addBtn = wrapper.findAll('button').find((b) => b.text() === '+ 添加工作经历')
    await addBtn!.trigger('click')

    expect(form.work_experience).toHaveLength(2)
  })

  it('移除工作经历条目（多于1条时）', async () => {
    const form = makeForm({ work_experience: [{}, {}] })
    const wrapper = mount(CandidateForm, {
      props: { form, submitting: false, error: null },
    })

    const addBtn = wrapper.findAll('button').find((b) => b.text() === '+ 添加工作经历')
    // 工作经历区域的移除按钮在教育经历之后
    // 先确认有2条工作经历
    expect(form.work_experience).toHaveLength(2)

    // 找到工作经历 section 内的 entry-remove
    const sections = wrapper.findAll('.form-section')
    // 工作经历是第3个 section（基本信息、教育经历、工作经历）
    const workSection = sections[2]
    const removeBtn = workSection.find('.entry-remove')
    await removeBtn.trigger('click')

    expect(form.work_experience).toHaveLength(1)
  })

  it('添加和移除项目经历条目', async () => {
    const form = makeForm()
    const wrapper = mount(CandidateForm, {
      props: { form, submitting: false, error: null },
    })

    expect(form.project_experience).toHaveLength(0)

    const addBtn = wrapper.findAll('button').find((b) => b.text() === '+ 添加项目经历')
    await addBtn!.trigger('click')

    expect(form.project_experience).toHaveLength(1)

    // 项目经历的移除按钮
    const sections = wrapper.findAll('.form-section')
    const projSection = sections[3]
    const removeBtn = projSection.find('.entry-remove')
    await removeBtn.trigger('click')

    expect(form.project_experience).toHaveLength(0)
  })

  it('添加和移除技能标签', async () => {
    const form = makeForm()
    const wrapper = mount(CandidateForm, {
      props: { form, submitting: false, error: null },
    })

    const tagInput = wrapper.find('.tag-input')
    await tagInput.setValue('Vue')
    await tagInput.trigger('keydown', { key: 'Enter' })

    expect(form.skill_tags).toContain('Vue')

    // 移除标签
    const tagRemove = wrapper.find('.tag-remove')
    await tagRemove.trigger('click')

    expect(form.skill_tags).toHaveLength(0)
  })

  it('输入姓名/手机/邮箱时触发 key-field-change', async () => {
    const wrapper = mountForm()

    const nameInput = wrapper.find('input[placeholder="姓名"]')
    await nameInput.setValue('张三')
    await nameInput.trigger('input')

    expect(wrapper.emitted('key-field-change')).toBeTruthy()
  })

  it('有 filePreview 且 previewPath 时显示 iframe 预览区', async () => {
    vi.mocked(fetchFileAsBlob).mockResolvedValue('blob:http://localhost/fake-blob')
    const wrapper = mountForm({}, {
      filePreview: {
        name: '张三_简历.pdf',
        sizeLabel: '文件大小：120 KB',
        status: '已上传',
      },
      filePath: 'data/resumes/abc123.pdf',
    })
    await flushPromises()
    expect(wrapper.find('.resume-preview-area').exists()).toBe(true)
    expect(wrapper.find('.resume-preview-area__iframe').exists()).toBe(true)
    expect(wrapper.find('.resume-preview-area__iframe').attributes('src')).toBe('blob:http://localhost/fake-blob')
  })

  it('有 filePreview 但无 filePath 时显示降级提示', () => {
    const wrapper = mountForm({}, {
      filePreview: {
        name: '张三_简历.docx',
        sizeLabel: '文件大小：120 KB',
        status: '已上传',
      },
      filePath: null,
    })
    expect(wrapper.find('.resume-preview-area').exists()).toBe(true)
    expect(wrapper.find('.resume-preview-area__iframe').exists()).toBe(false)
    expect(wrapper.text()).toContain('预览生成失败，请下载查看')
    expect(wrapper.text()).toContain('张三_简历.docx')
  })

  it('无 filePreview 时不显示预览区', () => {
    const wrapper = mountForm()
    expect(wrapper.find('.resume-preview-area').exists()).toBe(false)
  })

  it('显示错误信息', () => {
    const wrapper = mountForm({}, { error: '建档失败' })
    expect(wrapper.text()).toContain('建档失败')
  })

  it('提交中按钮显示建档中', () => {
    const wrapper = mountForm({}, { submitting: true })
    expect(wrapper.text()).toContain('建档中...')
    const btn = wrapper.find('.btn-primary')
    expect((btn.element as HTMLButtonElement).disabled).toBe(true)
  })
})
