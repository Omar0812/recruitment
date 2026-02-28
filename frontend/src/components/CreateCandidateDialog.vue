<template>
  <el-dialog
    :model-value="modelValue"
    title="新建候选人"
    width="600px"
    @close="handleClose"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <!-- Resume upload / preview area -->
    <div class="upload-section">
      <template v-if="!uploadedFileName">
        <el-upload
          drag
          :auto-upload="false"
          :show-file-list="false"
          accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
          :on-change="handleFileChange"
          :disabled="uploading"
        >
          <div class="upload-inner">
            <el-icon v-if="!uploading" style="font-size: 40px; color: #bbb"><UploadFilled /></el-icon>
            <el-icon v-else style="font-size: 40px; color: #409eff" class="spin"><Loading /></el-icon>
            <div style="margin-top: 8px; color: #666; font-size: 14px">
              {{ uploading ? '正在解析简历...' : '拖拽或点击上传简历（可选）' }}
            </div>
            <div style="font-size: 12px; color: #aaa; margin-top: 4px">支持 PDF / Word / 图片，AI 自动解析填入信息</div>
          </div>
        </el-upload>
      </template>
      <template v-else>
        <div class="resume-preview">
          <div class="resume-preview__header">
            <span class="resume-preview__name">已上传：{{ uploadedFileName }}</span>
            <el-upload
              :auto-upload="false"
              :show-file-list="false"
              accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
              :on-change="handleFileChange"
              :disabled="uploading"
            >
              <el-button size="small" plain :loading="uploading">重新上传</el-button>
            </el-upload>
          </div>
          <div class="resume-preview__body">
            <iframe
              v-if="previewType === 'pdf' && previewUrl"
              :src="previewUrl"
              class="resume-preview__frame"
              title="resume-preview"
            />
            <img
              v-else-if="previewType === 'image' && previewUrl"
              :src="previewUrl"
              alt="resume-image"
              class="resume-preview__image"
            />
            <div
              v-else-if="previewType === 'word' && previewHtml"
              class="resume-preview__html"
              v-html="previewHtml"
            />
            <pre v-else class="resume-preview__text">{{ previewText || '暂无可预览内容' }}</pre>
          </div>
        </div>
      </template>
    </div>

    <!-- Warning from AI -->
    <el-alert
      v-if="parseWarning"
      :title="parseWarning"
      type="warning"
      :closable="false"
      style="margin-top: 12px; margin-bottom: 0"
    />

    <!-- Critical fields checkpoint -->
    <div v-if="uploadedFileName" class="critical-check">
      <div class="critical-check__title">关键信息确认（先确认，再完善详细履历）</div>
      <div class="critical-check__desc">重点确认姓名、联系方式、当前职位与公司，避免错建档案。</div>
      <div class="critical-grid">
        <div v-for="item in criticalItems" :key="item.key" class="critical-item">
          <div class="critical-item__label">{{ item.label }}</div>
          <div class="critical-item__value">{{ item.display }}</div>
          <el-tag size="small" :type="item.tagType">{{ item.tagText }}</el-tag>
        </div>
      </div>
      <el-checkbox v-model="criticalConfirmed" class="critical-check__confirm">
        我已确认以上关键字段无误
      </el-checkbox>
    </div>

    <!-- Collapsible manual form -->
    <div class="manual-section">
      <div class="manual-toggle" @click="formExpanded = !formExpanded">
        <span>{{ uploadedFileName ? '确认候选人信息' : '手动填写基础信息' }}</span>
        <el-icon :class="['toggle-icon', { expanded: formExpanded }]"><ArrowDown /></el-icon>
      </div>

      <div v-show="formExpanded" class="manual-form">
        <el-form :model="form" label-width="80px" size="default">
          <el-form-item label="姓名" required>
            <el-input v-model="form.name" placeholder="必填" :class="{ 'is-error': nameError }" />
            <div v-if="nameError" class="form-error">姓名不能为空</div>
          </el-form-item>
          <el-form-item label="英文名">
            <el-input v-model="form.name_en" placeholder="选填" />
          </el-form-item>
          <el-form-item label="手机">
            <el-input v-model="form.phone" placeholder="选填" />
          </el-form-item>
          <el-form-item label="邮箱">
            <el-input v-model="form.email" placeholder="选填" />
          </el-form-item>
          <el-form-item label="城市">
            <el-input v-model="form.city" placeholder="选填" />
          </el-form-item>
          <el-form-item label="年龄">
            <el-input
              v-model="form.age"
              placeholder="选填"
              type="number"
              :min="16"
              :max="70"
              style="width: 100%"
              @keydown="blockE"
            />
          </el-form-item>
          <el-form-item label="工作年限">
            <el-input
              v-model="form.years_exp"
              placeholder="选填，如：3.5"
              type="number"
              :min="0"
              :max="50"
              style="width: 100%"
              @keydown="blockE"
            />
          </el-form-item>
          <el-form-item label="当前职位">
            <el-input v-model="form.last_title" placeholder="选填" />
          </el-form-item>
          <el-form-item label="当前公司">
            <el-input v-model="form.last_company" placeholder="选填" />
          </el-form-item>
          <el-form-item label="学历">
            <el-select v-model="form.education" placeholder="选填" clearable style="width: 100%">
              <el-option label="大专" value="大专" />
              <el-option label="本科" value="本科" />
              <el-option label="硕士" value="硕士" />
              <el-option label="MBA" value="MBA" />
              <el-option label="博士" value="博士" />
              <el-option label="其他" value="其他" />
            </el-select>
          </el-form-item>
          <el-form-item label="技能标签">
            <div class="tag-edit-wrap">
              <el-tag
                v-for="(tag, i) in form.skill_tags"
                :key="i"
                closable
                size="small"
                style="margin: 2px"
                @close="form.skill_tags.splice(i, 1)"
              >{{ tag }}</el-tag>
              <el-input
                v-if="tagInputVisible"
                ref="tagInputRef"
                v-model="tagInputVal"
                size="small"
                style="width: 90px; margin: 2px"
                @keyup.enter="addTag"
                @blur="addTag"
              />
              <el-button v-else size="small" plain style="margin: 2px" @click="showTagInput">+ 标签</el-button>
            </div>
          </el-form-item>
          <el-form-item label="工作经历">
            <div style="width: 100%">
              <div
                v-for="(job, i) in form.work_experience"
                :key="i"
                class="exp-item"
              >
                <el-input v-model="job.title" placeholder="职位" size="small" style="width: 34%; margin-right: 4px" />
                <el-input v-model="job.company" placeholder="公司" size="small" style="width: 34%; margin-right: 4px" />
                <el-select v-model="job.startYear" placeholder="入职年" size="small" style="width: 76px; margin-right: 2px" clearable>
                  <el-option v-for="y in yearOptions" :key="y" :label="y" :value="y" />
                </el-select>
                <el-select v-model="job.startMonth" placeholder="月" size="small" style="width: 56px; margin-right: 4px" clearable>
                  <el-option v-for="m in monthOptions" :key="m" :label="m" :value="m" />
                </el-select>
                <span style="color: #aaa; font-size: 12px; margin-right: 2px">—</span>
                <el-select v-model="job.endYear" placeholder="离职年" size="small" style="width: 76px; margin-right: 2px" clearable>
                  <el-option label="至今" value="至今" />
                  <el-option v-for="y in yearOptions" :key="y" :label="y" :value="y" />
                </el-select>
                <el-select
                  v-model="job.endMonth"
                  placeholder="月"
                  size="small"
                  style="width: 56px; margin-right: 4px"
                  clearable
                  :disabled="job.endYear === '至今'"
                >
                  <el-option v-for="m in monthOptions" :key="m" :label="m" :value="m" />
                </el-select>
                <el-button size="small" type="danger" plain circle @click="form.work_experience.splice(i, 1)">×</el-button>
                <el-input
                  v-model="job.description"
                  type="textarea"
                  :rows="2"
                  placeholder="该段职责与结果（选填）"
                  size="small"
                  style="margin-top: 6px; width: 100%"
                />
              </div>
              <el-button size="small" plain style="margin-top: 4px" @click="form.work_experience.push(newWorkItem())">+ 添加</el-button>
            </div>
          </el-form-item>
          <el-form-item label="项目经历">
            <div style="width: 100%">
              <div
                v-for="(proj, i) in form.project_experience"
                :key="i"
                class="exp-item"
              >
                <el-input v-model="proj.name" placeholder="项目名称" size="small" style="width: 26%; margin-right: 4px" />
                <el-input v-model="proj.role" placeholder="角色" size="small" style="width: 18%; margin-right: 4px" />
                <el-select v-model="proj.startYear" placeholder="开始年" size="small" style="width: 76px; margin-right: 2px" clearable>
                  <el-option v-for="y in yearOptions" :key="y" :label="y" :value="y" />
                </el-select>
                <el-select v-model="proj.startMonth" placeholder="月" size="small" style="width: 56px; margin-right: 4px" clearable>
                  <el-option v-for="m in monthOptions" :key="m" :label="m" :value="m" />
                </el-select>
                <span style="color: #aaa; font-size: 12px; margin-right: 2px">—</span>
                <el-select v-model="proj.endYear" placeholder="结束年" size="small" style="width: 76px; margin-right: 2px" clearable>
                  <el-option label="至今" value="至今" />
                  <el-option v-for="y in yearOptions" :key="y" :label="y" :value="y" />
                </el-select>
                <el-select
                  v-model="proj.endMonth"
                  placeholder="月"
                  size="small"
                  style="width: 56px; margin-right: 4px"
                  clearable
                  :disabled="proj.endYear === '至今'"
                >
                  <el-option v-for="m in monthOptions" :key="m" :label="m" :value="m" />
                </el-select>
                <el-button size="small" type="danger" plain circle @click="form.project_experience.splice(i, 1)">×</el-button>
                <el-input
                  v-model="proj.description"
                  type="textarea"
                  :rows="2"
                  placeholder="项目职责与产出（选填）"
                  size="small"
                  style="margin-top: 6px; width: 100%"
                />
                <el-input
                  v-model="proj.techStackText"
                  placeholder="技术栈（选填，逗号分隔）"
                  size="small"
                  style="margin-top: 6px; width: 100%"
                />
              </div>
              <el-button size="small" plain style="margin-top: 4px" @click="form.project_experience.push(newProjectItem())">+ 添加</el-button>
            </div>
          </el-form-item>
          <el-form-item label="教育经历">
            <div style="width: 100%">
              <div
                v-for="(edu, i) in form.education_list"
                :key="i"
                class="exp-item"
              >
                <el-select v-model="edu.degree" placeholder="学历" size="small" style="width: 70px; margin-right: 4px" clearable>
                  <el-option label="大专" value="大专" />
                  <el-option label="本科" value="本科" />
                  <el-option label="硕士" value="硕士" />
                  <el-option label="MBA" value="MBA" />
                  <el-option label="博士" value="博士" />
                </el-select>
                <el-input v-model="edu.school" placeholder="院校" size="small" style="width: 28%; margin-right: 4px" />
                <el-input v-model="edu.major" placeholder="专业" size="small" style="width: 22%; margin-right: 4px" />
                <el-select v-model="edu.startYear" placeholder="入学年" size="small" style="width: 76px; margin-right: 2px" clearable>
                  <el-option v-for="y in yearOptions" :key="y" :label="y" :value="y" />
                </el-select>
                <el-select v-model="edu.startMonth" placeholder="月" size="small" style="width: 56px; margin-right: 4px" clearable>
                  <el-option v-for="m in monthOptions" :key="m" :label="m" :value="m" />
                </el-select>
                <span style="color: #aaa; font-size: 12px; margin-right: 2px">—</span>
                <el-select v-model="edu.endYear" placeholder="毕业年" size="small" style="width: 76px; margin-right: 2px" clearable>
                  <el-option label="至今" value="至今" />
                  <el-option v-for="y in yearOptions" :key="y" :label="y" :value="y" />
                </el-select>
                <el-select
                  v-model="edu.endMonth"
                  placeholder="月"
                  size="small"
                  style="width: 56px; margin-right: 4px"
                  clearable
                  :disabled="edu.endYear === '至今'"
                >
                  <el-option v-for="m in monthOptions" :key="m" :label="m" :value="m" />
                </el-select>
                <el-button size="small" type="danger" plain circle @click="form.education_list.splice(i, 1)">×</el-button>
              </div>
              <el-button size="small" plain style="margin-top: 4px" @click="form.education_list.push({ degree: '', school: '', major: '', startYear: '', startMonth: '', endYear: '', endMonth: '' })">+ 添加</el-button>
            </div>
          </el-form-item>
          <el-form-item label="备注">
            <el-input v-model="form.notes" type="textarea" :rows="2" placeholder="选填" />
          </el-form-item>
        </el-form>
      </div>
    </div>

    <template #footer>
      <el-button @click="handleClose">取消</el-button>
      <el-button type="primary" :loading="submitting" @click="handleSubmit">建立档案</el-button>
    </template>
  </el-dialog>

  <el-dialog
    v-model="dedupDialogVisible"
    title="查重判定"
    width="760px"
    append-to-body
    :close-on-click-modal="false"
    :close-on-press-escape="false"
    :show-close="false"
  >
    <el-alert
      type="warning"
      :closable="false"
      title="检测到系统中存在相似候选人，请立即判定：同一人合并，或按新候选人创建。"
      style="margin-bottom: 12px"
    />
    <el-alert
      v-if="hasBlockingInProgressMatch"
      type="error"
      :closable="false"
      title="命中进行中候选人，按规则不能新开流程。请合并后进入进行中页处理。"
      style="margin-bottom: 12px"
    />

    <el-radio-group v-model="dedupSelectedCandidateId" class="dedup-group">
      <div
        v-for="item in dedupMatches"
        :key="item.id"
        :class="['dedup-item', { active: dedupSelectedCandidateId === item.id }]"
      >
        <div class="dedup-item__header">
          <el-radio :label="item.id">
            {{ item.name || item.display_id }} · {{ item.display_id }}
          </el-radio>
          <div class="dedup-item__reasons">
            <el-tag
              v-for="reason in item.match_reasons || []"
              :key="`${item.id}-${reason}`"
              size="small"
              type="warning"
              style="margin-left: 6px"
            >
              {{ reason }}
            </el-tag>
          </div>
        </div>
        <div class="dedup-item__meta">
          <span>手机：{{ item.phone || '—' }}</span>
          <span>邮箱：{{ item.email || '—' }}</span>
          <span>公司：{{ item.last_company || '—' }}</span>
        </div>
        <div class="dedup-item__context">
          <template v-if="item.last_application">
            最近申请：{{ item.last_application.job_title || '未知岗位' }} · {{ item.last_application.final_stage || '未知阶段' }} ·
            {{ outcomeText(item.last_application.outcome) }}
            <span v-if="item.last_application.days_ago != null">（{{ item.last_application.days_ago }} 天前）</span>
          </template>
          <template v-else>
            最近申请：暂无
          </template>
        </div>
        <div v-if="item.active_link" class="dedup-item__active">
          在途流程：{{ item.active_link.job_title || `岗位#${item.active_link.job_id}` }} · {{ item.active_link.stage || '未知阶段' }}
        </div>
      </div>
    </el-radio-group>

    <el-checkbox
      v-if="dedupPendingPayload?.resume_path"
      v-model="dedupOverwriteResume"
      style="margin-top: 8px"
    >
      合并时使用新简历覆盖已有简历
    </el-checkbox>

    <template #footer>
      <el-button
        type="primary"
        plain
        :disabled="hasBlockingInProgressMatch || dedupSubmitting"
        :loading="dedupSubmitting && dedupAction === 'create'"
        @click="confirmCreateAsNew"
      >
        按新候选人创建
      </el-button>
      <el-button
        type="primary"
        :disabled="!dedupSelectedCandidateId || dedupSubmitting"
        :loading="dedupSubmitting && dedupAction === 'merge'"
        @click="confirmMergeExisting"
      >
        合并到已有档案
      </el-button>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, reactive, computed, watch, nextTick } from 'vue'
