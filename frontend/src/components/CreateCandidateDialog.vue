<template>
  <el-dialog
    :model-value="modelValue"
    title="新建候选人"
    width="500px"
    @close="handleClose"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <!-- Resume upload area -->
    <div class="upload-section">
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
          <div v-if="uploadedFileName" style="font-size: 12px; color: #52c41a; margin-top: 4px">
            ✓ {{ uploadedFileName }}
          </div>
        </div>
      </el-upload>
    </div>

    <!-- Warning from AI -->
    <el-alert
      v-if="parseWarning"
      :title="parseWarning"
      type="warning"
      :closable="false"
      style="margin-top: 12px; margin-bottom: 0"
    />

    <!-- Collapsible manual form -->
    <div class="manual-section">
      <div class="manual-toggle" @click="formExpanded = !formExpanded">
        <span>手动填写基础信息</span>
        <el-icon :class="['toggle-icon', { expanded: formExpanded }]"><ArrowDown /></el-icon>
      </div>

      <div v-show="formExpanded" class="manual-form">
        <el-form :model="form" label-width="80px" size="default">
          <el-form-item label="姓名" required>
            <el-input v-model="form.name" placeholder="必填" :class="{ 'is-error': nameError }" />
            <div v-if="nameError" class="form-error">姓名不能为空</div>
          </el-form-item>
          <el-form-item label="手机">
            <el-input v-model="form.phone" placeholder="选填" />
          </el-form-item>
          <el-form-item label="邮箱">
            <el-input v-model="form.email" placeholder="选填" />
          </el-form-item>
          <el-form-item label="当前职位">
            <el-input v-model="form.last_title" placeholder="选填" />
          </el-form-item>
          <el-form-item label="当前公司">
            <el-input v-model="form.last_company" placeholder="选填" />
          </el-form-item>
          <el-form-item label="学历">
            <el-input v-model="form.education" placeholder="选填，如：本科、硕士" />
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
</template>

<script setup>
import { ref, reactive } from 'vue'
import { ElMessage } from 'element-plus'
import axios from 'axios'
import { candidatesApi } from '../api/candidates'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
})
const emit = defineEmits(['update:modelValue', 'created'])

const uploading = ref(false)
const submitting = ref(false)
const formExpanded = ref(false)
const nameError = ref(false)
const parseWarning = ref('')
const uploadedFileName = ref('')
const resumePath = ref('')
const parsedExtra = ref({}) // stores AI-parsed fields not shown in form

const form = reactive({
  name: '',
  phone: '',
  email: '',
  last_title: '',
  last_company: '',
  education: '',
  notes: '',
})

function resetState() {
  uploading.value = false
  submitting.value = false
  formExpanded.value = false
  nameError.value = false
  parseWarning.value = ''
  uploadedFileName.value = ''
  resumePath.value = ''
  parsedExtra.value = {}
  Object.assign(form, {
    name: '',
    phone: '',
    email: '',
    last_title: '',
    last_company: '',
    education: '',
    notes: '',
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

    // Pre-fill form from parsed
    if (parsed.name) form.name = parsed.name
    if (parsed.phone) form.phone = parsed.phone
    if (parsed.email) form.email = parsed.email
    const work0 = (parsed.work_experience || [])[0]
    if (work0) {
      if (work0.title) form.last_title = work0.title
      if (work0.company) form.last_company = work0.company
    }
    const edu0 = (parsed.education_list || [])[0]
    if (edu0 && edu0.degree) form.education = edu0.degree

    // Store additional parsed fields to pass to backend on submit
    parsedExtra.value = {
      name_en: parsed.name_en || undefined,
      age: parsed.age || undefined,
      city: parsed.city || undefined,
      years_exp: parsed.years_exp ?? undefined,
      skill_tags: parsed.skill_tags?.length ? parsed.skill_tags : undefined,
      education_list: parsed.education_list?.length ? parsed.education_list : undefined,
      work_experience: parsed.work_experience?.length ? parsed.work_experience : undefined,
    }

    resumePath.value = data.resume_path || ''
    uploadedFileName.value = file.name

    if (data.warning) {
      parseWarning.value = data.warning
    }

    // Always expand form after upload
    formExpanded.value = true
  } catch (e) {
    ElMessage.error('简历上传失败，请重试')
  } finally {
    uploading.value = false
  }
}

async function handleSubmit() {
  nameError.value = false
  if (!form.name?.trim()) {
    nameError.value = true
    formExpanded.value = true
    return
  }

  submitting.value = true
  try {
    const payload = {
      ...parsedExtra.value,
      name: form.name.trim(),
      phone: form.phone || undefined,
      email: form.email || undefined,
      last_title: form.last_title || undefined,
      last_company: form.last_company || undefined,
      education: form.education || undefined,
      notes: form.notes || undefined,
      resume_path: resumePath.value || undefined,
    }
    // Remove undefined keys
    Object.keys(payload).forEach(k => payload[k] === undefined && delete payload[k])

    await candidatesApi.create(payload)
    ElMessage.success('候选人档案已创建')
    emit('created')
    emit('update:modelValue', false)
    resetState()
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

:deep(.is-error .el-input__wrapper) {
  box-shadow: 0 0 0 1px #f56c6c inset;
}
</style>
