<template>
  <div class="action-form">
    <label class="form-label">面试时间</label>
    <div class="datetime-half-hour">
      <input v-model="scheduledDate" type="date" class="form-input" />
      <select v-model="scheduledTime" class="form-input">
        <option v-for="t in TIME_HALF_HOUR_OPTIONS" :key="t" :value="t">{{ t }}</option>
      </select>
    </div>
    <label class="form-label">面试官</label>
    <input v-model="interviewer" type="text" class="form-input" placeholder="面试官姓名" />
    <label class="form-label">面试形式</label>
    <input v-model="meetingType" type="text" class="form-input" placeholder="现场/视频/电话" />
    <label class="form-label">备注</label>
    <input v-model="note" type="text" class="form-input" placeholder="选填" />
    <div class="form-actions">
      <button class="btn btn--primary" @click="submit" :disabled="!scheduledDate">确认</button>
      <button class="btn btn--ghost" @click="$emit('done')">取消</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { usePipeline } from '@/composables/usePipeline'
import { TIME_HALF_HOUR_OPTIONS } from '@/utils/constants'

const props = defineProps<{
  applicationId: number
  actionCode: string
}>()

const emit = defineEmits<{ done: [] }>()
const { doAction } = usePipeline()

const scheduledDate = ref('')
const scheduledTime = ref('09:00')
const scheduledAt = computed(() => scheduledDate.value ? `${scheduledDate.value}T${scheduledTime.value}` : '')
const interviewer = ref('')
const meetingType = ref('')
const note = ref('')

async function submit() {
  try {
    await doAction({
      command_id: crypto.randomUUID(),
      action_code: props.actionCode,
      target: { type: 'application', id: props.applicationId },
      payload: {
        scheduled_at: scheduledAt.value,
        interviewer: interviewer.value,
        meeting_type: meetingType.value || undefined,
        body: note.value || undefined,
      },
    })
    emit('done')
  } catch {
    // doAction 已 toast，表单保持打开
  }
}
</script>

<style scoped>
.datetime-half-hour { display: flex; gap: 6px; }
.datetime-half-hour .form-input { flex: 1; }
</style>
