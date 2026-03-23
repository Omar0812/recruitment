import { reactive } from 'vue'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'

const routerMock = vi.hoisted(() => ({
  push: vi.fn(),
}))

vi.mock('vue-router', () => ({
  useRouter: () => routerMock,
}))

const pipelineApi = vi.hoisted(() => ({
  executeAction: vi.fn(),
  fetchActiveApplications: vi.fn(),
  fetchCandidate: vi.fn(),
  fetchJob: vi.fn(),
  fetchEvents: vi.fn(),
  fetchAvailableActions: vi.fn(),
}))

const candidateApi = vi.hoisted(() => ({
  checkDuplicate: vi.fn(),
}))

const candidatePanelComposable = vi.hoisted(() => ({
  useCandidatePanel: vi.fn(),
  closeCandidatePanel: vi.fn(),
  refresh: vi.fn(),
}))

const jobPanelComposable = vi.hoisted(() => ({
  useJobPanel: vi.fn(),
  open: vi.fn(),
}))

const jobsApi = vi.hoisted(() => ({
  fetchOpenJobs: vi.fn(),
}))

vi.mock('@/api/pipeline', () => ({
  executeAction: pipelineApi.executeAction,
  fetchActiveApplications: pipelineApi.fetchActiveApplications,
  fetchCandidate: pipelineApi.fetchCandidate,
  fetchJob: pipelineApi.fetchJob,
  fetchEvents: pipelineApi.fetchEvents,
  fetchAvailableActions: pipelineApi.fetchAvailableActions,
}))

vi.mock('@/api/candidates', () => ({
  checkDuplicate: candidateApi.checkDuplicate,
}))

vi.mock('@/composables/useCandidatePanel', () => ({
  useCandidatePanel: candidatePanelComposable.useCandidatePanel,
  closeCandidatePanel: candidatePanelComposable.closeCandidatePanel,
}))

vi.mock('@/composables/useJobPanel', () => ({
  useJobPanel: jobPanelComposable.useJobPanel,
}))

vi.mock('@/api/jobs', () => ({
  fetchOpenJobs: jobsApi.fetchOpenJobs,
}))

vi.mock('@/api/files', () => ({
  uploadFile: vi.fn(),
  fetchFileAsBlob: vi.fn().mockResolvedValue('blob:http://localhost/fake-blob'),
}))

import BasicInfoTab from '@/components/candidate-panel/BasicInfoTab.vue'
import ResumeTab from '@/components/candidate-panel/ResumeTab.vue'
import DuplicateResult from '@/components/candidate-panel/DuplicateResult.vue'
import PanelHeader from '@/components/candidate-panel/PanelHeader.vue'
import BlacklistConfirm from '@/components/candidate-panel/BlacklistConfirm.vue'
import CandidatePanel from '@/components/candidate-panel/CandidatePanel.vue'

function makeCandidate(overrides = {}) {
  return {
    id: 1,
    name: '张三',
    phone: '13800138000',
    email: 'zhang@test.com',
    source: 'BOSS直聘',
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    name_en: 'Zhang San',
    age: 28,
    education: '本科',
    school: '清华大学',
    last_company: '字节跳动',
    last_title: '后端工程师',
    years_exp: 5,
    skill_tags: ['Go', 'Python', 'Kubernetes'],
    education_list: [{ school: '清华大学', degree: '本科', major: '计算机' }],
    work_experience: [{ company: '字节跳动', title: '后端工程师', start: '2021-06', end: '2025-12' }],
    project_experience: [],
    notes: '技术能力强',
    blacklisted: false,
    blacklist_reason: null,
    blacklist_note: null,
    resume_path: null,
    attachments: [],
    starred: 0,
    supplier_id: null,
    referred_by: null,
    merged_into: null,
    ...overrides,
  }
}

function makeApplication(overrides = {}) {
  return {
    id: 1,
    candidate_id: 1,
    candidate_name: '张三',
    job_id: 1,
    state: 'IN_PROGRESS',
    outcome: null,
    stage: null,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    ...overrides,
  }
}

