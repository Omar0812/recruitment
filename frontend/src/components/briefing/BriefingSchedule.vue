<template>
  <section class="briefing-section">
    <h2 class="section-title">📅 日程</h2>

    <template v-if="hasItems">
      <div
        v-for="item in schedule.today"
        :key="`t-${item.application_id}-${item.scheduled_at || item.onboard_date}`"
        class="schedule-item"
        @click="navigateTo(item)"
      >
        <span v-if="item.type === 'interview'" class="schedule-time">
          {{ formatTime(item.scheduled_at!) }}
        </span>
        <span v-else class="schedule-time schedule-time--onboard">{{ onboardLabel('today') }}</span>

        <span class="schedule-name">{{ item.candidate_name }}</span>
        <template v-if="item.type === 'interview'">
          <span class="schedule-detail">{{ roundLabel(item.interview_round) }}</span>
          <span class="schedule-dot">·</span>
          <span class="schedule-detail">{{ item.job_title }}</span>
          <template v-if="item.meeting_type">
            <span class="schedule-dot">·</span>
            <span class="schedule-detail">{{ item.meeting_type }}</span>
          </template>
          <template v-if="item.interviewer">
            <span class="schedule-dot">·</span>
            <span class="schedule-detail">{{ item.interviewer }}</span>
          </template>
        </template>
        <template v-else>
          <span class="schedule-detail">{{ item.job_title }}</span>
          <template v-if="onboardNote(item)">
            <span class="schedule-dot">·</span>
            <span class="schedule-detail">{{ onboardNote(item) }}</span>
          </template>
        </template>
      </div>

      <div v-if="schedule.tomorrow.length" class="schedule-divider">── 明天 ──</div>

      <div
        v-for="item in schedule.tomorrow"
        :key="`m-${item.application_id}-${item.scheduled_at || item.onboard_date}`"
        class="schedule-item"
        @click="navigateTo(item)"
      >
        <span v-if="item.type === 'interview'" class="schedule-time">
          {{ formatTime(item.scheduled_at!) }}
        </span>
        <span v-else class="schedule-time schedule-time--onboard">{{ onboardLabel('tomorrow') }}</span>

        <span class="schedule-name">{{ item.candidate_name }}</span>
        <template v-if="item.type === 'interview'">
          <span class="schedule-detail">{{ roundLabel(item.interview_round) }}</span>
          <span class="schedule-dot">·</span>
          <span class="schedule-detail">{{ item.job_title }}</span>
          <template v-if="item.meeting_type">
            <span class="schedule-dot">·</span>
            <span class="schedule-detail">{{ item.meeting_type }}</span>
          </template>
        </template>
        <template v-else>
          <span class="schedule-detail">{{ item.job_title }}</span>
          <template v-if="onboardNote(item)">
            <span class="schedule-dot">·</span>
            <span class="schedule-detail">{{ onboardNote(item) }}</span>
          </template>
        </template>
      </div>
    </template>

    <p v-else class="section-empty">今明两日暂无日程安排</p>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import type { BriefingSchedule, ScheduleItem } from '@/api/briefing'
import { formatTime } from '@/utils/date'

const props = defineProps<{
  schedule: BriefingSchedule
}>()

const router = useRouter()

const hasItems = computed(
  () => props.schedule.today.length > 0 || props.schedule.tomorrow.length > 0,
)

const ROUND_LABELS: Record<number, string> = { 1: '一面', 2: '二面', 3: '三面', 4: '四面', 5: '五面' }
function roundLabel(round?: number) {
  if (!round) return ''
  return ROUND_LABELS[round] ?? `${round}面`
}

function onboardLabel(section: 'today' | 'tomorrow') {
  return section === 'today' ? '今日入职' : '入职'
}

function onboardNote(item: ScheduleItem) {
  const note = item.meeting_type?.trim()
  return note ? note : ''
}

function navigateTo(item: ScheduleItem) {
  router.push({ path: '/pipeline', query: { expand: String(item.application_id) } })
}
</script>

<style scoped>
.briefing-section {
  padding: var(--space-4, 16px) 0;
}

.section-title {
  font-size: 15px;
  font-weight: 500;
  margin-bottom: var(--space-3, 12px);
  color: var(--color-text-primary, #1A1A18);
}

.schedule-item {
  display: flex;
  align-items: center;
  gap: var(--space-2, 8px);
  padding: var(--space-2, 8px) 0;
  cursor: pointer;
  border-bottom: 1px solid var(--color-line, rgba(26,26,24,0.12));
}

.schedule-item:hover {
  background: rgba(26, 26, 24, 0.03);
}

.schedule-time {
  font-family: 'Inter', sans-serif;
  font-size: 13px;
  font-weight: 400;
  color: var(--color-text-primary, #1A1A18);
  min-width: 40px;
}

.schedule-time--onboard {
  color: var(--color-material-moss, #6F7A69);
}

.schedule-name {
  font-size: 15px;
  font-weight: 400;
  color: var(--color-text-primary, #1A1A18);
}

.schedule-detail {
  font-size: 13px;
  font-weight: 300;
  color: var(--color-text-secondary, rgba(26,26,24,0.60));
}

.schedule-dot {
  color: var(--color-text-secondary, rgba(26,26,24,0.60));
  font-size: 13px;
}

.schedule-divider {
  padding: var(--space-2, 8px) 0;
  font-size: 12px;
  font-weight: 300;
  color: var(--color-text-secondary, rgba(26,26,24,0.60));
  text-align: center;
}

.section-empty {
  font-size: 13px;
  font-weight: 300;
  color: var(--color-text-secondary, rgba(26,26,24,0.60));
  padding: var(--space-2, 8px) 0;
}
</style>
