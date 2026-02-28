<template>
  <div class="activity-card" :class="`activity-card--${activity.type}`">
    <div class="ac-header">
      <span class="ac-type-badge" :style="typeBadgeStyle">{{ typeLabel }}</span>
      <span v-if="roundLabel" class="ac-round">{{ roundLabel }}</span>
      <span class="ac-date">{{ formatDate(activity.created_at) }}</span>
      <span v-if="activity.actor" class="ac-actor">· {{ activity.actor }}</span>
    </div>

    <!-- Interview -->
    <template v-if="activity.type === 'interview'">
      <div v-if="p.scheduled_at || activity.scheduled_at" class="ac-meta">
        <el-icon><Calendar /></el-icon>
        {{ formatDate(p.scheduled_at || activity.scheduled_at) }}
        <template v-if="p.location || activity.location">
          · {{ p.location || activity.location }}
        </template>
      </div>
      <div v-if="p.interview_time || activity.interview_time" class="ac-meta">
        <el-icon><Clock /></el-icon> {{ p.interview_time || activity.interview_time }}
      </div>
      <div v-if="statusLabel" class="ac-status" :class="`ac-status--${p.status || activity.status}`">
        {{ statusLabel }}
      </div>
      <div v-if="p.conclusion || activity.conclusion" class="ac-conclusion">
        结论：{{ p.conclusion || activity.conclusion }}
        <span v-if="p.score || activity.score">
          · {{ '★'.repeat(p.score || activity.score) }}
        </span>
      </div>
    </template>

    <!-- Offer -->
    <template v-if="activity.type === 'offer'">
      <div v-if="p.monthly_salary || activity.salary" class="ac-meta">
        月薪：{{ p.monthly_salary || activity.salary }}
      </div>
      <div v-if="p.start_date || activity.start_date" class="ac-meta">
        入职日期：{{ p.start_date || activity.start_date }}
      </div>
      <div v-if="p.conclusion || activity.conclusion" class="ac-conclusion">
        结论：{{ p.conclusion || activity.conclusion }}
      </div>
    </template>

    <!-- Onboard -->
    <template v-if="activity.type === 'onboard'">
      <div v-if="p.start_date || activity.start_date" class="ac-meta">
        入职日期：{{ p.start_date || activity.start_date }}
      </div>
      <div v-if="p.salary || activity.salary" class="ac-meta">
        薪资：{{ p.salary || activity.salary }}
      </div>
    </template>

    <!-- Background check -->
    <template v-if="activity.type === 'background_check'">
      <div v-if="p.conclusion || activity.conclusion" class="ac-conclusion">
        结论：{{ p.conclusion || activity.conclusion }}
      </div>
    </template>

    <!-- Note / comment -->
    <div v-if="p.comment || activity.comment" class="ac-comment">
      {{ p.comment || activity.comment }}
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  activity: { type: Object, required: true },
})

const a = computed(() => props.activity)
const p = computed(() => a.value.payload || {})

const TYPE_LABELS = {
  resume_review: '简历筛选',
  interview: '面试',
  phone_screen: '电话初筛',
  note: '备注',
  offer: 'Offer',
  stage_change: '阶段变更',
  onboard: '入职确认',
  background_check: '背调',
}

const TYPE_COLORS = {
  resume_review: '#722ed1',
  interview: '#1677ff',
  phone_screen: '#13c2c2',
  note: '#8c8c8c',
  offer: '#d4380d',
  onboard: '#52c41a',
  background_check: '#fa8c16',
}

const typeLabel = computed(() => TYPE_LABELS[a.value.type] || a.value.type)

const typeBadgeStyle = computed(() => ({
  background: (TYPE_COLORS[a.value.type] || '#666') + '18',
  color: TYPE_COLORS[a.value.type] || '#666',
}))

const roundLabel = computed(() => {
  if (a.value.type === 'interview') return p.value.round || a.value.round || null
  return null
})

const STATUS_LABELS = { scheduled: '待面试', completed: '已完成', cancelled: '已取消' }
const statusLabel = computed(() => {
  const s = p.value.status || a.value.status
  return s ? STATUS_LABELS[s] || s : null
})

function formatDate(dt) {
  if (!dt) return ''
  return new Date(dt).toLocaleString('zh-CN', {
    month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit',
  })
}
</script>

<style scoped>
.activity-card {
  background: #fafafa;
  border: 1px solid #eee;
  border-radius: 8px;
  padding: 12px 14px;
  margin-bottom: 8px;
}

.ac-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 6px;
  flex-wrap: wrap;
}

.ac-type-badge {
  font-size: 11px;
  font-weight: 600;
  padding: 2px 8px;
  border-radius: 4px;
}

.ac-round {
  font-size: 12px;
  color: #666;
}

.ac-date, .ac-actor {
  font-size: 12px;
  color: #999;
  margin-left: auto;
}

.ac-actor { margin-left: 0; }

.ac-meta {
  font-size: 13px;
  color: #555;
  margin-top: 4px;
  display: flex;
  align-items: center;
  gap: 4px;
}

.ac-status {
  display: inline-block;
  font-size: 12px;
  padding: 1px 8px;
  border-radius: 4px;
  margin-top: 4px;
}

.ac-status--scheduled { background: #e6f4ff; color: #1677ff; }
.ac-status--completed { background: #f6ffed; color: #52c41a; }
.ac-status--cancelled { background: #fff7e6; color: #fa8c16; }

.ac-conclusion {
  font-size: 13px;
  color: #333;
  margin-top: 6px;
  font-weight: 500;
}

.ac-comment {
  font-size: 13px;
  color: #666;
  margin-top: 6px;
  line-height: 1.5;
}
</style>
