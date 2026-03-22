<template>
  <div class="job-drilldown" v-if="data">
    <button class="back-btn" @click="$emit('back')">← 返回岗位列表</button>

    <div class="drill-header">
      <span class="drill-title">{{ data.job.title }}<span v-if="data.job.city" class="city">（{{ data.job.city }}）</span></span>
      <span class="drill-meta">
        {{ data.job.status === 'open' ? '招聘中' : '已关闭' }}
        <template v-if="data.job.priority"> · {{ priorityLabel(data.job.priority) }}</template>
        · {{ data.job.hired_total }}/{{ data.job.headcount }} 到岗
      </span>
    </div>

    <section class="zone zone-split">
      <FunnelChart
        :funnel="data.funnel"
        :cohort-size="data.funnel_cohort_size"
        title="本期新流程转化"
      />
      <div class="stage-durations">
        <div class="section-title">各阶段平均耗时</div>
        <div v-for="d in data.stage_durations" :key="d.stage" class="duration-row">
          <span class="stage-name">{{ d.stage }}</span>
          <span class="duration-value">{{ d.avg_days !== null ? `${d.avg_days}天` : '—' }}</span>
          <span class="sample-size">({{ d.sample_size }}人)</span>
        </div>
      </div>
    </section>

    <section class="zone zone-split">
      <div class="source-dist">
        <div class="section-title">候选人来源分布</div>
        <div v-for="s in data.source_distribution" :key="s.source" class="source-row">
          <button class="source-name source-name-link" @click.stop="$emit('navigate-channel', { name: s.source })">{{ s.source }}</button>
          <div class="source-bar-track">
            <div class="source-bar" :style="{ width: sourceBarWidth(s.count) }"></div>
          </div>
          <span class="source-count">{{ s.count }}</span>
        </div>
        <div v-if="!data.source_distribution.length" class="empty">暂无数据</div>
      </div>
      <EndReasons :end-reasons="data.end_reasons" />
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { JobDrilldownData } from '@/api/analytics'
import FunnelChart from './FunnelChart.vue'
import EndReasons from './EndReasons.vue'

const props = defineProps<{ data: JobDrilldownData | null }>()
defineEmits<{
  (e: 'back'): void
  (e: 'navigate-channel', payload: { name: string }): void
}>()

function priorityLabel(p: string): string {
  const map: Record<string, string> = { high: '高优', medium: '中', low: '低' }
  return map[p] || p
}

const maxSource = computed(() =>
  Math.max(...(props.data?.source_distribution.map(s => s.count) || [1]), 1)
)

function sourceBarWidth(count: number): string {
  return `${Math.max((count / maxSource.value) * 100, 4)}%`
}
</script>

<style scoped>
.job-drilldown {
  display: flex;
  flex-direction: column;
  gap: var(--space-5);
}

.back-btn {
  align-self: flex-start;
  background: none;
  border: none;
  color: var(--color-text-secondary);
  font-size: 13px;
  cursor: pointer;
  padding: 0;
}

.back-btn:hover {
  color: var(--color-text-primary);
}

.drill-header {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
}

.drill-title {
  font-size: 18px;
  font-weight: 500;
}

.city {
  font-weight: 300;
  font-size: 15px;
  color: var(--color-text-secondary);
}

.drill-meta {
  font-size: 13px;
  font-weight: 300;
  color: var(--color-text-secondary);
}

.zone-split {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-5);
}

.section-title {
  font-size: 12px;
  font-weight: 300;
  color: var(--color-text-secondary);
  margin-bottom: var(--space-2);
}

.stage-durations {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}

.duration-row {
  display: grid;
  grid-template-columns: 56px 60px 1fr;
  gap: var(--space-2);
  font-size: 13px;
  padding: var(--space-1) 0;
}

.stage-name {
  font-weight: 300;
  color: var(--color-text-secondary);
  font-size: 12px;
}

.duration-value {
  font-family: var(--font-mono);
  font-weight: 400;
}

.sample-size {
  font-size: 11px;
  font-weight: 300;
  color: var(--color-text-secondary);
}

.source-dist {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}

.source-row {
  display: grid;
  grid-template-columns: 80px 1fr 32px;
  align-items: center;
  gap: var(--space-2);
}

.source-name {
  font-size: 12px;
  font-weight: 300;
  color: var(--color-text-secondary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.source-name-link {
  border: none;
  background: transparent;
  padding: 0;
  cursor: pointer;
  text-align: left;
}

.source-name-link:hover {
  color: var(--color-text-primary);
  text-decoration: underline;
}

.source-bar-track {
  height: 12px;
  overflow: hidden;
}

.source-bar {
  height: 100%;
  background: var(--color-material-moss);
  border-radius: 2px;
}

.source-count {
  font-size: 12px;
  font-family: var(--font-mono);
  text-align: right;
}

.empty {
  font-size: 12px;
  color: var(--color-text-secondary);
}
</style>
