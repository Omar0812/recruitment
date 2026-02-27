<template>
  <div class="tail-node">
    <!-- State A: Interview upcoming -->
    <template v-if="state === 'INTERVIEW_UPCOMING'">
      <ActivityCard :activity="tail" />
      <el-button size="small" style="margin-top: 8px" @click="cancelInterview">取消面试</el-button>
    </template>

    <!-- State B: Interview past due — show fill-in form -->
    <template v-else-if="state === 'INTERVIEW_PAST_DUE'">
      <div class="feedback-prompt">
        <el-tag type="warning" size="small">面试时间已过，请填写面评</el-tag>
      </div>
      <el-form :model="ivForm" label-width="72px" size="small" style="margin-top: 10px">
        <el-form-item label="结论">
          <el-select v-model="ivForm.conclusion" placeholder="请选择" style="width: 100%">
            <el-option label="通过" value="通过" />
            <el-option label="待定" value="待定" />
            <el-option label="淘汰" value="淘汰" />
          </el-select>
        </el-form-item>
        <el-form-item v-if="ivForm.conclusion" label="评分">
          <el-rate v-model="ivForm.score" :max="5" />
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="ivForm.comment" type="textarea" :rows="2" />
        </el-form-item>
        <el-form-item>
          <el-button size="small" type="primary" :loading="saving" @click="saveIvFeedback">保存面评</el-button>
          <el-button size="small" type="danger" plain style="margin-left: 8px" @click="cancelInterview">取消面试</el-button>
        </el-form-item>
      </el-form>
    </template>

    <!-- State IN_PROGRESS: Resume review pending -->
    <template v-else-if="state === 'IN_PROGRESS' && tail.type === 'resume_review'">
      <div class="rr-form">
        <span class="rr-label">简历筛选</span>
        <div class="rr-controls">
          <el-input v-model="rrActor" placeholder="筛选人" style="width: 120px" size="small" />
          <el-button size="small" type="success" @click="rrPass">✓ 通过</el-button>
          <el-button size="small" type="danger" plain @click="rrReject">✗ 淘汰</el-button>
        </div>
      </div>
    </template>

    <!-- State IN_PROGRESS: Offer pending -->
    <template v-else-if="state === 'IN_PROGRESS' && tail.type === 'offer'">
      <div class="offer-inline">
        <ActivityCard :activity="tail" />
        <el-button size="small" type="primary" plain style="margin-top: 8px" @click="editingOffer = true">
          编辑 Offer 结论
        </el-button>
        <el-form v-if="editingOffer" :model="offerForm" label-width="80px" size="small" style="margin-top: 10px">
          <el-form-item label="结论">
            <el-select v-model="offerForm.conclusion" placeholder="请选择" style="width: 100%">
              <el-option label="接受" value="接受" />
              <el-option label="拒绝" value="拒绝" />
              <el-option label="谈判中" value="谈判中" />
            </el-select>
          </el-form-item>
          <el-form-item>
            <el-button size="small" type="primary" :loading="saving" @click="saveOfferInline">保存</el-button>
            <el-button size="small" @click="editingOffer = false" style="margin-left: 8px">取消</el-button>
          </el-form-item>
        </el-form>
      </div>
    </template>

    <!-- State COMPLETED -->
    <template v-else-if="state === 'COMPLETED'">
      <ActivityCard :activity="tail" />

      <!-- Next step options -->
      <div v-if="nextOptions.length" class="next-step-row">
        <span class="next-label">下一步：</span>
        <div class="next-options">
          <el-button
            v-for="opt in nextOptions"
            :key="opt.type"
            size="small"
            @click="startNext(opt.type)"
          >
            {{ opt.label }}
          </el-button>
        </div>
      </div>

      <!-- Onboard option (after offer accepted) -->
      <div v-if="showOnboard" class="next-step-row">
        <span class="next-label">下一步：</span>
        <el-button size="small" type="success" @click="openOnboardForm">确认入职</el-button>
      </div>
    </template>

    <!-- Activity form for next step -->
    <ActivityForm
      ref="actFormRef"
      :type="nextFormType"
      :link-id="link.id"
      @saved="onActivitySaved"
    />

    <!-- Onboard form -->
    <el-dialog v-model="onboardDialogVisible" title="确认入职" width="400px">
      <el-form :model="onboardForm" label-width="80px" size="default">
        <el-form-item label="入职日期">
          <el-date-picker v-model="onboardForm.start_date" type="date" style="width: 100%" />
        </el-form-item>
        <el-form-item label="实际薪资">
          <el-input v-model="onboardForm.salary" placeholder="实际薪资" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="onboardDialogVisible = false">取消</el-button>
        <el-button type="success" :loading="saving" @click="saveOnboard">确认入职</el-button>
      </template>
    </el-dialog>

    <!-- Reject overlay after resume_review reject -->
    <el-dialog v-model="rejectDialogVisible" title="淘汰原因" width="380px">
      <el-select v-model="rejectReason" placeholder="选择淘汰原因" style="width: 100%">
        <el-option v-for="r in REJECT_REASONS" :key="r" :label="r" :value="r" />
      </el-select>
      <template #footer>
        <el-button @click="rejectDialogVisible = false">取消</el-button>
        <el-button type="danger" :loading="saving" @click="confirmReject">确认淘汰</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, reactive } from 'vue'