import { ElMessage } from 'element-plus'
import axios from 'axios'
import { useRouter } from 'vue-router'
import { candidatesApi } from '../api/candidates'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
})
const emit = defineEmits(['update:modelValue', 'created'])
const router = useRouter()

const uploading = ref(false)
const submitting = ref(false)
const formExpanded = ref(false)
const nameError = ref(false)
const parseWarning = ref('')
const uploadedFileName = ref('')
const resumePath = ref('')
const previewUrl = ref('')
const previewType = ref('')
const previewHtml = ref('')
const previewText = ref('')
const criticalConfirmed = ref(false)
const dedupDialogVisible = ref(false)
const dedupMatches = ref([])
const dedupSelectedCandidateId = ref(null)
const dedupOverwriteResume = ref(false)
const dedupPendingPayload = ref(null)
const dedupSubmitting = ref(false)
const dedupAction = ref('')

const tagInputVisible = ref(false)
const tagInputVal = ref('')
const tagInputRef = ref(null)

function isValidPhone(phone) {
  if (!phone) return true
  return /^1\d{10}$/.test(String(phone).trim())
}

function isValidEmail(email) {
  if (!email) return true
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email).trim())
}

const criticalItems = computed(() => {
  const items = [
    {
      key: 'name',
      label: '姓名',
      value: form.name,
      blocking: !form.name?.trim(),
      suggest: false,
      invalid: false,
    },
    {
      key: 'phone',
      label: '手机',
      value: form.phone,
      blocking: Boolean(form.phone) && !isValidPhone(form.phone),
      suggest: !form.phone,
      invalid: Boolean(form.phone) && !isValidPhone(form.phone),
    },
    {
      key: 'email',
      label: '邮箱',
      value: form.email,
      blocking: Boolean(form.email) && !isValidEmail(form.email),
      suggest: !form.email,
      invalid: Boolean(form.email) && !isValidEmail(form.email),
    },
    {
      key: 'last_title',
      label: '当前职位',
      value: form.last_title,
      blocking: false,
      suggest: !form.last_title,
      invalid: false,
    },
    {
      key: 'last_company',
      label: '当前公司',
      value: form.last_company,
      blocking: false,
      suggest: !form.last_company,
      invalid: false,
    },
  ]
  return items.map((item) => {
    let tagType = 'success'
    let tagText = '已确认'
    if (item.blocking || item.invalid) {
      tagType = 'danger'
      tagText = '需修正'
    } else if (item.suggest) {
      tagType = 'warning'
      tagText = '建议补全'
    }
    return {
      ...item,
      display: item.value ? String(item.value) : '—',
      tagType,
      tagText,
    }
  })
})

