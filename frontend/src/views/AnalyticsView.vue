<template>
  <div class="analytics-view">
    <div class="page-header">
      <h1 class="page-title">数据分析</h1>
      <TimePicker
        :display-range="displayRange"
        :preset="state.preset"
        :start="state.start"
        :end="state.end"
        :can-shift-forward="canShiftForward"
        @update:preset="setPreset"
        @update:custom-range="setCustomRange($event.start, $event.end)"
        @shift="shift"
      />
    </div>

    <TabBar :model-value="state.activeTab" @update:model-value="setTab" />

    <div class="tab-content">
      <div v-if="state.loading" class="loading">加载中...</div>
      <div v-else-if="state.error" class="error">{{ state.error }}</div>

      <template v-else>
        <OverviewTab
          v-if="state.activeTab === 'overview'"
          :data="state.overview"
          :granularity="state.granularity"
          :available-granularities="availableGranularities"
          :start="state.start"
          :end="state.end"
          @update:granularity="setGranularity"
        />

        <JobsTab
          v-else-if="state.activeTab === 'jobs'"
          :jobs-list="state.jobsList"
          :job-drilldown="state.jobDrilldown"
          :selected-job-id="state.selectedJobId"
          :filter="state.jobsFilter"
          @drilldown="drillIntoJob"
          @navigate-job="goToJob"
          @navigate-channel="goToChannel"
          @back="backFromDrilldown"
          @update:filter="setJobsFilter"
        />

        <ChannelsTab
          v-else-if="state.activeTab === 'channels'"
          :channels-list="state.channelsList"
          :channel-drilldown="state.channelDrilldown"
          :selected-channel-key="state.selectedChannelKey"
          @drilldown="drillIntoChannel"
          @navigate-job="goToJob"
          @navigate-channel="goToChannel"
          @back="backFromDrilldown"
        />
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAnalytics } from '@/composables/useAnalytics'
import TimePicker from '@/components/analytics/TimePicker.vue'
import TabBar from '@/components/analytics/TabBar.vue'
import OverviewTab from '@/components/analytics/OverviewTab.vue'
import JobsTab from '@/components/analytics/JobsTab.vue'
import ChannelsTab from '@/components/analytics/ChannelsTab.vue'

const router = useRouter()

const {
  state,
  displayRange,
  canShiftForward,
  availableGranularities,
  loadCurrentTab,
  setPreset,
  setGranularity,
  shift,
  setTab,
  drillIntoJob,
  drillIntoChannel,
  backFromDrilldown,
  setJobsFilter,
} = useAnalytics()


type ChannelTarget = {
  key?: string
  name?: string
}

function goToJob(jobId: number) {
  void router.push({ path: '/jobs', query: { panel: String(jobId) } })
}

function goToChannel(target: ChannelTarget) {
  const key = target.key ?? ''
  if (key.startsWith('supplier:')) {
    const panelId = key.split(':')[1]
    void router.push({ path: '/channels', query: { panel_type: 'supplier', panel_id: panelId } })
    return
  }
  if (key.startsWith('source_tag:')) {
    const panelId = key.split(':')[1]
    void router.push({ path: '/channels', query: { panel_type: 'source_tag', panel_id: panelId } })
    return
  }
  if (key.startsWith('source:')) {
    void router.push({ path: '/channels', query: { source_name: key.slice(7) } })
    return
  }
  if (target.name) {
    void router.push({ path: '/channels', query: { source_name: target.name } })
    return
  }
  void router.push('/channels')
}

onMounted(() => {
  loadCurrentTab()
})
</script>

<style scoped>
.analytics-view {
  display: flex;
  flex-direction: column;
  padding: var(--space-5);
  gap: var(--space-4);
  max-width: 960px;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.page-title {
  font-size: 24px;
  font-weight: 500;
}

.tab-content {
  padding-top: var(--space-5);
}

.loading {
  text-align: center;
  padding: var(--space-7);
  color: var(--color-text-secondary);
  font-size: 13px;
}

.error {
  text-align: center;
  padding: var(--space-7);
  color: var(--color-urgent);
  font-size: 13px;
}
</style>
