<template>
  <div class="settings-page">
    <h2 class="page-title">设置</h2>

    <!-- AI 配置 -->
    <el-card header="AI 配置" style="max-width: 560px; margin-bottom: 24px">
      <div v-if="loading" class="loading-wrap">
        <el-skeleton :rows="5" animated />
      </div>

      <el-form v-else :model="form" label-width="120px" size="default">
        <el-form-item label="API 地址">
          <el-input v-model="form.api_base" placeholder="如：https://api.moonshot.cn/v1" />
        </el-form-item>
        <el-form-item label="API Key">
          <el-input v-model="form.api_key" type="password" show-password placeholder="sk-..." />
        </el-form-item>
        <el-form-item label="模型">
          <el-input v-model="form.model" placeholder="如：moonshot-v1-32k" />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" :loading="saving" @click="saveConfig">保存</el-button>
          <el-button :loading="verifying" @click="verifyConnection" style="margin-left: 8px">测试连接</el-button>
        </el-form-item>
      </el-form>

      <el-alert
        v-if="verifyResult"
        :type="verifyResult.ok ? 'success' : 'error'"
        :title="verifyResult.message"
        show-icon
        :closable="false"
        style="margin-top: 12px"
      />
    </el-card>

    <!-- 邮件配置 -->
    <el-card header="邮件配置（SMTP）" style="max-width: 560px; margin-bottom: 24px">
      <div v-if="emailLoading" class="loading-wrap">
        <el-skeleton :rows="6" animated />
      </div>

      <el-form v-else :model="emailForm" label-width="120px" size="default">
        <el-form-item label="SMTP 主机">
          <el-input v-model="emailForm.smtp_host" placeholder="如：smtp.feishu.cn" />
        </el-form-item>
        <el-form-item label="端口">
          <el-input-number v-model="emailForm.smtp_port" :min="1" :max="65535" style="width: 120px" />
          <el-checkbox v-model="emailForm.use_ssl" style="margin-left: 16px">使用 SSL</el-checkbox>
        </el-form-item>
        <el-form-item label="发件邮箱">
          <el-input v-model="emailForm.smtp_user" placeholder="hr@yourcompany.com" />
        </el-form-item>
        <el-form-item label="邮箱密码">
          <el-input v-model="emailForm.smtp_password" type="password" show-password placeholder="留空则不修改" />
        </el-form-item>
        <el-form-item label="发件人名称">
          <el-input v-model="emailForm.from_name" placeholder="如：招聘团队" />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" :loading="emailSaving" @click="saveEmailConfig">保存</el-button>
          <el-button :loading="emailVerifying" @click="verifyEmailConnection" style="margin-left: 8px">测试连接</el-button>
        </el-form-item>
      </el-form>

      <el-alert
        v-if="emailVerifyResult"
        :type="emailVerifyResult.ok ? 'success' : 'error'"
        :title="emailVerifyResult.message"
        show-icon
        :closable="false"
        style="margin-top: 12px"
      />
    </el-card>

    <!-- 邮件模板 -->
    <el-card header="邮件模板" style="max-width: 560px">
      <el-form :model="emailForm" label-width="0" size="default">
        <div class="template-section">
          <div class="template-label">面试邀约模板</div>
          <div class="template-vars">
            支持变量：<code>{{candidate_name}}</code> <code>{{job_title}}</code> <code>{{date}}</code>
            <code>{{time}}</code> <code>{{location}}</code> <code>{{interviewer}}</code> <code>{{company_name}}</code>
          </div>
          <el-input
            v-model="emailForm.interview_invite_template"
            type="textarea"
            :rows="8"
            placeholder="请输入面试邀约邮件正文模板..."
          />
        </div>

        <div class="template-section" style="margin-top: 20px">
          <div class="template-label">拒信模板</div>
          <div class="template-vars">
            支持变量：<code>{{candidate_name}}</code> <code>{{job_title}}</code>
          </div>
          <el-input
            v-model="emailForm.rejection_template"
            type="textarea"
            :rows="6"
            placeholder="请输入拒信模板..."
          />
        </div>

        <el-form-item style="margin-top: 16px">
          <el-button type="primary" :loading="emailSaving" @click="saveEmailConfig">保存模板</el-button>
        </el-form-item>
      </el-form>
    </el-card>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { settingsApi } from '../api/settings'

