import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'

// Mock 所有 API 模块
vi.mock('@/api/files', () => ({
  uploadFile: vi.fn(),
  parseResume: vi.fn().mockResolvedValue({}),
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

// Mock vue-router
const mockBack = vi.fn()
const mockPush = vi.fn()
vi.mock('vue-router', () => ({
  useRouter: () => ({
    back: mockBack,
    push: mockPush,
  }),
}))

import CandidateCreateView from '@/views/CandidateCreateView.vue'
import { uploadFile } from '@/api/files'
import { stashDroppedFiles, useCandidateCreate } from '@/composables/useCandidateCreate'
import { fetchOpenJobs } from '@/api/jobs'

const mockFetchOpenJobs = vi.mocked(fetchOpenJobs)
const mockUploadFile = vi.mocked(uploadFile)
const confirmMock = vi.fn()

function makeFile(name: string): File {
  return new File(['x'], name, { type: 'application/pdf' })
}

function makeCandidate(id: number, name = '张三') {
  return {
    id,
    name,
    phone: '13800138000',
    email: 'zhang@test.com',
    source: 'BOSS直聘',
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
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
  }
}

describe('CandidateCreateView', () => {
  beforeEach(() => {
    const { reset } = useCandidateCreate()
    reset()
    vi.clearAllMocks()
    confirmMock.mockReturnValue(true)
    vi.stubGlobal('confirm', confirmMock)
    mockFetchOpenJobs.mockResolvedValue({
      items: [
        {
          id: 1,
          title: '后端工程师',
          department: '技术部',
          location_name: null,
          location_address: null,
          headcount: 1,
          jd: null,
          priority: null,
          target_onboard_date: null,
          notes: null,
          status: 'open',
          close_reason: null,
          closed_at: null,
          created_at: '2026-01-01T00:00:00Z',
          updated_at: '2026-01-01T00:00:00Z',
        },
      ],
      total: 1,
      page: 1,
      page_size: 100,
    })
  })

  function mountView() {
    return mount(CandidateCreateView)
  }

  it('渲染页面标题"新建候选人"', () => {
    const wrapper = mountView()
    expect(wrapper.text()).toContain('新建候选人')
  })

  it('初始显示 file-select 步骤', () => {
    const wrapper = mountView()
    // FileUploadZone 渲染时应该包含拖拽提示
    expect(wrapper.text()).toContain('拖拽简历文件到这里，或点击选择')
    expect(wrapper.text()).toContain('不上传文件，直接填写')
  })

  it('手动路径：点击直接填写后显示表单', async () => {
    const wrapper = mountView()

    const manualBtn = wrapper.findAll('button').find((b) => b.text() === '不上传文件，直接填写')
    await manualBtn!.trigger('click')
    await flushPromises()

    // 应该显示表单内容
    expect(wrapper.text()).toContain('基本信息')
    expect(wrapper.text()).toContain('确认建档')
  })

  it('单文件路径显示简历预览区', async () => {
    const { state } = useCandidateCreate()
    state.step = 'form'
    state.files = [new File(['hello world'], '张三_简历.pdf', { type: 'application/pdf' })]
    state.uploadResult = {
      file_id: 'f-1',
      file_path: '/uploads/zhangsan.pdf',
      sha256: 'sha-1',
    }

    const wrapper = mountView()
    await flushPromises()

    const preview = wrapper.find('.resume-preview-area')
    expect(preview.exists()).toBe(true)
  })

  it('表单步骤点击取消（表单未填写）触发路由返回', async () => {
    // 先进入 form 步骤
    const { goManual } = useCandidateCreate()
    goManual()

    const wrapper = mountView()
    await flushPromises()

    // 因为 isFormDirty() 为 false，不会弹 confirm
    const cancelBtn = wrapper.findAll('button').find((b) => b.text() === '取消')
    await cancelBtn!.trigger('click')

    expect(mockBack).toHaveBeenCalled()
  })

  it('文件选择空状态点击取消直接返回，不弹确认', async () => {
    const wrapper = mountView()

    const cancelBtn = wrapper.findAll('button').find((button) => button.text() === '取消')
    await cancelBtn!.trigger('click')

    expect(confirmMock).not.toHaveBeenCalled()
    expect(mockBack).toHaveBeenCalled()
  })

  it('分组步骤点击取消会先确认再返回', async () => {
    const { state } = useCandidateCreate()
    state.step = 'grouping'
    state.groups = [
      {
        label: '张三_简历',
        files: [makeFile('张三_简历.pdf'), makeFile('张三_作品集.pdf')],
      },
    ]

    const wrapper = mountView()
    const cancelBtn = wrapper.findAll('button').find((button) => button.text() === '取消')
    await cancelBtn!.trigger('click')

    expect(confirmMock).toHaveBeenCalledWith('放弃当前填写的内容？')
    expect(mockBack).toHaveBeenCalled()
  })

  it('岗位关联步骤点击取消会先确认再返回', async () => {
    const { state } = useCandidateCreate()
    state.step = 'job-link'
    state.createdCandidate = makeCandidate(1)

    const wrapper = mountView()
    await flushPromises()

    const cancelBtn = wrapper.findAll('button').find((button) => button.text() === '取消')
    await cancelBtn!.trigger('click')

    expect(confirmMock).toHaveBeenCalledWith('放弃当前填写的内容？')
    expect(mockBack).toHaveBeenCalled()
  })

  it('查看当前流程会跳到具体 application 展开态', async () => {
    const { state, goManual } = useCandidateCreate()
    goManual()
    state.form.name = '张三'
    state.form.source = 'BOSS直聘'
    state.duplicateCheck = {
      matches: [
        {
          candidate_id: 3,
          display_id: 'C-0003',
          name: '张三',
          phone: '13800138000',
          email: 'zhang@test.com',
          last_company: '字节跳动',
          last_title: '后端工程师',
          match_reasons: ['phone'],
          match_level: 'high',
          is_blacklisted: false,
          blacklist_reason: null,
          last_application: null,
          active_link: {
            application_id: 101,
            job_id: 8,
            job_title: '产品经理',
            stage: '面试',
          },
        },
      ],
      requires_decision: true,
      has_blocking_in_progress_match: true,
    }

    const wrapper = mountView()
    const viewBtn = wrapper.findAll('button').find((button) => button.text() === '查看当前流程')
    await viewBtn!.trigger('click')

    expect(mockPush).toHaveBeenCalledWith({ path: '/pipeline', query: { expand: '101' } })
  })

  it('单文件/手动路径跳过岗位后跳到人才库', async () => {
    const { state } = useCandidateCreate()
    state.step = 'job-link'
    state.createdCandidate = makeCandidate(1)

    const wrapper = mountView()
    await flushPromises()

    const skipBtn = wrapper.findAll('button').find((button) => button.text() === '跳过，先存人才库')
    await skipBtn!.trigger('click')
    await flushPromises()

    expect(mockPush).toHaveBeenCalledWith('/talent-pool')
  })

  it('多文件汇总展示岗位标题，完成后有人加入流程则跳去流程页', async () => {
    const { state } = useCandidateCreate()
    state.step = 'done'
    state.queue = [
      {
        group: { label: '张三', files: [makeFile('张三.pdf')] },
        form: { ...state.form, name: '张三' },
        duplicateCheck: null,
        result: {
          candidate: makeCandidate(1, '张三'),
          linkedJob: {
            id: 1,
            title: '后端工程师',
            department: '技术部',
            location_name: null,
            location_address: null,
            headcount: 1,
            jd: null,
            priority: null,
            target_onboard_date: null,
            notes: null,
            status: 'open',
            close_reason: null,
            closed_at: null,
            created_at: '2026-01-01T00:00:00Z',
            updated_at: '2026-01-01T00:00:00Z',
          },
        },
      },
      {
        group: { label: '李四', files: [makeFile('李四.pdf')] },
        form: { ...state.form, name: '李四' },
        duplicateCheck: null,
        result: {
          candidate: makeCandidate(2, '李四'),
          linkedJob: null,
        },
      },
    ]

    const wrapper = mountView()
    expect(wrapper.text()).toContain('后端工程师')
    expect(wrapper.text()).toContain('人才库')

    const doneBtn = wrapper.findAll('button').find((button) => button.text() === '完成')
    await doneBtn!.trigger('click')

    expect(mockPush).toHaveBeenCalledWith('/pipeline')
  })

  it('多文件汇总全部存人才库时完成后跳到人才库', async () => {
    const { state } = useCandidateCreate()
    state.step = 'done'
    state.queue = [
      {
        group: { label: '王五', files: [makeFile('王五.pdf')] },
        form: { ...state.form, name: '王五' },
        duplicateCheck: null,
        result: {
          candidate: makeCandidate(3, '王五'),
          linkedJob: null,
        },
      },
    ]

    const wrapper = mountView()
    const doneBtn = wrapper.findAll('button').find((button) => button.text() === '完成')
    await doneBtn!.trigger('click')

    expect(mockPush).toHaveBeenCalledWith('/talent-pool')
  })

  it('从简报拖拽进入时自动承接单文件并进入表单', async () => {
    stashDroppedFiles([makeFile('张三_简历.pdf')])
    mockUploadFile.mockResolvedValue({
      file_id: 'f-1',
      file_path: '/uploads/zhangsan.pdf',
      sha256: 'sha-1',
    })

    const wrapper = mountView()
    await flushPromises()

    expect(mockUploadFile).toHaveBeenCalledWith(expect.objectContaining({ name: '张三_简历.pdf' }), expect.any(Function))
    expect(wrapper.text()).toContain('基本信息')
    expect(wrapper.text()).toContain('确认建档')
  })

  it('从简报拖拽进入时多文件直接进入分组页', async () => {
    stashDroppedFiles([makeFile('张三_简历.pdf'), makeFile('李四_简历.pdf')])

    const wrapper = mountView()
    await flushPromises()

    expect(mockUploadFile).not.toHaveBeenCalled()
    expect(wrapper.text()).toContain('请确认分组')
    expect(wrapper.text()).toContain('确认分组，开始处理')
  })
})
