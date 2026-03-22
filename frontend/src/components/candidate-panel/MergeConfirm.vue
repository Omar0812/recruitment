<template>
  <div class="merge-confirm">
    <div class="merge-confirm__title">合并候选人</div>

    <!-- 守卫阻断 -->
    <div v-if="guardError" class="merge-confirm__guard">
      <p class="merge-confirm__guard-text">{{ guardError }}</p>
      <button class="merge-confirm__btn-cancel" @click="$emit('cancel')">返回</button>
    </div>

    <template v-else>
      <!-- 双方摘要 -->
      <div class="merge-confirm__cards">
        <div
          class="merge-confirm__card"
          :class="{ 'merge-confirm__card--primary': targetId === current.id }"
          @click="targetId = current.id"
        >
          <div class="merge-confirm__card-badge" v-if="targetId === current.id">主档案</div>
          <div class="merge-confirm__card-badge merge-confirm__card-badge--secondary" v-else>被吸收</div>
          <div class="merge-confirm__card-name">{{ current.name }}</div>
          <div class="merge-confirm__card-meta">
            <span v-if="current.source">来源: {{ current.source }}</span>
            <span v-if="current.phone">手机: {{ current.phone }}</span>
            <span v-if="current.email">邮箱: {{ current.email }}</span>
          </div>
          <div class="merge-confirm__card-stats">
            简历 {{ current.attachments_count }} 份 · 流程 {{ current.applications_count }} 条
          </div>
        </div>

        <div class="merge-confirm__arrow" @click="swapDirection">
          <span class="merge-confirm__arrow-icon">⇄</span>
          <span class="merge-confirm__arrow-label">切换方向</span>
        </div>

        <div
          class="merge-confirm__card"
          :class="{ 'merge-confirm__card--primary': targetId === other.id }"
          @click="targetId = other.id"
        >
          <div class="merge-confirm__card-badge" v-if="targetId === other.id">主档案</div>
          <div class="merge-confirm__card-badge merge-confirm__card-badge--secondary" v-else>被吸收</div>
          <div class="merge-confirm__card-name">{{ other.name }}</div>
          <div class="merge-confirm__card-meta">
            <span v-if="other.source">来源: {{ other.source }}</span>
            <span v-if="other.phone">手机: {{ other.phone }}</span>
            <span v-if="other.email">邮箱: {{ other.email }}</span>
          </div>
          <div class="merge-confirm__card-stats">
            简历 {{ other.attachments_count }} 份 · 流程 {{ other.applications_count }} 条
          </div>
        </div>
      </div>

      <!-- 合并效果预览 -->
      <div class="merge-confirm__preview">
        <div class="merge-confirm__preview-title">合并效果</div>
        <ul class="merge-confirm__preview-list">
          <li>将 {{ sourceSummary.name }} 的 {{ sourceSummary.applications_count }} 条流程记录转移到主档案</li>
          <li>将 {{ sourceSummary.attachments_count }} 份简历/附件追加到主档案</li>
          <li>主档案空字段从被吸收方补充</li>
          <li>被吸收方标记为"已合并"，不再出现在人才库</li>
        </ul>
      </div>

      <!-- 操作 -->
      <div class="merge-confirm__actions">
        <button class="merge-confirm__btn-cancel" @click="$emit('cancel')">取消</button>
        <button
          class="merge-confirm__btn-confirm"
          :disabled="merging"
          @click="$emit('confirm', targetId, sourceId)"
        >
          {{ merging ? '合并中...' : '确认合并' }}
        </button>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

interface CandidateSummary {
  id: number
  name: string
  source: string | null
  phone: string | null
  email: string | null
  attachments_count: number
  applications_count: number
  is_blacklisted: boolean
  active_link: { application_id: number; job_id: number; job_title: string; stage: string } | null
}

const props = defineProps<{
  current: CandidateSummary
  other: CandidateSummary
  merging: boolean
}>()

defineEmits<{
  confirm: [targetId: number, sourceId: number]
  cancel: []
}>()

// 默认当前面板候选人为主档案
const targetId = ref(props.current.id)

