import api from './base'

export const insightsApi = {
  getToday: () => api.get('/insights/today'),
}
