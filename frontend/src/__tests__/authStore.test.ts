import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useAuthStore } from '@/stores/auth'

// Mock api/auth
vi.mock('@/api/auth', () => ({
  login: vi.fn(),
  register: vi.fn(),
  logout: vi.fn(),
  fetchMe: vi.fn(),
}))

import { login as apiLogin, register as apiRegister, logout as apiLogout, fetchMe } from '@/api/auth'

beforeEach(() => {
  setActivePinia(createPinia())
  localStorage.clear()
  vi.clearAllMocks()
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('auth store', () => {
  it('login 成功后设置 token 和 user', async () => {
    const mockUser = { id: 1, login_name: 'admin', display_name: 'Admin', avatar_path: null, is_admin: true, is_setup_complete: true }
    vi.mocked(apiLogin).mockResolvedValue({ token: 'test-token', user: mockUser })

    const auth = useAuthStore()
    await auth.login('admin', '123456')

    expect(auth.token).toBe('test-token')
    expect(auth.user).toEqual(mockUser)
    expect(auth.isLoggedIn).toBe(true)
    expect(auth.isAdmin).toBe(true)
    expect(localStorage.getItem('auth_token')).toBe('test-token')
  })

  it('register 成功后设置 token 和 user', async () => {
    const mockUser = { id: 2, login_name: 'newuser', display_name: null, avatar_path: null, is_admin: false, is_setup_complete: false }
    vi.mocked(apiRegister).mockResolvedValue({ token: 'reg-token', user: mockUser })

    const auth = useAuthStore()
    await auth.register('newuser', '123456')

    expect(auth.token).toBe('reg-token')
    expect(auth.user).toEqual(mockUser)
    expect(auth.isSetupComplete).toBe(false)
  })

  it('logout 清除 token 和 user', async () => {
    vi.mocked(apiLogout).mockResolvedValue(undefined as any)
    const auth = useAuthStore()
    auth.token = 'some-token'
    auth.user = { id: 1, login_name: 'a', display_name: 'A', avatar_path: null, is_admin: false, is_setup_complete: true }
    localStorage.setItem('auth_token', 'some-token')

    await auth.logout()

    expect(auth.token).toBeNull()
    expect(auth.user).toBeNull()
    expect(auth.isLoggedIn).toBe(false)
    expect(localStorage.getItem('auth_token')).toBeNull()
  })

  it('loadUser 成功时设置 user', async () => {
    const mockUser = { id: 1, login_name: 'admin', display_name: 'Admin', avatar_path: null, is_admin: true, is_setup_complete: true }
    vi.mocked(fetchMe).mockResolvedValue(mockUser)

    const auth = useAuthStore()
    auth.token = 'valid-token'
    localStorage.setItem('auth_token', 'valid-token')

    await auth.loadUser()

    expect(auth.user).toEqual(mockUser)
  })

  it('loadUser 失败时清除状态', async () => {
    vi.mocked(fetchMe).mockRejectedValue(new Error('401'))

    const auth = useAuthStore()
    auth.token = 'expired-token'
    localStorage.setItem('auth_token', 'expired-token')

    await auth.loadUser()

    expect(auth.token).toBeNull()
    expect(auth.user).toBeNull()
  })

  it('loadUser 无 token 时不请求', async () => {
    const auth = useAuthStore()
    await auth.loadUser()
    expect(fetchMe).not.toHaveBeenCalled()
  })

  it('localStorage 持久化：刷新后恢复 token', () => {
    localStorage.setItem('auth_token', 'persisted-token')
    const auth = useAuthStore()
    expect(auth.token).toBe('persisted-token')
  })
})
