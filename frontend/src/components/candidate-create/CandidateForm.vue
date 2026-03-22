<template>
  <div class="candidate-form" :class="{ 'candidate-form--with-preview': showPreview, 'candidate-form--readonly': readonly }">
    <!-- 简历原文预览区 -->
    <div v-if="showPreview" class="resume-preview-area">
      <template v-if="filePath">
        <div v-if="previewLoading" class="resume-preview-area__loading">加载中...</div>
        <!-- PDF → iframe -->
        <iframe
          v-if="fileType === 'pdf' && previewBlobUrl"
          class="resume-preview-area__iframe"
          :src="previewBlobUrl"
          frameborder="0"
          @load="previewLoading = false"
        />
        <!-- DOCX → docx-preview -->
        <div
          v-else-if="fileType === 'docx'"
          ref="docxContainer"
          class="resume-preview-area__docx"
        />
        <!-- 图片 → img -->
        <img
          v-else-if="fileType === 'image' && previewBlobUrl"
          class="resume-preview-area__image"
          :src="previewBlobUrl"
          @load="previewLoading = false"
        />
      </template>
      <div v-else class="resume-preview-area__fallback">
        <p class="resume-preview-area__filename">{{ fileName }}</p>
        <p class="resume-preview-area__hint">预览生成失败，请下载查看</p>
        <button
          v-if="filePath"
          class="resume-preview-area__download"
          @click="downloadFile"
        >下载文件</button>
      </div>
    </div>

    <!-- AI 解析 loading -->
    <div v-if="parsing" class="parsing-overlay">
      <div class="parsing-spinner" />
      <p class="parsing-text">正在解析简历…</p>
    </div>

    <!-- AI 解析错误 -->
    <div v-if="parseError && !parsing" class="parse-error-area">
      <p class="parse-error-text">{{ parseError }}</p>
      <template v-if="parseErrorType !== 'not_configured'">
        <button class="parse-retry-btn" @click="$emit('retry-parse')">重试</button>
      </template>
      <template v-else>
        <p class="parse-error-hint">请在系统设置中配置 AI</p>
      </template>
    </div>

    <!-- 手动建档：可选简历上传 -->
    <div v-if="showManualUpload" class="manual-upload-area">
      <template v-if="!form.resume_path">
        <label class="manual-upload-btn">
          {{ manualUploading ? '上传中...' : '+ 上传简历附件（可选）' }}
          <input
            type="file"
            accept=".pdf,.docx,.png,.jpg,.jpeg"
            class="manual-upload-input"
            :disabled="manualUploading"
            @change="onManualFileSelect"
          />
        </label>
      </template>
      <template v-else>
        <span class="manual-upload-file">{{ manualFileName || '已上传简历' }}</span>
        <button class="manual-upload-remove" @click="removeManualFile">移除</button>
      </template>
      <p v-if="manualUploadError" class="manual-upload-error">{{ manualUploadError }}</p>
    </div>

    <div class="form-section">
      <h3 class="section-title">基本信息</h3>

      <div class="form-grid">
        <div class="form-field">
          <label>姓名 <span class="required">*</span></label>
          <input v-model="form.name" class="text-input" placeholder="姓名" @input="onKeyFieldChange" />
          <span v-if="errors.name" class="field-error">{{ errors.name }}</span>
        </div>
        <div class="form-field">
          <label>英文名</label>
          <input v-model="form.name_en" class="text-input" placeholder="English name" />
        </div>
        <div class="form-field">
          <label>手机</label>
          <input v-model="form.phone" class="text-input" placeholder="手机号" @input="onKeyFieldChange" />
        </div>
        <div class="form-field">
          <label>邮箱</label>
          <input v-model="form.email" class="text-input" placeholder="邮箱" @input="onKeyFieldChange" />
        </div>
        <div class="form-field">
          <label>学历</label>
          <select v-model="form.education" class="select-input">
            <option value="">请选择</option>
            <option v-for="d in degrees" :key="d" :value="d">{{ d }}</option>
          </select>
        </div>
        <div class="form-field">
          <label>学校</label>
          <input v-model="form.school" class="text-input" placeholder="学校" />
        </div>
        <div class="form-field">
          <label>上家职位</label>
          <input v-model="form.last_title" class="text-input" placeholder="上家职位" />
        </div>
        <div class="form-field">
          <label>上家公司</label>
          <input v-model="form.last_company" class="text-input" placeholder="上家公司" />
        </div>
        <div class="form-field form-field--half">
          <label>工作年限</label>
          <input v-model.number="form.years_exp" type="number" step="0.5" min="0" class="text-input" placeholder="0" />
        </div>
        <div class="form-field form-field--half">
          <label>年龄</label>
          <input v-model.number="form.age" type="number" min="0" class="text-input" placeholder="0" />
        </div>
      </div>
    </div>

    <!-- 教育经历 -->
    <div class="form-section">
      <h3 class="section-title">教育经历</h3>
      <div v-for="(edu, i) in form.education_list" :key="i" class="entry-row">
        <div class="entry-fields">
          <input v-model="edu.school" class="text-input entry-input" placeholder="学校" />
          <select v-model="edu.degree" class="select-input entry-input">
            <option value="">学历</option>
            <option v-for="d in degrees" :key="d" :value="d">{{ d }}</option>
          </select>
          <input v-model="edu.major" class="text-input entry-input" placeholder="专业" />
        </div>
        <div class="entry-date-row">
          <YearMonthPicker v-model="edu.start" />
          <span class="entry-date-sep">—</span>
          <YearMonthPicker v-model="edu.end" :allow-present="true" />
        </div>
        <button v-if="form.education_list!.length > 1" class="entry-remove" @click="removeEntry('education_list', i)">×</button>
      </div>
      <button class="add-entry" @click="addEntry('education_list')">+ 添加教育经历</button>
    </div>

    <!-- 工作经历 -->
    <div class="form-section">
      <h3 class="section-title">工作经历</h3>
      <div v-for="(work, i) in form.work_experience" :key="i" class="entry-row">
        <div class="entry-fields">
          <input v-model="work.company" class="text-input entry-input" placeholder="公司" />
          <input v-model="work.title" class="text-input entry-input" placeholder="职位" />
        </div>
        <div class="entry-date-row">
          <YearMonthPicker v-model="work.start" />
          <span class="entry-date-sep">—</span>
          <YearMonthPicker v-model="work.end" :allow-present="true" />
        </div>
        <textarea v-model="work.description" class="text-input entry-textarea" placeholder="工作描述" />
        <button v-if="form.work_experience!.length > 1" class="entry-remove" @click="removeEntry('work_experience', i)">×</button>
      </div>
      <button class="add-entry" @click="addEntry('work_experience')">+ 添加工作经历</button>
    </div>

    <!-- 项目经历 -->
    <div class="form-section">
      <h3 class="section-title">项目经历</h3>
      <div v-for="(proj, i) in form.project_experience" :key="i" class="entry-row">
        <div class="entry-fields">
          <input v-model="proj.name" class="text-input entry-input" placeholder="项目名称" />
          <input v-model="proj.role" class="text-input entry-input" placeholder="角色" />
        </div>
        <div class="entry-date-row">
          <YearMonthPicker v-model="proj.start" />
          <span class="entry-date-sep">—</span>
          <YearMonthPicker v-model="proj.end" :allow-present="true" />
        </div>
        <textarea v-model="proj.description" class="text-input entry-textarea" placeholder="项目描述" />
        <button class="entry-remove" @click="removeEntry('project_experience', i)">×</button>
      </div>
      <button class="add-entry" @click="addEntry('project_experience')">+ 添加项目经历</button>
    </div>

    <!-- 技能标签 -->
    <div class="form-section">
      <h3 class="section-title">技能标签</h3>
      <div class="tags-area">
        <span v-for="(tag, i) in form.skill_tags" :key="i" class="tag">
          {{ tag }}
          <button class="tag-remove" @click="removeTag(i)">×</button>
        </span>
        <input
          v-model="tagInput"
          class="tag-input"
          placeholder="输入标签后回车"
          @keydown.enter.prevent="addTag"
        />
      </div>
    </div>

    <!-- 来源渠道 -->
    <div class="form-section">
      <SourceChannelPicker
        :model-value="form.source"
        :supplier-id="form.supplier_id"
        :referred-by="form.referred_by"
        @update:model-value="form.source = $event"
        @update:supplier-id="form.supplier_id = $event"
        @update:referred-by="form.referred_by = $event"
      />
      <span v-if="errors.source" class="field-error">{{ errors.source }}</span>
    </div>

    <!-- 备注 -->
    <div class="form-section">
      <h3 class="section-title">备注</h3>
      <textarea v-model="form.notes" class="text-input notes-textarea" placeholder="自由文本" />
    </div>

    <!-- 查重区域 -->
    <DuplicateZone
      v-if="!readonly"
      :matches="duplicateMatches ?? []"
      :checking="checkingDuplicate ?? false"
      @check="$emit('check-duplicate')"
      @merge="$emit('merge-existing', $event)"
      @ignore="$emit('dismiss-duplicate')"
      @view-pipeline="$emit('view-pipeline', $event)"
    />

    <!-- 操作 -->
    <div v-if="error" class="form-error">{{ error }}</div>

    <template v-if="readonly">
      <div class="form-readonly-badge">已建档 ✓</div>
    </template>
    <template v-else>
      <div class="form-actions">
        <button class="btn-text" @click="$emit('cancel')">取消</button>
        <button
          class="btn-primary"
          :disabled="submitting"
          @click="onSubmit"
        >
          {{ submitting ? '建档中...' : '确认建档' }}
        </button>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { reactive, ref, computed, watch, onUnmounted, nextTick } from 'vue'