function mountCandidatePanel({
  candidate = makeCandidate(),
  applications = [],
} = {}) {
  const state = reactive({
    isOpen: true,
    candidateId: candidate.id,
    loading: false,
    error: null,
    candidate,
    applications,
    returnToJobId: null,
  })

  candidatePanelComposable.useCandidatePanel.mockReturnValue({
    state,
    close: candidatePanelComposable.closeCandidatePanel,
    refresh: candidatePanelComposable.refresh,
  })
  jobPanelComposable.useJobPanel.mockReturnValue({
    open: jobPanelComposable.open,
  })

  const wrapper = mount(CandidatePanel, {
    global: {
      stubs: {
        teleport: true,
        transition: true,
      },
    },
  })

  return { state, wrapper }
}

beforeEach(() => {
  vi.clearAllMocks()
  pipelineApi.executeAction.mockResolvedValue({ ok: true })
  candidateApi.checkDuplicate.mockResolvedValue({ matches: [], requires_decision: false, has_blocking_in_progress_match: false })
  candidatePanelComposable.refresh.mockResolvedValue(undefined)
  candidatePanelComposable.useCandidatePanel.mockReset()
  candidatePanelComposable.closeCandidatePanel.mockReset()
  candidatePanelComposable.refresh.mockReset()
  candidatePanelComposable.refresh.mockResolvedValue(undefined)
  jobPanelComposable.useJobPanel.mockReset()
  jobPanelComposable.open.mockReset()
  jobsApi.fetchOpenJobs.mockResolvedValue({ items: [] })
})

// ── PanelHeader ──

describe('PanelHeader', () => {
  it('显示候选人姓名和副标题', () => {
    const wrapper = mount(PanelHeader, {
      props: { candidate: makeCandidate(), applications: [] },
    })
    expect(wrapper.text()).toContain('张三')
    expect(wrapper.text()).toContain('后端工程师')
    expect(wrapper.text()).toContain('5年经验')
  })

  it('黑名单候选人显示红色标签', () => {
    const wrapper = mount(PanelHeader, {
      props: {
        candidate: makeCandidate({ blacklisted: true }),
        applications: [],
      },
    })
    expect(wrapper.find('.panel-header__tag--blacklist').exists()).toBe(true)
    expect(wrapper.text()).toContain('黑名单')
  })

  it('已入职候选人显示已入职标签', () => {
    const wrapper = mount(PanelHeader, {
      props: {
        candidate: makeCandidate(),
        applications: [makeApplication({ state: 'HIRED' })],
      },
    })
    expect(wrapper.find('.panel-header__tag--hired').exists()).toBe(true)
  })

  it('点击关闭按钮触发 close 事件', async () => {
    const wrapper = mount(PanelHeader, {
      props: { candidate: makeCandidate(), applications: [] },
    })
    await wrapper.find('.panel-header__close').trigger('click')
    expect(wrapper.emitted('close')).toBeTruthy()
  })
})

// ── BasicInfoTab ──

