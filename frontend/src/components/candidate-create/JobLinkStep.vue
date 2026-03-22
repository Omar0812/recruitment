<template>
  <div class="job-link">
    <div class="job-link-header">
      <p class="success-msg">✓ {{ candidateName }}已建档</p>
    </div>

    <div class="job-link-body">
      <p class="prompt">加入流程？</p>

      <div class="job-select">
        <label class="field-label">岗位</label>
        <select v-model="selectedJobId" class="select-input" :disabled="loading || !jobs.length">
          <option :value="0" disabled>{{ loading ? '加载中...' : jobs.length ? '选择开放岗位' : '当前无开放岗位' }}</option>
          <option v-for="job in jobs" :key="job.id" :value="job.id">
            {{ job.title }}{{ job.department ? ` · ${job.department}` : '' }}
          </option>
        </select>
      </div>

      <div v-if="error" class="job-error">{{ error }}</div>

      <div class="job-actions">
        <button class="btn-text" @click="$emit('cancel')">取消</button>
        <button class="btn-text" @click="$emit('skip')">跳过，先存人才库</button>
        <button
          class="btn-primary"
          :disabled="!selectedJobId || submitting"
          @click="$emit('link', selectedJobId)"
        >
          {{ submitting ? '处理中...' : '加入流程' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { fetchOpenJobs } from '@/api/jobs'
import type { Job } from '@/api/types'

defineProps<{
  candidateName: string
  submitting: boolean
  error: string | null
}>()

defineEmits<{
  cancel: []
  link: [jobId: number]
  skip: []
}>()

const jobs = ref<Job[]>([])
const loading = ref(true)
const selectedJobId = ref(0)

onMounted(async () => {
  try {
    const res = await fetchOpenJobs()
    jobs.value = res.items
  } catch { /* ignore */ }
  finally { loading.value = false }
})
</script>

<style scoped>
.job-link {
  max-width: 480px;
}

.success-msg {
  font-size: 16px;
  font-weight: 500;
  margin-bottom: var(--space-5);
}

.prompt {
  font-size: 15px;
  margin-bottom: var(--space-3);
}

.job-select { margin-bottom: var(--space-4); }

.field-label {
  display: block;
  font-size: 13px;
  color: var(--color-text-secondary);
  margin-bottom: var(--space-1);
}

.select-input {
  width: 100%;
  padding: var(--space-2);
  border: 1px solid var(--color-line);
  border-radius: 4px;
  font-size: 14px;
  background: var(--color-bg);
  outline: none;
}

.job-error {
  color: var(--color-urgent);
  font-size: 13px;
  margin-bottom: var(--space-3);
}

.job-actions {
  display: flex;
  gap: var(--space-3);
  justify-content: space-between;
}

.btn-text {
  font-size: 14px;
  color: var(--color-text-secondary);
}
.btn-text:hover { color: var(--color-text-primary); }

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
