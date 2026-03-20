<template>
  <div class="resume-tab">
    <!-- 空状态 -->
    <template v-if="attachments.length === 0">
      <div class="resume-tab__empty">暂无简历</div>
    </template>

    <!-- 单附件：直接预览 -->
    <template v-else-if="attachments.length === 1">
      <div class="resume-tab__single-header">
        <span class="resume-tab__icon">{{ typeIcon(attachments[0]) }}</span>
        <span class="resume-tab__label">{{ attachments[0].label }}</span>
        <span class="resume-tab__date">{{ formatDate(attachments[0].created_at) }}</span>
        <button class="resume-tab__download" @click="handleDownload(attachments[0])">下载</button>
        <button class="resume-tab__delete" @click="confirmDelete(attachments[0])">删除</button>
      </div>
      <!-- PDF → iframe -->
      <iframe
        v-if="getFileType(attachments[0].file_path) === 'pdf' && blobUrls.has(attachments[0].file_path)"
        class="resume-tab__preview"
        :src="blobUrls.get(attachments[0].file_path)"
        frameborder="0"
        @error="onPreviewError(attachments[0].file_path)"
        @load="onPreviewLoad($event, attachments[0].file_path)"
      />
      <!-- DOCX → docx-preview -->
      <div
        v-else-if="getFileType(attachments[0].file_path) === 'docx' && docxBuffers.has(attachments[0].file_path)"
        :ref="(el) => renderDocx(el as HTMLElement, attachments[0].file_path)"
        class="resume-tab__docx-preview"
      />
      <!-- 图片 → img -->
      <img
        v-else-if="getFileType(attachments[0].file_path) === 'image' && blobUrls.has(attachments[0].file_path)"
        class="resume-tab__image-preview"
        :src="blobUrls.get(attachments[0].file_path)"
      />
      <div v-else-if="previewFailed.has(attachments[0].file_path)" class="resume-tab__fallback">
        <p>预览不可用</p>
        <button class="resume-tab__fallback-download" @click="handleDownload(attachments[0])">下载原始文件</button>
      </div>
      <div v-else class="resume-tab__fallback">
        <p>加载中...</p>
      </div>
    </template>

    <!-- 多附件：列表模式 -->
    <template v-else>
      <div
        v-for="att in attachments"
        :key="att.file_path"
        class="resume-tab__item"
      >
        <div class="resume-tab__item-header" @click="togglePreview(att.file_path)">
          <span class="resume-tab__icon">{{ typeIcon(att) }}</span>
          <span class="resume-tab__label">{{ att.label }}</span>
          <span class="resume-tab__date">{{ formatDate(att.created_at) }}</span>
          <button class="resume-tab__toggle">预览 {{ expandedSet.has(att.file_path) ? '▲' : '▼' }}</button>
          <button class="resume-tab__download" @click.stop="handleDownload(att)">下载</button>
          <button class="resume-tab__delete" @click.stop="confirmDelete(att)">删除</button>
        </div>
        <!-- PDF → iframe -->
        <iframe
          v-if="expandedSet.has(att.file_path) && getFileType(att.file_path) === 'pdf' && blobUrls.has(att.file_path)"
          class="resume-tab__preview"
          :src="blobUrls.get(att.file_path)"
          frameborder="0"
          @error="onPreviewError(att.file_path)"
          @load="onPreviewLoad($event, att.file_path)"
        />
        <!-- DOCX → docx-preview -->
        <div
          v-else-if="expandedSet.has(att.file_path) && getFileType(att.file_path) === 'docx' && docxBuffers.has(att.file_path)"
          :ref="(el) => renderDocx(el as HTMLElement, att.file_path)"
          class="resume-tab__docx-preview"
        />
        <!-- 图片 → img -->
        <img
          v-else-if="expandedSet.has(att.file_path) && getFileType(att.file_path) === 'image' && blobUrls.has(att.file_path)"
          class="resume-tab__image-preview"
          :src="blobUrls.get(att.file_path)"
        />
        <div v-else-if="expandedSet.has(att.file_path) && previewFailed.has(att.file_path)" class="resume-tab__fallback">
          <p>预览不可用</p>
          <button class="resume-tab__fallback-download" @click="handleDownload(att)">下载原始文件</button>
        </div>
        <div v-else-if="expandedSet.has(att.file_path)" class="resume-tab__fallback">
          <p>加载中...</p>
        </div>
      </div>
    </template>

    <!-- 上传入口 -->
    <div class="resume-tab__upload">
      <button class="resume-tab__upload-btn" :disabled="uploading" @click="triggerUpload">
        {{ uploading ? '上传中...' : '上传附件' }}
      </button>
      <input
        ref="fileInput"
        type="file"
        accept=".pdf,.docx,.png,.jpg,.jpeg"
        style="display: none"
        @change="handleFileChange"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onUnmounted, nextTick } from 'vue'
