import { reactive, watch } from 'vue'
import { uploadFile, parseResume } from '@/api/files'
import { checkDuplicate, resolveIntake } from '@/api/intake'
import type {
  CandidateCreatePayload,
  CandidateDetail,
  DuplicateCheckResponse,
  FileUploadResult,
  Job,
  ResumeParseResult,
} from '@/api/types'

export type CreateStep = 'file-select' | 'grouping' | 'form' | 'job-link' | 'done'

export interface FileGroup {
  label: string
  files: File[]
  uploadResult?: FileUploadResult
}

export interface QueueItem {
  group: FileGroup
  form: CandidateCreatePayload
  duplicateCheck: DuplicateCheckResponse | null
  result: { candidate: CandidateDetail; linkedJob: Job | null } | null
  parsed: boolean
  parsing: boolean
  parseError: string | null
  parseErrorType: string | null
}

let pendingDroppedFiles: File[] = []

function emptyForm(): CandidateCreatePayload {
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
  }
}

export function stashDroppedFiles(files: File[]) {
  pendingDroppedFiles = [...files]
}

export function consumeDroppedFiles() {
  const files = pendingDroppedFiles
  pendingDroppedFiles = []
  return files
}

const state = reactive({
  step: 'file-select' as CreateStep,
  files: [] as File[],
  groups: [] as FileGroup[],
  queue: [] as QueueItem[],
  currentIndex: 0,
  form: emptyForm(),
  duplicateCheck: null as DuplicateCheckResponse | null,
  checkingDuplicate: false,
  createdCandidate: null as CandidateDetail | null,
  finalResult: null as { candidate: CandidateDetail; linkedJob: Job | null } | null,
  submitting: false,
  error: null as string | null,
  // 单文件上传结果
  uploadResult: null as FileUploadResult | null,
  uploading: false,
  uploadProgress: 0,
  uploadedCount: 0,
  // AI 解析状态
  parsing: false,
  parseError: null as string | null,
  parseErrorType: null as string | null,
})

// ── AI 解析辅助 ──

/** 将 "2020-2024"、"2020.09-2024.06"、"2020.09-至今" 等格式拆成 { start, end } */
function parsePeriod(period?: string): { start?: string; end?: string } {
  if (!period) return {}
  const cleaned = period.replace(/\s/g, '')
  // 匹配 YYYY.MM 或 YYYY-MM 或 YYYY
  const parts = cleaned.split(/[-–—~]/)
  const normalize = (s: string): string | undefined => {
    if (!s || /至今|present|now|current/i.test(s)) return undefined
    // "2020.09" → "2020-09", "2020" → "2020-01"
    const m = s.match(/^(\d{4})[.\-/]?(\d{1,2})?$/)
    if (!m) return undefined
    const year = m[1]
    const month = m[2] ? m[2].padStart(2, '0') : '01'
    return `${year}-${month}`
  }
  return {
    start: normalize(parts[0] || ''),
    end: parts.length > 1 ? normalize(parts[parts.length - 1] || '') : undefined,
  }
}

/** 将 AI 解析结果预填到表单 */
function applyParseResult(form: CandidateCreatePayload, parsed: ResumeParseResult) {
  if (!parsed || Object.keys(parsed).length === 0) return

  if (parsed.name) form.name = parsed.name
  if (parsed.name_en) form.name_en = parsed.name_en
  if (parsed.phone) form.phone = parsed.phone
  if (parsed.email) form.email = parsed.email
  if (parsed.age) form.age = parsed.age
  if (parsed.years_exp != null) form.years_exp = parsed.years_exp
  if (parsed.skill_tags?.length) form.skill_tags = parsed.skill_tags

  // 教育经历
  if (parsed.education_list?.length) {
    form.education_list = parsed.education_list.map((edu) => {
      const { start, end } = parsePeriod(edu.period)
      return { school: edu.school, degree: edu.degree, major: edu.major, start, end }
    })
    // 用最高学历填基本信息
    const first = parsed.education_list[0]
    if (first.degree) form.education = first.degree
    if (first.school) form.school = first.school
  }

  // 工作经历
  if (parsed.work_experience?.length) {
    form.work_experience = parsed.work_experience.map((work) => {
      const { start, end } = parsePeriod(work.period)
      return { company: work.company, title: work.title, start, end, description: work.description }
    })
    // 用最近一段填基本信息
    const latest = parsed.work_experience[0]
    if (latest.company) form.last_company = latest.company
    if (latest.title) form.last_title = latest.title
  }

  // 项目经历
  if (parsed.project_experience?.length) {
    form.project_experience = parsed.project_experience.map((proj) => {
      const { start, end } = parsePeriod(proj.period)
      return { name: proj.name, role: proj.role, start, end, description: proj.description }
    })
  }
}