import { ElMessage } from 'element-plus'
import { activitiesApi } from '../api/activities'
import { pipelineApi } from '../api/pipeline'
import ActivityCard from './ActivityCard.vue'
import ActivityForm from './ActivityForm.vue'

const props = defineProps({
  link: { type: Object, required: true },
  tail: { type: Object, required: true },
  allActivities: { type: Array, default: () => [] },
})

const emit = defineEmits(['refresh', 'removed'])

const REJECT_REASONS = ['技术能力不达标', '经验不匹配', '文化/价值观不符', '背调有问题', '薪资期望过高', '其他']

const saving = ref(false)
const actFormRef = ref(null)
const nextFormType = ref('interview')

const ivForm = reactive({ conclusion: '', score: 0, comment: '' })
const offerForm = reactive({ conclusion: '' })
const editingOffer = ref(false)
const onboardDialogVisible = ref(false)
const onboardForm = reactive({ start_date: null, salary: '' })
const rejectDialogVisible = ref(false)
const rejectReason = ref('')
const rrActor = ref(props.tail.actor || '')

const state = computed(() => {
  const tail = props.tail
  if (!tail) return 'EMPTY'

  if (tail.type === 'interview' && tail.status === 'scheduled') {
    const p = tail.payload || {}
    const scheduledAt = p.scheduled_at || tail.scheduled_at
    if (scheduledAt && new Date(scheduledAt) > new Date()) return 'INTERVIEW_UPCOMING'
    return 'INTERVIEW_PAST_DUE'
  }

  const p = tail.payload || {}
  const isComplete = p.status === 'completed' || tail.status === 'completed' ||
    (tail.type === 'resume_review' && (p.conclusion || tail.conclusion)) ||
    (tail.type === 'offer' && (p.conclusion || tail.conclusion)) ||
    (tail.type === 'background_check' && (p.conclusion || tail.conclusion))

  if (isComplete) return 'COMPLETED'
  return 'IN_PROGRESS'
})

const tailConclusion = computed(() => {
  const p = props.tail.payload || {}
  return p.conclusion || props.tail.conclusion
})

const showOnboard = computed(() =>
  state.value === 'COMPLETED' &&
  props.tail.type === 'offer' &&
  tailConclusion.value === '接受'
)

