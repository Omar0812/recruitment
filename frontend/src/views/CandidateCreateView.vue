<template>
  <div class="create-view">
    <header class="create-header">
      <h1 class="create-title">新建候选人</h1>
    </header>

    <div class="create-body">
      <div v-if="showStepCancel" class="create-toolbar">
        <button class="create-toolbar__cancel" @click="onCancel">取消</button>
      </div>

      <!-- 队列状态栏 -->
      <QueueBar
        v-if="isQueueMode() && state.step === 'form'"
        :current-index="state.currentIndex"
        :total="state.queue.length"
        :name="state.form.name || `候选人 ${state.currentIndex + 1}`"
        @prev="goToQueueItem(state.currentIndex - 1)"
        @next="goToQueueItem(state.currentIndex + 1)"
        @remove="removeFromQueue(state.currentIndex)"
      />

      <!-- 步骤一：文件选择 -->
      <FileUploadZone
        v-if="state.step === 'file-select'"
        :files="state.files"
        :uploading="state.uploading"
        :upload-progress="state.uploadProgress ?? 0"
        :error="state.error"
        @update:files="setFiles"
        @manual="goManual"
        @proceed="proceedWithFiles"
      />

      <!-- 步骤二：多文件分组 -->
      <FileGrouping
        v-if="state.step === 'grouping'"
        :groups="state.groups"
        :uploading="state.uploading"
        :uploaded-count="state.uploadedCount"
        :error="state.error"
        @back="state.step = 'file-select'"
        @confirm="confirmGroups"
      />

      <!-- 步骤三：建档表单 -->
      <CandidateForm
        v-if="state.step === 'form'"
        :form="state.form"
        :file-preview="currentFilePreview"
        :file-path="currentFilePath"
        :submitting="state.submitting"
        :parsing="state.parsing"
        :parse-error="state.parseError ?? null"
        :parse-error-type="state.parseErrorType ?? null"
        :error="state.error"
        :readonly="currentItemReadonly"
        :duplicate-matches="currentDuplicateMatches"
        :checking-duplicate="state.checkingDuplicate"
        @submit="onFormSubmit"
        @cancel="onCancel"
        @key-field-change="triggerDuplicateCheck"
        @retry-parse="retryParse"
        @check-duplicate="triggerDuplicateCheck"
        @merge-existing="onMerge"
        @dismiss-duplicate="dismissDuplicate"
        @view-pipeline="goToPipeline"
      />

      <!-- 步骤四：关联岗位（保留上方简历预览区） -->
      <div v-if="state.step === 'job-link'" class="job-link-with-preview">
        <div v-if="jobLinkBlobUrl || jobLinkFileType === 'docx'" class="job-link-preview-area">
          <iframe
            v-if="jobLinkFileType === 'pdf'"
            class="job-link-preview-area__iframe"
            :src="jobLinkBlobUrl!"
            frameborder="0"
          />
          <div
            v-else-if="jobLinkFileType === 'docx'"
            ref="jobLinkDocxContainer"
            class="job-link-preview-area__docx"
          />
          <img
            v-else-if="jobLinkFileType === 'image'"
            class="job-link-preview-area__img"
            :src="jobLinkBlobUrl!"
            alt="简历预览"
          />
        </div>
        <JobLinkStep
          :candidate-name="state.createdCandidate?.name ?? ''"
          :submitting="state.submitting"
          :error="state.error"
          @cancel="onCancel"
          @link="linkJob"
          @skip="skipJob"
        />
      </div>

      <!-- 步骤五：完成（多文件汇总 / 单文件直接跳转） -->
      <BatchSummary
        v-if="state.step === 'done' && isQueueMode()"
        :results="completedResults"
        @done="onBatchDone"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { consumeDroppedFiles, useCandidateCreate } from '@/composables/useCandidateCreate'
import { fetchFileAsBlob } from '@/api/files'
import FileUploadZone from '@/components/candidate-create/FileUploadZone.vue'
import FileGrouping from '@/components/candidate-create/FileGrouping.vue'
import CandidateForm from '@/components/candidate-create/CandidateForm.vue'
import JobLinkStep from '@/components/candidate-create/JobLinkStep.vue'
import QueueBar from '@/components/candidate-create/QueueBar.vue'
import BatchSummary from '@/components/candidate-create/BatchSummary.vue'

const router = useRouter()
const {
  state,
  setFiles,
  proceedWithFiles,
  goManual,
  confirmGroups,
  triggerDuplicateCheck,
  dismissDuplicate,
  submitForm,
  linkJob,
  skipJob,
  removeFromQueue,
  goToQueueItem,
  isQueueMode,
  isFormDirty,
  retryParse,
  reset,
} = useCandidateCreate()

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

const currentFilePreview = computed(() => {
  const group = isQueueMode() ? state.queue[state.currentIndex]?.group : null
  const file = group?.files[0] ?? state.files[0]

  if (!file) return null

  return {
    name: file.name,
    sizeLabel: `文件大小：${formatFileSize(file.size)}`,
    status: group?.uploadResult || state.uploadResult ? '已上传' : '待上传',
  }
})