const hasCriticalBlockingIssue = computed(() => criticalItems.value.some(item => item.blocking))
const hasBlockingInProgressMatch = computed(() => dedupMatches.value.some(item => item.active_link))
const selectedDedupCandidate = computed(() => dedupMatches.value.find(item => item.id === dedupSelectedCandidateId.value) || null)

// Year options: current year down to 1980
const currentYear = new Date().getFullYear()
const yearOptions = Array.from({ length: currentYear - 1979 }, (_, i) => String(currentYear - i))
const monthOptions = Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0'))

function blockE(e) {
  if (e.key === 'e' || e.key === 'E' || e.key === '+' || e.key === '-') e.preventDefault()
}

function parsePoint(part) {
  if (!part) return { year: '', month: '' }
  if (part.includes('至今') || part === '今') return { year: '至今', month: '' }
  const m = part.match(/(\d{4})(?:[.\-/年]?(\d{1,2}))?/)
  if (!m) return { year: '', month: '' }
  const year = m[1] || ''
  const month = m[2] ? String(m[2]).padStart(2, '0') : ''
  return { year, month }
}

// Parse "2019.03-至今" / "2019-2023" / "2019.03-2023.10"
function parsePeriod(period) {
  if (!period) return { startYear: '', startMonth: '', endYear: '', endMonth: '' }
  const parts = period.split(/[-–—~至]/).map(s => s.trim()).filter(Boolean)
  const start = parsePoint(parts[0] || '')
  const end = period.includes('至今') ? { year: '至今', month: '' } : parsePoint(parts[1] || '')
  return {
    startYear: start.year === '至今' ? '' : start.year,
    startMonth: start.month,
    endYear: end.year,
    endMonth: end.year === '至今' ? '' : end.month,
  }
}

