import api from './base'

export const candidatesApi = {
  list: (params) => api.get('/candidates', params),
  get: (id) => api.get(`/candidates/${id}`),
  create: (data) => api.post('/candidates', data),
  update: (id, data) => api.patch(`/candidates/${id}`, data),
  blacklist: (id, data) => api.post(`/candidates/${id}/blacklist`, data),
  unblacklist: (id, data) => api.delete(`/candidates/${id}/blacklist`, data),
  checkDuplicate: (data) => api.post('/candidates/check-duplicate', data),
  getLastApplication: (id) => api.get(`/candidates/${id}/last-application`),
  resumePreview: (id) => api.get(`/candidates/${id}/resume-preview`),
}
