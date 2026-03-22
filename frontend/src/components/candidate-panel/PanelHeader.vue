<template>
  <div class="panel-header">
    <div class="panel-header__info">
      <div class="panel-header__name-row">
        <button
          v-if="returnToJobId"
          class="panel-header__back"
          @click="$emit('back')"
          aria-label="返回岗位"
        >
          ← 返回岗位
        </button>
        <h2 class="panel-header__name">{{ candidate.name }}</h2>
        <span v-if="candidate.blacklisted" class="panel-header__tag panel-header__tag--blacklist">黑名单</span>
        <span v-if="isHired" class="panel-header__tag panel-header__tag--hired">已入职</span>
      </div>
      <div v-if="subtitle" class="panel-header__subtitle">{{ subtitle }}</div>
    </div>
    <button class="panel-header__close" @click="$emit('close')" aria-label="关闭">×</button>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { CandidateDetail, Application } from '@/api/types'

const props = defineProps<{
  candidate: CandidateDetail
  applications: Application[]
  returnToJobId?: number | null
}>()

defineEmits<{
  close: []
  back: []
}>()

const isHired = computed(() =>
  props.applications.some(a => a.state === 'HIRED'),
)

const subtitle = computed(() => {
  const parts: string[] = []
  if (props.candidate.last_title) parts.push(props.candidate.last_title)
  if (props.candidate.years_exp != null) parts.push(`${props.candidate.years_exp}年经验`)
  return parts.join(' · ')
})
</script>

<style scoped>
.panel-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  padding: var(--space-4) var(--space-5);
  border-bottom: 1px solid var(--color-line);
}

.panel-header__name-row {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.panel-header__name {
  font-size: 18px;
  font-weight: 500;
  margin: 0;
  color: var(--color-text-primary);
}

.panel-header__tag {
  font-size: 11px;
  padding: 1px 6px;
  border-radius: 2px;
  font-weight: 500;
}

.panel-header__tag--blacklist {
  background: var(--color-urgent);
  color: #fff;
}

.panel-header__tag--hired {
  background: #E0ECE4;
  color: #2E5438;
}

.panel-header__subtitle {
  font-size: 13px;
  color: var(--color-text-secondary);
  margin-top: 2px;
}

.panel-header__close {
  background: none;
  border: none;
  font-size: 20px;
  color: var(--color-text-secondary);
  cursor: pointer;
  padding: 0 4px;
  line-height: 1;
}

.panel-header__close:hover {
  color: var(--color-text-primary);
}

.panel-header__back {
  background: none;
  border: none;
  font-size: 13px;
  color: var(--color-primary);
  cursor: pointer;
  padding: 0;
  margin-right: 12px;
  transition: opacity 0.2s;
}

.panel-header__back:hover {
  opacity: 0.8;
}
</style>