function withMonth(year, month) {
  if (!year) return ''
  return month ? `${year}.${String(month).padStart(2, '0')}` : String(year)
}

// Format { startYear, startMonth, endYear, endMonth } to "2019.03-至今"
function formatPeriod(startYear, startMonth, endYear, endMonth) {
  if (!startYear && !endYear) return ''
  const start = withMonth(startYear, startMonth)
  if (!start) return endYear === '至今' ? '至今' : withMonth(endYear, endMonth)
  if (!endYear) return start
  if (endYear === '至今') return `${start}-至今`
  return `${start}-${withMonth(endYear, endMonth)}`
}

function outcomeText(outcome) {
  if (!outcome) return '进行中'
  if (outcome === 'hired') return '已入职'
  if (outcome === 'rejected') return '已淘汰'
  if (outcome === 'withdrawn') return '已退出'
  return outcome
}

function showTagInput() {
  tagInputVisible.value = true
  nextTick(() => tagInputRef.value?.focus())
}
function addTag() {
  const val = tagInputVal.value.trim()
  if (val && !form.skill_tags.includes(val)) form.skill_tags.push(val)
  tagInputVal.value = ''
  tagInputVisible.value = false
}

function newWorkItem() {
  return { title: '', company: '', startYear: '', startMonth: '', endYear: '', endMonth: '', description: '' }
}