/** 上传后尝试 AI 解析并预填，失败记录错误 */
async function tryParseAndFill(form: CandidateCreatePayload, filePath: string, item?: QueueItem) {
  const setParseState = (parsing: boolean, error: string | null, errorType: string | null) => {
    if (item) {
      item.parsing = parsing
      item.parseError = error
      item.parseErrorType = errorType
      // 仅当该 item 是当前正在查看的 item 时，同步到全局 state
      const idx = state.queue.indexOf(item)
      if (idx === state.currentIndex) {
        state.parsing = parsing
        state.parseError = error
        state.parseErrorType = errorType
      }
    } else {
      state.parsing = parsing
      state.parseError = error
      state.parseErrorType = errorType
    }
  }

  setParseState(true, null, null)
  try {
    const parsed = await parseResume(filePath)
    if (parsed.error) {
      setParseState(false, parsed.error, parsed.error_type ?? null)
    } else {
      applyParseResult(form, parsed)
      setParseState(false, null, null)
      // 解析完成后自动触发查重
      triggerDuplicateCheck()
    }
  } catch (e: any) {
    setParseState(false, e.message || '解析失败', null)
  }
}

// ── 文件选择 ──

function setFiles(files: File[]) {
  state.files = files
}

async function proceedWithFiles() {
  if (state.files.length === 0) {
    // 手动建档
    state.form = emptyForm()
    state.uploadResult = null
    state.step = 'form'
    return
  }

  state.uploading = true
  state.error = null
  state.uploadProgress = 0

  try {
    if (state.files.length === 1) {
      // 单文件
      const result = await uploadFile(state.files[0], (p) => { state.uploadProgress = p })
      state.uploadResult = result
      state.form = emptyForm()
      state.form.resume_path = result.file_path
      state.step = 'form'
      // AI 解析预填（异步，不阻断进入表单）
      tryParseAndFill(state.form, result.file_path)
    } else {
      // 多文件 → 分组
      state.groups = guessGroups(state.files)
      state.step = 'grouping'
    }
  } catch (e: any) {
    state.error = e.message || '文件上传失败'
  } finally {
    state.uploading = false
  }
}

function goManual() {
  state.files = []
  state.form = emptyForm()
  state.uploadResult = null
  state.parseError = null
  state.parseErrorType = null
  state.step = 'form'
}

function retryParse() {
  const filePath = state.form.resume_path || state.uploadResult?.file_path
  if (!filePath) return
  tryParseAndFill(state.form, filePath)
}

// ── 分组 ──

function guessGroups(files: File[]): FileGroup[] {
  const map = new Map<string, File[]>()
  for (const f of files) {
    const prefix = f.name.replace(/[_\-\s]?(简历|resume|作品集|portfolio).*$/i, '').replace(/\.[^.]+$/, '')
    const key = prefix.toLowerCase()
    if (!map.has(key)) map.set(key, [])
    map.get(key)!.push(f)
  }
  return Array.from(map.entries()).map(([key, files]) => ({
    label: files[0].name.replace(/\.[^.]+$/, ''),
    files,
  }))
}

function setGroups(groups: FileGroup[]) {
  state.groups = groups
}

