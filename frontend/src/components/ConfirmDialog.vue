<template>
  <el-dialog
    v-model="visible"
    :title="title"
    width="400px"
    :close-on-click-modal="false"
    @closed="onClosed"
  >
    <p style="line-height: 1.6; color: #555;">{{ content }}</p>
    <template #footer>
      <el-button @click="visible = false">取消</el-button>
      <el-button :type="confirmType" :loading="loading" @click="handleConfirm">
        {{ confirmText }}
      </el-button>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref } from 'vue'

const props = defineProps({
  title: { type: String, default: '确认操作' },
  content: { type: String, default: '确认要执行此操作吗？' },
  confirmText: { type: String, default: '确认' },
  confirmType: { type: String, default: 'primary' },
  onConfirm: { type: Function, default: null },
})

const emit = defineEmits(['confirmed', 'cancelled'])

const visible = ref(false)
const loading = ref(false)

function open() {
  visible.value = true
}

async function handleConfirm() {
  if (props.onConfirm) {
    loading.value = true
    try {
      await props.onConfirm()
      visible.value = false
      emit('confirmed')
    } finally {
      loading.value = false
    }
  } else {
    visible.value = false
    emit('confirmed')
  }
}

function onClosed() {
  emit('cancelled')
}

defineExpose({ open })
</script>
