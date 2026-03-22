<template>
  <div class="overlay" @click.self="$emit('close')">
    <div class="panel">
      <div class="panel-header">
        <h2>系统管理</h2>
        <button class="close-btn" @click="$emit('close')">×</button>
      </div>

      <div class="panel-body">
        <p v-if="message" class="message" :class="{ 'message--error': isError }">{{ message }}</p>

        <!-- 用户管理 -->
        <div class="section">
          <div class="section-header">
            <label>用户管理</label>
            <button class="btn btn--sm" @click="showCreateUser = !showCreateUser">+ 新建</button>
          </div>

          <div v-if="showCreateUser" class="create-user-form">
            <input v-model="newLoginName" type="text" placeholder="登录账号" />
            <input v-model="newPassword" type="text" placeholder="初始密码" />
            <div class="create-user-actions">
              <button class="btn btn--sm" :disabled="saving" @click="handleCreateUser">创建</button>
              <button class="btn btn--sm btn--ghost" @click="showCreateUser = false">取消</button>
            </div>
          </div>

          <ul class="user-list">
            <li v-for="u in users" :key="u.id" class="user-item">
              <div class="user-info">
                <span class="user-name">{{ u.display_name || u.login_name }}</span>
                <span v-if="u.is_admin" class="admin-tag">管理员</span>
              </div>
              <div v-if="u.id !== auth.user?.id" class="user-actions">
                <button class="menu-btn" @click="toggleMenu(u.id)">...</button>
                <div v-if="openMenuId === u.id" class="user-menu" @click="openMenuId = null">
                  <button @click="handleResetPassword(u.id)">重置密码</button>
                  <button @click="handleToggleAdmin(u.id, !u.is_admin)">
                    {{ u.is_admin ? '取消管理员' : '设为管理员' }}
                  </button>
                  <button class="danger" @click="handleDeleteUser(u.id)">删除用户</button>
                </div>
              </div>
            </li>
          </ul>
        </div>

        <!-- 注册设置 -->
        <div class="section">
          <label>注册设置</label>
          <div class="toggle-row">
            <span>开放注册</span>
            <button
              class="toggle-btn"
              :class="{ 'toggle-btn--on': registrationOpen }"
              @click="toggleRegistration"
            >
              {{ registrationOpen ? '开' : '关' }}
            </button>
          </div>
        </div>

        <!-- 模型配置 -->
        <div class="section">
          <div class="section-header">
            <label>模型配置</label>
            <button v-if="!editingAi" class="btn btn--sm btn--ghost" @click="startEditAi">修改</button>
          </div>

          <div class="ai-config">
            <div class="config-row">
              <span class="config-label">Provider</span>
              <input v-if="editingAi" v-model="aiForm.provider" type="text" />
              <span v-else class="config-value">{{ aiSettings.provider || '—' }}</span>
            </div>
            <div class="config-row">
              <span class="config-label">模型</span>
              <input v-if="editingAi" v-model="aiForm.model" type="text" />
              <span v-else class="config-value">{{ aiSettings.model || '—' }}</span>
            </div>
            <div class="config-row">
              <span class="config-label">API Key</span>
              <div v-if="editingAi" class="field-row">
                <input v-model="aiForm.api_key" :type="showApiKey ? 'text' : 'password'" />
                <button type="button" class="pwd-toggle" @click="showApiKey = !showApiKey">{{ showApiKey ? '🙈' : '👁' }}</button>
              </div>
              <span v-else class="config-value">{{ aiSettings.api_key || '—' }}</span>
            </div>
            <div class="config-row">
              <span class="config-label">Base URL</span>
              <input v-if="editingAi" v-model="aiForm.base_url" type="text" />
              <span v-else class="config-value">{{ aiSettings.base_url || '—' }}</span>
            </div>
            <div v-if="editingAi" class="config-actions">
              <button class="btn btn--sm" :disabled="saving" @click="saveAiConfig">保存</button>
              <button class="btn btn--sm btn--ghost" @click="editingAi = false">取消</button>
            </div>
            <div class="test-connection">
              <button
                class="btn btn--sm btn--ghost"
                :disabled="testingConnection"
                @click="handleTestConnection"
              >
                {{ testingConnection ? '测试中...' : '测试连接' }}
              </button>
              <span v-if="testConnectionResult" class="test-result" :class="testConnectionResult.ok ? 'test-result--ok' : 'test-result--fail'">
                {{ testConnectionResult.ok ? `连接成功（${testConnectionResult.model}）` : testConnectionResult.error }}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { api } from '@/api/client'