import type { CandidateDetail, AttachmentEntry } from '@/api/types'
import { uploadFile, fetchFileAsBlob } from '@/api/files'
import { formatDate } from '@/utils/date'
import { addAttachment, removeAttachment } from '@/api/candidates'

const props = defineProps<{
  candidate: CandidateDetail
}>()

const emit = defineEmits<{
  refresh: []
}>()

const expandedSet = ref(new Set<string>())
const previewFailed = ref(new Set<string>())
const uploading = ref(false)
const fileInput = ref<HTMLInputElement | null>(null)
const blobUrls = ref(new Map<string, string>())
const docxBuffers = ref(new Map<string, ArrayBuffer>())

// attachments 优先，fallback 到 resume_path
const attachments = computed<AttachmentEntry[]>(() => {
  if (props.candidate.attachments && props.candidate.attachments.length > 0) {
    return props.candidate.attachments
  }
  if (props.candidate.resume_path) {
    return [{
      file_path: props.candidate.resume_path,
      label: '简历',
      type: 'resume',
      created_at: props.candidate.created_at,
    }]
  }
  return []
})

function typeIcon(att: AttachmentEntry) {
  return att.type === 'resume' ? '📄' : '📎'
}

// blob URL 管理
function revokeAllBlobs() {
  for (const url of blobUrls.value.values()) {
    URL.revokeObjectURL(url)
  }
  blobUrls.value = new Map()
}

function getFileType(filePath: string): 'pdf' | 'docx' | 'image' | 'unknown' {
  const fp = filePath.toLowerCase()
  if (fp.endsWith('.pdf')) return 'pdf'
  if (fp.endsWith('.docx')) return 'docx'
  if (fp.endsWith('.png') || fp.endsWith('.jpg') || fp.endsWith('.jpeg')) return 'image'
  return 'unknown'
}

async function loadBlobUrl(att: AttachmentEntry) {
  if (blobUrls.value.has(att.file_path)) return
  const fType = getFileType(att.file_path)
  try {
    const path = (att.file_path || '').replace(/^\/+/, '')
    if (fType === 'docx') {
      // docx-preview 需要 arrayBuffer，存到 docxBuffers
      const blobUrl = await fetchFileAsBlob(path)
      const resp = await fetch(blobUrl)
      const buf = await resp.arrayBuffer()
      URL.revokeObjectURL(blobUrl)
      const newBufs = new Map(docxBuffers.value)
      newBufs.set(att.file_path, buf)
      docxBuffers.value = newBufs
    } else {
      const url = await fetchFileAsBlob(path)
      const newMap = new Map(blobUrls.value)
      newMap.set(att.file_path, url)
      blobUrls.value = newMap
    }
  } catch {
    onPreviewError(att.file_path)
  }
}

// 单附件自动加载预览；多附件展开时加载
watch(attachments, (atts) => {
  revokeAllBlobs()
  if (atts.length === 1) {
    loadBlobUrl(atts[0])
  }
}, { immediate: true })

onUnmounted(revokeAllBlobs)

async function renderDocx(el: HTMLElement | null, filePath: string) {
  if (!el || el.childElementCount > 0) return
  const buf = docxBuffers.value.get(filePath)
  if (!buf) return
  await nextTick()
  const { renderAsync } = await import('docx-preview')
  el.innerHTML = ''
  await renderAsync(buf, el)
}

function onPreviewError(filePath: string) {
  const s = new Set(previewFailed.value)
  s.add(filePath)
  previewFailed.value = s
}

function onPreviewLoad(event: Event, filePath: string) {
  const iframe = event.target as HTMLIFrameElement
  try {
    const doc = iframe.contentDocument
    if (doc && doc.title === '') {
      const body = doc.body?.textContent?.trim() || ''
      if (body.includes('File not found') || body.includes('Not Found')) {
        onPreviewError(filePath)
      }
    }
  } catch {
    // 跨域访问抛异常 = 内容正常加载
  }
}

function togglePreview(filePath: string) {
  const s = new Set(expandedSet.value)
  if (s.has(filePath)) {
    s.delete(filePath)
    // revoke blob when collapsing
    if (blobUrls.value.has(filePath)) {
      URL.revokeObjectURL(blobUrls.value.get(filePath)!)
      const newMap = new Map(blobUrls.value)
      newMap.delete(filePath)
      blobUrls.value = newMap
    }
  } else {
    s.add(filePath)
    // load blob when expanding
    const att = attachments.value.find(a => a.file_path === filePath)
    if (att) loadBlobUrl(att)
  }
  expandedSet.value = s
}