function newProjectItem() {
  return {
    name: '',
    role: '',
    startYear: '',
    startMonth: '',
    endYear: '',
    endMonth: '',
    description: '',
    techStackText: '',
  }
}

const form = reactive({
  name: '',
  name_en: '',
  phone: '',
  email: '',
  city: '',
  age: null,
  years_exp: null,
  last_title: '',
  last_company: '',
  education: '',
  skill_tags: [],
  work_experience: [],
  project_experience: [],
  education_list: [],
  notes: '',
})

watch(
  () => [form.name, form.phone, form.email, form.last_title, form.last_company],
  () => {
    if (uploadedFileName.value) {
      criticalConfirmed.value = false
    }
  }
)

function resetState() {
  uploading.value = false
  submitting.value = false
  dedupSubmitting.value = false
  dedupAction.value = ''
  formExpanded.value = false
  nameError.value = false
  parseWarning.value = ''
  uploadedFileName.value = ''
  resumePath.value = ''
  previewUrl.value = ''
  previewType.value = ''
  previewHtml.value = ''
  previewText.value = ''
  criticalConfirmed.value = false
  dedupDialogVisible.value = false
  dedupMatches.value = []
  dedupSelectedCandidateId.value = null
  dedupOverwriteResume.value = false
  dedupPendingPayload.value = null
  tagInputVisible.value = false
  tagInputVal.value = ''
  Object.assign(form, {
    name: '', name_en: '', phone: '', email: '', city: '',
    age: null, years_exp: null, last_title: '', last_company: '',
    education: '', skill_tags: [], work_experience: [], project_experience: [], education_list: [], notes: '',
  })
}