import type { CandidateCreatePayload, DuplicateMatch } from '@/api/types'
import { uploadFile, fetchFileAsBlob } from '@/api/files'
import SourceChannelPicker from './SourceChannelPicker.vue'
import YearMonthPicker from './YearMonthPicker.vue'
import DuplicateZone from './DuplicateZone.vue'

const degrees = ['大专', '本科', '硕士', '博士', '其他']

const props = defineProps<{
  form: CandidateCreatePayload
  filePreview?: {
    name: string
    sizeLabel: string
    status: string
  }
  filePath?: string | null
  submitting: boolean
  parsing: boolean
  parseError?: string | null
  parseErrorType?: string | null
  error: string | null
  readonly?: boolean
  duplicateMatches?: DuplicateMatch[]
  checkingDuplicate?: boolean
}>()

const emit = defineEmits<{
  submit: []
  cancel: []
  'key-field-change': []
  'retry-parse': []
  'check-duplicate': []
  'merge-existing': [candidateId: number]
  'dismiss-duplicate': []
  'view-pipeline': [applicationId: number | undefined]
}>()

const tagInput = ref('')
const errors = reactive({ name: '', source: '' })
const previewLoading = ref(true)

// 手动建档简历上传
const manualUploading = ref(false)
const manualUploadError = ref('')
const manualFileName = ref('')

