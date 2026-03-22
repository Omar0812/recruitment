<template>
  <div class="join-pipeline-inline">
    <div class="join-pipeline-inline__body">
      <label class="join-pipeline-inline__label">推荐到岗位</label>
      <select v-model="selectedJobId" class="join-pipeline-inline__select" :disabled="loading || !jobs.length">
        <option :value="0" disabled>{{ loading ? '加载中...' : jobs.length ? '选择开放岗位' : '当前无开放岗位' }}</option>
        <option v-for="job in jobs" :key="job.id" :value="job.id">
          {{ job.title }}{{ job.department ? ` · ${job.department}` : '' }}
        </option>
      </select>
    </div>

    <div v-if="error" class="join-pipeline-inline__error">{{ error }}</div>

    <div class="join-pipeline-inline__actions">
      <button class="join-pipeline-inline__btn" @click="$emit('cancel')">取消</button>
      <button
        class="join-pipeline-inline__btn join-pipeline-inline__btn--primary"
        :disabled="!selectedJobId || submitting"
        @click="$emit('confirm', selectedJobId)"
      >
        {{ submitting ? '处理中...' : '确认' }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { fetchOpenJobs } from '@/api/jobs'
import type { Job } from '@/api/types'

defineProps<{
  submitting: boolean
  error: string | null
}>()

defineEmits<{
  confirm: [jobId: number]
  cancel: []
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
.join-pipeline-inline {
  padding: var(--space-3) var(--space-5);
  border-top: 1px solid var(--color-line);
  background: rgba(26, 26, 24, 0.02);
}

.join-pipeline-inline__label {
  display: block;
  font-size: 13px;
  color: var(--color-text-secondary);
  margin-bottom: var(--space-1);
}

.join-pipeline-inline__select {
  width: 100%;
  padding: var(--space-2);
  border: 1px solid var(--color-line);
  border-radius: 4px;
  font-size: 14px;
  background: var(--color-bg);
  outline: none;
}

.join-pipeline-inline__error {
  color: var(--color-urgent);
  font-size: 13px;
  margin-top: var(--space-2);
}

.join-pipeline-inline__actions {
  display: flex;
  gap: var(--space-2);
  justify-content: flex-end;
  margin-top: var(--space-3);
}

.join-pipeline-inline__btn {
  font-size: 13px;
  padding: 4px 12px;
  border: 1px solid var(--color-line);
  background: none;
  border-radius: 3px;
  cursor: pointer;
  color: var(--color-text-primary);
}

.join-pipeline-inline__btn:hover:not(:disabled) {
  background: rgba(26, 26, 24, 0.04);
}

.join-pipeline-inline__btn--primary {
  background: var(--color-text-primary);
  color: var(--color-bg);
  border-color: var(--color-text-primary);
}

.join-pipeline-inline__btn--primary:hover:not(:disabled) {
  opacity: 0.85;
  background: var(--color-text-primary);
}

.join-pipeline-inline__btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
