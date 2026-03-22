<template>
  <div class="job-list">
    <div class="list-header">
      <div class="header-title">岗位分析</div>
      <select class="filter-select" :value="filter" @change="onFilterChange">
        <option value="open">招聘中</option>
        <option value="closed">已关闭</option>
        <option value="all">全部</option>
      </select>
    </div>

    <div v-if="!data" class="empty-state">暂无数据</div>

    <template v-else>
      <div
        v-for="item in data.items"
        :key="item.job_id"
        class="job-row"
        @click="$emit('drilldown', item.job_id)"
      >
        <div class="row-line-1">
          <button class="job-title job-title-link" @click.stop="$emit('navigate-job', item.job_id)">
            {{ item.title }}<span v-if="item.city" class="city">（{{ item.city }}）</span>
          </button>
          <span class="metrics">
            通过率 {{ item.pass_rate !== null ? `${item.pass_rate}%` : '—' }}
            · 周期 {{ item.avg_cycle !== null ? `${item.avg_cycle}天` : '—' }}
          </span>
        </div>
        <div class="row-line-2">
          <span v-for="(f, i) in item.funnel" :key="f.stage">
            {{ stageLabel(f.stage) }} {{ f.count }}<span v-if="i < item.funnel.length - 1" class="arrow"> → </span>
          </span>
        </div>
      </div>

      <div class="job-row total-row">
        <div class="row-line-1">
          <span class="job-title">合计</span>
          <span class="metrics">
            通过率 {{ data.totals.pass_rate !== null ? `${data.totals.pass_rate}%` : '—' }}
            · 周期 {{ data.totals.avg_cycle !== null ? `${data.totals.avg_cycle}天` : '—' }}
          </span>
        </div>
        <div class="row-line-2">
          <span v-for="(f, i) in data.totals.funnel" :key="f.stage">
            {{ stageLabel(f.stage) }} {{ f.count }}<span v-if="i < data.totals.funnel.length - 1" class="arrow"> → </span>
          </span>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import type { JobsListData } from '@/api/analytics'

defineProps<{
  data: JobsListData | null
  filter: string
}>()

const emit = defineEmits<{
  (e: 'drilldown', jobId: number): void
  (e: 'navigate-job', jobId: number): void
  (e: 'update:filter', val: string): void
}>()

function onFilterChange(ev: Event) {
  emit('update:filter', (ev.target as HTMLSelectElement).value)
}

const STAGE_DISPLAY: Record<string, string> = {
  '简历筛选': '新增',
}

function stageLabel(stage: string): string {
  return STAGE_DISPLAY[stage] ?? stage
}
</script>

<style scoped>
.job-list {
  display: flex;
  flex-direction: column;
}

.list-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-bottom: var(--space-3);
}

.header-title {
  font-size: 15px;
  font-weight: 500;
}

.filter-select {
  font-size: 13px;
  padding: var(--space-1) var(--space-2);
  border: 1px solid var(--color-line);
  border-radius: 4px;
  background: transparent;
  color: var(--color-text-primary);
  cursor: pointer;
}

.job-row {
  padding: var(--space-3) 0;
  border-top: 1px solid var(--color-line);
  cursor: pointer;
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}

.job-row:hover {
  background: rgba(26, 26, 24, 0.02);
}

.total-row {
  cursor: default;
  border-top: 2px solid var(--color-line);
}

.total-row:hover {
  background: transparent;
}

.row-line-1 {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
}

.job-title {
  font-size: 15px;
  font-weight: 400;
}

.job-title-link {
  border: none;
  background: transparent;
  padding: 0;
  color: inherit;
  cursor: pointer;
  text-align: left;
}

.job-title-link:hover {
  text-decoration: underline;
}

.city {
  font-size: 13px;
  font-weight: 300;
  color: var(--color-text-secondary);
}

.metrics {
  font-size: 13px;
  font-weight: 300;
  color: var(--color-text-secondary);
  font-family: var(--font-mono);
}

.row-line-2 {
  font-size: 13px;
  font-weight: 300;
  color: var(--color-text-secondary);
  font-family: var(--font-mono);
}

.arrow {
  color: var(--color-line);
}

.empty-state {
  padding: var(--space-7) 0;
  text-align: center;
  color: var(--color-text-secondary);
  font-size: 13px;
}
</style>
