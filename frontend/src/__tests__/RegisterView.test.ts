import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createRouter, createWebHistory } from 'vue-router'
import { defineComponent } from 'vue'
import RegisterView from '@/views/RegisterView.vue'

const Stub = defineComponent({ template: '<div />' })

vi.mock('@/api/auth', () => ({
  login: vi.fn(),
  register: vi.fn(),
  logout: vi.fn(),
  fetchMe: vi.fn(),
  hasUsers: vi.fn(),
  checkLoginName: vi.fn(),
  updateProfile: vi.fn(),
}))

vi.mock('@/api/files', () => ({
  uploadFile: vi.fn(),
}))

import { useAuthStore } from '@/stores/auth'

function makeRouter() {
  return createRouter({
    history: createWebHistory(),
    routes: [
      { path: '/login', name: 'login', component: Stub, meta: { guest: true } },
      { path: '/register', name: 'register', component: RegisterView, meta: { guest: true } },
      { path: '/', name: 'briefing', component: Stub },
    ],
  })
}

beforeEach(() => {
  setActivePinia(createPinia())
  localStorage.clear()
  vi.clearAllMocks()
})

describe('RegisterView', () => {
  it('第一步：渲染注册表单', async () => {
    const router = makeRouter()
    await router.push('/register')
    await router.isReady()

    const wrapper = mount(RegisterView, {
      global: { plugins: [router, createPinia()] },
    })
    await flushPromises()

    expect(wrapper.find('.register-title').text()).toBe('注册账号')
    expect(wrapper.find('input[autocomplete="username"]').exists()).toBe(true)
    expect(wrapper.find('input[autocomplete="new-password"]').exists()).toBe(true)
    expect(wrapper.find('.register-btn').text()).toBe('注册')
  })

  it('第一步：空表单提交显示校验错误', async () => {
    const router = makeRouter()
    await router.push('/register')
    await router.isReady()

    const wrapper = mount(RegisterView, {
      global: { plugins: [router, createPinia()] },
    })
    await flushPromises()

    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(wrapper.find('.register-error').text()).toBe('请输入登录账号')
  })

  it('第一步：密码不一致显示错误', async () => {
    const router = makeRouter()
    await router.push('/register')
    await router.isReady()

    const wrapper = mount(RegisterView, {
      global: { plugins: [router, createPinia()] },
    })
    await flushPromises()

    await wrapper.find('input[autocomplete="username"]').setValue('testuser')
    const pwdInputs = wrapper.findAll('input[autocomplete="new-password"]')
    await pwdInputs[0].setValue('123456')
    await pwdInputs[1].setValue('654321')
    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(wrapper.find('.register-error').text()).toBe('两次密码不一致')
  })

  it('第二步：已登录未完成设置时直接显示第二步', async () => {
    const pinia = createPinia()
    setActivePinia(pinia)
    const auth = useAuthStore()
    auth.token = 'test-token'
    auth.user = { id: 1, login_name: 'a', display_name: null, avatar_path: null, is_admin: false, is_setup_complete: false }

    const router = makeRouter()
    await router.push('/register')
    await router.isReady()

    const wrapper = mount(RegisterView, {
      global: { plugins: [router, pinia] },
    })
    await flushPromises()

    expect(wrapper.find('.register-title').text()).toBe('完善信息')
    expect(wrapper.find('input[type="file"]').exists()).toBe(true)
  })

  it('第一步：有"已有账号？登录"链接', async () => {
    const router = makeRouter()
    await router.push('/register')
    await router.isReady()

    const wrapper = mount(RegisterView, {
      global: { plugins: [router, createPinia()] },
    })
    await flushPromises()

    expect(wrapper.find('.register-link').text()).toContain('登录')
  })
})