async function handleFileChange(file) {
  uploading.value = true
  parseWarning.value = ''
  try {
    const fd = new FormData()
    fd.append('file', file.raw)
    const res = await axios.post('/api/resume/upload', fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    const data = res.data
    const parsed = data.parsed || {}

    // Pre-fill all parsed fields directly into form
    if (parsed.name) form.name = parsed.name
    if (parsed.name_en) form.name_en = parsed.name_en
    if (parsed.phone) form.phone = parsed.phone
    if (parsed.email) form.email = parsed.email
    if (parsed.city) form.city = parsed.city
    if (parsed.age) form.age = parsed.age
    if (parsed.years_exp != null) form.years_exp = parsed.years_exp
    if (parsed.skill_tags?.length) form.skill_tags = [...parsed.skill_tags]
    form.work_experience = []
    if (parsed.work_experience?.length) {
      form.work_experience = parsed.work_experience.map(w => {
        const { startYear, startMonth, endYear, endMonth } = parsePeriod(w.period)
        const detailText = w.description || w.detail || (Array.isArray(w.highlights) ? w.highlights.join('；') : '') || ''
        return { title: w.title || '', company: w.company || '', startYear, startMonth, endYear, endMonth, description: detailText }
      })
      form.last_title = parsed.work_experience[0]?.title || form.last_title
      form.last_company = parsed.work_experience[0]?.company || form.last_company
    }
    form.project_experience = []
    if (parsed.project_experience?.length) {
      form.project_experience = parsed.project_experience.map(p => {
        const { startYear, startMonth, endYear, endMonth } = parsePeriod(p.period)
        const techStack = Array.isArray(p.tech_stack) ? p.tech_stack.join(', ') : (p.tech_stack || '')
        return {
          name: p.name || '',
          role: p.role || '',
          startYear,
          startMonth,
          endYear,
          endMonth,
          description: p.description || p.detail || '',
          techStackText: techStack,
        }
      })
    }
    form.education_list = []
    if (parsed.education_list?.length) {
      form.education_list = parsed.education_list.map(e => {
        const { startYear, startMonth, endYear, endMonth } = parsePeriod(e.period)
        return { degree: e.degree || '', school: e.school || '', major: e.major || '', startYear, startMonth, endYear, endMonth }
      })
      form.education = parsed.education_list[0]?.degree || form.education
    }

    resumePath.value = data.resume_path || ''
    uploadedFileName.value = file.name
    previewUrl.value = data.preview_url || ''
    previewType.value = data.preview_type || ''
    previewHtml.value = data.preview_html || ''
    previewText.value = data.extracted_text || ''

    if (data.warning) {
      parseWarning.value = data.warning
    }

    // Always expand form after upload
    criticalConfirmed.value = false
    formExpanded.value = true
  } catch (e) {
    ElMessage.error('简历上传失败，请重试')
  } finally {
    uploading.value = false
  }
}

function buildPayload() {
  const payload = {
    name: form.name.trim(),
    name_en: form.name_en || undefined,
    phone: form.phone || undefined,
    email: form.email || undefined,
    city: form.city || undefined,
    age: form.age ? Number(form.age) : undefined,
    years_exp: form.years_exp != null && form.years_exp !== '' ? Number(form.years_exp) : undefined,
    last_title: form.last_title || undefined,
    last_company: form.last_company || undefined,
    education: form.education || undefined,
    skill_tags: form.skill_tags.length ? form.skill_tags : undefined,
    work_experience: form.work_experience.length ? form.work_experience.map(w => ({
      title: w.title,
      company: w.company,
      period: formatPeriod(w.startYear, w.startMonth, w.endYear, w.endMonth),
      description: w.description || undefined,
    })) : undefined,
    project_experience: form.project_experience.length ? form.project_experience.map(p => ({
      name: p.name,
      role: p.role || undefined,
      period: formatPeriod(p.startYear, p.startMonth, p.endYear, p.endMonth),
      description: p.description || undefined,
      tech_stack: (p.techStackText || '')
        .split(/[,，、]/)
        .map(s => s.trim())
        .filter(Boolean),
    })) : undefined,
    education_list: form.education_list.length ? form.education_list.map(e => ({
      degree: e.degree,
      school: e.school,
      major: e.major,
      period: formatPeriod(e.startYear, e.startMonth, e.endYear, e.endMonth),
    })) : undefined,
    notes: form.notes || undefined,
    resume_path: resumePath.value || undefined,
  }
  Object.keys(payload).forEach(k => payload[k] === undefined && delete payload[k])
  return payload
}

function finalizeAndClose() {
  emit('created')
  emit('update:modelValue', false)
  resetState()
}

function openDedupDecision(payload, matches) {
  dedupPendingPayload.value = payload
  dedupMatches.value = matches || []
  dedupSelectedCandidateId.value = dedupMatches.value[0]?.id || null
  dedupOverwriteResume.value = Boolean(payload?.resume_path)
  dedupDialogVisible.value = true
}

async function createAsNew(payload) {
  await candidatesApi.intakeResolve({
    decision: 'create_new',
    incoming: payload,
  })
  ElMessage.success('候选人档案已创建')
  finalizeAndClose()
}

async function confirmCreateAsNew() {
  if (!dedupPendingPayload.value) return
  if (hasBlockingInProgressMatch.value) {
    ElMessage.warning('命中在途候选人，不能按新建创建')
    return
  }
  dedupSubmitting.value = true
  dedupAction.value = 'create'
  try {
    await createAsNew(dedupPendingPayload.value)
  } finally {
    dedupSubmitting.value = false
    dedupAction.value = ''
  }
}

async function confirmMergeExisting() {
  if (!dedupPendingPayload.value) return
  if (!dedupSelectedCandidateId.value) {
    ElMessage.warning('请先选择要合并的候选人')
    return
  }
  dedupSubmitting.value = true
  dedupAction.value = 'merge'
  try {
    const res = await candidatesApi.intakeResolve({
      decision: 'merge_existing',
      existing_candidate_id: dedupSelectedCandidateId.value,
      incoming: dedupPendingPayload.value,
      overwrite_resume: dedupOverwriteResume.value,
    })
    const target = selectedDedupCandidate.value
    ElMessage.success(`已合并到 ${target?.display_id || `C${dedupSelectedCandidateId.value}`}`)
    const activeLinkId = res?.active_link?.id
    finalizeAndClose()
    if (activeLinkId) {
      await router.push({ path: '/pipeline', query: { link_id: String(activeLinkId) } })
    }
  } finally {
    dedupSubmitting.value = false
    dedupAction.value = ''
  }
}

async function handleSubmit() {
  nameError.value = false
  if (!form.name?.trim()) {
    nameError.value = true
    formExpanded.value = true
    return
  }
  if (uploadedFileName.value && hasCriticalBlockingIssue.value) {
    ElMessage.warning('请先修正关键字段中的错误项')
    formExpanded.value = true
    return
  }
  if (uploadedFileName.value && !criticalConfirmed.value) {
    ElMessage.warning('请先确认关键字段无误')
    formExpanded.value = true
    return
  }

  const payload = buildPayload()
  submitting.value = true
  try {
    const dedupResult = await candidatesApi.checkDuplicate({
      name: payload.name,
      phone: payload.phone,
      email: payload.email,
      last_company: payload.last_company,
    })
    const matches = dedupResult?.matches || []
    if (matches.length) {
      openDedupDecision(payload, matches)
      return
    }
    await createAsNew(payload)
  } finally {
    submitting.value = false
  }
}

function handleClose() {
  emit('update:modelValue', false)
  resetState()
}
</script>

<style scoped>
.upload-section {
  margin-bottom: 0;
}

.upload-inner {
  padding: 16px 0;
  text-align: center;
}

.resume-preview {
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  overflow: hidden;
  background: #fff;
}

.resume-preview__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 8px 10px;
  background: #f8fafc;
  border-bottom: 1px solid #eef2f7;
}

