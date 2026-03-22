<template>
  <div class="talent-pool-view">
    <div v-if="state.toast" class="talent-pool-view__toast" role="status">
      {{ state.toast }}
    </div>

    <div v-if="state.error" class="talent-pool-view__error" role="alert">
      {{ state.error }}
    </div>

    <TalentPoolFilters
      :filters="state.filters"
      :skill-options="skillOptions"
      :source-options="sourceOptions"
      @update="setFilters"
      @search="setSearch"
      @clear="clearFilters"
    />
    <CandidateList
      :items="state.items"
      :total="state.total"
      :page="state.page"
      :page-size="state.pageSize"
      :loading="state.loading"
      @select="handleSelect"
      @toggle-star="handleToggleStar"
      @page="setPage"
    />
  </div>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useTalentPool } from '@/composables/useTalentPool'
import { candidatePanelMutationState, openCandidatePanel } from '@/composables/useCandidatePanel'
import { fetchCandidateSkillOptions } from '@/api/candidates'
import { fetchSourceTags, fetchSuppliers } from '@/api/channels'
import type { TalentPoolFilters as TalentPoolFilterState } from '@/api/types'
import TalentPoolFilters from '@/components/talent-pool/TalentPoolFilters.vue'
import CandidateList from '@/components/talent-pool/CandidateList.vue'

const route = useRoute()
const { state, setFilters, setSearch, setPage, clearFilters, handleToggleStar, clearToast, load } = useTalentPool(getRouteFilters())

const sourceOptions = ref<string[]>([])
const skillOptions = ref<string[]>([])
let toastTimer: ReturnType<typeof setTimeout> | null = null

function handleSelect(id: number) {
  openCandidatePanel(id)
}

function parsePipelineStatus(value: unknown): TalentPoolFilterState['pipeline_status'] {
  const raw = Array.isArray(value) ? value[0] : value
  if (raw === 'none' || raw === 'in_progress' || raw === 'ended') return raw
  return undefined
}

function getRouteFilters(): TalentPoolFilterState {
  const pipelineStatus = parsePipelineStatus(route.query.pipeline_status)
  return pipelineStatus ? { pipeline_status: pipelineStatus } : {}
}

async function loadFilterOptions() {
  const [sourceTagsResult, suppliersResult, skillOptionsResult] = await Promise.allSettled([
    fetchSourceTags(),
    fetchSuppliers(),
    fetchCandidateSkillOptions(),
  ])

  const sourceTags = sourceTagsResult.status === 'fulfilled' ? sourceTagsResult.value : []
  const supplierItems = suppliersResult.status === 'fulfilled' ? suppliersResult.value.items : []

  sourceOptions.value = Array.from(new Set([
    ...sourceTags.map((tag) => tag.name).filter(Boolean),
    ...supplierItems.map((supplier) => supplier.name).filter(Boolean),
    '内推',
  ]))
  skillOptions.value = skillOptionsResult.status === 'fulfilled' ? skillOptionsResult.value : []
}

onMounted(() => {
  loadFilterOptions()
})

watch(() => state.toast, (message) => {
  if (toastTimer) clearTimeout(toastTimer)
  if (!message) return
  toastTimer = setTimeout(() => {
    clearToast()
    toastTimer = null
  }, 2400)
})

watch(() => route.query.pipeline_status, (value) => {
  const pipelineStatus = parsePipelineStatus(value)
  if (state.filters.pipeline_status === pipelineStatus) return
  setFilters({
    ...state.filters,
    pipeline_status: pipelineStatus,
  })
})

watch(() => candidatePanelMutationState.version, (version) => {
  if (version > 0 && candidatePanelMutationState.candidateId != null) {
    load()
  }
})

onBeforeUnmount(() => {
  if (toastTimer) clearTimeout(toastTimer)
})
</script>

<style scoped>
.talent-pool-view {
  height: 100%;
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 12px 0 0;
  overflow: hidden;
}

.talent-pool-view__toast,
.talent-pool-view__error {
  margin: 0 16px;
  padding: 10px 12px;
  border-radius: 8px;
  font-size: 13px;
  line-height: 1.5;
}

.talent-pool-view__toast {
  background: rgba(26,26,24,0.92);
  color: #fff;
}

.talent-pool-view__error {
  border: 1px solid rgba(196,71,42,0.18);
  background: rgba(196,71,42,0.08);
  color: var(--color-urgent, #C4472A);
}
</style>
