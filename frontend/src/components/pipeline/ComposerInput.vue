<template>
  <div class="composer">
    <div class="composer__row">
      <input
        v-model="text"
        class="composer__input"
        placeholder="记录沟通、写备注..."
        @keydown.enter="send"
      />
      <button
        class="composer__send"
        :disabled="!text.trim()"
        @click="send"
      >发送</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { usePipeline } from '@/composables/usePipeline'

const props = defineProps<{
  applicationId: number
}>()

const { doAction } = usePipeline()
const text = ref('')

async function send() {
  const body = text.value.trim()
  if (!body) return
  try {
    await doAction({
      command_id: crypto.randomUUID(),
      action_code: 'add_note',
      target: { type: 'application', id: props.applicationId },
      payload: { body },
    })
    text.value = ''
  } catch {
    // doAction 已 toast，保留输入内容
  }
}
</script>

<style scoped>
.composer {
  margin-top: var(--space-3);
  border-left: 2px solid var(--color-line);
  padding-left: var(--space-3);
}

.composer__row {
  display: flex;
  gap: var(--space-2);
}

.composer__input {
  flex: 1;
  font: inherit;
  font-size: 13px;
  padding: 6px 10px;
  border: 1px solid var(--color-line);
  border-radius: 4px;
  background: var(--color-bg);
  transition: border-color 150ms;
}

.composer__input:focus {
  outline: none;
  border-color: var(--color-text-secondary);
}

.composer__send {
  font-size: 13px;
  padding: 4px 12px;
  border-radius: 4px;
  border: none;
  background: var(--color-text-primary);
  color: var(--color-bg);
  cursor: pointer;
  white-space: nowrap;
  transition: opacity 150ms;
}

.composer__send:hover { opacity: 0.85; }
.composer__send:disabled { opacity: 0.35; cursor: not-allowed; }
</style>