const showManualUpload = computed(() => !props.filePreview && !props.readonly)

async function onManualFileSelect(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return

  const allowed = ['.pdf', '.docx', '.png', '.jpg', '.jpeg']
  const ext = file.name.slice(file.name.lastIndexOf('.')).toLowerCase()
  if (!allowed.includes(ext)) {
    manualUploadError.value = '仅支持 PDF/DOCX/图片格式'
    input.value = ''
    return
  }
  if (file.size > 100 * 1024 * 1024) {
    manualUploadError.value = '文件大小超过 100MB 限制'
    input.value = ''
    return
  }

  manualUploading.value = true
  manualUploadError.value = ''
  try {
    const result = await uploadFile(file)
    props.form.resume_path = result.file_path
    manualFileName.value = file.name
  } catch (err: any) {
    manualUploadError.value = err.message || '上传失败'
  } finally {
    manualUploading.value = false
    input.value = ''
  }
}

function removeManualFile() {
  props.form.resume_path = undefined
  manualFileName.value = ''
  manualUploadError.value = ''
}

const showPreview = computed(() => !!props.filePreview)

const fileName = computed(() => props.filePreview?.name ?? '')

const normalizedFilePath = computed(() =>
  (props.filePath ?? '').replace(/^\/+/, ''),
)

const fileType = computed(() => {
  const fp = normalizedFilePath.value.toLowerCase()
  if (fp.endsWith('.pdf')) return 'pdf'
  if (fp.endsWith('.docx')) return 'docx'
  if (fp.endsWith('.png') || fp.endsWith('.jpg') || fp.endsWith('.jpeg')) return 'image'
  return 'unknown'
})

// blob URL 预览
const previewBlobUrl = ref<string | null>(null)
const docxContainer = ref<HTMLElement | null>(null)

function revokePreviewBlob() {
  if (previewBlobUrl.value) {
    URL.revokeObjectURL(previewBlobUrl.value)
    previewBlobUrl.value = null
  }
}

