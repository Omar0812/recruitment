<template>
  <section class="briefing-section">
    <h2 class="section-title">📋 待办</h2>

    <template v-if="todos.length">
      <div v-for="group in todos" :key="group.type" class="todo-group">
        <!-- 待分配 / 待筛选：聚合行 -->
        <template v-if="group.type === 'unassigned' || group.type === 'screening'">
          <div class="todo-row todo-row--aggregate" @click="navigateGroup(group)">
            <span class="todo-label">{{ group.label }}</span>
            <span class="todo-count">{{ group.items.length }} 份</span>
            <span class="todo-action">去处理 →</span>
          </div>
        </template>

        <!-- 其他类型：逐条展示 -->
        <template v-else>
          <div class="todo-group-header">{{ group.label }}</div>
          <div
            v-for="item in group.items"
            :key="item.application_id"
            class="todo-row"
            @click="navigateItem(item)"
          >
            <span class="todo-name">{{ item.candidate_name }}</span>
            <span v-if="item.job_title" class="todo-detail">{{ item.job_title }}</span>
            <span v-if="item.interview_round" class="todo-detail">
              · {{ roundLabel(item.interview_round) }}
            </span>
            <span
              v-if="item.job_priority === 'high'"
              class="todo-priority"
            >高优</span>
            <span
              v-else-if="item.job_priority === 'low'"
              class="todo-priority todo-priority--low"
            >低优</span>
            <span class="todo-time">{{ item.time_label }}</span>
            <span class="todo-action">去处理 →</span>
          </div>
        </template>
      </div>
    </template>

    <p v-else class="section-empty">全部处理完毕 ✓</p>
  </section>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'
import type { TodoGroup, TodoItem } from '@/api/briefing'

defineProps<{
  todos: TodoGroup[]
}>()

const router = useRouter()

const ROUND_LABELS: Record<number, string> = { 1: '一面', 2: '二面', 3: '三面', 4: '四面', 5: '五面' }
function roundLabel(round?: number) {
  if (!round) return ''
  return ROUND_LABELS[round] ?? `${round}面`
}

function navigateGroup(group: TodoGroup) {
  switch (group.type) {
    case 'unassigned':
      router.push({ path: '/talent-pool', query: { pipeline_status: 'none' } })
      return
    case 'screening':
      router.push('/pipeline')
      return
    default:
      return
  }
}

function navigateItem(item: TodoItem) {
  if (item.application_id) {
    router.push({ path: '/pipeline', query: { expand: String(item.application_id) } })
  }
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

.todo-group {
  margin-bottom: var(--space-2, 8px);
}

.todo-group-header {
  font-size: 13px;
  font-weight: 400;
  color: var(--color-text-secondary, rgba(26,26,24,0.60));
  padding: var(--space-1, 4px) 0;
}

.todo-row {
  display: flex;
  align-items: center;
  gap: var(--space-2, 8px);
  padding: var(--space-2, 8px) 0;
  cursor: pointer;
  border-bottom: 1px solid var(--color-line, rgba(26,26,24,0.12));
}

.todo-row:hover {
  background: rgba(26, 26, 24, 0.03);
}

.todo-row--aggregate .todo-label {
  font-size: 15px;
  font-weight: 400;
  color: var(--color-text-primary, #1A1A18);
}

.todo-count {
  font-family: 'Inter', sans-serif;
  font-size: 13px;
  font-weight: 400;
  color: var(--color-text-primary, #1A1A18);
}

.todo-name {
  font-size: 15px;
  font-weight: 400;
  color: var(--color-text-primary, #1A1A18);
}

.todo-detail {
  font-size: 13px;
  font-weight: 300;
  color: var(--color-text-secondary, rgba(26,26,24,0.60));
}

.todo-priority {
  font-size: 12px;
  font-weight: 400;
  color: var(--color-urgent, #C4472A);
}

.todo-priority--low {
  color: var(--color-text-secondary, rgba(26,26,24,0.40));
}

.todo-time {
  font-size: 12px;
  font-weight: 300;
  color: var(--color-text-secondary, rgba(26,26,24,0.60));
  margin-left: auto;
}

.todo-action {
  font-size: 12px;
  font-weight: 300;
  color: var(--color-text-secondary, rgba(26,26,24,0.60));
  flex-shrink: 0;
}

.section-empty {
  font-size: 13px;
  font-weight: 300;
  color: var(--color-material-moss, #6F7A69);
  padding: var(--space-2, 8px) 0;
}
</style>
