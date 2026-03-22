<template>
  <div class="pipeline-page">
    <div class="pipeline-header">
      <h1 class="pipeline-title">进行中</h1>
      <div class="pipeline-view-switch" role="radiogroup" aria-label="视图切换">
        <button
          v-for="opt in viewOptions"
          :key="opt.value"
          type="button"
          class="view-switch-btn"
          :class="{ active: groupMode === opt.value }"
          role="radio"
          :aria-checked="groupMode === opt.value"
          @click="setGroupMode(opt.value)"
        >{{ opt.label }}</button>
      </div>
    </div>

    <div v-if="state.loading" class="pipeline-loading">加载中…</div>

    <div v-else-if="state.error" class="pipeline-error" role="alert">
      <p>{{ state.error }}</p>
      <button type="button" class="pipeline-retry" @click="loadPage">重试</button>
    </div>

    <div v-else-if="state.items.length === 0" class="pipeline-empty">
      <p>暂无进行中的候选人</p>
    </div>

    <div v-else class="pipeline-list">
      <template v-for="group in groupedItems" :key="group.key">
        <!-- 分组 header（all 模式不渲染） -->
        <div
          v-if="groupMode !== 'all'"
          class="pipeline-group-header"
          :class="{ collapsed: isCollapsed(group.key) }"
          @click="toggleCollapse(group.key)"
        >
          <span class="group-arrow">{{ isCollapsed(group.key) ? '▸' : '▾' }}</span>
          <span class="group-label">{{ group.label }}</span>
          <span class="group-count">{{ group.items.length }}</span>
        </div>

        <!-- 组内行 -->
        <template v-if="!isCollapsed(group.key)">
          <PipelineRow
            v-for="item in group.items"
            :key="item.application.id"
            :item="item"
            :expanded="state.expandedId === item.application.id"
            @toggle="onToggle(item.application.id)"
          />
        </template>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { usePipeline } from '@/composables/usePipeline'
import type { GroupMode } from '@/composables/usePipeline'
import PipelineRow from '@/components/pipeline/PipelineRow.vue'

const {
  state,
  groupMode,
  groupedItems,
  loadPipeline,
  expand,
  setGroupMode,
  toggleCollapse,
  isCollapsed,
} = usePipeline()
const route = useRoute()
const router = useRouter()

const viewOptions: { value: GroupMode; label: string }[] = [
  { value: 'all', label: '全部' },
  { value: 'byJob', label: '按岗位' },
  { value: 'byStage', label: '按阶段' },
]

function onToggle(applicationId: number) {
  expand(applicationId)
}

async function handleExpandQuery() {
  const expandId = route.query.expand
  if (expandId) {
    const id = Number(expandId)
    if (!isNaN(id)) {
      await expand(id)
      const nextQuery = { ...route.query }
      delete nextQuery.expand
      router.replace({ query: nextQuery })
      setTimeout(() => {
        const el = document.querySelector(`[data-application-id="${id}"]`)
        el?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
      }, 100)
    }
  }
}

async function loadPage() {
  await loadPipeline()
  if (state.error) return
  await handleExpandQuery()
}

onMounted(loadPage)
</script>

<style scoped>
.pipeline-page {
  max-width: 800px;
}

.pipeline-header {
  align-items: center;
  display: flex;
  gap: var(--space-4);
  margin-bottom: var(--space-5);
}

.pipeline-title {
  font-size: 20px;
  font-weight: 500;
  margin: 0;
}

.pipeline-view-switch {
  display: flex;
  gap: 0;
  margin-left: auto;
}

.view-switch-btn {
  background: transparent;
  border: 1px solid var(--color-border);
  color: var(--color-text-secondary);
  cursor: pointer;
  font: inherit;
  font-size: 13px;
  padding: 4px 12px;
}

.view-switch-btn:first-child {
  border-radius: 6px 0 0 6px;
}

.view-switch-btn:last-child {
  border-radius: 0 6px 6px 0;
}

.view-switch-btn:not(:first-child) {
  margin-left: -1px;
}

.view-switch-btn.active {
  background: var(--color-bg-secondary, #f5f5f5);
  border-color: var(--color-text-primary);
  color: var(--color-text-primary);
  font-weight: 500;
  position: relative;
  z-index: 1;
}

.view-switch-btn:hover:not(.active) {
  background: var(--color-bg-secondary, #f5f5f5);
}

.pipeline-loading,
.pipeline-empty {
  color: var(--color-text-secondary);
  font-size: 14px;
  padding: var(--space-7) 0;
  text-align: center;
}

.pipeline-error {
  align-items: center;
  color: var(--color-urgent);
  display: flex;
  flex-direction: column;
  font-size: 14px;
  gap: var(--space-3);
  padding: var(--space-7) 0;
  text-align: center;
}

.pipeline-error p {
  margin: 0;
}

.pipeline-retry {
  background: transparent;
  border: 1px solid currentColor;
  border-radius: 999px;
  color: inherit;
  cursor: pointer;
  font: inherit;
  padding: 6px 14px;
}

.pipeline-retry:hover {
  opacity: 0.85;
}

.pipeline-list {
  display: flex;
  flex-direction: column;
}

.pipeline-group-header {
  align-items: center;
  border-bottom: 1px solid var(--color-border);
  cursor: pointer;
  display: flex;
  font-size: 13px;
  gap: var(--space-2);
  margin-top: var(--space-4);
  padding: var(--space-2) 0;
  user-select: none;
}

.pipeline-group-header:first-child {
  margin-top: 0;
}

.group-arrow {
  color: var(--color-text-tertiary);
  font-size: 12px;
  width: 14px;
}

.group-label {
  color: var(--color-text-primary);
  font-weight: 500;
}

.group-count {
  color: var(--color-text-tertiary);
  font-size: 12px;
}
</style>