// AI 配置
const loading = ref(false)
const saving = ref(false)
const verifying = ref(false)
const verifyResult = ref(null)

const form = reactive({
  api_base: '',
  api_key: '',
  model: '',
})

async function fetchConfig() {
  loading.value = true
  try {
    const data = await settingsApi.getAi()
    Object.assign(form, {
      api_base: data.api_base || '',
      api_key: data.api_key || '',
      model: data.model || '',
    })
  } finally {
    loading.value = false
  }
}

async function saveConfig() {
  saving.value = true
  try {
    await settingsApi.updateAi({ ...form })
    ElMessage.success('配置已保存')
    verifyResult.value = null
  } finally {
    saving.value = false
  }
}

async function verifyConnection() {
  verifying.value = true
  verifyResult.value = null
  try {
    const res = await settingsApi.verifyAi({ ...form })
    verifyResult.value = { ok: true, message: res.message || '连接成功' }
  } catch (e) {
    verifyResult.value = { ok: false, message: e.response?.data?.detail || '连接失败' }
  } finally {
    verifying.value = false
  }
}

// 邮件配置
const emailLoading = ref(false)
const emailSaving = ref(false)
const emailVerifying = ref(false)
const emailVerifyResult = ref(null)

const emailForm = reactive({
  smtp_host: '',
  smtp_port: 465,
  smtp_user: '',
  smtp_password: '',
  from_name: '',
  use_ssl: true,
  interview_invite_template: '',
  rejection_template: '',
})

async function fetchEmailConfig() {
  emailLoading.value = true
  try {
    const data = await settingsApi.getEmail()
    Object.assign(emailForm, {
      smtp_host: data.smtp_host || '',
      smtp_port: data.smtp_port || 465,
      smtp_user: data.smtp_user || '',
      smtp_password: '',  // 不回显密码
      from_name: data.from_name || '',
      use_ssl: data.use_ssl !== undefined ? data.use_ssl : true,
      interview_invite_template: data.interview_invite_template || '',
      rejection_template: data.rejection_template || '',
    })
  } finally {
    emailLoading.value = false
  }
}

async function saveEmailConfig() {
  emailSaving.value = true
  try {
    const payload = { ...emailForm }
    // 密码为空时不更新（保留原密码）
    if (!payload.smtp_password) delete payload.smtp_password
    await settingsApi.updateEmail(payload)
    ElMessage.success('邮件配置已保存')
    emailVerifyResult.value = null
  } finally {
    emailSaving.value = false
  }
}

async function verifyEmailConnection() {
  emailVerifying.value = true
  emailVerifyResult.value = null
  try {
    const res = await settingsApi.verifyEmail()
    emailVerifyResult.value = { ok: true, message: res.message || '连接成功' }
  } catch (e) {
    emailVerifyResult.value = { ok: false, message: e.response?.data?.detail || '连接失败' }
  } finally {
    emailVerifying.value = false
  }
}

onMounted(() => {
  fetchConfig()
  fetchEmailConfig()
})
</script>

<style scoped>
.settings-page { max-width: 600px; }
.page-title { font-size: 18px; font-weight: 700; color: #222; margin-bottom: 20px; }
.loading-wrap { padding: 12px 0; }
.template-section { margin-bottom: 4px; }
.template-label { font-weight: 600; color: #333; margin-bottom: 6px; }
.template-vars { font-size: 12px; color: #888; margin-bottom: 8px; line-height: 1.8; }
.template-vars code { background: #f3f4f6; padding: 1px 5px; border-radius: 3px; margin-right: 4px; color: #555; }
</style>
