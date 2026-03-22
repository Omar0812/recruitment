<template>
  <div class="upload-zone">
    <div
      class="drop-area"
      :class="{ 'drop-area--over': dragging }"
      @dragover.prevent="dragging = true"
      @dragleave="dragging = false"
      @drop.prevent="onDrop"
      @click="openPicker"
    >
      <p class="drop-hint">拖拽简历文件到这里，或点击选择</p>
      <p class="drop-sub">支持 PDF / DOCX / 图片，单个文件不超过 100MB</p>
    </div>

    <input
      ref="fileInput"
      type="file"
      multiple
      accept=".pdf,.docx,.png,.jpg,.jpeg"
      style="display: none"
      @change="onFileChange"
    />

    <ul v-if="files.length" class="file-list">
      <li v-for="(f, i) in files" :key="i" class="file-item">
        <span class="file-name">{{ f.name }}</span>
        <span class="file-size">{{ formatSize(f.size) }}</span>
        <button class="file-remove" @click="removeFile(i)">移除</button>
      </li>
    </ul>

    <div v-if="uploading" class="upload-progress">
      <div class="progress-bar">
        <div class="progress-fill" :style="{ width: uploadProgress + '%' }"></div>
      </div>
      <span class="progress-text">{{ uploadProgress }}%</span>
    </div>

    <div v-if="errorMessages.length" class="upload-error" role="alert">
      <p v-for="message in errorMessages" :key="message">{{ message }}</p>
    </div>

    <div class="upload-actions">
      <button class="btn-text" @click="$emit('manual')">不上传文件，直接填写</button>
      <button
        v-if="files.length"
        class="btn-primary"
        :disabled="uploading"
        @click="$emit('proceed')"
      >
        {{ uploading ? '上传中...' : files.length === 1 ? '下一步' : `处理 ${files.length} 个文件` }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'

const ALLOWED_EXT = ['.pdf', '.docx', '.png', '.jpg', '.jpeg']
const MAX_SIZE = 100 * 1024 * 1024

const props = defineProps<{
  files: File[]
  uploading: boolean
  uploadProgress: number
  error: string | null
}>()

const emit = defineEmits<{
  'update:files': [files: File[]]
  manual: []
  proceed: []
}>()

const fileInput = ref<HTMLInputElement>()
const dragging = ref(false)
const validationErrors = ref<string[]>([])

const errorMessages = computed(() => {
  const messages = [...validationErrors.value]
  if (props.error) messages.unshift(props.error)
  return messages
})

function openPicker() {
  fileInput.value?.click()
}

function onFileChange(e: Event) {
  const input = e.target as HTMLInputElement
  if (input.files) addFiles(Array.from(input.files))
  input.value = ''
}

function onDrop(e: DragEvent) {
  dragging.value = false
  if (e.dataTransfer?.files) addFiles(Array.from(e.dataTransfer.files))
}

function addFiles(incoming: File[]) {
  const valid: File[] = []
  const invalidType: string[] = []
  const oversized: string[] = []
  for (const f of incoming) {
    const ext = '.' + f.name.split('.').pop()?.toLowerCase()
    if (!ALLOWED_EXT.includes(ext)) {
      invalidType.push(f.name)
      continue
    }
    if (f.size > MAX_SIZE) {
      oversized.push(f.name)
      continue
    }
    valid.push(f)
  }

  validationErrors.value = []
  if (invalidType.length) {
    validationErrors.value.push(`不支持的文件类型：${invalidType.join('、')}`)
  }
  if (oversized.length) {
    validationErrors.value.push(`文件大小超过 100MB 限制：${oversized.join('、')}`)
  }

  emit('update:files', [...props.files, ...valid])
}

function removeFile(index: number) {
  const next = [...props.files]
  next.splice(index, 1)
  emit('update:files', next)
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(0) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
}
</script>

<style scoped>
.upload-zone {
  max-width: 560px;
  margin: 0 auto;
}

.drop-area {
  border: 2px dashed var(--color-line);
  border-radius: 8px;
  padding: var(--space-8) var(--space-6);
  text-align: center;
  cursor: pointer;
  transition: border-color 150ms, background 150ms;
}

.drop-area:hover,
.drop-area--over {
  border-color: var(--color-text-secondary);
  background: rgba(26, 26, 24, 0.02);
}

.drop-hint {
  font-size: 15px;
  font-weight: 500;
  color: var(--color-text-primary);
}

.drop-sub {
  font-size: 13px;
  color: var(--color-text-tertiary);
  margin-top: var(--space-1);
}

.file-list {
  margin-top: var(--space-4);
}

.file-item {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-2) 0;
  border-bottom: 1px solid var(--color-line);
  font-size: 14px;
}

.file-name {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.file-size {
  color: var(--color-text-tertiary);
  font-size: 13px;
  flex-shrink: 0;
}

.file-remove {
  color: var(--color-text-tertiary);
  font-size: 13px;
  flex-shrink: 0;
}

.file-remove:hover {
  color: var(--color-urgent);
}

.upload-progress {
  margin-top: var(--space-3);
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.progress-bar {
  flex: 1;
  height: 6px;
  background: var(--color-line);
  border-radius: 3px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: var(--color-text-primary);
  border-radius: 3px;
  transition: width 150ms;
}

.progress-text {
  font-size: 13px;
  color: var(--color-text-secondary);
  flex-shrink: 0;
  min-width: 36px;
  text-align: right;
}

.upload-error {
  margin-top: var(--space-3);
  color: var(--color-urgent);
  font-size: 13px;
}

.upload-error p {
  margin: 0;
}

.upload-error p + p {
  margin-top: 4px;
}

.upload-actions {
  margin-top: var(--space-5);
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.btn-text {
  font-size: 14px;
  color: var(--color-text-secondary);
}

.btn-text:hover {
  color: var(--color-text-primary);
}

.btn-primary {
  padding: var(--space-2) var(--space-5);
  background: var(--color-text-primary);
  color: var(--color-bg);
  border-radius: 4px;
  font-size: 14px;
  transition: opacity 150ms;
}

.btn-primary:hover { opacity: 0.85; }
.btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
</style>
