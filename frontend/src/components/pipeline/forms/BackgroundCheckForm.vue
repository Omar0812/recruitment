<template>
  <div class="action-form">
    <label class="form-label">背调结果</label>
    <select v-model="result" class="form-input">
      <option value="">请选择</option>
      <option value="pass">通过</option>
      <option value="fail">未通过</option>
    </select>
    <label class="form-label">备注</label>
    <textarea v-model="note" class="form-input" rows="2" placeholder="选填" />
    <div class="form-actions">
      <button class="btn btn--primary" @click="submit" :disabled="!result">确认</button>
      <button class="btn btn--ghost" @click="$emit('done')">取消</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { usePipeline } from '@/composables/usePipeline'

const props = defineProps<{
  applicationId: number
  actionCode: string
}>()

const emit = defineEmits<{ done: [] }>()
const { doAction } = usePipeline()

const result = ref('')
const note = ref('')

async function submit() {
  try {
    await doAction({
      command_id: crypto.randomUUID(),
      action_code: props.actionCode,
      target: { type: 'application', id: props.applicationId },
      payload: { result: result.value, body: note.value || undefined },
    })

    // 背调未通过 → 自动触发 end_application
    if (result.value === 'fail') {
      await doAction({
        command_id: crypto.randomUUID(),
        action_code: 'end_application',
        target: { type: 'application', id: props.applicationId },
        payload: {
          outcome: 'rejected',
          reason: '背景调查未通过',
          body: '背景调查未通过',
        },
      })
    }

    emit('done')
  } catch {
    // doAction 已 toast，表单保持打开
  }
}
</script>

<style scoped>
</style>
