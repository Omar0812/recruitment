import type { FileUploadResult } from './types'
import { BASE_URL, getAuthHeaders, handle401 } from './client'

export { parseResume, fetchFileAsBlob } from './client'

export function uploadFile(
  file: File,
  onProgress?: (percent: number) => void,
): Promise<FileUploadResult> {
  return new Promise((resolve, reject) => {
    const form = new FormData()
    form.append('file', file)

    const xhr = new XMLHttpRequest()
    xhr.open('POST', `${BASE_URL}/files/upload`)

    const headers = getAuthHeaders()
    if (headers['Authorization']) {
      xhr.setRequestHeader('Authorization', headers['Authorization'])
    }

    if (onProgress) {
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) {
          onProgress(Math.round((e.loaded / e.total) * 100))
        }
      }
    }

    xhr.onload = () => {
      if (xhr.status === 401) {
        handle401(xhr.status)
        reject(new Error('登录已过期，请重新登录'))
        return
      }
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(JSON.parse(xhr.responseText))
      } else {
        try {
          const err = JSON.parse(xhr.responseText)
          reject(new Error(err.detail || err.message || `上传失败：HTTP ${xhr.status}`))
        } catch {
          reject(new Error(`上传失败：HTTP ${xhr.status}`))
        }
      }
    }

    xhr.onerror = () => reject(new Error('上传失败：网络错误'))
    xhr.send(form)
  })
}
