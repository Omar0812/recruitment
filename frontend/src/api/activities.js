import api from './base'

export const activitiesApi = {
  list: (params) => api.get('/activities', params),
  create: (data) => api.post('/activities', data),
  update: (id, data) => api.patch(`/activities/${id}`, data),
  delete: (id) => api.delete(`/activities/${id}`),
}
