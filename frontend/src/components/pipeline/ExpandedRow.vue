<template>
  <div class="expanded-row">
    <div v-if="pipelineState.expandedLoading" class="expanded-row__loading">
      加载中…
    </div>

    <template v-else>
      <EventTimeline
        :events="pipelineState.expandedEvents"
        :application-id="item.application.id"
      />

      <div class="expanded-row__actions">
        <StageAction
          :stage="item.application.stage"
          :available-actions="pipelineState.expandedActions"
          :application-id="item.application.id"
          :candidate-supplier="candidateSupplier"
          :interview-scheduled-at="latestInterviewScheduledAt"
          :events="pipelineState.expandedEvents"
        />
      </div>

      <ComposerInput :application-id="item.application.id" />

      <EndFlowPanel
        :application-id="item.application.id"
        :item="item"
      />

      <div class="expanded-row__footer">
        <button class="expanded-row__profile-link" @click="openCandidatePanel(item.candidate.id)">
          查看完整档案
        </button>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import type { PipelineItem, Supplier } from '@/api/types'
import { ref, watch, computed } from 'vue'
import { usePipeline } from '@/composables/usePipeline'
import { openCandidatePanel } from '@/composables/useCandidatePanel'
import { fetchSupplier } from '@/api/channels'
import EventTimeline from './EventTimeline.vue'
import StageAction from './StageAction.vue'
import ComposerInput from './ComposerInput.vue'
import EndFlowPanel from './EndFlowPanel.vue'

const props = defineProps<{
  item: PipelineItem
}>()

const { state: pipelineState } = usePipeline()

// 从已加载的事件中提取最近面试的 scheduled_at
const latestInterviewScheduledAt = computed(() => {
  const events = pipelineState.expandedEvents
  for (let i = events.length - 1; i >= 0; i--) {
    const e = events[i]
    if (e.type === 'interview_scheduled' && e.payload?.scheduled_at) {
      return e.payload.scheduled_at as string
    }
  }
  return null
})

// 按需加载候选人关联的猎头信息
const candidateSupplier = ref<Supplier | null>(null)

watch(
  () => props.item.candidate.supplier_id,
  async (supplierId) => {
    if (supplierId) {
      try {
        candidateSupplier.value = await fetchSupplier(supplierId)
      } catch {
        candidateSupplier.value = null
      }
    } else {
      candidateSupplier.value = null
    }
  },
  { immediate: true },
)
</script>

<style scoped>
.expanded-row {
  padding: var(--space-3) var(--space-4) var(--space-4);
  border-top: 1px solid var(--color-line);
  background: rgba(26, 26, 24, 0.02);
}

.expanded-row__loading {
  color: var(--color-text-secondary);
  font-size: 13px;
  padding: var(--space-4) 0;
}

.expanded-row__actions {
  margin-top: var(--space-3);
}

.expanded-row__footer {
  margin-top: var(--space-3);
  padding-top: var(--space-2);
  border-top: 1px solid var(--color-line);
}

.expanded-row__profile-link {
  font-size: 13px;
  color: var(--color-text-secondary);
  cursor: pointer;
  transition: color 150ms;
}

.expanded-row__profile-link:hover {
  color: var(--color-text-primary);
}
</style>
