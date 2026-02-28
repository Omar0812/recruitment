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
    if (err.config?.suppressErrorToast) {
      return Promise.reject(err)
    }
    const msg = err.response?.data?.detail || err.message || '请求失败'
    ElMessage.error(msg)
    return Promise.reject(err)
  }
)

// Wrap DELETE to support body (axios quirk: use `data` config key)
const api = {
  get: (url, params, options = {}) => http.get(url, { params, ...options }),
  post: (url, data, options = {}) => http.post(url, data, options),
  patch: (url, data, options = {}) => http.patch(url, data, options),
  put: (url, data, options = {}) => http.put(url, data, options),
  delete: (url, data, options = {}) => http.delete(url, data !== undefined ? { data, ...options } : options),
}

export default api
