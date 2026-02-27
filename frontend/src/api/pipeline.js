import api from './base'

export const pipelineApi = {
  getActive: () => api.get('/pipeline/active'),
  getHired: () => api.get('/pipeline/hired'),
  link: (data) => api.post('/pipeline/link', data),
  updateLink: (linkId, data) => api.patch(`/pipeline/link/${linkId}`, data),
  withdraw: (linkId, data) => api.post(`/pipeline/link/${linkId}/withdraw`, data),
  reject: (linkId, data) => api.post(`/pipeline/link/${linkId}/reject`, data),
  hire: (linkId, data) => api.post(`/pipeline/link/${linkId}/hire`, data),
  transfer: (linkId, data) => api.post(`/pipeline/link/${linkId}/transfer`, data),
  updateNotes: (linkId, data) => api.patch(`/pipeline/link/${linkId}/notes`, data),
}