.resume-preview__name {
  font-size: 12px;
  color: #4b5563;
}

.resume-preview__body {
  height: 280px;
  overflow: auto;
}

.resume-preview__frame {
  width: 100%;
  height: 100%;
  border: 0;
}

.resume-preview__image {
  display: block;
  width: 100%;
  height: auto;
}

.resume-preview__html {
  padding: 10px 12px;
  font-size: 13px;
  line-height: 1.55;
  color: #1f2937;
}

.resume-preview__text {
  margin: 0;
  padding: 10px 12px;
  white-space: pre-wrap;
  word-break: break-word;
  font-size: 12px;
  color: #374151;
}

.spin {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.manual-section {
  margin-top: 16px;
  border-top: 1px solid #f0f0f0;
}

.critical-check {
  margin-top: 12px;
  padding: 12px;
  border: 1px solid #d6e4ff;
  border-radius: 8px;
  background: #f8fbff;
}

.critical-check__title {
  font-size: 13px;
  font-weight: 600;
  color: #1f2d3d;
}

.critical-check__desc {
  margin-top: 4px;
  font-size: 12px;
  color: #6b7280;
}

.critical-grid {
  margin-top: 10px;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 8px;
}

.critical-item {
  padding: 8px;
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.critical-item__label {
  font-size: 12px;
  color: #6b7280;
}

.critical-item__value {
  font-size: 13px;
  color: #1f2937;
  word-break: break-word;
}

.critical-check__confirm {
  margin-top: 10px;
}

.manual-toggle {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 0 10px;
  cursor: pointer;
  color: #666;
  font-size: 13px;
  user-select: none;
}

.manual-toggle:hover {
  color: #409eff;
}

.toggle-icon {
  transition: transform 0.2s;
}

.toggle-icon.expanded {
  transform: rotate(180deg);
}

.manual-form {
  padding-top: 4px;
}

.form-error {
  color: #f56c6c;
  font-size: 12px;
  margin-top: 4px;
}

.tag-edit-wrap {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 2px;
}

.exp-item {
  display: flex;
  align-items: flex-start;
  flex-wrap: wrap;
  margin-bottom: 6px;
}

.dedup-group {
  width: 100%;
  max-height: 360px;
  overflow: auto;
}

.dedup-item {
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 10px 12px;
  margin-bottom: 10px;
  background: #fff;
}

.dedup-item.active {
  border-color: #1677ff;
  background: #f4f8ff;
}

.dedup-item__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.dedup-item__meta {
  margin-top: 6px;
  font-size: 12px;
  color: #6b7280;
  display: flex;
  gap: 14px;
  flex-wrap: wrap;
}

.dedup-item__context {
  margin-top: 6px;
  font-size: 12px;
  color: #374151;
}

.dedup-item__active {
  margin-top: 6px;
  font-size: 12px;
  color: #b42318;
}

:deep(.is-error .el-input__wrapper) {
  box-shadow: 0 0 0 1px #f56c6c inset;
}
</style>
