import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Mock API 模块
vi.mock('@/api/files', () => ({
  uploadFile: vi.fn(),
}))

vi.mock('@/api/intake', () => ({
  checkDuplicate: vi.fn(),
  resolveIntake: vi.fn(),
}))

vi.mock('@/api/jobs', () => ({
  fetchOpenJobs: vi.fn(),
}))

vi.mock('@/api/pipeline', () => ({
  executeAction: vi.fn(),
  fetchJob: vi.fn(),
}))

import { uploadFile } from '@/api/files'
import { checkDuplicate, resolveIntake } from '@/api/intake'
import { executeAction, fetchJob } from '@/api/pipeline'
import { consumeDroppedFiles, stashDroppedFiles, useCandidateCreate } from '@/composables/useCandidateCreate'

const mockUploadFile = vi.mocked(uploadFile)
const mockCheckDuplicate = vi.mocked(checkDuplicate)
const mockResolveIntake = vi.mocked(resolveIntake)
const mockExecuteAction = vi.mocked(executeAction)
const mockFetchJob = vi.mocked(fetchJob)

function makeFile(name: string, size = 1024): File {
  return new File(['x'.repeat(size)], name, { type: 'application/pdf' })
}

function makeCandidateDetail(id: number, name = '张三') {
  return {
    id,
    name,
    phone: '13800138000',
    email: 'zhang@test.com',
    source: 'BOSS直聘',
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    name_en: null,
    age: 28,
    education: '本科',
    school: '清华大学',
    last_company: '字节跳动',
    last_title: '后端工程师',
    years_exp: 5,
    skill_tags: ['Go', 'Python'],
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

describe('useCandidateCreate', () => {
  let cc: ReturnType<typeof useCandidateCreate>

  beforeEach(() => {
    cc = useCandidateCreate()
    cc.reset()
    vi.clearAllMocks()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  // ── 初始状态 ──

  it('初始 step 为 file-select', () => {
    expect(cc.state.step).toBe('file-select')
    expect(cc.state.files).toEqual([])
    expect(cc.state.form.name).toBe('')
    expect(cc.state.duplicateCheck).toBeNull()
  })

  // ── goManual ──

  it('goManual 设置 step 为 form，表单清空', () => {
    cc.goManual()

    expect(cc.state.step).toBe('form')
    expect(cc.state.files).toEqual([])
    expect(cc.state.form.name).toBe('')
    expect(cc.state.form.phone).toBeUndefined()
    expect(cc.state.uploadResult).toBeNull()
  })

  // ── setFiles ──

  it('setFiles 设置文件列表', () => {
    const files = [makeFile('resume.pdf')]
    cc.setFiles(files)

    expect(cc.state.files).toEqual(files)
    expect(cc.state.files).toHaveLength(1)
  })

  // ── proceedWithFiles ──

  it('proceedWithFiles 无文件时跳到 form（手动建档）', async () => {
    cc.setFiles([])
    await cc.proceedWithFiles()

    expect(cc.state.step).toBe('form')
    expect(cc.state.uploadResult).toBeNull()
  })

  it('proceedWithFiles 单文件上传后跳到 form', async () => {
    const file = makeFile('张三_简历.pdf')
    cc.setFiles([file])
    mockUploadFile.mockResolvedValue({
      file_id: 'f-1',
      file_path: '/uploads/resume.pdf',
      sha256: 'abc',
    })

    await cc.proceedWithFiles()

    expect(mockUploadFile).toHaveBeenCalledWith(file)
    expect(cc.state.step).toBe('form')
    expect(cc.state.uploadResult).toEqual({
      file_id: 'f-1',
      file_path: '/uploads/resume.pdf',
      sha256: 'abc',
    })
    expect(cc.state.form.resume_path).toBe('/uploads/resume.pdf')
  })

  it('proceedWithFiles 多文件跳到 grouping', async () => {
    const files = [makeFile('张三_简历.pdf'), makeFile('李四_简历.pdf')]
    cc.setFiles(files)

    await cc.proceedWithFiles()

    expect(cc.state.step).toBe('grouping')
    expect(cc.state.groups.length).toBeGreaterThanOrEqual(1)
  })

  it('proceedWithFiles 上传失败设置 error', async () => {
    cc.setFiles([makeFile('test.pdf')])
    mockUploadFile.mockRejectedValue(new Error('网络错误'))

    await cc.proceedWithFiles()

    expect(cc.state.error).toBe('网络错误')
    expect(cc.state.uploading).toBe(false)
  })

  // ── 查重 ──

  it('triggerDuplicateCheck 防抖调用 checkDuplicate', async () => {
    const dupRes = {
      matches: [],
      requires_decision: false,
      has_blocking_in_progress_match: false,
    }
    mockCheckDuplicate.mockResolvedValue(dupRes)

    cc.state.form.name = '张三'
    cc.state.form.phone = '13800138000'
    cc.triggerDuplicateCheck()

    // 未到防抖时间，不应调用
    expect(mockCheckDuplicate).not.toHaveBeenCalled()

    // 推进定时器
    vi.advanceTimersByTime(600)
    await vi.waitFor(() => {
      expect(mockCheckDuplicate).toHaveBeenCalledTimes(1)
    })

    expect(mockCheckDuplicate).toHaveBeenCalledWith({
      name: '张三',
      phone: '13800138000',
      email: undefined,
    })
  })

  it('triggerDuplicateCheck 无关键字段时清空 duplicateCheck', async () => {
    cc.state.duplicateCheck = { matches: [], requires_decision: false, has_blocking_in_progress_match: false }
    cc.state.form.name = ''
    cc.state.form.phone = undefined
    cc.state.form.email = undefined

    cc.triggerDuplicateCheck()
    vi.advanceTimersByTime(600)

    await vi.waitFor(() => {
      expect(cc.state.duplicateCheck).toBeNull()
    })
    expect(mockCheckDuplicate).not.toHaveBeenCalled()
  })

  it('dismissDuplicate 清空 duplicateCheck', () => {
    cc.state.duplicateCheck = { matches: [], requires_decision: true, has_blocking_in_progress_match: false }
    cc.dismissDuplicate()
    expect(cc.state.duplicateCheck).toBeNull()
  })

  // ── 建档 ──

  it('submitForm 调用 resolveIntake 成功后跳到 job-link', async () => {
    const candidate = makeCandidateDetail(1)
    mockResolveIntake.mockResolvedValue({
      action: 'created',
      candidate,
      active_link: null,
    })

    cc.state.form.name = '张三'
    cc.state.form.source = 'BOSS直聘'
    await cc.submitForm('create_new')

    expect(mockResolveIntake).toHaveBeenCalledWith({
      decision: 'create_new',
      incoming: cc.state.form,
      existing_candidate_id: undefined,
      overwrite_resume: false,
    })
    expect(cc.state.step).toBe('job-link')
    expect(cc.state.createdCandidate).toEqual(candidate)
  })

  it('submitForm 失败时设置 error', async () => {
    mockResolveIntake.mockRejectedValue(new Error('建档失败'))

    await cc.submitForm('create_new')

    expect(cc.state.error).toBe('建档失败')
    expect(cc.state.submitting).toBe(false)
  })

  it('submitForm merge_existing 时传入已有候选人 id', async () => {
    const candidate = makeCandidateDetail(9, '已存在候选人')
    mockResolveIntake.mockResolvedValue({
      action: 'merged',
      candidate,
      active_link: null,
    })

    cc.state.form.name = '已存在候选人'
    cc.state.form.source = '拉勾'
    await cc.submitForm('merge_existing', 9)

    expect(mockResolveIntake).toHaveBeenCalledWith({
      decision: 'merge_existing',
      incoming: cc.state.form,
      existing_candidate_id: 9,
      overwrite_resume: false,
    })
    expect(cc.state.createdCandidate).toEqual(candidate)
    expect(cc.state.step).toBe('job-link')
  })

  // ── skipJob ──

  it('skipJob 非队列模式 → step 变 done', () => {
    cc.state.step = 'job-link'
    cc.state.createdCandidate = makeCandidateDetail(1)
    cc.skipJob()

    expect(cc.state.step).toBe('done')
    expect(cc.state.finalResult).toEqual({
      candidate: expect.objectContaining({ id: 1 }),
      linkedJob: null,
    })
  })

  // ── 队列模式 ──

  it('finishCurrentCandidate 队列模式下推进到下一个', () => {
    // 设置两个队列项
    cc.state.queue = [
      {
        group: { label: '张三', files: [makeFile('a.pdf')] },
        form: { ...cc.emptyForm(), name: '张三' },
        duplicateCheck: null,
        result: null,
      },
      {
        group: { label: '李四', files: [makeFile('b.pdf')] },
        form: { ...cc.emptyForm(), name: '李四' },
        duplicateCheck: null,
        result: null,
      },
    ]
    cc.state.currentIndex = 0
    cc.state.createdCandidate = makeCandidateDetail(1, '张三')
    cc.state.step = 'job-link'

    cc.skipJob()

    expect(cc.state.currentIndex).toBe(1)
    expect(cc.state.step).toBe('form')
    expect(cc.state.form.name).toBe('李四')
    expect(cc.state.duplicateCheck).toBeNull()
  })

  it('finishCurrentCandidate 队列最后一个 → step = done', () => {
    cc.state.queue = [
      {
        group: { label: '张三', files: [makeFile('a.pdf')] },
        form: { ...cc.emptyForm(), name: '张三' },
        duplicateCheck: null,
        result: null,
      },
    ]
    cc.state.currentIndex = 0
    cc.state.createdCandidate = makeCandidateDetail(1)
    cc.state.step = 'job-link'

    cc.skipJob()

    expect(cc.state.step).toBe('done')
  })

  it('triggerDuplicateCheck 保留进行中流程拦截结果', async () => {
    mockCheckDuplicate.mockResolvedValue({
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
    })

    cc.state.form.name = '张三'
    cc.triggerDuplicateCheck()
    vi.advanceTimersByTime(600)

    await vi.waitFor(() => {
      expect(cc.state.duplicateCheck?.has_blocking_in_progress_match).toBe(true)
      expect(cc.state.duplicateCheck?.matches[0].active_link?.application_id).toBe(101)
    })
  })

  it('stashDroppedFiles 与 consumeDroppedFiles 只消费一次', () => {
    const files = [makeFile('briefing-drop.pdf')]
    stashDroppedFiles(files)

    expect(consumeDroppedFiles()).toEqual(files)
    expect(consumeDroppedFiles()).toEqual([])
  })

  it('linkJob 在单人模式下保存完整岗位信息用于完成跳转', async () => {
    cc.state.createdCandidate = makeCandidateDetail(1)
    cc.state.step = 'job-link'
    mockExecuteAction.mockResolvedValue({ ok: true } as any)
    mockFetchJob.mockResolvedValue({
      id: 6,
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
    })

    await cc.linkJob(6)

    expect(mockExecuteAction).toHaveBeenCalled()
    expect(mockFetchJob).toHaveBeenCalledWith(6)
    expect(cc.state.step).toBe('done')
    expect(cc.state.finalResult?.linkedJob?.title).toBe('后端工程师')
  })

  it('removeFromQueue 移除后队列为空 → step = done', () => {
    cc.state.queue = [
      {
        group: { label: '张三', files: [makeFile('a.pdf')] },
        form: { ...cc.emptyForm(), name: '张三' },
        duplicateCheck: null,
        result: null,
      },
    ]
    cc.state.currentIndex = 0

    cc.removeFromQueue(0)

    expect(cc.state.queue).toHaveLength(0)
    expect(cc.state.step).toBe('done')
  })

  it('removeFromQueue 移除当前项后 currentIndex 不越界', () => {
    cc.state.queue = [
      {
        group: { label: '张三', files: [makeFile('a.pdf')] },
        form: { ...cc.emptyForm(), name: '张三' },
        duplicateCheck: null,
        result: null,
      },
      {
        group: { label: '李四', files: [makeFile('b.pdf')] },
        form: { ...cc.emptyForm(), name: '李四' },
        duplicateCheck: null,
        result: null,
      },
    ]
    cc.state.currentIndex = 1

    cc.removeFromQueue(1)

    expect(cc.state.queue).toHaveLength(1)
    expect(cc.state.currentIndex).toBe(0)
    expect(cc.state.form.name).toBe('张三')
  })

  // ── reset ──

  it('reset 清空所有状态', () => {
    cc.state.step = 'form'
    cc.state.files = [makeFile('test.pdf')]
    cc.state.form.name = '张三'
    cc.state.duplicateCheck = { matches: [], requires_decision: false, has_blocking_in_progress_match: false }

    cc.reset()

    expect(cc.state.step).toBe('file-select')
    expect(cc.state.files).toEqual([])
    expect(cc.state.form.name).toBe('')
    expect(cc.state.duplicateCheck).toBeNull()
    expect(cc.state.queue).toEqual([])
    expect(cc.state.currentIndex).toBe(0)
    expect(cc.state.createdCandidate).toBeNull()
    expect(cc.state.submitting).toBe(false)
    expect(cc.state.error).toBeNull()
    expect(cc.state.uploadResult).toBeNull()
    expect(cc.state.uploading).toBe(false)
  })

  // ── isFormDirty ──

  it('isFormDirty 空表单返回 false', () => {
    expect(cc.isFormDirty()).toBe(false)
  })

  it('isFormDirty 有 name 返回 true', () => {
    cc.state.form.name = '张三'
    expect(cc.isFormDirty()).toBe(true)
  })

  it('isFormDirty 有 phone 返回 true', () => {
    cc.state.form.phone = '13800138000'
    expect(cc.isFormDirty()).toBe(true)
  })

  it('isFormDirty 有 email 返回 true', () => {
    cc.state.form.email = 'test@test.com'
    expect(cc.isFormDirty()).toBe(true)
  })

  it('isFormDirty 有 notes 返回 true', () => {
    cc.state.form.notes = '备注内容'
    expect(cc.isFormDirty()).toBe(true)
  })

  // ── isQueueMode ──

  it('isQueueMode 队列为空返回 false', () => {
    expect(cc.isQueueMode()).toBe(false)
  })

  it('isQueueMode 队列有项返回 true', () => {
    cc.state.queue = [
      {
        group: { label: '张三', files: [makeFile('a.pdf')] },
        form: cc.emptyForm(),
        duplicateCheck: null,
        result: null,
      },
    ]
    expect(cc.isQueueMode()).toBe(true)
  })
})
