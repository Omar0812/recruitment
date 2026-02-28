import api from './base'

export const pipelineApi = {
  getActive: () => api.get('/pipeline/active'),
  getHired: () => api.get('/pipeline/hired'),
  link: (data) => api.post('/pipeline/link', data),
  withdraw: (linkId, data) => api.patch(`/pipeline/link/${linkId}/withdraw`, data),
  reject: (linkId, data) => api.patch(`/pipeline/link/${linkId}/outcome`, { outcome: 'rejected', rejection_reason: data?.reason }),
  hire: (linkId) => api.patch(`/pipeline/link/${linkId}/hire`),
  transfer: (linkId, data) => api.patch(`/pipeline/link/${linkId}/transfer`, data),
  updateNotes: (linkId, data) => api.patch(`/pipeline/link/${linkId}/notes`, data),
}
