<template>
  <div
    class="briefing-view"
    @dragover.prevent="onDragOver"
    @dragleave="onDragLeave"
    @drop.prevent="onDrop"
  >
    <div v-if="dragOver" class="drop-overlay">
      <p>释放文件以新建候选人</p>
    </div>

    <header class="briefing-header">
      <h1 class="briefing-title">今日简报</h1>
      <span class="briefing-date">{{ formattedDate }}</span>
    </header>

    <div v-if="state.loading && !state.data" class="briefing-loading">加载中…</div>

    <template v-if="state.data">
      <BriefingPulse :pulse="state.data.pulse" @scroll-to="onScrollTo" />
      <div ref="scheduleRef">
        <BriefingSchedule :schedule="state.data.schedule" />
      </div>
      <div ref="todosRef">
        <BriefingTodos :todos="state.data.todos" />
      </div>
      <BriefingFocus :focus="state.data.focus" />
    </template>

    <p v-if="state.error" class="briefing-error">{{ state.error }}</p>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useBriefing } from '@/composables/useBriefing'
import { stashDroppedFiles } from '@/composables/useCandidateCreate'
import { formatDateWithWeekday } from '@/utils/date'
import BriefingPulse from '@/components/briefing/BriefingPulse.vue'
import BriefingSchedule from '@/components/briefing/BriefingSchedule.vue'
import BriefingTodos from '@/components/briefing/BriefingTodos.vue'
import BriefingFocus from '@/components/briefing/BriefingFocus.vue'

const { state, load } = useBriefing()
const router = useRouter()
const dragOver = ref(false)
const scheduleRef = ref<HTMLElement>()
const todosRef = ref<HTMLElement>()

const formattedDate = computed(() => formatDateWithWeekday(new Date()))

onMounted(() => {
  load()
})

function onScrollTo(section: 'schedule' | 'todos') {
  const el = section === 'schedule' ? scheduleRef.value : todosRef.value
  el?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

function onDragOver() {
  dragOver.value = true
}

function onDragLeave() {
  dragOver.value = false
}

function onDrop(e: DragEvent) {
  dragOver.value = false
  const files = e.dataTransfer?.files
  if (files && files.length > 0) {
    stashDroppedFiles(Array.from(files))
    router.push('/candidate/create')
  }
}
</script>

<style scoped>
.briefing-view {
  max-width: 720px;
  margin: 0 auto;
  padding: var(--space-6, 24px) var(--space-4, 16px);
  position: relative;
}

.briefing-header {
  display: flex;
  align-items: baseline;
  gap: var(--space-3, 12px);
  margin-bottom: var(--space-2, 8px);
}

.briefing-title {
  font-size: 24px;
  font-weight: 500;
  color: var(--color-text-primary, #1A1A18);
}

.briefing-date {
  font-size: 13px;
  font-weight: 300;
  color: var(--color-text-secondary, rgba(26,26,24,0.60));
  font-family: 'Inter', sans-serif;
}

.briefing-loading {
  padding: var(--space-8, 32px) 0;
  text-align: center;
  font-size: 13px;
  color: var(--color-text-secondary, rgba(26,26,24,0.60));
}

.briefing-error {
  padding: var(--space-4, 16px);
  color: var(--color-urgent, #C4472A);
  font-size: 13px;
}

.drop-overlay {
  position: absolute;
  inset: 0;
  background: rgba(111, 122, 105, 0.08);
  border: 2px dashed var(--color-material-moss, #6F7A69);
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10;
  pointer-events: none;
}

.drop-overlay p {
  font-size: 15px;
  font-weight: 400;
  color: var(--color-material-moss, #6F7A69);
}
</style>