async function handleDownload(att: AttachmentEntry) {
  try {
    const path = (att.file_path || '').replace(/^\/+/, '')
    const blobUrl = await fetchFileAsBlob(path)
    const a = document.createElement('a')
    a.href = blobUrl
    a.download = att.label || 'download'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(blobUrl)
  } catch (err: any) {
    alert(err.message || '下载失败')
  }
}

function triggerUpload() {
  fileInput.value?.click()
}

async function handleFileChange(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return

  uploading.value = true
  try {
    const result = await uploadFile(file)
    const label = file.name.replace(/\.[^.]+$/, '')
    await addAttachment(props.candidate.id, {
      file_path: result.file_path,
      label,
      type: 'attachment',
    })
    emit('refresh')
  } catch (err: any) {
    alert(err.message || '上传失败')
  } finally {
    uploading.value = false
    input.value = ''
  }
}

async function confirmDelete(att: AttachmentEntry) {
  const ok = window.confirm(`确定删除「${att.label}」？`)
  if (!ok) return

  try {
    await removeAttachment(props.candidate.id, att.file_path)
    emit('refresh')
  } catch (err: any) {
    alert(err.message || '删除失败')
  }
}
</script>

<style scoped>
.resume-tab {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.resume-tab__empty {
  color: var(--color-text-secondary);
  font-size: 13px;
  text-align: center;
  padding: var(--space-6) 0;
}

.resume-tab__single-header {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  font-size: 12px;
  color: var(--color-text-secondary);
  margin-bottom: var(--space-2);
}

.resume-tab__icon {
  font-size: 14px;
}

.resume-tab__label {
  font-weight: 500;
  color: var(--color-text-primary);
}

.resume-tab__date {
  flex: 1;
}

.resume-tab__delete {
  font-size: 12px;
  color: var(--color-urgent);
  background: none;
  border: none;
  cursor: pointer;
  padding: 2px 6px;
}

.resume-tab__delete:hover {
  text-decoration: underline;
}

.resume-tab__preview {
  flex: 1;
  width: 100%;
  min-height: 400px;
  border: 1px solid var(--color-line);
  border-radius: 3px;
}

.resume-tab__docx-preview {
  flex: 1;
  width: 100%;
  min-height: 400px;
  overflow: auto;
  border: 1px solid var(--color-line);
  border-radius: 3px;
}

.resume-tab__image-preview {
  width: 100%;
  max-height: 80vh;
  object-fit: contain;
  border: 1px solid var(--color-line);
  border-radius: 3px;
}

.resume-tab__item {
  margin-bottom: var(--space-3);
}

.resume-tab__item-header {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  font-size: 12px;
  padding: var(--space-2);
  border: 1px solid var(--color-line);
  border-radius: 3px;
  cursor: pointer;
  color: var(--color-text-secondary);
}

.resume-tab__item-header:hover {
  background: rgba(26, 26, 24, 0.03);
}

.resume-tab__toggle {
  font-size: 11px;
  color: var(--color-text-secondary);
  background: none;
  border: none;
  cursor: pointer;
  padding: 2px 6px;
}

.resume-tab__item .resume-tab__preview {
  margin-top: var(--space-2);
  min-height: 300px;
}

.resume-tab__upload {
  margin-top: auto;
  padding-top: var(--space-3);
  flex-shrink: 0;
}

.resume-tab__upload-btn {
  width: 100%;
  padding: 8px;
  font-size: 13px;
  border: 1px dashed var(--color-line);
  background: none;
  border-radius: 3px;
  cursor: pointer;
  color: var(--color-text-secondary);
}

.resume-tab__upload-btn:hover:not(:disabled) {
  border-color: var(--color-text-primary);
  color: var(--color-text-primary);
}

.resume-tab__upload-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.resume-tab__fallback {
  padding: var(--space-4);
  text-align: center;
  border: 1px dashed var(--color-line);
  border-radius: 3px;
  color: var(--color-text-secondary);
  font-size: 13px;
}

.resume-tab__fallback p {
  margin: 0 0 var(--space-2) 0;
}

.resume-tab__fallback a {
  color: var(--color-text-primary);
  text-decoration: underline;
}

.resume-tab__download {
  font-size: 12px;
  color: var(--color-text-secondary);
  background: none;
  border: none;
  cursor: pointer;
  padding: 2px 6px;
}

.resume-tab__download:hover {
  color: var(--color-text-primary);
  text-decoration: underline;
}

.resume-tab__fallback-download {
  background: none;
  border: none;
  cursor: pointer;
  color: var(--color-text-primary);
  text-decoration: underline;
  font-size: 13px;
}
</style>
