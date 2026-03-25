<template>
  <div
    class="pipeline-row"
    :class="{ 'pipeline-row--expanded': expanded }"
    :data-application-id="item.application.id"
  >
    <div class="pipeline-row__header" @click="$emit('toggle')">
      <span class="pipeline-row__indicator">{{ expanded ? '▼' : '▸' }}</span>
      <span class="pipeline-row__name" @click.stop="handleNameClick">{{ item.candidate.name }}</span>
      <span class="pipeline-row__stage" :class="stageClass">{{ stageLabel }}</span>
      <span class="pipeline-row__job">{{ item.job.title }}</span>
      <span v-if="interviewTimeLabel" class="pipeline-row__interview-time">{{ interviewTimeLabel }}</span>
    </div>

    <ExpandedRow
      v-if="expanded"
      :item="item"
    />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { PipelineItem } from '@/api/types'
import { openCandidatePanel } from '@/composables/useCandidatePanel'
import { usePipeline } from '@/composables/usePipeline'
import { formatDateTime, formatTime } from '@/utils/date'
import ExpandedRow from './ExpandedRow.vue'

const props = defineProps<{
  item: PipelineItem
  expanded: boolean
}>()

defineEmits<{
  toggle: []
}>()

const { getEventSummary } = usePipeline()

const summary = computed(() => getEventSummary(props.item.application.id))

const STAGE_CLASS_MAP: Record<string, string> = {
  '新申请': 'stage--new',
  '简历筛选': 'stage--screening',
  '面试': 'stage--interview',
  'Offer沟通': 'stage--offer',
  '背调': 'stage--background',
  '待入职': 'stage--pending',
}

const stageClass = computed(() => STAGE_CLASS_MAP[props.item.application.stage ?? ''] ?? '')

const stageLabel = computed(() => summary.value?.stageDetail ?? props.item.application.stage ?? '')

const interviewTimeLabel = computed(() => {
  const at = summary.value?.nextInterviewAt
  if (!at) return ''
  const d = new Date(at)
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const target = new Date(d.getFullYear(), d.getMonth(), d.getDate())
  const diffDays = Math.round((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
  const time = formatTime(at)
  if (diffDays === 0) return `今天 ${time}`
  if (diffDays === 1) return `明天 ${time}`
  if (diffDays === -1) return `昨天 ${time}`
  return formatDateTime(at)
})

function handleNameClick() {
  openCandidatePanel(props.item.candidate.id)
}
</script>

<style scoped>
.pipeline-row {
  border-bottom: 1px solid var(--color-line);
}

.pipeline-row__header {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-3) var(--space-4);
  cursor: pointer;
  transition: background 150ms;
}

.pipeline-row__header:hover {
  background: rgba(26, 26, 24, 0.03);
}

.pipeline-row--expanded .pipeline-row__header {
  background: rgba(26, 26, 24, 0.04);
}

.pipeline-row__indicator {
  font-size: 10px;
  color: var(--color-text-secondary);
  flex-shrink: 0;
  width: 12px;
}

.pipeline-row__name {
  font-size: 14px;
  font-weight: 500;
  min-width: 80px;
  cursor: pointer;
}

.pipeline-row__name:hover {
  text-decoration: underline;
}

.pipeline-row__stage {
  font-size: 12px;
  padding: 2px 8px;
  border-radius: 3px;
  background: var(--color-line);
  white-space: nowrap;
}

.stage--new       { background: #F0EDE8; color: #5C5347; }
.stage--screening { background: #E8EAE6; color: #4A5242; }
.stage--interview { background: #E3E8ED; color: #3D4F5F; }
.stage--offer     { background: #F0E8DF; color: #6B5340; }
.stage--background { background: #E8E3ED; color: #524060; }
.stage--pending   { background: #E0ECE4; color: #2E5438; }

.pipeline-row__job {
  font-size: 13px;
  color: var(--color-text-secondary);
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pipeline-row__interview-time {
  font-size: 12px;
  color: var(--color-text-secondary);
  white-space: nowrap;
  flex-shrink: 0;
}

</style>