watch(
  () => props.filePath,
  async (newPath) => {
    revokePreviewBlob()
    if (!newPath) return
    previewLoading.value = true
    try {
      const normalized = newPath.replace(/^\/+/, '')
      const blobUrl = await fetchFileAsBlob(normalized)
      if (fileType.value === 'docx') {
        // docx-preview 需要 arrayBuffer
        const resp = await fetch(blobUrl)
        const buf = await resp.arrayBuffer()
        URL.revokeObjectURL(blobUrl)
        await nextTick()
        if (docxContainer.value) {
          const { renderAsync } = await import('docx-preview')
          docxContainer.value.innerHTML = ''
          await renderAsync(buf, docxContainer.value)
        }
        previewLoading.value = false
      } else {
        previewBlobUrl.value = blobUrl
      }
    } catch {
      previewBlobUrl.value = null
      previewLoading.value = false
    }
  },
  { immediate: true },
)

onUnmounted(revokePreviewBlob)

async function downloadFile() {
  if (!props.filePath) return
  try {
    const blobUrl = await fetchFileAsBlob(props.filePath)
    const a = document.createElement('a')
    a.href = blobUrl
    a.download = props.filePreview?.name || 'download'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(blobUrl)
  } catch (err: any) {
    alert(err.message || '下载失败')
  }
}

function validate(): boolean {
  errors.name = props.form.name ? '' : '姓名不能为空'
  errors.source = props.form.source ? '' : '来源渠道不能为空'
  return !errors.name && !errors.source
}

function onSubmit() {
  if (validate()) emit('submit')
}

function onKeyFieldChange() {
  emit('key-field-change')
}

function addEntry(field: 'education_list' | 'work_experience' | 'project_experience') {
  ;(props.form[field] as any[])!.push({})
}

function removeEntry(field: 'education_list' | 'work_experience' | 'project_experience', index: number) {
  ;(props.form[field] as any[])!.splice(index, 1)
}

function addTag() {
  const val = tagInput.value.trim()
  if (val && !props.form.skill_tags!.includes(val)) {
    props.form.skill_tags!.push(val)
  }
  tagInput.value = ''
}

function removeTag(index: number) {
  props.form.skill_tags!.splice(index, 1)
}
</script>

<style scoped>
.candidate-form {
  max-width: 640px;
}

.candidate-form--with-preview {
  max-width: none;
  display: flex;
  flex-direction: column;
  height: 100%;
}

/* 简历预览区 */
.resume-preview-area {
  height: 60%;
  min-height: 450px;
  border: 1px solid var(--color-line);
  border-radius: 6px;
  margin-bottom: var(--space-4);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  flex-shrink: 0;
}

.resume-preview-area__iframe {
  width: 100%;
  flex: 1;
  border: none;
}

.resume-preview-area__loading {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--space-6);
  color: var(--color-text-secondary);
  font-size: 14px;
}

.resume-preview-area__fallback {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  padding: var(--space-6);
  flex: 1;
}

.resume-preview-area__filename {
  font-size: 14px;
  font-weight: 500;
  color: var(--color-text-primary);
  word-break: break-all;
  margin: 0;
}

.resume-preview-area__hint {
  font-size: 13px;
  color: var(--color-text-secondary);
  margin: 0;
}

.resume-preview-area__download {
  font-size: 13px;
  padding: 6px 14px;
  border: 1px solid var(--color-line);
  border-radius: 4px;
  color: var(--color-text-primary);
  text-decoration: none;
}

.resume-preview-area__download:hover {
  background: rgba(26, 26, 24, 0.04);
}

.form-section {
  margin-bottom: var(--space-5);
  padding-bottom: var(--space-5);
  border-bottom: 1px solid var(--color-line);
}

.form-section:last-of-type { border-bottom: none; }

.section-title {
  font-size: 14px;
  font-weight: 500;
  margin-bottom: var(--space-3);
}

.form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-3);
}

.form-field {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}

.form-field label {
  font-size: 13px;
  color: var(--color-text-secondary);
}

.required { color: var(--color-urgent); }

.text-input {
  padding: var(--space-2);
  border: 1px solid var(--color-line);
  border-radius: 4px;
  font-size: 14px;
  outline: none;
  transition: border-color 150ms;
  font-family: inherit;
}

.text-input:focus { border-color: var(--color-text-secondary); }

.select-input {
  padding: var(--space-2);
  border: 1px solid var(--color-line);
  border-radius: 4px;
  font-size: 14px;
  background: var(--color-bg);
  outline: none;
}

.field-error {
  font-size: 12px;
  color: var(--color-urgent);
}

/* 经历条目 */
.entry-row {
  position: relative;
  padding: var(--space-3);
  border: 1px solid var(--color-line);
  border-radius: 6px;
  margin-bottom: var(--space-2);
}

.entry-fields {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
}

.entry-input { flex: 1; min-width: 120px; }

.entry-date-row {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  margin-top: var(--space-2);
}

