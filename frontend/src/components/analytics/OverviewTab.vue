<template>
  <div class="overview-tab" v-if="data">
    <!-- 第一区：数字卡片 -->
    <section class="zone">
      <StatCards :cards="data.cards" />
    </section>

    <!-- 第二区：趋势柱状图 -->
    <section class="zone">
      <TrendChart
        :trend="data.trend"
        :start="start"
        :end="end"
        :granularity="granularity"
        :available-granularities="availableGranularities"
        @update:granularity="emit('update:granularity', $event)"
      />
    </section>

    <!-- 第三区：漏斗 × 结束原因 -->
    <section class="zone zone-split">
      <FunnelChart
        :funnel="data.funnel"
        :cohort-size="data.funnel_cohort_size"
        title="本期新流程转化"
      />
      <EndReasons :end-reasons="data.end_reasons" />
    </section>
  </div>
</template>

<script setup lang="ts">
import type { OverviewData } from '@/api/analytics'
import type { Granularity } from '@/composables/useAnalytics'
import StatCards from './StatCards.vue'
import TrendChart from './TrendChart.vue'
import FunnelChart from './FunnelChart.vue'
import EndReasons from './EndReasons.vue'

defineProps<{
  data: OverviewData | null
  granularity: Granularity
  availableGranularities: Granularity[]
  start: string
  end: string
}>()

const emit = defineEmits<{
  (e: 'update:granularity', g: Granularity): void
}>()
</script>

<style scoped>
.overview-tab {
  display: flex;
  flex-direction: column;
  gap: var(--space-7);
}

.zone {
  /* 留白呼吸 */
}

.zone-split {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-5);
}
</style>
