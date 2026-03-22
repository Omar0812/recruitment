<template>
  <div class="channels-tab">
    <ChannelDrilldown
      v-if="selectedChannelKey !== null"
      :data="channelDrilldown"
      @back="$emit('back')"
      @navigate-job="$emit('navigate-job', $event)"
    />
    <ChannelList
      v-else
      :data="channelsList"
      @drilldown="$emit('drilldown', $event)"
      @navigate-channel="$emit('navigate-channel', $event)"
    />
  </div>
</template>

<script setup lang="ts">
import type { ChannelsListData, ChannelDrilldownData } from '@/api/analytics'
import ChannelList from './ChannelList.vue'
import ChannelDrilldown from './ChannelDrilldown.vue'

defineProps<{
  channelsList: ChannelsListData | null
  channelDrilldown: ChannelDrilldownData | null
  selectedChannelKey: string | null
}>()

defineEmits<{
  (e: 'drilldown', channelKey: string): void
  (e: 'navigate-job', jobId: number): void
  (e: 'navigate-channel', payload: { key: string; name: string }): void
  (e: 'back'): void
}>()
</script>

<style scoped>
.channels-tab {
  /* pass-through container */
}
</style>
