<template>
  <div class="register-page">
    <div class="register-card">
      <h1 class="register-title">{{ step === 1 ? '注册账号' : '完善信息' }}</h1>

      <p v-if="error" class="register-error">{{ error }}</p>

      <!-- 第一步：账号密码 -->
      <form v-if="step === 1" @submit.prevent="handleStep1">
        <div class="register-field">
          <label>登录账号</label>
          <input
            v-model="loginName"
            type="text"
            autocomplete="username"
            @blur="checkName"
          />
          <p v-if="nameHint" class="field-hint" :class="{ 'field-hint--error': !nameOk }">{{ nameHint }}</p>
        </div>
        <div class="register-field">
          <label>密码</label>
          <div class="password-wrapper">
            <input v-model="password" :type="showPwd ? 'text' : 'password'" autocomplete="new-password" />
            <button type="button" class="pwd-toggle" @click="showPwd = !showPwd">{{ showPwd ? '🙈' : '👁' }}</button>
          </div>
        </div>
        <div class="register-field">
          <label>确认密码</label>
          <input v-model="confirmPassword" :type="showPwd ? 'text' : 'password'" autocomplete="new-password" />
        </div>
        <button class="register-btn" type="submit" :disabled="submitting">
          {{ submitting ? '注册中...' : '注册' }}
        </button>
      </form>

      <!-- 第二步：头像+名字 -->
      <form v-else @submit.prevent="handleStep2">
        <div class="register-field">
          <label>头像（可选）</label>
          <input type="file" accept="image/*" @change="handleAvatarChange" />
          <div v-if="avatarPreview" class="avatar-preview">
            <img :src="avatarPreview" alt="头像预览" />
          </div>
        </div>
        <div class="register-field">
          <label>你的名字 *</label>
          <input v-model="displayName" type="text" />
        </div>
        <button class="register-btn" type="submit" :disabled="submitting">
          {{ submitting ? '保存中...' : '完成' }}
        </button>
      </form>

      <div v-if="step === 1" class="register-footer">
        <router-link to="/login" class="register-link">已有账号？登录</router-link>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { checkLoginName, updateProfile } from '@/api/auth'
import { uploadFile } from '@/api/files'

const router = useRouter()
const auth = useAuthStore()

const step = ref(auth.isLoggedIn && !auth.isSetupComplete ? 2 : 1)
const loginName = ref('')
const password = ref('')
const confirmPassword = ref('')
const showPwd = ref(false)
const displayName = ref('')
const avatarFile = ref<File | null>(null)
const avatarPreview = ref<string | null>(null)
const error = ref('')
const submitting = ref(false)
const nameHint = ref('')
const nameOk = ref(true)

async function checkName() {
  const name = loginName.value.trim()
  if (!name) {
    nameHint.value = ''
    return
  }
  if (!/^[A-Za-z0-9_]{3,20}$/.test(name)) {
    nameHint.value = '仅允许英文、数字、下划线，3-20位'
    nameOk.value = false
    return
  }
  try {
    const res = await checkLoginName(name)
    if (res.available) {
      nameHint.value = '可以使用'
      nameOk.value = true
    } else {
      nameHint.value = res.message || '该账号已被使用'
      nameOk.value = false
    }
  } catch {
    nameHint.value = ''
  }
}

async function handleStep1() {
  error.value = ''
  const name = loginName.value.trim()
  if (!name) { error.value = '请输入登录账号'; return }
  if (!/^[A-Za-z0-9_]{3,20}$/.test(name)) { error.value = '登录账号仅允许英文、数字、下划线，3-20位'; return }
  if (password.value.length < 6) { error.value = '密码至少6位'; return }
  if (password.value !== confirmPassword.value) { error.value = '两次密码不一致'; return }

  submitting.value = true
  try {
    await auth.register(name, password.value)
    step.value = 2
  } catch (e: any) {
    error.value = e.message || '注册失败'
  } finally {
    submitting.value = false
  }
}

function handleAvatarChange(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return
  avatarFile.value = file
  avatarPreview.value = URL.createObjectURL(file)
}

async function handleStep2() {
  error.value = ''
  const name = displayName.value.trim()
  if (!name) { error.value = '请输入你的名字'; return }

  submitting.value = true
  try {
    let avatar_path: string | undefined
    if (avatarFile.value) {
      const uploaded = await uploadFile(avatarFile.value)
      avatar_path = uploaded.file_path
    }
    await updateProfile({ display_name: name, avatar_path })
    await auth.loadUser()
    router.replace('/')
  } catch (e: any) {
    error.value = e.message || '保存失败'
  } finally {
    submitting.value = false
  }
}
</script>

<style scoped>
.register-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--color-bg-secondary, #f5f5f5);
}

.register-card {
  width: 360px;
  padding: 40px 32px;
  background: var(--color-bg, #fff);
  border-radius: 8px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
}

.register-title {
  font-size: 24px;
  font-weight: 600;
  text-align: center;
  margin-bottom: 24px;
  color: var(--color-text-primary);
}

.register-error {
  color: var(--color-danger, #d32f2f);
  font-size: 13px;
  margin-bottom: 12px;
  text-align: center;
}

.register-field {
  margin-bottom: 16px;
}

.register-field label {
  display: block;
  font-size: 13px;
  color: var(--color-text-secondary);
  margin-bottom: 4px;
}

.register-field input {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid var(--color-line, #ddd);
  border-radius: 4px;
  font-size: 14px;
  box-sizing: border-box;
}

.field-hint {
  font-size: 12px;
  margin-top: 4px;
  color: var(--color-success, #2e7d32);
}

.field-hint--error {
  color: var(--color-danger, #d32f2f);
}

.password-wrapper {
  position: relative;
}

.password-wrapper input {
  width: 100%;
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

.avatar-preview {
  margin-top: 8px;
  width: 64px;
  height: 64px;
  border-radius: 50%;
  overflow: hidden;
}

.avatar-preview img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.register-btn {
  width: 100%;
  padding: 10px;
  background: var(--color-primary, #1a73e8);
  color: #fff;
  border: none;
  border-radius: 4px;
  font-size: 14px;
  cursor: pointer;
  margin-top: 8px;
}

.register-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.register-footer {
  margin-top: 20px;
  text-align: center;
}

.register-link {
  color: var(--color-primary, #1a73e8);
  text-decoration: none;
  font-size: 13px;
}
</style>
