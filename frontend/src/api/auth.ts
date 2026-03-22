import { api } from './client'

export interface AuthUser {
  id: number
  login_name: string
  display_name: string | null
  avatar_path: string | null
  is_admin: boolean
  is_setup_complete: boolean
}

export interface LoginResponse {
  token: string
  user: AuthUser
}

export function login(login_name: string, password: string) {
  return api.post<LoginResponse>('/auth/login', { login_name, password })
}

export function register(login_name: string, password: string) {
  return api.post<LoginResponse>('/auth/register', { login_name, password })
}

export function logout() {
  return api.post<void>('/auth/logout')
}

export function fetchMe() {
  return api.get<AuthUser>('/auth/me')
}

export function updateProfile(data: { display_name?: string; avatar_path?: string }) {
  return api.put<AuthUser>('/auth/me/profile', data)
}

export function changePassword(old_password: string, new_password: string) {
  return api.put<void>('/auth/me/password', { old_password, new_password })
}

export function checkLoginName(name: string) {
  return api.get<{ available: boolean; message?: string }>(`/auth/check-login-name/${encodeURIComponent(name)}`)
}

export function hasUsers() {
  return api.get<{ has_users: boolean }>('/auth/has-users')
}

export function getRegistrationStatus() {
  return api.get<{ registration_open: boolean }>('/auth/registration-status')
}

// ── Admin ──

export function adminListUsers() {
  return api.get<AuthUser[]>('/admin/users')
}

export function adminCreateUser(login_name: string, password: string) {
  return api.post<AuthUser>('/admin/users', { login_name, password })
}

export function adminDeleteUser(userId: number) {
  return api.delete<void>(`/admin/users/${userId}`)
}

export function adminResetPassword(userId: number, new_password: string) {
  return api.put<void>(`/admin/users/${userId}/password`, { new_password })
}

export function adminToggleAdmin(userId: number, is_admin: boolean) {
  return api.put<void>(`/admin/users/${userId}/admin`, { is_admin })
}

export interface SystemSettings {
  settings: Record<string, string>
  version: number
}

export function adminGetSettings() {
  return api.get<SystemSettings>('/admin/settings')
}

export function adminUpdateSettings(settings: Record<string, string>, version: number) {
  return api.put<{ ok: boolean; version: number }>('/admin/settings', { settings, version })
}
