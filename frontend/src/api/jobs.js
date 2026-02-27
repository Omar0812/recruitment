import api from './base'

export const jobsApi = {
  list: (params) => api.get('/jobs', params),
  get: (id) => api.get(`/jobs/${id}`),
  create: (data) => api.post('/jobs', data),
  update: (id, data) => api.patch(`/jobs/${id}`, data),
  close: (id, data) => api.post(`/jobs/${id}/close`, data),
  reopen: (id) => api.post(`/jobs/${id}/reopen`),
}
