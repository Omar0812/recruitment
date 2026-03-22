<template>
  <div class="grouping">
    <h2 class="grouping-title">导入 {{ totalFiles }} 个文件，请确认分组</h2>

    <div v-for="(group, gi) in localGroups" :key="group.label + gi" class="group-card">
      <div class="group-header">
        <span class="group-label">候选人 {{ gi + 1 }}</span>
      </div>
      <ul class="group-files">
        <li v-for="(f, fi) in group.files" :key="f.name + fi" class="group-file">
          <span class="group-file__name">{{ f.name }}</span>
          <div class="group-file__actions">
            <label class="group-file__label">
              归到
              <select
                class="group-file__select"
                :value="gi"
                @change="moveFile(f, Number(($event.target as HTMLSelectElement).value))"
              >
                <option v-for="(_, targetIndex) in localGroups" :key="targetIndex" :value="targetIndex">
                  候选人 {{ targetIndex + 1 }}
                </option>
              </select>
            </label>
            <button type="button" class="group-file__split" @click="moveFileToNewGroup(f)">单独成组</button>
          </div>
        </li>
      </ul>
    </div>

    <div v-if="error" class="grouping-error">{{ error }}</div>

    <div class="grouping-actions">
      <button class="btn-text" @click="$emit('back')">返回</button>
      <button
        class="btn-primary"
        :disabled="uploading"
        @click="$emit('confirm', localGroups)"
      >
        {{ uploading ? `正在上传 ${uploadedCount}/${localGroups.length}...` : '确认分组，开始处理' }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { FileGroup } from '@/composables/useCandidateCreate'

const props = defineProps<{
  groups: FileGroup[]
  uploading: boolean
  uploadedCount: number
  error: string | null
}>()

defineEmits<{
  back: []
  confirm: [groups: FileGroup[]]
}>()

const localGroups = ref<FileGroup[]>([])

const totalFiles = computed(() => localGroups.value.reduce((sum, g) => sum + g.files.length, 0))

watch(
  () => props.groups,
  (groups) => {
    localGroups.value = groups.map((group) => ({
      ...group,
      files: [...group.files],
    }))
  },
  { immediate: true, deep: true },
)

function buildLabel(file: File): string {
  return file.name.replace(/\.[^.]+$/, '')
}

function cleanupGroups() {
  localGroups.value = localGroups.value
    .filter((group) => group.files.length > 0)
    .map((group) => ({
      ...group,
      label: group.files[0] ? buildLabel(group.files[0]) : group.label,
    }))
}

function findGroupIndex(file: File) {
  return localGroups.value.findIndex((group) => group.files.includes(file))
}

function moveFile(file: File, targetIndex: number) {
  const sourceIndex = findGroupIndex(file)
  if (sourceIndex < 0 || sourceIndex === targetIndex) return

  localGroups.value[sourceIndex].files = localGroups.value[sourceIndex].files.filter((item) => item !== file)
  localGroups.value[targetIndex].files.push(file)
  cleanupGroups()
}

function moveFileToNewGroup(file: File) {
  const sourceIndex = findGroupIndex(file)
  if (sourceIndex < 0) return
  if (localGroups.value[sourceIndex].files.length === 1) return

  localGroups.value[sourceIndex].files = localGroups.value[sourceIndex].files.filter((item) => item !== file)
  localGroups.value.push({
    label: buildLabel(file),
    files: [file],
  })
  cleanupGroups()
}
</script>

<style scoped>
.grouping {
  max-width: 560px;
  margin: 0 auto;
}

.grouping-title {
  font-size: 16px;
  font-weight: 500;
  margin-bottom: var(--space-5);
}

.group-card {
  border: 1px solid var(--color-line);
  border-radius: 6px;
  padding: var(--space-3) var(--space-4);
  margin-bottom: var(--space-3);
}

.group-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--space-2);
}

.group-label {
  font-size: 14px;
  font-weight: 500;
}

.group-files {
  padding-left: var(--space-4);
}

.group-file {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-2);
  font-size: 13px;
  color: var(--color-text-secondary);
  padding: var(--space-2) 0;
}

.group-file__name {
  min-width: 0;
  flex: 1;
  word-break: break-all;
}

.group-file__actions {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.group-file__label {
  display: flex;
  align-items: center;
  gap: 6px;
}

.group-file__select {
  border: 1px solid var(--color-line);
  border-radius: 4px;
  background: var(--color-bg);
  padding: 2px 6px;
  font-size: 12px;
}

.group-file__split {
  font-size: 12px;
  color: var(--color-text-secondary);
}

.group-file__split:hover {
  color: var(--color-text-primary);
}

.grouping-error {
  margin-top: var(--space-3);
  color: var(--color-urgent);
  font-size: 13px;
}

.grouping-actions {
  margin-top: var(--space-5);
  display: flex;
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
