import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { login as apiLogin, register as apiRegister, logout as apiLogout, fetchMe } from '@/api/auth'
import type { AuthUser } from '@/api/auth'

const TOKEN_KEY = 'auth_token'

export const useAuthStore = defineStore('auth', () => {
  const token = ref<string | null>(localStorage.getItem(TOKEN_KEY))
  const user = ref<AuthUser | null>(null)

  const isLoggedIn = computed(() => !!token.value)
  const isAdmin = computed(() => user.value?.is_admin ?? false)
  const isSetupComplete = computed(() => user.value?.is_setup_complete ?? true)

  function setToken(t: string | null) {
    token.value = t
    if (t) {
      localStorage.setItem(TOKEN_KEY, t)
    } else {
      localStorage.removeItem(TOKEN_KEY)
    }
  }

  async function login(login_name: string, password: string) {
    const res = await apiLogin(login_name, password)
    setToken(res.token)
    user.value = res.user
  }

  async function register(login_name: string, password: string) {
    const res = await apiRegister(login_name, password)
    setToken(res.token)
    user.value = res.user
  }

  async function loadUser() {
    if (!token.value) return
    try {
      user.value = await fetchMe()
    } catch {
      clear()
    }
  }

  async function logout() {
    try {
      await apiLogout()
    } catch {
      // ignore
    }
    clear()
  }

  function clear() {
    setToken(null)
    user.value = null
  }

  return {
    token,
    user,
    isLoggedIn,
    isAdmin,
    isSetupComplete,
    login,
    register,
    loadUser,
    logout,
    clear,
  }
})