describe('BasicInfoTab', () => {
  it('显示基本信息字段', () => {
    const wrapper = mount(BasicInfoTab, {
      props: { candidate: makeCandidate() },
    })
    expect(wrapper.text()).toContain('13800138000')
    expect(wrapper.text()).toContain('zhang@test.com')
    expect(wrapper.text()).toContain('本科')
    expect(wrapper.text()).toContain('清华大学')
    expect(wrapper.text()).toContain('5年')
    expect(wrapper.text()).toContain('28')
  })

  it('显示技能标签', () => {
    const wrapper = mount(BasicInfoTab, {
      props: { candidate: makeCandidate() },
    })
    expect(wrapper.text()).toContain('Go')
    expect(wrapper.text()).toContain('Python')
    expect(wrapper.text()).toContain('Kubernetes')
  })

  it('显示教育经历', () => {
    const wrapper = mount(BasicInfoTab, {
      props: { candidate: makeCandidate() },
    })
    expect(wrapper.text()).toContain('清华大学')
    expect(wrapper.text()).toContain('计算机')
  })

  it('显示工作经历', () => {
    const wrapper = mount(BasicInfoTab, {
      props: { candidate: makeCandidate() },
    })
    expect(wrapper.text()).toContain('字节跳动')
    expect(wrapper.text()).toContain('后端工程师')
  })

  it('显示项目经历', () => {
    const wrapper = mount(BasicInfoTab, {
      props: {
        candidate: makeCandidate({
          project_experience: [{
            name: '招聘中台重构',
            role: '后端负责人',
            start: '2024-01',
            end: '2024-10',
            description: '负责流程编排与数据建模。',
          }],
        }),
      },
    })
    expect(wrapper.text()).toContain('项目经历')
    expect(wrapper.text()).toContain('招聘中台重构')
    expect(wrapper.text()).toContain('后端负责人')
    expect(wrapper.text()).toContain('负责流程编排与数据建模。')
  })

  it('黑名单候选人显示警告区', () => {
    const wrapper = mount(BasicInfoTab, {
      props: {
        candidate: makeCandidate({
          blacklisted: true,
          blacklist_reason: '背调不通过',
          blacklist_note: '学历造假',
        }),
      },
    })
    expect(wrapper.find('.basic-info__blacklist-warning').exists()).toBe(true)
    expect(wrapper.text()).toContain('背调不通过')
    expect(wrapper.text()).toContain('学历造假')
  })

  it('无黑名单时不显示警告区', () => {
    const wrapper = mount(BasicInfoTab, {
      props: { candidate: makeCandidate() },
    })
    expect(wrapper.find('.basic-info__blacklist-warning').exists()).toBe(false)
  })

  it('显示备注', () => {
    const wrapper = mount(BasicInfoTab, {
      props: { candidate: makeCandidate() },
    })
    expect(wrapper.text()).toContain('技术能力强')
  })

  it('编辑模式下渲染 input 字段', () => {
    const wrapper = mount(BasicInfoTab, {
      props: { candidate: makeCandidate(), editing: true },
    })
    const inputs = wrapper.findAll('.basic-info__input')
    expect(inputs.length).toBeGreaterThanOrEqual(6)
    expect(wrapper.find('.basic-info__edit-actions').exists()).toBe(true)
  })

  it('编辑模式下点击取消 emit cancel', async () => {
    const wrapper = mount(BasicInfoTab, {
      props: { candidate: makeCandidate(), editing: true },
    })
    const cancelBtn = wrapper.findAll('.basic-info__btn').find((b) => b.text() === '取消')
    await cancelBtn!.trigger('click')
    expect(wrapper.emitted('cancel')).toBeTruthy()
  })

  it('编辑模式下点击保存 emit save', async () => {
    const wrapper = mount(BasicInfoTab, {
      props: { candidate: makeCandidate(), editing: true },
    })
    const saveBtn = wrapper.find('.basic-info__btn--primary')
    await saveBtn.trigger('click')
    expect(wrapper.emitted('save')).toBeTruthy()
  })
})

// ── ResumeTab ──

