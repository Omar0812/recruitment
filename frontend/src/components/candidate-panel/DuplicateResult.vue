<template>
  <div class="dup-result">
    <div class="dup-result__title">查重结果</div>

    <template v-if="results.length === 0">
      <div class="dup-result__empty">未发现重复记录</div>
    </template>
    <template v-else>
      <div class="dup-result__count">发现 {{ results.length }} 条疑似重复：</div>
      <div v-for="dup in results" :key="dup.id" class="dup-result__item">
        <div class="dup-result__item-header">
          <div class="dup-result__item-name">{{ dup.name }}</div>
          <div class="dup-result__item-id">{{ dup.display_id }}</div>
        </div>
        <div class="dup-result__item-info">
          <span v-if="dup.last_title">{{ dup.last_title }}</span>
          <span v-if="dup.last_company"> · {{ dup.last_company }}</span>
        </div>
        <div class="dup-result__item-history">
          <template v-if="dup.last_application">
            {{ dup.last_application.job_title }}
            <span v-if="dup.last_application.outcome"> · {{ dup.last_application.outcome }}</span>
          </template>
          <template v-else>无流程记录</template>
        </div>
        <div class="dup-result__item-match">匹配原因：{{ dup.match_reasons.join(' / ') }}</div>
        <div v-if="dup.phone || dup.email" class="dup-result__item-contact">
          <span v-if="dup.phone">手机: {{ dup.phone }}</span>
          <span v-if="dup.email"> 邮箱: {{ dup.email }}</span>
        </div>
        <div class="dup-result__item-actions">
          <button class="dup-result__merge" @click="$emit('merge', dup.id)">合并</button>
          <button class="dup-result__ignore" @click="$emit('ignore', dup.id)">忽略</button>
        </div>
      </div>
    </template>

    <button class="dup-result__close" @click="$emit('close')">关闭</button>
  </div>
</template>

<script setup lang="ts">
import type { CandidateDuplicatePanelItem } from '@/api/types'

defineProps<{
  results: CandidateDuplicatePanelItem[]
}>()

defineEmits<{
  close: []
  ignore: [candidateId: number]
  merge: [candidateId: number]
}>()
</script>

<style scoped>
.dup-result {
  padding: var(--space-3) var(--space-5);
  border-top: 1px solid var(--color-line);
  background: rgba(26, 26, 24, 0.02);
}

.dup-result__title {
  font-size: 13px;
  font-weight: 500;
  margin-bottom: var(--space-2);
}

.dup-result__empty {
  font-size: 13px;
  color: var(--color-material-moss);
  margin-bottom: var(--space-2);
}

.dup-result__count {
  font-size: 12px;
  color: var(--color-text-secondary);
  margin-bottom: var(--space-2);
}

.dup-result__item {
  padding: var(--space-2) 0;
  border-bottom: 1px solid var(--color-line);
}

.dup-result__item-header {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: var(--space-2);
}

.dup-result__item:last-child {
  border-bottom: none;
}

.dup-result__item-name {
  font-size: 13px;
  font-weight: 500;
}

.dup-result__item-info {
  font-size: 12px;
  color: var(--color-text-secondary);
}

.dup-result__item-history {
  font-size: 12px;
  color: var(--color-text-secondary);
  margin-top: 2px;
}

.dup-result__item-id {
  font-size: 12px;
  color: var(--color-text-tertiary);
  font-family: 'JetBrains Mono', monospace;
}

.dup-result__item-match {
  font-size: 12px;
  color: var(--color-text-secondary);
  margin-top: 2px;
}

.dup-result__item-contact {
  font-size: 12px;
  color: var(--color-text-secondary);
  font-family: 'JetBrains Mono', monospace;
}

.dup-result__item-actions {
  display: flex;
  gap: var(--space-2);
  margin-top: var(--space-2);
}

.dup-result__merge {
  font-size: 12px;
  color: var(--color-text-primary);
  background: none;
  border: 1px solid var(--color-line);
  padding: 2px 8px;
  border-radius: 3px;
  cursor: pointer;
}

.dup-result__merge:hover {
  background: rgba(26, 26, 24, 0.06);
}

.dup-result__ignore {
  font-size: 12px;
  color: var(--color-text-secondary);
  background: none;
  border: none;
  padding: 0;
  cursor: pointer;
}

.dup-result__ignore:hover {
  color: var(--color-text-primary);
}

.dup-result__close {
  margin-top: var(--space-2);
  font-size: 12px;
  background: none;
  border: 1px solid var(--color-line);
  padding: 4px 10px;
  border-radius: 3px;
  cursor: pointer;
}
</style>