const nextOptions = computed(() => {
  if (state.value !== 'COMPLETED') return []
  if (showOnboard.value) return []
  if (tailConclusion.value !== '通过' && tailConclusion.value !== '接受') return []

  if (['resume_review', 'background_check'].includes(props.tail.type)) {
    return [
      { type: 'interview', label: '安排面试' },
      { type: 'offer', label: '发Offer' },
      { type: 'background_check', label: '背调' },
    ]
  }
  if (props.tail.type === 'interview') {
    return [
      { type: 'interview', label: '下一轮面试' },
      { type: 'offer', label: '发Offer' },
      { type: 'background_check', label: '背调' },
    ]
  }
  return []
})

function startNext(type) {
  nextFormType.value = type
  const autoRound = type === 'interview'
    ? `第${props.allActivities.filter(a => a.type === 'interview').length + 1}轮面试`
    : ''
  actFormRef.value?.open({ round: autoRound })
}

async function cancelInterview() {
  saving.value = true
  try {
    await activitiesApi.update(props.tail.id, { status: 'cancelled' })
    emit('refresh')
  } finally {
    saving.value = false
  }
}

async function saveIvFeedback() {
  if (!ivForm.conclusion) { ElMessage.warning('请选择结论'); return }
  saving.value = true
  try {
    await activitiesApi.update(props.tail.id, { ...ivForm, status: 'completed' })
    if (ivForm.conclusion === '淘汰') {
      rejectDialogVisible.value = true
    } else {
      emit('refresh')
    }
  } finally {
    saving.value = false
  }
}

async function rrPass() {
  if (!rrActor.value.trim()) { ElMessage.warning('请填写筛选人'); return }
  saving.value = true
  try {
    await activitiesApi.update(props.tail.id, { conclusion: '通过', status: 'completed', actor: rrActor.value.trim() })
    emit('refresh')
  } finally {
    saving.value = false
  }
}

function rrReject() {
  if (!rrActor.value.trim()) { ElMessage.warning('请填写筛选人'); return }
  activitiesApi.update(props.tail.id, { actor: rrActor.value.trim() }).then(() => {
    rejectDialogVisible.value = true
  })
}

async function confirmReject() {
  if (!rejectReason.value) { ElMessage.warning('请选择淘汰原因'); return }
  saving.value = true
  try {
    await pipelineApi.reject(props.link.id, { reason: rejectReason.value })
    rejectDialogVisible.value = false
    emit('removed')
  } finally {
    saving.value = false
  }
}

async function saveOfferInline() {
  if (!offerForm.conclusion) { ElMessage.warning('请选择结论'); return }
  saving.value = true
  try {
    await activitiesApi.update(props.tail.id, { ...offerForm })
    editingOffer.value = false
    emit('refresh')
    if (offerForm.conclusion === '接受') {
      ElMessage.success('Offer 已接受，请确认入职')
    }
  } finally {
    saving.value = false
  }
}

function openOnboardForm() {
  onboardForm.start_date = null
  onboardForm.salary = ''
  onboardDialogVisible.value = true
}

async function saveOnboard() {
  if (!onboardForm.start_date) { ElMessage.warning('请填写入职日期'); return }
  saving.value = true
  try {
    await activitiesApi.create({
      link_id: props.link.id,
      type: 'onboard',
      ...onboardForm,
    })
    onboardDialogVisible.value = false
    ElMessage.success('已确认入职')
    emit('removed')
  } finally {
    saving.value = false
  }
}

function onActivitySaved() {
  emit('refresh')
}
</script>

<style scoped>
.tail-node { }

.feedback-prompt { margin-bottom: 8px; }

.rr-form {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px;
  background: #f9f9f9;
  border-radius: 8px;
  border: 1px solid #eee;
  flex-wrap: wrap;
}

.rr-label {
  font-weight: 600;
  font-size: 13px;
  color: #444;
}

.rr-controls {
  display: flex;
  gap: 8px;
  align-items: center;
  flex-wrap: wrap;
}

.offer-inline { }

.next-step-row {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 10px;
  padding-top: 10px;
  border-top: 1px dashed #e8e8e8;
  flex-wrap: wrap;
}

.next-label {
  font-size: 13px;
  color: #888;
  white-space: nowrap;
}

.next-options {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}
</style>
