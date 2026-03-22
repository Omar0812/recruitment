<template>
  <div class="end-flow">
    <button class="end-flow__trigger" @click="open = !open">
      结束流程 {{ open ? '▴' : '▾' }}
    </button>

    <div v-if="open" class="end-flow__panel">
      <!-- Tab 切换 -->
      <div class="end-flow__tabs">
        <button
          class="end-flow__tab"
          :class="{ 'end-flow__tab--active': tab === 'rejected' }"
          @click="tab = 'rejected'"
        >未通过</button>
        <button
          class="end-flow__tab"
          :class="{ 'end-flow__tab--active': tab === 'withdrawn' }"
          @click="tab = 'withdrawn'"
        >候选人退出</button>
      </div>

      <!-- 原因列表 -->
      <div class="end-flow__reasons">
        <label
          v-for="reason in reasons"
          :key="reason"
          class="end-flow__reason"
        >
          <input type="radio" :value="reason" v-model="selectedReason" />
          <span>{{ reason }}</span>
        </label>
        <label class="end-flow__reason">
          <input type="radio" value="__other__" v-model="selectedReason" />
          <span>其他</span>
        </label>
        <input
          v-if="selectedReason === '__other__'"
          v-model="otherReason"
          type="text"
          class="end-flow__other-input"
          placeholder="请输入原因"
        />
      </div>

      <!-- 备注（选填） -->
      <div class="end-flow__note">
        <label class="end-flow__note-label">备注（选填）</label>
        <textarea
          v-model="endNote"
          class="end-flow__note-input"
          rows="3"
          placeholder="补充说明..."
        ></textarea>
      </div>

      <!-- 确认 -->
      <div class="end-flow__confirm">
        <button class="btn btn--danger" @click="confirm" :disabled="!canConfirm">
          确认结束
        </button>
        <button class="btn btn--ghost" @click="open = false">取消</button>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
export const REJECTED_REASONS = ['简历不匹配', '经验资历不匹配', '技术能力不足', '文化/软素质不合适', '薪资谈不拢', '背调未通过', '岗位关闭']
</script>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { PipelineItem } from '@/api/types'
import { usePipeline } from '@/composables/usePipeline'
import { showToastUndo } from '@/composables/useToastUndo'

const props = defineProps<{
  applicationId: number
  item: PipelineItem
}>()

const { doAction, removeItem, restoreItem, loadPipeline } = usePipeline()

const open = ref(false)
const tab = ref<'rejected' | 'withdrawn'>('rejected')
const selectedReason = ref('')
const otherReason = ref('')
const endNote = ref('')

const WITHDRAWN_REASONS = ['接了其他 offer', '薪资不满意', '对岗位/公司不感兴趣', '个人原因', '失联']

const reasons = computed(() => tab.value === 'rejected' ? REJECTED_REASONS : WITHDRAWN_REASONS)

// 切换 tab 时重置选择
watch(tab, () => {
  selectedReason.value = ''
  otherReason.value = ''
  endNote.value = ''
})

const canConfirm = computed(() => {
  if (!selectedReason.value) return false
  if (selectedReason.value === '__other__' && !otherReason.value.trim()) return false
  return true
})

async function confirm() {
  const reason = selectedReason.value === '__other__'
    ? otherReason.value.trim()
    : selectedReason.value

  const outcome = tab.value // 'rejected' | 'withdrawn'

  try {
    const res = await doAction({
      command_id: crypto.randomUUID(),
      action_code: 'end_application',
      target: { type: 'application', id: props.applicationId },
      payload: { outcome, reason, body: endNote.value.trim() || undefined },
    })

    open.value = false

    // 从列表移除
    const removedItem = { ...props.item }
    removeItem(props.applicationId)

    // Toast + 撤回
    const eventIds = res.event_ids ?? []
    showToastUndo(
      `已结束「${removedItem.candidate.name}」的流程`,
      () => {},
      async () => {
        for (const eid of eventIds) {
          await doAction({
            command_id: crypto.randomUUID(),
            action_code: 'delete_event',
            target: { type: 'application', id: props.applicationId },
            payload: { event_id: eid },
          })
        }
        restoreItem(removedItem)
        await loadPipeline()
      }
    )
  } catch {
    // doAction 已 toast，面板保持打开
  }
}
</script>

<style scoped>
.end-flow {
  margin-top: var(--space-3);
}

.end-flow__trigger {
  font-size: 13px;
  color: var(--color-text-secondary);
  padding: 4px 10px;
  border: 1px solid var(--color-line);
  border-radius: 4px;
  transition: color 150ms;
}

.end-flow__trigger:hover {
  color: var(--color-text-primary);
}

.end-flow__panel {
  margin-top: var(--space-2);
  padding: var(--space-3);
  border: 1px solid var(--color-line);
  border-radius: 4px;
  background: var(--color-bg);
}

.end-flow__tabs {
  display: flex;
  gap: 0;
  border-bottom: 1px solid var(--color-line);
  margin-bottom: var(--space-3);
}

.end-flow__tab {
  padding: var(--space-2) var(--space-3);
  font-size: 13px;
  color: var(--color-text-secondary);
  border-bottom: 2px solid transparent;
  margin-bottom: -1px;
  transition: color 150ms;
}

.end-flow__tab:hover {
  color: var(--color-text-primary);
}

.end-flow__tab--active {
  color: var(--color-text-primary);
  border-bottom-color: var(--color-text-primary);
}

.end-flow__reasons {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  margin-bottom: var(--space-3);
}

.end-flow__reason {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  font-size: 13px;
  cursor: pointer;
}

.end-flow__other-input {
  font: inherit;
  font-size: 13px;
  padding: 4px 8px;
  border: 1px solid var(--color-line);
  border-radius: 4px;
  margin-left: 20px;
}

.end-flow__confirm {
  display: flex;
  gap: var(--space-2);
}

.end-flow__note {
  margin-bottom: var(--space-3);
}

.end-flow__note-label {
  display: block;
  font-size: 12px;
  color: var(--color-text-secondary);
  margin-bottom: var(--space-1);
}

.end-flow__note-input {
  width: 100%;
  font: inherit;
  font-size: 13px;
  padding: var(--space-2);
  border: 1px solid var(--color-line);
  border-radius: 4px;
  resize: vertical;
  line-height: 1.5;
}

</style>
