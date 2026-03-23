import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createRouter, createWebHistory } from 'vue-router'
import { defineComponent } from 'vue'
import LoginView from '@/views/LoginView.vue'

const Stub = defineComponent({ template: '<div />' })

// Mock api/auth
vi.mock('@/api/auth', () => ({
  login: vi.fn(),
  register: vi.fn(),
  logout: vi.fn(),
  fetchMe: vi.fn(),
  hasUsers: vi.fn(),
  getRegistrationStatus: vi.fn(),
  checkLoginName: vi.fn(),
  updateProfile: vi.fn(),
}))

import { hasUsers, getRegistrationStatus } from '@/api/auth'
import { useAuthStore } from '@/stores/auth'

function makeRouter() {
  return createRouter({
    history: createWebHistory(),
    routes: [
      { path: '/login', name: 'login', component: LoginView, meta: { guest: true } },
      { path: '/register', name: 'register', component: Stub, meta: { guest: true } },
      { path: '/', name: 'briefing', component: Stub },
    ],
  })
}

beforeEach(() => {
  setActivePinia(createPinia())
  localStorage.clear()
  vi.clearAllMocks()
})

describe('LoginView', () => {
  it('渲染登录表单', async () => {
    vi.mocked(hasUsers).mockResolvedValue({ has_users: true })
    const router = makeRouter()
    await router.push('/login')
    await router.isReady()

    const wrapper = mount(LoginView, {
      global: { plugins: [router, createPinia()] },
    })
    await flushPromises()

    expect(wrapper.find('.login-title').text()).toBe('招聘管理')
    expect(wrapper.find('input[autocomplete="username"]').exists()).toBe(true)
    expect(wrapper.find('input[autocomplete="current-password"]').exists()).toBe(true)
    expect(wrapper.find('.login-btn').text()).toBe('登录')
  })

  it('首次启动（无用户）→ 跳转注册', async () => {
    vi.mocked(hasUsers).mockResolvedValue({ has_users: false })
    const router = makeRouter()
    await router.push('/login')
    await router.isReady()

    mount(LoginView, {
      global: { plugins: [router, createPinia()] },
    })
    await flushPromises()

    expect(router.currentRoute.value.path).toBe('/register')
  })

  it('空表单提交显示错误提示', async () => {
    vi.mocked(hasUsers).mockResolvedValue({ has_users: true })
    const router = makeRouter()
    await router.push('/login')
    await router.isReady()

    const wrapper = mount(LoginView, {
      global: { plugins: [router, createPinia()] },
    })
    await flushPromises()

    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(wrapper.find('.login-error').text()).toBe('请输入登录账号和密码')
  })

  it('注册链接在 registrationOpen 时显示', async () => {
    vi.mocked(hasUsers).mockResolvedValue({ has_users: true })
    vi.mocked(getRegistrationStatus).mockResolvedValue({ registration_open: true })
    const router = makeRouter()
    await router.push('/login')
    await router.isReady()

    const wrapper = mount(LoginView, {
      global: { plugins: [router, createPinia()] },
    })
    await flushPromises()

    expect(wrapper.find('.login-link').exists()).toBe(true)
    expect(wrapper.find('.login-link').text()).toContain('注册')
  })
})