import {
  adminListUsers,
  adminCreateUser,
  adminDeleteUser,
  adminResetPassword,
  adminToggleAdmin,
  adminGetSettings,
  adminUpdateSettings,
} from '@/api/auth'
import type { AuthUser } from '@/api/auth'

defineEmits<{ close: [] }>()

const auth = useAuthStore()

const users = ref<AuthUser[]>([])
const openMenuId = ref<number | null>(null)
const showCreateUser = ref(false)
const newLoginName = ref('')
const newPassword = ref('')
const saving = ref(false)
const message = ref('')
const isError = ref(false)

const registrationOpen = ref(true)
const settingsVersion = ref(1)

const aiSettings = reactive({ provider: '', model: '', api_key: '', base_url: '' })
const aiForm = reactive({ provider: '', model: '', api_key: '', base_url: '' })
const editingAi = ref(false)
const showApiKey = ref(false)
const testingConnection = ref(false)
const testConnectionResult = ref<{ ok: boolean; model?: string; error?: string } | null>(null)

function showMsg(msg: string, error = false) {
  message.value = msg
  isError.value = error
  setTimeout(() => { message.value = '' }, 3000)
}

function toggleMenu(id: number) {
  openMenuId.value = openMenuId.value === id ? null : id
}

onMounted(async () => {
  await Promise.all([loadUsers(), loadSettings()])
})

async function loadUsers() {
  try {
    users.value = await adminListUsers()
  } catch (e: any) {
    showMsg(e.message || '加载用户失败', true)
  }
}

async function loadSettings() {
  try {
    const res = await adminGetSettings()
    settingsVersion.value = res.version
    registrationOpen.value = res.settings.registration_open !== 'false'
    aiSettings.provider = res.settings.ai_provider || ''
    aiSettings.model = res.settings.ai_model || ''
    aiSettings.api_key = res.settings.ai_api_key || ''
    aiSettings.base_url = res.settings.ai_base_url || ''
  } catch {
    // ignore
  }
}

async function handleCreateUser() {
  if (!newLoginName.value || !newPassword.value) { showMsg('请填写完整', true); return }
  saving.value = true
  try {
    await adminCreateUser(newLoginName.value, newPassword.value)
    newLoginName.value = ''
    newPassword.value = ''
    showCreateUser.value = false
    await loadUsers()
    showMsg('用户已创建')
  } catch (e: any) {
    showMsg(e.message || '创建失败', true)
  } finally {
    saving.value = false
  }
}

async function handleDeleteUser(userId: number) {
  if (!confirm('确定删除该用户？')) return
  try {
    await adminDeleteUser(userId)
    await loadUsers()
    showMsg('用户已删除')
  } catch (e: any) {
    showMsg(e.message || '删除失败', true)
  }
}

async function handleResetPassword(userId: number) {
  const pwd = prompt('输入新密码（至少6位）')
  if (!pwd || pwd.length < 6) { showMsg('密码至少6位', true); return }
  try {
    await adminResetPassword(userId, pwd)
    showMsg('密码已重置')
  } catch (e: any) {
    showMsg(e.message || '重置失败', true)
  }
}

async function handleToggleAdmin(userId: number, isAdmin: boolean) {
  try {
    await adminToggleAdmin(userId, isAdmin)
    await loadUsers()
    showMsg(isAdmin ? '已设为管理员' : '已取消管理员')
  } catch (e: any) {
    showMsg(e.message || '操作失败', true)
  }
}

async function toggleRegistration() {
  const newVal = !registrationOpen.value
  saving.value = true
  try {
    const res = await adminUpdateSettings(
      { registration_open: newVal ? 'true' : 'false' },
      settingsVersion.value,
    )
    settingsVersion.value = res.version
    registrationOpen.value = newVal
  } catch (e: any) {
    showMsg(e.message || '保存失败', true)
  } finally {
    saving.value = false
  }
}

function startEditAi() {
  aiForm.provider = aiSettings.provider
  aiForm.model = aiSettings.model
  aiForm.api_key = ''
  aiForm.base_url = aiSettings.base_url
  editingAi.value = true
}

async function saveAiConfig() {
  saving.value = true
  try {
    const settings: Record<string, string> = {
      ai_provider: aiForm.provider,
      ai_model: aiForm.model,
      ai_base_url: aiForm.base_url,
    }
    if (aiForm.api_key) {
      settings.ai_api_key = aiForm.api_key
    }
    const res = await adminUpdateSettings(settings, settingsVersion.value)
    settingsVersion.value = res.version
    editingAi.value = false
    await loadSettings()
    showMsg('模型配置已保存')
  } catch (e: any) {
    showMsg(e.message || '保存失败', true)
  } finally {
    saving.value = false
  }
}

