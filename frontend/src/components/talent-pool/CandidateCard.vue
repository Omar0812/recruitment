<template>
  <div
    class="candidate-card"
    @click="$emit('select', candidate.id)"
  >
    <div class="candidate-card__body">
      <!-- Line 1: Name + pipeline status -->
      <div class="candidate-card__line1">
        <span class="candidate-card__name">{{ candidate.name }}</span>
        <span
          v-if="candidate.blacklisted"
          class="candidate-card__blacklist-tag"
        >黑名单</span>
        <span class="candidate-card__status">{{ statusText }}</span>
        <span
          v-if="candidate.blacklisted && candidate.blacklist_reason"
          class="candidate-card__blacklist-reason"
        >{{ candidate.blacklist_reason }}</span>
      </div>

      <!-- Line 2: Last title · Last company · Years exp -->
      <div class="candidate-card__line2">
        <template v-if="line2Parts.length">
          {{ line2Parts.join(' · ') }}
        </template>
      </div>

      <!-- Line 3: Skill tags (max 3) -->
      <div class="candidate-card__line3">
        <span
          v-for="tag in displayTags"
          :key="tag"
          class="candidate-card__tag"
        >{{ tag }}</span>
      </div>
    </div>

    <div class="candidate-card__star">
      <StarButton
        :active="!!candidate.starred"
        @toggle="$emit('toggle-star', candidate.id)"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { CandidateWithApplication } from '@/api/types'
import { formatShortDate } from '@/utils/date'
import StarButton from './StarButton.vue'

const props = defineProps<{
  candidate: CandidateWithApplication
}>()

defineEmits<{
  select: [id: number]
  'toggle-star': [id: number]
}>()

const statusText = computed(() => {
  const la = props.candidate.latest_application
  if (!la) return ''

  if (la.state === 'IN_PROGRESS') {
    return `进行中 · ${la.stage ?? ''}`
  }
  if (la.state === 'HIRED') {
    const onboardDate = formatShortDate(la.status_changed_at)
    return `${la.job_title} · ${onboardDate ? `${onboardDate}入职` : '已入职'}`
  }
  if (la.state === 'LEFT') {
    return `上次：${la.job_title} · 已离职`
  }
  // REJECTED / WITHDRAWN
  const reason = la.outcome ?? '已结束'
  return `上次：${la.job_title} · ${la.stage ?? ''} · ${reason}`
})

const line2Parts = computed(() => {
  const parts: string[] = []
  if (props.candidate.last_title) parts.push(props.candidate.last_title)
  if (props.candidate.last_company) parts.push(props.candidate.last_company)
  if (props.candidate.years_exp != null) parts.push(`${props.candidate.years_exp}年`)
  return parts
})

const displayTags = computed(() =>
  (props.candidate.skill_tags ?? []).slice(0, 3),
)
</script>

<style scoped>
.candidate-card {
  display: flex;
  align-items: flex-start;
  padding: 12px 16px;
  border-bottom: 1px solid var(--color-line, rgba(26,26,24,0.12));
  cursor: pointer;
  transition: background 0.15s;
}

.candidate-card:hover {
  background: rgba(26,26,24,0.03);
}

.candidate-card:hover .star-button {
  opacity: 1;
}

.candidate-card__body {
  flex: 1;
  min-width: 0;
}

.candidate-card__line1 {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  line-height: 20px;
}

.candidate-card__name {
  font-weight: 500;
  color: var(--color-text-primary, #1A1A18);
  white-space: nowrap;
}

.candidate-card__blacklist-tag {
  font-size: 11px;
  padding: 1px 6px;
  border-radius: 3px;
  background: var(--color-urgent, #C4472A);
  color: #fff;
  white-space: nowrap;
  line-height: 16px;
}

.candidate-card__status {
  color: var(--color-text-secondary, rgba(26,26,24,0.60));
  font-size: 13px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin-left: auto;
}

.candidate-card__blacklist-reason {
  color: var(--color-urgent, #C4472A);
  font-size: 12px;
  margin-left: auto;
  white-space: nowrap;
}

.candidate-card__line2 {
  font-size: 13px;
  color: var(--color-text-secondary, rgba(26,26,24,0.60));
  margin-top: 2px;
  line-height: 18px;
}

.candidate-card__line3 {
  display: flex;
  gap: 6px;
  margin-top: 4px;
}

.candidate-card__tag {
  font-size: 12px;
  padding: 1px 8px;
  border-radius: 3px;
  background: rgba(26,26,24,0.06);
  color: var(--color-text-secondary, rgba(26,26,24,0.60));
  line-height: 18px;
}

.candidate-card__star {
  flex-shrink: 0;
  margin-left: 8px;
  padding-top: 2px;
}
</style>