const currentFilePath = computed(() => {
  const group = isQueueMode() ? state.queue[state.currentIndex]?.group : null
  return group?.uploadResult?.file_path ?? state.uploadResult?.file_path ?? null
})

const completedResults = computed(() =>
  state.queue.filter((q) => q.result).map((q) => q.result!),
)

const showStepCancel = computed(() =>
  state.step === 'file-select' || state.step === 'grouping',
)

const currentItemReadonly = computed(() => {
  if (!isQueueMode()) return false
  return !!state.queue[state.currentIndex]?.result
})

const currentDuplicateMatches = computed(() =>
  state.duplicateCheck?.matches ?? [],
)

const hasPendingState = computed(() =>
  state.files.length > 0
  || state.groups.length > 0
  || state.queue.length > 0
  || isFormDirty()
  || !!state.createdCandidate
  || !!state.uploadResult
  || !!state.finalResult,
)

function onFormSubmit() {
  submitForm('create_new')
}

function onMerge(candidateId: number) {
  submitForm('merge_existing', candidateId)
}

// job-link 步骤的预览
const jobLinkBlobUrl = ref<string | null>(null)
const jobLinkDocxContainer = ref<HTMLElement | null>(null)

const jobLinkFileType = computed(() => {
  const fp = (currentFilePath.value ?? '').toLowerCase()
  if (fp.endsWith('.pdf')) return 'pdf'
  if (fp.endsWith('.docx')) return 'docx'
  if (fp.endsWith('.png') || fp.endsWith('.jpg') || fp.endsWith('.jpeg')) return 'image'
  return 'unknown'
})

function revokeJobLinkBlob() {
  if (jobLinkBlobUrl.value) {
    URL.revokeObjectURL(jobLinkBlobUrl.value)
    jobLinkBlobUrl.value = null
  }
}

watch(
  [() => state.step, currentFilePath],
  async ([step, filePath]) => {
    revokeJobLinkBlob()
    if (step !== 'job-link' || !filePath) return

    try {
      const normalized = filePath.replace(/^\/+/, '')
      const blobUrl = await fetchFileAsBlob(normalized)

      if (jobLinkFileType.value === 'docx') {
        // docx-preview 渲染
        const resp = await fetch(blobUrl)
        const buf = await resp.arrayBuffer()
        URL.revokeObjectURL(blobUrl)
        await nextTick()
        if (jobLinkDocxContainer.value) {
          const { renderAsync } = await import('docx-preview')
          jobLinkDocxContainer.value.innerHTML = ''
          await renderAsync(buf, jobLinkDocxContainer.value)
        }
      } else {
        jobLinkBlobUrl.value = blobUrl
      }
    } catch {
      jobLinkBlobUrl.value = null
    }
  },
  { immediate: true },
)

function onCancel() {
  if (hasPendingState.value && !confirm('放弃当前填写的内容？')) return
  reset()
  router.back()
}

function goToPipeline(applicationId?: number) {
  reset()
  if (applicationId) {
    router.push({ path: '/pipeline', query: { expand: String(applicationId) } })
    return
  }
  router.push('/pipeline')
}

function onBatchDone() {
  const hasLinked = completedResults.value.some((r) => r.linkedJob)
  reset()
  router.push(hasLinked ? '/pipeline' : '/talent-pool')
}

onMounted(async () => {
  const droppedFiles = consumeDroppedFiles()
  if (droppedFiles.length === 0) return
  setFiles(droppedFiles)
  await proceedWithFiles()
})

watch(() => state.step, (step) => {
  if (step === 'done' && !isQueueMode()) {
    const destination = state.finalResult?.linkedJob ? '/pipeline' : '/talent-pool'
    reset()
    router.push(destination)
  }
})

onUnmounted(() => {
  revokeJobLinkBlob()
  reset()
})
</script>

<style scoped>
.create-view {
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.create-header {
  padding: var(--space-5) var(--space-6);
  border-bottom: 1px solid var(--color-line);
  flex-shrink: 0;
}

.create-title {
  font-size: 18px;
  font-weight: 500;
}

.create-body {
  flex: 1;
  overflow-y: auto;
  padding: var(--space-6);
}

.create-toolbar {
  display: flex;
  justify-content: flex-end;
  margin-bottom: var(--space-4);
}

.create-toolbar__cancel {
  font-size: 14px;
  color: var(--color-text-secondary);
}

.create-toolbar__cancel:hover {
  color: var(--color-text-primary);
}

.job-link-with-preview {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.job-link-preview-area {
  height: 60%;
  min-height: 450px;
  border: 1px solid var(--color-line);
  border-radius: 6px;
  margin-bottom: var(--space-4);
  overflow: hidden;
  flex-shrink: 0;
}

.job-link-preview-area__iframe {
  width: 100%;
  height: 100%;
  border: none;
}

.job-link-preview-area__docx {
  width: 100%;
  height: 100%;
  overflow: auto;
}

.job-link-preview-area__img {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
  display: block;
  margin: 0 auto;
}
</style>
