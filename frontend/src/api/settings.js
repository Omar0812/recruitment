import api from './base'

export const settingsApi = {
  getAi: () => api.get('/settings/ai'),
  updateAi: (data) => api.patch('/settings/ai', data),
  verifyAi: (data) => api.post('/settings/ai/verify', data),
}
