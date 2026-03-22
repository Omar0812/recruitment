import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { createRouter, createWebHistory } from 'vue-router'
import { defineComponent } from 'vue'

// Mock api/auth — 必须在 import store 之前
vi.mock('@/api/auth', () => ({
  login: vi.fn(),
  register: vi.fn(),
  logout: vi.fn(),
  fetchMe: vi.fn(),
  hasUsers: vi.fn(),
  checkLoginName: vi.fn(),
  updateProfile: vi.fn(),
}))

import { useAuthStore } from '@/stores/auth'

const Stub = defineComponent({ template: '<div />' })

function makeRouter() {
  return createRouter({
    history: createWebHistory(),
    routes: [
      { path: '/login', name: 'login', component: Stub, meta: { guest: true } },
      { path: '/register', name: 'register', component: Stub, meta: { guest: true } },
      { path: '/', name: 'briefing', component: Stub },
      { path: '/jobs', name: 'jobs', component: Stub },
    ],
  })
}

beforeEach(() => {
  setActivePinia(createPinia())
  localStorage.clear()
})

describe('路由守卫', () => {
  it('未登录访问受保护页 → 跳转 /login', async () => {
    const router = makeRouter()
    const auth = useAuthStore()

    // 安装守卫
    router.beforeEach(async (to) => {
      if (!auth.isLoggedIn && to.meta.guest !== true) {
        return { name: 'login', query: { redirect: to.fullPath } }
      }
    })

    await router.push('/jobs')
    await router.isReady()
    expect(router.currentRoute.value.name).toBe('login')
    expect(router.currentRoute.value.query.redirect).toBe('/jobs')
  })

  it('已登录访问 /login → 跳转首页', async () => {
    const router = makeRouter()
    const auth = useAuthStore()
    auth.token = 'test-token'
    auth.user = { id: 1, login_name: 'a', display_name: 'A', avatar_path: null, is_admin: false, is_setup_complete: true }

    router.beforeEach(async (to) => {
      if (!auth.isLoggedIn && to.meta.guest !== true) {
        return { name: 'login' }
      }
      if (auth.isLoggedIn && auth.isSetupComplete && to.meta.guest === true) {
        return { path: '/' }
      }
    })

    await router.push('/login')
    await router.isReady()
    expect(router.currentRoute.value.path).toBe('/')
  })

  it('已登录但 is_setup_complete=false → 跳转 /register', async () => {
    const router = makeRouter()
    const auth = useAuthStore()
    auth.token = 'test-token'
    auth.user = { id: 1, login_name: 'a', display_name: null, avatar_path: null, is_admin: false, is_setup_complete: false }

    router.beforeEach(async (to) => {
      if (!auth.isLoggedIn && to.meta.guest !== true) {
        return { name: 'login' }
      }
      if (auth.isLoggedIn && !auth.isSetupComplete && to.name !== 'register') {
        return { name: 'register' }
      }
      if (auth.isLoggedIn && auth.isSetupComplete && to.meta.guest === true) {
        return { path: '/' }
      }
    })

    await router.push('/jobs')
    await router.isReady()
    expect(router.currentRoute.value.name).toBe('register')
  })
})