const sourceId = computed(() =>
  targetId.value === props.current.id ? props.other.id : props.current.id,
)

const sourceSummary = computed(() =>
  targetId.value === props.current.id ? props.other : props.current,
)

// 守卫检查
const guardError = computed(() => {
  if (props.current.active_link && props.other.active_link) {
    return '请先结束其中一个流程再合并'
  }
  if (props.current.is_blacklisted || props.other.is_blacklisted) {
    return '请先处理黑名单状态再合并'
  }
  return null
})

function swapDirection() {
  targetId.value = targetId.value === props.current.id ? props.other.id : props.current.id
}
</script>

<style scoped>
.merge-confirm {
  padding: var(--space-4) var(--space-5);
  border-top: 1px solid var(--color-line);
  background: rgba(26, 26, 24, 0.02);
}

.merge-confirm__title {
  font-size: 14px;
  font-weight: 500;
  margin-bottom: var(--space-3);
}

.merge-confirm__guard {
  padding: var(--space-3);
  background: rgba(196, 71, 42, 0.06);
  border-radius: 6px;
}

.merge-confirm__guard-text {
  font-size: 13px;
  color: var(--color-urgent);
  margin: 0 0 var(--space-2);
}

.merge-confirm__cards {
  display: flex;
  align-items: stretch;
  gap: var(--space-2);
  margin-bottom: var(--space-3);
}

.merge-confirm__card {
  flex: 1;
  padding: var(--space-3);
  border: 1px solid var(--color-line);
  border-radius: 6px;
  cursor: pointer;
  transition: border-color 150ms;
}

.merge-confirm__card:hover {
  border-color: var(--color-text-secondary);
}

.merge-confirm__card--primary {
  border-color: var(--color-text-primary);
  background: rgba(26, 26, 24, 0.03);
}

.merge-confirm__card-badge {
  font-size: 11px;
  font-weight: 500;
  color: var(--color-text-primary);
  margin-bottom: var(--space-1);
}

.merge-confirm__card-badge--secondary {
  color: var(--color-text-tertiary);
}

.merge-confirm__card-name {
  font-size: 14px;
  font-weight: 500;
  margin-bottom: var(--space-1);
}

.merge-confirm__card-meta {
  font-size: 12px;
  color: var(--color-text-secondary);
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.merge-confirm__card-stats {
  font-size: 12px;
  color: var(--color-text-tertiary);
  margin-top: var(--space-2);
}

.merge-confirm__arrow {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  cursor: pointer;
  flex-shrink: 0;
  padding: 0 var(--space-1);
}

.merge-confirm__arrow-icon {
  font-size: 18px;
  color: var(--color-text-secondary);
}

.merge-confirm__arrow-label {
  font-size: 10px;
  color: var(--color-text-tertiary);
  white-space: nowrap;
}

.merge-confirm__arrow:hover .merge-confirm__arrow-icon {
  color: var(--color-text-primary);
}

.merge-confirm__preview {
  padding: var(--space-3);
  background: rgba(26, 26, 24, 0.03);
  border-radius: 6px;
  margin-bottom: var(--space-3);
}

.merge-confirm__preview-title {
  font-size: 12px;
  font-weight: 500;
  margin-bottom: var(--space-2);
}

.merge-confirm__preview-list {
  margin: 0;
  padding-left: 18px;
  font-size: 12px;
  color: var(--color-text-secondary);
  line-height: 1.6;
}

.merge-confirm__actions {
  display: flex;
  justify-content: flex-end;
  gap: var(--space-2);
}

.merge-confirm__btn-cancel {
  font-size: 13px;
  padding: 6px 12px;
  border: 1px solid var(--color-line);
  background: none;
  border-radius: 3px;
  cursor: pointer;
  color: var(--color-text-primary);
}

.merge-confirm__btn-confirm {
  font-size: 13px;
  padding: 6px 14px;
  background: var(--color-text-primary);
  color: var(--color-bg);
  border: none;
  border-radius: 3px;
  cursor: pointer;
  transition: opacity 150ms;
}

.merge-confirm__btn-confirm:hover {
  opacity: 0.85;
}

.merge-confirm__btn-confirm:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