describe('ResumeTab', () => {
  it('无附件时显示空状态', () => {
    const wrapper = mount(ResumeTab, {
      props: { candidate: makeCandidate() },
    })
    expect(wrapper.text()).toContain('暂无简历')
  })

  it('单附件时直接 iframe 预览', async () => {
    const wrapper = mount(ResumeTab, {
      props: {
        candidate: makeCandidate({
          attachments: [{
            file_path: 'data/resumes/abc.pdf',
            label: '简历',
            type: 'resume',
            created_at: '2026-01-15T00:00:00Z',
          }],
        }),
      },
    })
    await flushPromises()
    expect(wrapper.text()).toContain('简历')
    expect(wrapper.find('iframe').exists()).toBe(true)
    expect(wrapper.find('iframe').attributes('src')).toBe('blob:http://localhost/fake-blob')
  })

  it('多附件时列表展示，不直接预览', () => {
    const wrapper = mount(ResumeTab, {
      props: {
        candidate: makeCandidate({
          attachments: [
            { file_path: 'data/resumes/resume.pdf', label: '简历', type: 'resume', created_at: '2026-01-15T00:00:00Z' },
            { file_path: 'data/resumes/portfolio.pdf', label: '作品集', type: 'attachment', created_at: '2026-01-16T00:00:00Z' },
          ],
        }),
      },
    })
    expect(wrapper.text()).toContain('简历')
    expect(wrapper.text()).toContain('作品集')
    // 多附件模式下默认不展开预览
    expect(wrapper.findAll('iframe').length).toBe(0)
  })

  it('fallback 到 resume_path（兼容旧数据）', async () => {
    const wrapper = mount(ResumeTab, {
      props: {
        candidate: makeCandidate({ resume_path: '/uploads/resume.pdf', attachments: [] }),
      },
    })
    await flushPromises()
    expect(wrapper.find('iframe').exists()).toBe(true)
    expect(wrapper.find('iframe').attributes('src')).toBe('blob:http://localhost/fake-blob')
  })

  it('DOCX 附件使用 docx-preview 渲染（不是 iframe）', async () => {
    const wrapper = mount(ResumeTab, {
      props: {
        candidate: makeCandidate({
          attachments: [{
            file_path: 'data/resumes/abc123.docx',
            label: '简历',
            type: 'resume',
            created_at: '2026-01-01T00:00:00Z',
          }],
        }),
      },
    })
    await flushPromises()
    // DOCX files are rendered via docx-preview, not iframe
    expect(wrapper.find('iframe').exists()).toBe(false)
  })

  it('每个附件显示删除按钮', () => {
    const wrapper = mount(ResumeTab, {
      props: {
        candidate: makeCandidate({
          attachments: [{
            file_path: 'data/resumes/abc.pdf',
            label: '简历',
            type: 'resume',
            created_at: '2026-01-01T00:00:00Z',
          }],
        }),
      },
    })
    expect(wrapper.find('.resume-tab__delete').exists()).toBe(true)
    expect(wrapper.find('.resume-tab__delete').text()).toBe('删除')
  })

  it('始终显示上传入口', () => {
    const wrapper = mount(ResumeTab, {
      props: { candidate: makeCandidate() },
    })
    expect(wrapper.find('.resume-tab__upload-btn').exists()).toBe(true)
    expect(wrapper.find('.resume-tab__upload-btn').text()).toBe('上传附件')
  })
})

// ── DuplicateResult ──

describe('DuplicateResult', () => {
  it('显示候选人 ID 和匹配原因，并支持忽略', async () => {
    const wrapper = mount(DuplicateResult, {
      props: {
        results: [{
          ...makeCandidate({ id: 2, last_title: '工程经理', last_company: '美团' }),
          display_id: 'C-0002',
          match_reasons: ['姓名相同', '手机相同'],
          last_application: null,
        }],
      },
    })

    expect(wrapper.text()).toContain('C-0002')
    expect(wrapper.text()).toContain('匹配原因：姓名相同 / 手机相同')

    await wrapper.find('.dup-result__ignore').trigger('click')
    expect(wrapper.emitted('ignore')).toEqual([[2]])
  })
})

// ── BlacklistConfirm ──

describe('BlacklistConfirm', () => {
  it('渲染原因选项', () => {
    const wrapper = mount(BlacklistConfirm, {
      props: { candidateId: 1 },
    })
    expect(wrapper.text()).toContain('简历造假')
    expect(wrapper.text()).toContain('态度问题')
    expect(wrapper.text()).toContain('背调不通过')
    expect(wrapper.text()).toContain('多次爽约')
    expect(wrapper.text()).toContain('其他')
  })

  it('未选原因时确认按钮禁用', () => {
    const wrapper = mount(BlacklistConfirm, {
      props: { candidateId: 1 },
    })
    const confirmBtn = wrapper.find('.blacklist-confirm__btn--confirm')
    expect((confirmBtn.element as HTMLButtonElement).disabled).toBe(true)
  })

  it('点击取消触发 cancel 事件', async () => {
    const wrapper = mount(BlacklistConfirm, {
      props: { candidateId: 1 },
    })
    const cancelBtn = wrapper.findAll('.blacklist-confirm__btn').find((button) => button.text() === '取消')
    await cancelBtn!.trigger('click')
    expect(wrapper.emitted('cancel')).toBeTruthy()
  })

  it('选择原因后确认按钮可用', async () => {
    const wrapper = mount(BlacklistConfirm, {
      props: { candidateId: 1 },
    })
    const radio = wrapper.find('input[value="态度问题"]')
    await radio.setValue(true)
    const confirmBtn = wrapper.find('.blacklist-confirm__btn--confirm')
    expect((confirmBtn.element as HTMLButtonElement).disabled).toBe(false)
  })
})