async function confirmGroups(groups?: FileGroup[]) {
  state.uploading = true
  state.error = null
  state.uploadedCount = 0

  try {
    if (groups) state.groups = groups

    // 并发上传所有文件
    const uploadPromises = state.groups.map(async (group) => {
      const mainFile = group.files[0]
      try {
        const result = await uploadFile(mainFile)
        group.uploadResult = result
      } catch {
        group.uploadResult = undefined
      }
      state.uploadedCount++
    })
    await Promise.allSettled(uploadPromises)

    // 检查上传失败数
    const failedCount = state.groups.filter((g) => !g.uploadResult).length
    if (failedCount > 0 && failedCount < state.groups.length) {
      state.error = `${failedCount} 个文件上传失败`
    } else if (failedCount === state.groups.length) {
      state.error = '所有文件上传失败'
      return
    }

    // 初始化队列
    state.queue = state.groups.map((group) => ({
      group,
      form: {
        ...emptyForm(),
        resume_path: group.uploadResult?.file_path,
      },
      duplicateCheck: null,
      result: null,
      parsed: false,
      parsing: false,
      parseError: null,
      parseErrorType: null,
    }))
    state.currentIndex = 0
    state.form = state.queue[0].form
    state.duplicateCheck = null
    state.finalResult = null
    state.step = 'form'

    // 对第一个有 resume_path 的 item 自动触发解析
    const firstItem = state.queue[0]
    if (firstItem?.form.resume_path) {
      firstItem.parsed = true
      tryParseAndFill(firstItem.form, firstItem.form.resume_path, firstItem)
    }
  } catch (e: any) {
    state.error = e.message || '文件上传失败'
  } finally {
    state.uploading = false
  }
}

// ── 查重 ──

async function triggerDuplicateCheck() {
  const { name, phone, email } = state.form
  if (!name && !phone && !email) {
    state.duplicateCheck = null
    return
  }
  state.checkingDuplicate = true
  try {
    state.duplicateCheck = await checkDuplicate({
      name: name || undefined,
      phone: phone || undefined,
      email: email || undefined,
    })
  } catch {
    // 查重失败不阻断
    state.duplicateCheck = null
  } finally {
    state.checkingDuplicate = false
  }
}

function dismissDuplicate() {
  state.duplicateCheck = null
}

// ── 建档 ──

async function submitForm(decision: 'create_new' | 'merge_existing' = 'create_new', existingId?: number) {
  state.submitting = true
  state.error = null

  try {
    const res = await resolveIntake({
      decision,
      incoming: state.form,
      existing_candidate_id: existingId,
      overwrite_resume: !!state.form.resume_path,
    })
    state.createdCandidate = res.candidate
    state.step = 'job-link'
  } catch (e: any) {
    state.error = e.message || '建档失败'
  } finally {
    state.submitting = false
  }
}

// ── 关联岗位 ──

async function linkJob(jobId: number) {
  if (!state.createdCandidate) return

  state.submitting = true
  state.error = null

  try {
    const { executeAction, fetchJob } = await import('@/api/pipeline')
    await executeAction({
      command_id: crypto.randomUUID(),
      action_code: 'create_application',
      target: { type: 'candidate', id: state.createdCandidate.id },
      payload: { job_id: jobId },
      actor: { type: 'human' },
    })

    const linkedJob = await fetchJob(jobId)
    finishCurrentCandidate(linkedJob)
  } catch (e: any) {
    state.error = e.message || '加入流程失败'
  } finally {
    state.submitting = false
  }
}

function skipJob() {
  finishCurrentCandidate(null)
}

function finishCurrentCandidate(linkedJob: Job | null) {
  if (isQueueMode()) {
    const item = state.queue[state.currentIndex]
    item.result = {
      candidate: state.createdCandidate!,
      linkedJob,
    }

    // 下一个
    const nextIndex = state.queue.findIndex((q, i) => i > state.currentIndex && !q.result)
    if (nextIndex >= 0) {
      state.currentIndex = nextIndex
      state.form = state.queue[nextIndex].form
      state.duplicateCheck = null
      state.createdCandidate = null
      state.step = 'form'
    } else {
      state.step = 'done'
    }
  } else {
    state.finalResult = {
      candidate: state.createdCandidate!,
      linkedJob,
    }
    state.step = 'done'
  }
}

