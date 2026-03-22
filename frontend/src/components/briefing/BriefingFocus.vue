<template>
  <section class="briefing-section">
    <h2 class="section-title">👁 关注</h2>

    <template v-if="focus.length">
      <div
        v-for="(item, idx) in focus"
        :key="idx"
        class="focus-row"
        @click="navigateTo(item)"
      >
        <template v-if="item.entity === 'job'">
          <span class="focus-name">{{ item.job_title }}</span>
          <span v-if="item.department" class="focus-detail">{{ item.department }}</span>
          <span
            v-if="item.priority === 'high'"
            class="focus-priority"
          >高优</span>
          <span
            v-else-if="item.priority === 'low'"
            class="focus-priority focus-priority--low"
          >低优</span>
          <span
            v-if="item.headcount && item.headcount > 0"
            class="focus-detail"
          >{{ item.hired_count ?? 0 }}/{{ item.headcount }} 到岗</span>
        </template>
        <template v-else>
          <span class="focus-name">{{ item.candidate_name }}</span>
          <span class="focus-detail">{{ item.stage }}</span>
          <span class="focus-detail">· {{ item.job_title }}</span>
        </template>
        <span class="focus-signals">
          <span v-for="(signal, si) in item.signals" :key="si" class="focus-signal">
            {{ signal }}
          </span>
        </span>
        <span class="focus-action">查看 →</span>
      </div>
    </template>

    <p v-else class="section-empty">一切正常</p>
  </section>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'
import type { FocusItem } from '@/api/briefing'

defineProps<{
  focus: FocusItem[]
}>()

const router = useRouter()

function navigateTo(item: FocusItem) {
  if (item.entity === 'job') {
    router.push({ path: '/jobs', query: { panel: String(item.job_id) } })
  } else if (item.application_id) {
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

.focus-row {
  display: flex;
  align-items: center;
  gap: var(--space-2, 8px);
  padding: var(--space-2, 8px) 0;
  cursor: pointer;
  border-bottom: 1px solid var(--color-line, rgba(26,26,24,0.12));
}

.focus-row:hover {
  background: rgba(26, 26, 24, 0.03);
}

.focus-name {
  font-size: 15px;
  font-weight: 400;
  color: var(--color-text-primary, #1A1A18);
}

.focus-detail {
  font-size: 13px;
  font-weight: 300;
  color: var(--color-text-secondary, rgba(26,26,24,0.60));
}

.focus-priority {
  font-size: 12px;
  font-weight: 400;
  color: var(--color-urgent, #C4472A);
}

.focus-priority--low {
  color: var(--color-text-secondary, rgba(26,26,24,0.40));
}

.focus-signals {
  display: flex;
  gap: var(--space-2, 8px);
  margin-left: auto;
}

.focus-signal {
  font-size: 12px;
  font-weight: 400;
  color: var(--color-material-clay, #9A7E66);
}

.focus-action {
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
