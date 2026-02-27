<template>
  <div class="settings-page">
    <h2 class="page-title">设置</h2>

    <el-card header="AI 配置" style="max-width: 560px">
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
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { settingsApi } from '../api/settings'

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

onMounted(fetchConfig)
</script>

<style scoped>
.settings-page { max-width: 600px; }
.page-title { font-size: 18px; font-weight: 700; color: #222; margin-bottom: 20px; }
.loading-wrap { padding: 12px 0; }
</style>
