<template>
  <div class="login-page">
    <div class="login-card">
      <h1 class="login-title">招聘管理</h1>

      <div v-if="firstTime" class="login-hint">首次使用，请创建管理员账号</div>

      <p v-if="error" class="login-error">{{ error }}</p>

      <form @submit.prevent="handleSubmit">
        <div class="login-field">
          <label>登录账号</label>
          <input v-model="loginName" type="text" autocomplete="username" />
        </div>
        <div class="login-field">
          <label>密码</label>
          <div class="password-wrapper">
            <input v-model="password" :type="showPwd ? 'text' : 'password'" autocomplete="current-password" />
            <button type="button" class="pwd-toggle" @click="showPwd = !showPwd">{{ showPwd ? '🙈' : '👁' }}</button>
          </div>
        </div>
        <button class="login-btn" type="submit" :disabled="submitting">
          {{ submitting ? '登录中...' : '登录' }}
        </button>
      </form>

      <div class="login-footer">
        <router-link v-if="registrationOpen" to="/register" class="login-link">还没有账号？注册</router-link>
        <span class="login-hint-text">忘记账号或密码？请联系管理员</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { hasUsers, getRegistrationStatus } from '@/api/auth'

const router = useRouter()
const route = useRoute()
const auth = useAuthStore()

const loginName = ref('')
const password = ref('')
const showPwd = ref(false)
const error = ref('')
const submitting = ref(false)
const firstTime = ref(false)
const registrationOpen = ref(false)

onMounted(async () => {
  try {
    const res = await hasUsers()
    if (!res.has_users) {
      firstTime.value = true
      router.replace('/register')
      return
    }
  } catch {
    // ignore
  }
  try {
    const status = await getRegistrationStatus()
    registrationOpen.value = status.registration_open
  } catch {
    registrationOpen.value = false
  }
})

async function handleSubmit() {
  error.value = ''
  if (!loginName.value || !password.value) {
    error.value = '请输入登录账号和密码'
    return
  }
  submitting.value = true
  try {
    await auth.login(loginName.value, password.value)
    const redirect = (route.query.redirect as string) || '/'
    router.replace(redirect)
  } catch (e: any) {
    error.value = '登录账号或密码错误'
  } finally {
    submitting.value = false
  }
}
</script>

<style scoped>
.login-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--color-bg-secondary, #f5f5f5);
}

.login-card {
  width: 360px;
  padding: 40px 32px;
  background: var(--color-bg, #fff);
  border-radius: 8px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
}

.login-title {
  font-size: 24px;
  font-weight: 600;
  text-align: center;
  margin-bottom: 24px;
  color: var(--color-text-primary);
}

.login-hint {
  text-align: center;
  color: var(--color-primary, #1a73e8);
  font-size: 14px;
  margin-bottom: 16px;
}

.login-error {
  color: var(--color-danger, #d32f2f);
  font-size: 13px;
  margin-bottom: 12px;
  text-align: center;
}

.login-field {
  margin-bottom: 16px;
}

.login-field label {
  display: block;
  font-size: 13px;
  color: var(--color-text-secondary);
  margin-bottom: 4px;
}

.login-field input {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid var(--color-line, #ddd);
  border-radius: 4px;
  font-size: 14px;
  box-sizing: border-box;
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

.login-btn {
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

.login-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.login-footer {
  margin-top: 20px;
  text-align: center;
  font-size: 13px;
}

.login-link {
  color: var(--color-primary, #1a73e8);
  text-decoration: none;
  display: block;
  margin-bottom: 8px;
}

.login-hint-text {
  color: var(--color-text-secondary);
}
</style>