// ── 队列 ──

function isQueueMode() {
  return state.queue.length > 0
}

function goToQueueItem(index: number) {
  if (index < 0 || index >= state.queue.length) return
  if (index === state.currentIndex) return

  // 保存当前 form 和 duplicateCheck 到当前 queue item
  const currentItem = state.queue[state.currentIndex]
  if (currentItem && !currentItem.result) {
    currentItem.form = { ...state.form }
    currentItem.duplicateCheck = state.duplicateCheck
  }

  // 加载目标 item
  state.currentIndex = index
  const target = state.queue[index]
  state.form = target.form
  state.duplicateCheck = target.duplicateCheck
  state.createdCandidate = target.result?.candidate ?? null
  state.error = null
  state.step = 'form'

  // 恢复目标 item 的解析状态到全局
  state.parsing = target.parsing
  state.parseError = target.parseError
  state.parseErrorType = target.parseErrorType

  // 按需触发解析：未解析过且有 resume_path
  if (!target.parsed && target.form.resume_path) {
    target.parsed = true
    tryParseAndFill(target.form, target.form.resume_path, target)
  }
}

function removeFromQueue(index: number) {
  state.queue.splice(index, 1)
  if (state.queue.length === 0) {
    state.step = 'done'
    return
  }
  if (state.currentIndex >= state.queue.length) {
    state.currentIndex = state.queue.length - 1
  }
  state.form = state.queue[state.currentIndex].form
}

// ── 重置 ──

function reset() {
  pendingDroppedFiles = []
  state.step = 'file-select'
  state.files = []
  state.groups = []
  state.queue = []
  state.currentIndex = 0
  state.form = emptyForm()
  state.duplicateCheck = null
  state.checkingDuplicate = false
  state.createdCandidate = null
  state.finalResult = null
  state.submitting = false
  state.error = null
  state.uploadResult = null
  state.uploading = false
  state.uploadProgress = 0
  state.parsing = false
  state.parseError = null
  state.parseErrorType = null
}

// ── 表单脏检查 ──

function isFormDirty(): boolean {
  const f = state.form

  const hasValue = (value: unknown) => {
    if (typeof value === 'string') return value.trim().length > 0
    return value !== undefined && value !== null
  }

  const hasFilledEntry = (entries: Array<Record<string, unknown> | undefined> | undefined) =>
    (entries ?? []).some((entry) =>
      Object.values(entry ?? {}).some((value) => hasValue(value)),
    )

  return (
    hasValue(f.name)
    || hasValue(f.phone)
    || hasValue(f.email)
    || hasValue(f.source)
    || hasValue(f.name_en)
    || hasValue(f.age)
    || hasValue(f.education)
    || hasValue(f.school)
    || hasValue(f.last_company)
    || hasValue(f.last_title)
    || hasValue(f.years_exp)
    || hasValue(f.notes)
    || hasValue(f.resume_path)
    || hasValue(f.supplier_id)
    || hasValue(f.referred_by)
    || (f.skill_tags ?? []).some((tag) => hasValue(tag))
    || hasFilledEntry(f.education_list as Array<Record<string, unknown> | undefined> | undefined)
    || hasFilledEntry(f.work_experience as Array<Record<string, unknown> | undefined> | undefined)
    || hasFilledEntry(f.project_experience as Array<Record<string, unknown> | undefined> | undefined)
  )
}

export function useCandidateCreate() {
  return {
    state,
    setFiles,
    proceedWithFiles,
    goManual,
    setGroups,
    confirmGroups,
    triggerDuplicateCheck,
    dismissDuplicate,
    submitForm,
    linkJob,
    skipJob,
    removeFromQueue,
    goToQueueItem,
    isQueueMode,
    isFormDirty,
    retryParse,
    reset,
    emptyForm,
  }
}