// ── CandidatePanel ──

describe('CandidatePanel', () => {
  it('加载失败时显示错误态并支持重试', async () => {
    const state = reactive({
      isOpen: true,
      candidateId: 1,
      loading: false,
      error: '候选人详情加载失败，请重试',
      candidate: null,
      applications: [],
      returnToJobId: null,
    })

    candidatePanelComposable.useCandidatePanel.mockReturnValue({
      state,
      close: candidatePanelComposable.closeCandidatePanel,
      refresh: candidatePanelComposable.refresh,
    })
    jobPanelComposable.useJobPanel.mockReturnValue({
      open: jobPanelComposable.open,
    })

    const wrapper = mount(CandidatePanel, {
      global: {
        stubs: {
          teleport: true,
          transition: true,
        },
      },
    })

    expect(wrapper.find('.panel-error').text()).toContain('候选人详情加载失败，请重试')

    await wrapper.find('.panel-retry').trigger('click')
    expect(candidatePanelComposable.refresh).toHaveBeenCalledTimes(1)
  })

  it('闲置候选人显示查重、编辑信息、推荐到岗位、加入黑名单', () => {
    const { wrapper } = mountCandidatePanel()
    const actionTexts = wrapper.findAll('.panel-actions__btn').map((button) => button.text())
    expect(actionTexts).toEqual(['查重', '编辑信息', '推荐到岗位', '加入黑名单'])
  })

  it('有进行中 Application 的候选人显示查重、编辑信息和加入黑名单', () => {
    const { wrapper } = mountCandidatePanel({
      applications: [makeApplication({ state: 'IN_PROGRESS' })],
    })
    const actionTexts = wrapper.findAll('.panel-actions__btn').map((button) => button.text())
    expect(actionTexts).toEqual(['查重', '编辑信息', '加入黑名单'])
  })

  it('已入职候选人显示查重、编辑信息和标记离职', () => {
    const { wrapper } = mountCandidatePanel({
      applications: [makeApplication({ id: 7, state: 'HIRED' })],
    })
    const actionTexts = wrapper.findAll('.panel-actions__btn').map((button) => button.text())
    expect(actionTexts).toEqual(['查重', '编辑信息', '标记离职'])
  })

  it('黑名单候选人显示查重、编辑信息和解除黑名单', () => {
    const { wrapper } = mountCandidatePanel({
      candidate: makeCandidate({ blacklisted: true }),
    })
    const actionTexts = wrapper.findAll('.panel-actions__btn').map((button) => button.text())
    expect(actionTexts).toEqual(['查重', '编辑信息', '解除黑名单'])
  })

  it('标记离职后刷新候选人面板', async () => {
    const { wrapper } = mountCandidatePanel({
      applications: [makeApplication({ id: 9, state: 'HIRED' })],
    })

    await wrapper.findAll('.panel-actions__btn')[2].trigger('click')
    await flushPromises()

    expect(pipelineApi.executeAction).toHaveBeenCalledWith(expect.objectContaining({
      action_code: 'record_left',
      target: { type: 'application', id: 9 },
    }))
    expect(candidatePanelComposable.refresh).toHaveBeenCalledTimes(1)
  })

  it('拉黑成功后刷新候选人面板', async () => {
    const { wrapper } = mountCandidatePanel()

    await wrapper.findAll('.panel-actions__btn')[3].trigger('click')
    const radio = wrapper.find('input[value="背调不通过"]')
    await radio.setValue(true)
    await wrapper.find('.blacklist-confirm__btn--confirm').trigger('click')
    await flushPromises()

    expect(pipelineApi.executeAction).toHaveBeenCalledWith(expect.objectContaining({
      action_code: 'blacklist_candidate',
      target: { type: 'candidate', id: 1 },
      payload: expect.objectContaining({ reason: '背调不通过' }),
    }))
    expect(candidatePanelComposable.refresh).toHaveBeenCalledTimes(1)
  })

  it('查重结果支持当前面板内忽略', async () => {
    candidateApi.checkDuplicate.mockResolvedValue({
      matches: [
        {
          candidate_id: 1,
          display_id: 'C-0001',
          name: '张三',
          phone: '13800138000',
          email: 'zhang@test.com',
          last_company: '字节跳动',
          last_title: '后端工程师',
          match_reasons: ['name', 'phone', 'email'],
          match_level: 'high',
          is_blacklisted: false,
          blacklist_reason: null,
          last_application: null,
          active_link: null,
        },
        {
          candidate_id: 2,
          display_id: 'C-0002',
          name: '张三',
          phone: '13800138000',
          email: 'zhang@test.com',
          last_company: '美团',
          last_title: '工程经理',
          match_reasons: ['name', 'phone', 'email'],
          match_level: 'high',
          is_blacklisted: false,
          blacklist_reason: null,
          last_application: null,
          active_link: null,
        },
      ],
      requires_decision: true,
      has_blocking_in_progress_match: false,
    })
    const { wrapper } = mountCandidatePanel()

    await wrapper.findAll('.panel-actions__btn')[0].trigger('click')
    await flushPromises()

    expect(wrapper.text()).toContain('C-0002')
    expect(wrapper.text()).toContain('匹配原因：姓名相同 / 手机相同 / 邮箱相同')

    await wrapper.find('.dup-result__ignore').trigger('click')
    await flushPromises()

    expect(wrapper.text()).toContain('未发现重复记录')
  })

  it('点击推荐到岗位展开岗位选择区', async () => {
    const { wrapper } = mountCandidatePanel()
    const joinBtn = wrapper.findAll('.panel-actions__btn').find((b) => b.text() === '推荐到岗位')
    await joinBtn!.trigger('click')

    expect(wrapper.findComponent({ name: 'JoinPipelineInline' }).exists()).toBe(true)
  })

  it('点击返回岗位时恢复到候选人 tab', async () => {
    const state = reactive({
      isOpen: true,
      candidateId: 1,
      loading: false,
      error: null,
      candidate: makeCandidate(),
      applications: [makeApplication()],
      returnToJobId: 9,
    })

    candidatePanelComposable.useCandidatePanel.mockReturnValue({
      state,
      close: candidatePanelComposable.closeCandidatePanel,
      refresh: candidatePanelComposable.refresh,
    })
    jobPanelComposable.useJobPanel.mockReturnValue({
      open: jobPanelComposable.open,
    })

    const wrapper = mount(CandidatePanel, {
      global: {
        stubs: {
          teleport: true,
          transition: true,
        },
      },
    })

    await wrapper.find('.panel-header__back').trigger('click')

    expect(candidatePanelComposable.closeCandidatePanel).toHaveBeenCalled()
    expect(jobPanelComposable.open).toHaveBeenCalledWith(9, { activeTab: 'candidates' })
  })

  it('解除黑名单后刷新面板', async () => {
    pipelineApi.executeAction.mockResolvedValue({ ok: true })
    const { wrapper } = mountCandidatePanel({
      candidate: makeCandidate({ blacklisted: true, blacklist_reason: '背调不通过', blacklist_note: '学历造假' }),
    })

    const unblacklistBtn = wrapper.findAll('.panel-actions__btn').find((b) => b.text() === '解除黑名单')
    await unblacklistBtn!.trigger('click')
    await flushPromises()

    expect(pipelineApi.executeAction).toHaveBeenCalledWith(expect.objectContaining({
      action_code: 'unblacklist_candidate',
      target: { type: 'candidate', id: 1 },
    }))
    expect(candidatePanelComposable.refresh).toHaveBeenCalledTimes(1)
  })

  it('编辑信息按钮切换 BasicInfoTab 到编辑模式', async () => {
    const { wrapper } = mountCandidatePanel()

    const editBtn = wrapper.findAll('.panel-actions__btn').find((b) => b.text() === '编辑信息')
    await editBtn!.trigger('click')

    const basicTab = wrapper.findComponent(BasicInfoTab)
    expect(basicTab.props('editing')).toBe(true)
  })
})
