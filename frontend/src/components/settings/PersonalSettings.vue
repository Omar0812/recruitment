<template>
  <div class="overlay" @click.self="$emit('close')">
    <div class="panel">
      <div class="panel-header">
        <h2>个人设置</h2>
        <button class="close-btn" @click="$emit('close')">×</button>
      </div>

      <div class="panel-body">
        <p v-if="message" class="message" :class="{ 'message--error': isError }">{{ message }}</p>

        <!-- 头像 -->
        <div class="section">
          <label>头像</label>
          <div class="avatar-row">
            <div class="avatar">
              <img v-if="avatarUrl" :src="avatarUrl" alt="头像" />
              <span v-else class="avatar-placeholder">{{ initials }}</span>
            </div>
            <input type="file" accept="image/*" @change="handleAvatarChange" />
          </div>
        </div>

        <!-- 名字 -->
        <div class="section">
          <label>名字</label>
          <div class="inline-edit">
            <input v-model="displayName" type="text" />
            <button class="btn btn--sm" :disabled="saving" @click="saveName">保存</button>
          </div>
        </div>

        <!-- 修改密码 -->
        <div class="section">
          <label>修改密码</label>
          <div class="password-fields">
            <div class="field-row">
              <input v-model="oldPassword" :type="showPwd ? 'text' : 'password'" placeholder="旧密码" />
              <button type="button" class="pwd-toggle" @click="showPwd = !showPwd">{{ showPwd ? '🙈' : '👁' }}</button>
            </div>
            <input v-model="newPassword" :type="showPwd ? 'text' : 'password'" placeholder="新密码（至少6位）" />
            <button class="btn btn--sm" :disabled="saving" @click="savePassword">修改密码</button>
          </div>
        </div>

        <!-- 退出登录 -->
        <div class="section">
          <button class="btn btn--danger" @click="handleLogout">退出登录</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { updateProfile, changePassword } from '@/api/auth'
import { uploadFile } from '@/api/files'

defineEmits<{ close: [] }>()

const router = useRouter()
const auth = useAuthStore()

const displayName = ref(auth.user?.display_name ?? '')
const oldPassword = ref('')
const newPassword = ref('')
const showPwd = ref(false)
const saving = ref(false)
const message = ref('')
const isError = ref(false)

const avatarUrl = computed(() => {
  const p = auth.user?.avatar_path
  return p ? `/api/v1/files/${p}` : null
})

const initials = computed(() => {
  const name = auth.user?.display_name || auth.user?.login_name || '?'
  return name.slice(0, 1).toUpperCase()
})

function showMsg(msg: string, error = false) {
  message.value = msg
  isError.value = error
  setTimeout(() => { message.value = '' }, 3000)
}

async function handleAvatarChange(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return
  saving.value = true
  try {
    const uploaded = await uploadFile(file)
    await updateProfile({ avatar_path: uploaded.file_path })
    await auth.loadUser()
    showMsg('头像已更新')
  } catch (err: any) {
    showMsg(err.message || '上传失败', true)
  } finally {
    saving.value = false
  }
}

async function saveName() {
  const name = displayName.value.trim()
  if (!name) { showMsg('请输入名字', true); return }
  saving.value = true
  try {
    await updateProfile({ display_name: name })
    await auth.loadUser()
    showMsg('名字已更新')
  } catch (err: any) {
    showMsg(err.message || '保存失败', true)
  } finally {
    saving.value = false
  }
}

async function savePassword() {
  if (!oldPassword.value) { showMsg('请输入旧密码', true); return }
  if (newPassword.value.length < 6) { showMsg('新密码至少6位', true); return }
  saving.value = true
  try {
    await changePassword(oldPassword.value, newPassword.value)
    oldPassword.value = ''
    newPassword.value = ''
    showMsg('密码已修改')
  } catch (err: any) {
    showMsg(err.message || '修改失败', true)
  } finally {
    saving.value = false
  }
}

async function handleLogout() {
  await auth.logout()
  router.replace('/login')
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
  width: 420px;
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

.panel-header h2 {
  font-size: 18px;
  font-weight: 600;
}

.close-btn {
  font-size: 20px;
  color: var(--color-text-secondary);
  background: none;
  border: none;
  cursor: pointer;
}

.panel-body {
  padding: 0 24px 24px;
}

.message {
  font-size: 13px;
  color: var(--color-success, #2e7d32);
  margin-bottom: 12px;
}

.message--error {
  color: var(--color-danger, #d32f2f);
}

.section {
  margin-bottom: 20px;
}

.section > label {
  display: block;
  font-size: 13px;
  font-weight: 500;
  color: var(--color-text-secondary);
  margin-bottom: 8px;
}

.avatar-row {
  display: flex;
  align-items: center;
  gap: 12px;
}

.avatar {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  overflow: hidden;
  background: var(--color-bg-secondary, #f0f0f0);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.avatar-placeholder {
  font-size: 18px;
  font-weight: 600;
  color: var(--color-text-secondary);
}

.inline-edit {
  display: flex;
  gap: 8px;
}

.inline-edit input {
  flex: 1;
  padding: 6px 10px;
  border: 1px solid var(--color-line, #ddd);
  border-radius: 4px;
  font-size: 14px;
}

.password-fields {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.password-fields input {
  padding: 6px 10px;
  border: 1px solid var(--color-line, #ddd);
  border-radius: 4px;
  font-size: 14px;
  width: 100%;
  box-sizing: border-box;
}

.field-row {
  position: relative;
}

.field-row input {
  padding-right: 36px;
}

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

.btn--danger {
  background: none;
  color: var(--color-danger, #d32f2f);
  padding: 0;
  font-size: 14px;
}

.btn--danger:hover {
  text-decoration: underline;
}
</style>
