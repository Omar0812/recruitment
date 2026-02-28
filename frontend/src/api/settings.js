import api from './base'

export const settingsApi = {
  getAi: () => api.get('/settings/ai'),
  updateAi: (data) => api.patch('/settings/ai', data),
  verifyAi: (data) => api.post('/settings/ai/verify', data),
  getEmail: () => api.get('/settings/email'),
  updateEmail: (data) => api.patch('/settings/email', data),
  verifyEmail: () => api.post('/settings/email/verify'),
}
