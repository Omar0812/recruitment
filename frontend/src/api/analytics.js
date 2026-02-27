import api from './base'

export const analyticsApi = {
  getDashboard: (period = 'all') => api.get('/analytics/dashboard', { params: { period } }),
  getWeeklyReport: (period = 'month') => api.get('/analytics/weekly-report', { params: { period } }),
}