.entry-date-sep {
  color: var(--color-text-tertiary);
  font-size: 13px;
}

/* AI 解析 loading */
.parsing-overlay {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-8) 0;
  margin-bottom: var(--space-5);
}

.parsing-spinner {
  width: 28px;
  height: 28px;
  border: 2.5px solid var(--color-line);
  border-top-color: var(--color-text-primary);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin { to { transform: rotate(360deg); } }

.parsing-text {
  font-size: 14px;
  color: var(--color-text-secondary);
}

.parse-error-area {
  padding: var(--space-3) var(--space-4);
  background: rgba(220, 53, 69, 0.06);
  border-radius: 6px;
  margin-bottom: var(--space-4);
  text-align: center;
}

.parse-error-text {
  font-size: 13px;
  color: var(--color-urgent);
  margin: 0;
}

.parse-error-hint {
  font-size: 12px;
  color: var(--color-text-tertiary);
  margin: var(--space-1) 0 0;
}

.parse-retry-btn {
  margin-top: var(--space-2);
  font-size: 13px;
  color: var(--color-text-secondary);
  text-decoration: underline;
}
.parse-retry-btn:hover { color: var(--color-text-primary); }

.resume-preview-area__docx {
  width: 100%;
  min-height: 300px;
  overflow: auto;
}

.resume-preview-area__image {
  width: 100%;
  max-height: 80vh;
  object-fit: contain;
}

.entry-textarea {
  width: 100%;
  margin-top: var(--space-2);
  min-height: 60px;
  resize: vertical;
}

.entry-remove {
  position: absolute;
  top: var(--space-2);
  right: var(--space-2);
  font-size: 16px;
  color: var(--color-text-tertiary);
  line-height: 1;
}
.entry-remove:hover { color: var(--color-urgent); }

.add-entry {
  font-size: 13px;
  color: var(--color-text-secondary);
  margin-top: var(--space-2);
}
.add-entry:hover { color: var(--color-text-primary); }

/* 技能标签 */
.tags-area {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
  align-items: center;
}

.tag {
  display: inline-flex;
  align-items: center;
  gap: var(--space-1);
  padding: 2px var(--space-2);
  background: rgba(26, 26, 24, 0.06);
  border-radius: 3px;
  font-size: 13px;
}

.tag-remove {
  font-size: 14px;
  color: var(--color-text-tertiary);
  line-height: 1;
}
.tag-remove:hover { color: var(--color-urgent); }

.tag-input {
  border: none;
  outline: none;
  font-size: 13px;
  min-width: 120px;
  padding: 2px 0;
}

/* 备注 */
.notes-textarea {
  width: 100%;
  min-height: 80px;
  resize: vertical;
}

/* 错误和操作 */
.form-error {
  color: var(--color-urgent);
  font-size: 13px;
  margin-bottom: var(--space-3);
}

.form-actions {
  display: flex;
  justify-content: space-between;
  padding-top: var(--space-4);
}

.btn-text {
  font-size: 14px;
  color: var(--color-text-secondary);
}
.btn-text:hover { color: var(--color-text-primary); }

.btn-primary {
  padding: var(--space-2) var(--space-5);
  background: var(--color-text-primary);
  color: var(--color-bg);
  border-radius: 4px;
  font-size: 14px;
  transition: opacity 150ms;
}
.btn-primary:hover { opacity: 0.85; }
.btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }

/* 手动建档简历上传 */
.manual-upload-area {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-3);
  border: 1px dashed var(--color-line);
  border-radius: 6px;
  margin-bottom: var(--space-4);
}

.manual-upload-btn {
  font-size: 13px;
  color: var(--color-text-secondary);
  cursor: pointer;
}
.manual-upload-btn:hover { color: var(--color-text-primary); }

.manual-upload-input {
  display: none;
}

.manual-upload-file {
  font-size: 13px;
  color: var(--color-text-primary);
}

.manual-upload-remove {
  font-size: 12px;
  color: var(--color-text-secondary);
}
.manual-upload-remove:hover { color: var(--color-urgent); }

.manual-upload-error {
  font-size: 12px;
  color: var(--color-urgent);
  margin: 0;
}

/* 只读模式 */
.candidate-form--readonly input,
.candidate-form--readonly select,
.candidate-form--readonly textarea {
  pointer-events: none;
  opacity: 0.7;
}

.form-readonly-badge {
  text-align: center;
  padding: var(--space-4);
  font-size: 15px;
  font-weight: 500;
  color: var(--color-text-secondary);
}
</style>