async function handleTestConnection() {
  testingConnection.value = true
  testConnectionResult.value = null
  try {
    const res = await api.post<{ ok: boolean; model?: string; error?: string }>('/admin/ai/test-connection')
    testConnectionResult.value = res
  } catch (e: any) {
    testConnectionResult.value = { ok: false, error: e.message || '请求失败' }
  } finally {
    testingConnection.value = false
  }
}
</script>

<style scoped>
.overlay {
  position: fixed;
  inset: 0;
  z-index: 100;
  background: rgba(0, 0, 0, 0.3);
  display: flex;
  justify-content: center;
  align-items: flex-start;
  padding-top: 80px;
}

.panel {
  width: 480px;
  max-height: 80vh;
  overflow-y: auto;
  background: var(--color-bg, #fff);
  border-radius: 8px;
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.12);
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px 12px;
}

.panel-header h2 { font-size: 18px; font-weight: 600; }

.close-btn {
  font-size: 20px;
  color: var(--color-text-secondary);
  background: none;
  border: none;
  cursor: pointer;
}

.panel-body { padding: 0 24px 24px; }

.message { font-size: 13px; color: var(--color-success, #2e7d32); margin-bottom: 12px; }
.message--error { color: var(--color-danger, #d32f2f); }

.section { margin-bottom: 24px; }
.section > label, .section-header label {
  font-size: 13px;
  font-weight: 500;
  color: var(--color-text-secondary);
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.create-user-form {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 12px;
  padding: 12px;
  background: var(--color-bg-secondary, #f9f9f9);
  border-radius: 4px;
}

.create-user-form input {
  padding: 6px 10px;
  border: 1px solid var(--color-line, #ddd);
  border-radius: 4px;
  font-size: 14px;
}

.create-user-actions { display: flex; gap: 8px; }

.user-list { list-style: none; padding: 0; margin: 8px 0 0; }

.user-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 0;
  border-bottom: 1px solid var(--color-line, #eee);
}

.user-info { display: flex; align-items: center; gap: 8px; }
.user-name { font-size: 14px; }
.admin-tag { font-size: 11px; color: var(--color-text-secondary); background: var(--color-bg-secondary, #f0f0f0); padding: 1px 6px; border-radius: 3px; }

.user-actions { position: relative; }

.menu-btn {
  background: none;
  border: none;
  cursor: pointer;
  font-size: 16px;
  color: var(--color-text-secondary);
  padding: 2px 6px;
}

.user-menu {
  position: absolute;
  right: 0;
  top: 100%;
  background: var(--color-bg, #fff);
  border: 1px solid var(--color-line);
  border-radius: 4px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  z-index: 10;
  min-width: 120px;
}

.user-menu button {
  display: block;
  width: 100%;
  text-align: left;
  padding: 8px 12px;
  font-size: 13px;
  background: none;
  border: none;
  cursor: pointer;
}

.user-menu button:hover { background: var(--color-bg-secondary, #f5f5f5); }
.user-menu button.danger { color: var(--color-danger, #d32f2f); }

.toggle-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 8px;
}

.toggle-row span { font-size: 14px; }

.toggle-btn {
  padding: 4px 16px;
  border-radius: 12px;
  font-size: 12px;
  border: 1px solid var(--color-line, #ddd);
  background: var(--color-bg-secondary, #f0f0f0);
  cursor: pointer;
}

.toggle-btn--on {
  background: var(--color-primary, #1a73e8);
  color: #fff;
  border-color: var(--color-primary, #1a73e8);
}

.ai-config { margin-top: 8px; }

.config-row {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 8px;
}

.config-label {
  width: 80px;
  flex-shrink: 0;
  font-size: 13px;
  color: var(--color-text-secondary);
}

.config-value { font-size: 14px; }

.config-row input {
  flex: 1;
  padding: 6px 10px;
  border: 1px solid var(--color-line, #ddd);
  border-radius: 4px;
  font-size: 14px;
}

.field-row {
  position: relative;
  flex: 1;
}

.field-row input { width: 100%; padding-right: 36px; box-sizing: border-box; }

.pwd-toggle {
  position: absolute;
  right: 8px;
  top: 50%;
  transform: translateY(-50%);
  background: none;
  border: none;
  cursor: pointer;
  font-size: 14px;
  padding: 0;
}

.config-actions { display: flex; gap: 8px; margin-top: 8px; }

.test-connection {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 8px;
}

.test-result {
  font-size: 13px;
}

.test-result--ok {
  color: var(--color-material-moss, #6F7A69);
}

.test-result--fail {
  color: var(--color-urgent, #C4472A);
}

</style>
