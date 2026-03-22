<template>
  <div class="channel-list">
    <div class="list-header">
      <div class="header-title">渠道分析</div>
    </div>

    <div v-if="!data" class="empty-state">暂无数据</div>

    <template v-else>
      <div v-for="section in data.sections" :key="section.label" class="section">
        <div class="section-label">{{ section.label }}</div>
        <div
          v-for="item in section.items"
          :key="item.key"
          class="channel-row"
          @click="$emit('drilldown', item.key)"
        >
          <div class="row-line-1">
            <button class="channel-name channel-name-link" @click.stop="$emit('navigate-channel', { key: item.key, name: item.name })">{{ item.name }}</button>
            <span class="metrics">
              转化率 {{ item.conversion_rate !== null ? `${item.conversion_rate}%` : '—' }}
              · 人均 {{ item.cost_per_hire !== null ? `¥${formatCost(item.cost_per_hire)}` : '—' }}
            </span>
          </div>
          <div class="row-line-2">
            <span v-for="(f, i) in item.funnel" :key="f.stage">
              {{ i === 0 ? '推荐' : f.stage }} {{ f.count }}<span v-if="i < item.funnel.length - 1" class="arrow"> → </span>
            </span>
          </div>
        </div>
        <div v-if="!section.items.length" class="empty-section">暂无数据</div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import type { ChannelsListData } from '@/api/analytics'

defineProps<{ data: ChannelsListData | null }>()
defineEmits<{
  (e: 'drilldown', channelKey: string): void
  (e: 'navigate-channel', payload: { key: string; name: string }): void
}>()

function formatCost(v: number): string {
  if (v >= 10000) return `${(v / 1000).toFixed(0)}k`
  return v.toLocaleString()
}
</script>

<style scoped>
.channel-list {
  display: flex;
  flex-direction: column;
}

.list-header {
  padding-bottom: var(--space-3);
}

.header-title {
  font-size: 15px;
  font-weight: 500;
}

.section {
  margin-bottom: var(--space-4);
}

.section-label {
  font-size: 12px;
  font-weight: 300;
  color: var(--color-text-secondary);
  padding: var(--space-2) 0;
  text-transform: uppercase;
  letter-spacing: 1px;
}

.channel-row {
  padding: var(--space-3) 0;
  padding-left: var(--space-3);
  border-top: 1px solid var(--color-line);
  cursor: pointer;
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}

.channel-row:hover {
  background: rgba(26, 26, 24, 0.02);
}

.row-line-1 {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
}

.channel-name {
  font-size: 15px;
  font-weight: 400;
}

.channel-name-link {
  border: none;
  background: transparent;
  padding: 0;
  color: inherit;
  cursor: pointer;
  text-align: left;
}

.channel-name-link:hover {
  text-decoration: underline;
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

.empty-state, .empty-section {
  padding: var(--space-7) 0;
  text-align: center;
  color: var(--color-text-secondary);
  font-size: 13px;
}

.empty-section {
  padding: var(--space-3);
  padding-left: var(--space-3);
}
</style>
