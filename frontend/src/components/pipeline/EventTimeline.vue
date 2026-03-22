<template>
  <div class="event-timeline">
    <div v-if="events.length === 0" class="event-timeline__empty">暂无记录</div>
    <EventCard
      v-for="(event, index) in events"
      :key="event.id"
      :event="event"
      :events="events"
      :is-first="index === 0"
      :is-last="index === events.length - 1"
      :application-id="applicationId"
    />
  </div>
</template>

<script setup lang="ts">
import type { EventRecord } from '@/api/types'
import EventCard from './EventCard.vue'

defineProps<{
  events: EventRecord[]
  applicationId: number
}>()
</script>

<style scoped>
.event-timeline {
  display: flex;
  flex-direction: column;
  gap: 0;
}

.event-timeline__empty {
  color: var(--color-text-secondary);
  font-size: 13px;
  padding: var(--space-3) 0;
}
</style>
