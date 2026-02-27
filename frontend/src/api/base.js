import axios from 'axios'
import { ElMessage } from 'element-plus'

const http = axios.create({
  baseURL: '/api',
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
})

// Response interceptor — show error toast on failure
http.interceptors.response.use(
  (res) => res.data,
  (err) => {
    const msg = err.response?.data?.detail || err.message || '请求失败'
    ElMessage.error(msg)
    return Promise.reject(err)
  }
)

// Wrap DELETE to support body (axios quirk: use `data` config key)
const api = {
  get: (url, params) => http.get(url, { params }),
  post: (url, data) => http.post(url, data),
  patch: (url, data) => http.patch(url, data),
  put: (url, data) => http.put(url, data),
  delete: (url, data) => http.delete(url, data !== undefined ? { data } : {}),
}

export default api
