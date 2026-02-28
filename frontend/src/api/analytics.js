import api from './base'

export const analyticsApi = {
  // api.get(url, params) expects a plain params object.
  // Passing { params: { period } } would produce params[period]=... and break backend filtering.
  getDashboard: (period = 'all') => api.get('/analytics/dashboard', { period }),
  getWeeklyReport: (period = 'month') => api.get('/analytics/weekly-report', { period }),
}
