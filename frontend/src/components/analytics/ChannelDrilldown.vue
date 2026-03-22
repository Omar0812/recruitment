<template>
  <div class="channel-drilldown" v-if="data">
    <button class="back-btn" @click="$emit('back')">← 返回渠道列表</button>

    <div class="drill-header">
      <span class="drill-title">{{ data.channel.name }}</span>
      <span class="drill-meta" v-if="showContractMeta">
        {{ contractStatusLabel }}
        <template v-if="data.channel.contract_end"> · 合同至 {{ data.channel.contract_end }}</template>
      </span>
    </div>

    <section class="zone zone-split">
      <FunnelChart
        :funnel="data.funnel"
        :cohort-size="data.funnel_cohort_size"
        title="本期推荐转化"
      />
      <EndReasons :end-reasons="data.end_reasons" />
    </section>

    <section class="zone zone-split">
      <div class="job-dist">
        <div class="section-title">岗位分布</div>
        <div v-for="j in data.job_distribution" :key="j.job_id" class="dist-row">
          <button class="dist-name dist-name-link" @click.stop="$emit('navigate-job', j.job_id)">{{ j.title }}</button>
          <div class="dist-bar-track">
            <div class="dist-bar" :style="{ width: jobBarWidth(j.count) }"></div>
          </div>
          <span class="dist-count">{{ j.count }}</span>
        </div>
        <div v-if="!data.job_distribution.length" class="empty">暂无数据</div>
      </div>

      <div class="expense-detail">
        <div class="section-title">费用明细</div>
        <div class="expense-row" v-if="data.channel.section === '猎头'">
          <span class="expense-label">猎头费</span>
          <span class="expense-value">¥{{ formatCost(data.expense_detail.headhunter_fee) }}</span>
        </div>
        <div class="expense-row">
          <span class="expense-label">{{ data.channel.section === '猎头' ? '其他费用' : '渠道费用' }}</span>
          <span class="expense-value">¥{{ formatCost(data.expense_detail.platform_cost) }}</span>
        </div>
        <div class="expense-row total">
          <span class="expense-label">合计</span>
          <span class="expense-value">¥{{ formatCost(data.expense_detail.total) }}</span>
        </div>

        <div class="expense-items">
          <div class="expense-items-title">逐条记录</div>
          <template v-if="(data.expense_detail as any).items?.length">
            <div v-for="(item, idx) in (data.expense_detail as any).items" :key="idx" class="expense-item-row">
              <span class="expense-item-month">{{ item.month }}</span>
              <span class="expense-item-amount">¥{{ formatCost(item.amount) }}</span>
              <span class="expense-item-desc">{{ item.description || '' }}</span>
            </div>
          </template>
          <div v-else class="empty">暂无明细</div>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { ChannelDrilldownData } from '@/api/analytics'
import FunnelChart from './FunnelChart.vue'
import EndReasons from './EndReasons.vue'

const props = defineProps<{ data: ChannelDrilldownData | null }>()
defineEmits<{
  (e: 'back'): void
  (e: 'navigate-job', jobId: number): void
}>()

const maxJob = computed(() =>
  Math.max(...(props.data?.job_distribution.map(j => j.count) || [1]), 1)
)

const showContractMeta = computed(() => {
  if (!props.data) return false
  return props.data.channel.type === 'headhunter' || props.data.channel.section === '猎头'
})

const contractStatusLabel = computed(() => {
  if (!props.data) return ''
  if (props.data.channel.contract_status) return props.data.channel.contract_status
  return props.data.channel.deleted_at ? '已停用' : '合作中'
})

function jobBarWidth(count: number): string {
  return `${Math.max((count / maxJob.value) * 100, 4)}%`
}

function formatCost(v: number): string {
  if (v >= 10000) return `${(v / 1000).toFixed(0)}k`
  return v.toLocaleString()
}
</script>

<style scoped>
.channel-drilldown {
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

.job-dist {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}

.dist-row {
  display: grid;
  grid-template-columns: 80px 1fr 32px;
  align-items: center;
  gap: var(--space-2);
}

.dist-name {
  font-size: 12px;
  font-weight: 300;
  color: var(--color-text-secondary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.dist-name-link {
  border: none;
  background: transparent;
  padding: 0;
  cursor: pointer;
  text-align: left;
}

.dist-name-link:hover {
  color: var(--color-text-primary);
  text-decoration: underline;
}

.dist-bar-track {
  height: 12px;
  overflow: hidden;
}

.dist-bar {
  height: 100%;
  background: var(--color-material-moss);
  border-radius: 2px;
}

.dist-count {
  font-size: 12px;
  font-family: var(--font-mono);
  text-align: right;
}

.expense-detail {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.expense-row {
  display: flex;
  justify-content: space-between;
  font-size: 13px;
  padding: var(--space-1) 0;
}

.expense-row.total {
  border-top: 1px solid var(--color-line);
  font-weight: 500;
  padding-top: var(--space-2);
}

.expense-label {
  font-weight: 300;
  color: var(--color-text-secondary);
}

.expense-value {
  font-family: var(--font-mono);
  font-weight: 400;
}

.empty {
  font-size: 12px;
  color: var(--color-text-secondary);
}

.expense-items {
  margin-top: var(--space-3);
  padding-top: var(--space-2);
  border-top: 1px solid var(--color-line);
}

.expense-items-title {
  font-size: 11px;
  font-weight: 300;
  color: var(--color-text-tertiary);
  margin-bottom: var(--space-1);
}

.expense-item-row {
  display: flex;
  gap: var(--space-2);
  font-size: 12px;
  padding: 3px 0;
  color: var(--color-text-secondary);
}

.expense-item-month {
  min-width: 56px;
  font-family: var(--font-mono);
}

.expense-item-amount {
  min-width: 56px;
  font-family: var(--font-mono);
  text-align: right;
}

.expense-item-desc {
  flex: 1;
  color: var(--color-text-tertiary);
}
</style>
