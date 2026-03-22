<template>
  <div class="dup-zone">
    <div class="dup-zone__header">
      <span v-if="!hasMatches" class="dup-zone__status">未发现重复记录</span>
      <span v-else class="dup-zone__status dup-zone__status--warn">
        发现 {{ matches.length }} 个可能重复
      </span>
      <button
        class="dup-zone__check-btn"
        :disabled="checking"
        @click="$emit('check')"
      >
        {{ checking ? '查重中...' : '查重' }}
      </button>
    </div>

    <template v-if="hasMatches">
      <div class="dup-zone__list">
        <div v-for="m in matches" :key="m.candidate_id" class="dup-zone__match">
          <div class="dup-zone__match-header">
            <span class="dup-zone__match-name">{{ m.name }}</span>
            <span class="dup-zone__match-id">{{ m.display_id }}</span>
            <span v-if="m.match_level === 'low'" class="dup-zone__match-low">仅姓名相同</span>
          </div>
          <div v-if="m.last_title || m.last_company" class="dup-zone__match-info">
            {{ m.last_title || '' }}<template v-if="m.last_title && m.last_company"> · </template>{{ m.last_company || '' }}
          </div>
          <div v-if="m.last_application" class="dup-zone__match-app">
            上次：{{ m.last_application.job_title }}
            <template v-if="m.last_application.outcome"> · {{ m.last_application.outcome }}</template>
          </div>

          <!-- 阻断：IN_PROGRESS -->
          <template v-if="m.active_link">
            <div class="dup-zone__match-block">
              此候选人正在流程中：{{ m.active_link.job_title }} · {{ m.active_link.stage }}
            </div>
            <div class="dup-zone__match-actions">
              <button class="dup-zone__btn-link" @click="$emit('view-pipeline', m.active_link!.application_id)">
                查看当前流程
              </button>
            </div>
          </template>

          <!-- 阻断：黑名单 -->
          <template v-else-if="m.is_blacklisted">
            <div class="dup-zone__match-block dup-zone__match-block--blacklist">
              此候选人已在黑名单中{{ m.blacklist_reason ? `：${m.blacklist_reason}` : '' }}
            </div>
          </template>

          <!-- 正常匹配 -->
          <template v-else>
            <div class="dup-zone__match-actions">
              <button class="dup-zone__btn-merge" @click="$emit('merge', m.candidate_id)">
                更新到此档案
              </button>
            </div>
          </template>
        </div>
      </div>

      <div class="dup-zone__footer">
        <button class="dup-zone__btn-ignore" @click="$emit('ignore')">
          忽略，新建候选人
        </button>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { DuplicateMatch } from '@/api/types'

const props = defineProps<{
  matches: DuplicateMatch[]
  checking: boolean
}>()

defineEmits<{
  check: []
  merge: [candidateId: number]
  ignore: []
  'view-pipeline': [applicationId: number | undefined]
}>()

const hasMatches = computed(() => props.matches.length > 0)
</script>

<style scoped>
.dup-zone {
  border: 1px solid var(--color-line);
  border-radius: 6px;
  padding: var(--space-3) var(--space-4);
  margin-bottom: var(--space-4);
  background: rgba(26, 26, 24, 0.02);
}

.dup-zone__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.dup-zone__status {
  font-size: 13px;
  color: var(--color-text-secondary);
}

.dup-zone__status--warn {
  font-weight: 500;
  color: var(--color-text-primary);
}

.dup-zone__check-btn {
  font-size: 12px;
  padding: 4px 10px;
  border: 1px solid var(--color-line);
  border-radius: 3px;
  background: none;
  cursor: pointer;
  color: var(--color-text-primary);
}

.dup-zone__check-btn:hover:not(:disabled) {
  background: rgba(26, 26, 24, 0.04);
}

.dup-zone__check-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.dup-zone__list {
  margin-top: var(--space-3);
}

.dup-zone__match {
  padding: var(--space-2) 0;
  border-top: 1px solid var(--color-line);
}

.dup-zone__match:last-child {
  padding-bottom: 0;
}

.dup-zone__match-header {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.dup-zone__match-name {
  font-size: 13px;
  font-weight: 500;
}

.dup-zone__match-id {
  font-size: 12px;
  color: var(--color-text-tertiary);
  font-family: 'JetBrains Mono', monospace;
}

.dup-zone__match-low {
  font-size: 11px;
  color: var(--color-text-tertiary);
  font-style: italic;
}

.dup-zone__match-info {
  font-size: 12px;
  color: var(--color-text-secondary);
  margin-top: 2px;
}

.dup-zone__match-app {
  font-size: 12px;
  color: var(--color-text-secondary);
  margin-top: 2px;
}

.dup-zone__match-block {
  font-size: 12px;
  color: var(--color-urgent);
  margin-top: var(--space-1);
  padding: var(--space-1) var(--space-2);
  background: rgba(196, 71, 42, 0.06);
  border-radius: 3px;
}

.dup-zone__match-block--blacklist {
  color: var(--color-urgent);
}

.dup-zone__match-actions {
  margin-top: var(--space-2);
}

.dup-zone__btn-merge {
  font-size: 12px;
  padding: 3px 10px;
  border: 1px solid var(--color-text-primary);
  border-radius: 3px;
  background: none;
  cursor: pointer;
  color: var(--color-text-primary);
  transition: all 150ms;
}

.dup-zone__btn-merge:hover {
  background: var(--color-text-primary);
  color: var(--color-bg);
}

.dup-zone__btn-link {
  font-size: 12px;
  color: var(--color-text-secondary);
  background: none;
  border: none;
  padding: 0;
  cursor: pointer;
  text-decoration: underline;
}

.dup-zone__btn-link:hover {
  color: var(--color-text-primary);
}

.dup-zone__footer {
  margin-top: var(--space-3);
  padding-top: var(--space-2);
  border-top: 1px solid var(--color-line);
}

.dup-zone__btn-ignore {
  font-size: 12px;
  color: var(--color-text-secondary);
  background: none;
  border: none;
  padding: 0;
  cursor: pointer;
}

.dup-zone__btn-ignore:hover {
  color: var(--color-text-primary);
}
</style>
