import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'

// Mock API
vi.mock('@/api/files', () => ({
  uploadFile: vi.fn(),
  parseResume: vi.fn(),
}))

vi.mock('@/api/intake', () => ({
  checkDuplicate: vi.fn(),
  resolveIntake: vi.fn(),
  fetchCandidate: vi.fn(),
  fetchCandidateApplications: vi.fn(),
}))

vi.mock('@/api/jobs', () => ({
  fetchOpenJobs: vi.fn(),
}))

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

vi.mock('@/api/pipeline', () => ({
  executeAction: vi.fn(),
  fetchActiveApplications: vi.fn(),
  fetchCandidate: vi.fn(),
  fetchJob: vi.fn(),
  fetchEvents: vi.fn(),
  fetchAvailableActions: vi.fn(),
}))

const mockBack = vi.fn()
const mockPush = vi.fn()
vi.mock('vue-router', () => ({
  useRouter: () => ({
    back: mockBack,
    push: mockPush,
  }),
}))

import CandidateCreateView from '@/views/CandidateCreateView.vue'
import CandidateForm from '@/components/candidate-create/CandidateForm.vue'
import { uploadFile, parseResume } from '@/api/files'
import { useCandidateCreate } from '@/composables/useCandidateCreate'

const mockUploadFile = vi.mocked(uploadFile)
const mockParseResume = vi.mocked(parseResume)

function makeFile(name = 'test.pdf') {
  return new File(['content'], name, { type: 'application/pdf' })
}

describe('简历 AI 解析预填', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    const { reset } = useCandidateCreate()
    reset()
  })

  it('单文件上传后触发解析并预填表单', async () => {
    const uploadResult = { file_id: 'abc', file_path: 'data/resumes/abc.pdf', sha256: 'abc' }
    const parseResult = {
      name: '李四',
      phone: '13900139000',
      email: 'lisi@example.com',
      age: 28,
      years_exp: 5,
      skill_tags: ['Python', 'SQL'],
      education_list: [{ school: '清华大学', degree: '硕士', period: '2018.09-2021.06' }],
      work_experience: [{ company: '字节跳动', title: '后端工程师', period: '2021.07-至今' }],
    }

    mockUploadFile.mockResolvedValue(uploadResult)
    mockParseResume.mockResolvedValue(parseResult)

    const { state, setFiles, proceedWithFiles } = useCandidateCreate()
    setFiles([makeFile()])
    await proceedWithFiles()
    await flushPromises()

    expect(mockParseResume).toHaveBeenCalledWith('data/resumes/abc.pdf')
    expect(state.form.name).toBe('李四')
    expect(state.form.phone).toBe('13900139000')
    expect(state.form.email).toBe('lisi@example.com')
    expect(state.form.age).toBe(28)
    expect(state.form.years_exp).toBe(5)
    expect(state.form.skill_tags).toEqual(['Python', 'SQL'])
    expect(state.form.education_list?.[0]?.school).toBe('清华大学')
    expect(state.form.education_list?.[0]?.start).toBe('2018-09')
    expect(state.form.education_list?.[0]?.end).toBe('2021-06')
    expect(state.form.work_experience?.[0]?.company).toBe('字节跳动')
    expect(state.form.last_company).toBe('字节跳动')
    expect(state.form.last_title).toBe('后端工程师')
  })

  it('解析失败时静默降级，表单保持空白', async () => {
    const uploadResult = { file_id: 'abc', file_path: 'data/resumes/abc.pdf', sha256: 'abc' }
    mockUploadFile.mockResolvedValue(uploadResult)
    mockParseResume.mockRejectedValue(new Error('网络异常'))

    const { state, setFiles, proceedWithFiles } = useCandidateCreate()
    setFiles([makeFile()])
    await proceedWithFiles()
    await flushPromises()

    expect(state.step).toBe('form')
    expect(state.form.name).toBe('')
    expect(state.error).toBeNull()
  })

  it('解析返回空对象时不影响表单', async () => {
    const uploadResult = { file_id: 'abc', file_path: 'data/resumes/abc.pdf', sha256: 'abc' }
    mockUploadFile.mockResolvedValue(uploadResult)
    mockParseResume.mockResolvedValue({})

    const { state, setFiles, proceedWithFiles } = useCandidateCreate()
    setFiles([makeFile()])
    await proceedWithFiles()
    await flushPromises()

    expect(state.step).toBe('form')
    expect(state.form.name).toBe('')
  })

  it('parsing 状态在解析期间为 true', async () => {
    const uploadResult = { file_id: 'abc', file_path: 'data/resumes/abc.pdf', sha256: 'abc' }
    mockUploadFile.mockResolvedValue(uploadResult)

    let resolveParsePromise: (v: any) => void
    mockParseResume.mockReturnValue(new Promise((resolve) => { resolveParsePromise = resolve }))

    const { state, setFiles, proceedWithFiles } = useCandidateCreate()
    setFiles([makeFile()])
    await proceedWithFiles()

    expect(state.parsing).toBe(true)

    resolveParsePromise!({ name: '测试' })
    await flushPromises()

    expect(state.parsing).toBe(false)
  })
})

describe('日期字段使用年月双下拉', () => {
  it('教育经历渲染 YearMonthPicker（含年和月两个 select）', () => {
    const wrapper = mount(CandidateForm, {
      props: {
        form: {
          name: '',
          education_list: [{ school: '测试大学' }],
          work_experience: [{}],
          project_experience: [],
          skill_tags: [],
        },
        submitting: false,
        parsing: false,
        error: null,
      },
    })

    // 每个 YearMonthPicker 有 2 个 select（年+月），教育经历 start+end = 4 个
    const ymSelects = wrapper.findAll('.ym-picker select')
    expect(ymSelects.length).toBeGreaterThanOrEqual(4)
  })

  it('工作经历也渲染 YearMonthPicker', () => {
    const wrapper = mount(CandidateForm, {
      props: {
        form: {
          name: '',
          education_list: [{}],
          work_experience: [{ company: '测试公司' }],
          project_experience: [],
          skill_tags: [],
        },
        submitting: false,
        parsing: false,
        error: null,
      },
    })

    // edu 4 + work 4 = 8 个 select
    const ymSelects = wrapper.findAll('.ym-picker select')
    expect(ymSelects.length).toBeGreaterThanOrEqual(8)
  })

  it('解析中显示 loading 提示', () => {
    const wrapper = mount(CandidateForm, {
      props: {
        form: {
          name: '',
          education_list: [{}],
          work_experience: [{}],
          project_experience: [],
          skill_tags: [],
        },
        submitting: false,
        parsing: true,
        error: null,
      },
    })

    expect(wrapper.find('.parsing-overlay').exists()).toBe(true)
    expect(wrapper.text()).toContain('正在解析简历')
  })

  it('解析完成后不显示 loading', () => {
    const wrapper = mount(CandidateForm, {
      props: {
        form: {
          name: '',
          education_list: [{}],
          work_experience: [{}],
          project_experience: [],
          skill_tags: [],
        },
        submitting: false,
        parsing: false,
        error: null,
      },
    })

    expect(wrapper.find('.parsing-overlay').exists()).toBe(false)
  })
})
