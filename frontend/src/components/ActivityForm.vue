<template>
  <el-dialog
    v-model="visible"
    :title="formTitle"
    width="500px"
    :close-on-click-modal="false"
    @closed="resetForm"
  >
    <el-form :model="form" label-width="80px" size="default">
      <!-- Interview -->
      <template v-if="type === 'interview'">
        <template v-if="interviewMode === 'schedule'">
          <el-form-item label="轮次">
            <el-input v-model="form.round" placeholder="如：面试1、面试2、HR面" />
          </el-form-item>
          <el-form-item label="面试官">
            <el-input v-model="form.actor" placeholder="面试官姓名" />
          </el-form-item>
          <el-form-item label="面试时间">
            <el-date-picker
              v-model="form.scheduled_at"
              type="datetime"
              placeholder="选择面试时间"
              style="width: 100%"
            />
          </el-form-item>
          <el-form-item label="地点/链接">
            <el-input v-model="form.location" placeholder="选填，如：线上会议链接 / 会议室A" />
          </el-form-item>
        </template>
        <template v-else>
          <el-form-item label="面试官">
            <el-input v-model="form.actor" placeholder="面试官姓名" />
          </el-form-item>
          <el-form-item label="结论">
            <el-select v-model="form.conclusion" placeholder="请选择" style="width: 100%">
              <el-option label="通过" value="通过" />
              <el-option label="待定" value="待定" />
              <el-option label="淘汰" value="淘汰" />
            </el-select>
          </el-form-item>
          <el-form-item v-if="form.conclusion === '淘汰'" label="淘汰原因" required>
            <el-select v-model="form.rejection_reason" placeholder="请选择淘汰原因" style="width: 100%">
              <el-option v-for="r in REJECT_REASONS" :key="r" :label="r" :value="r" />
            </el-select>
          </el-form-item>
          <el-form-item v-if="form.conclusion" label="评分">
            <el-rate v-model="form.score" :max="5" />
          </el-form-item>
        </template>
      </template>

      <!-- Offer -->
      <template v-if="type === 'offer'">
        <el-form-item label="月薪(税前)">
          <el-input v-model="form.monthly_salary" placeholder="如：30000" />
        </el-form-item>
        <el-form-item label="年终(月)">
          <el-input v-model="form.salary_months" placeholder="如：3" />
        </el-form-item>
        <el-form-item label="期权/股权">
          <el-input v-model="form.other_cash" placeholder="选填" />
        </el-form-item>
        <el-form-item label="入职日期">
          <el-date-picker v-model="form.start_date" type="date" placeholder="选择日期" style="width:100%" />
        </el-form-item>
        <el-form-item label="结论">
          <el-select v-model="form.conclusion" placeholder="请选择" style="width: 100%">
            <el-option label="接受" value="接受" />
            <el-option label="拒绝" value="拒绝" />
            <el-option label="谈判中" value="谈判中" />
          </el-select>
        </el-form-item>
      </template>

      <!-- Onboard -->
      <template v-if="type === 'onboard'">
        <el-form-item label="入职日期">
          <el-date-picker v-model="form.start_date" type="date" placeholder="选择入职日期" style="width:100%" />
        </el-form-item>
        <el-form-item label="实际薪资">
          <el-input v-model="form.salary" placeholder="实际薪资" />
        </el-form-item>
      </template>

      <!-- Background check -->
      <template v-if="type === 'background_check'">
        <el-form-item label="背调机构">
          <el-input v-model="form.actor" placeholder="背调机构或负责人" />
        </el-form-item>
        <el-form-item label="结论">
          <el-select v-model="form.conclusion" placeholder="请选择" style="width: 100%">
            <el-option label="通过" value="通过" />
            <el-option label="有瑕疵" value="有瑕疵" />
            <el-option label="不通过" value="不通过" />
          </el-select>
        </el-form-item>
      </template>

      <!-- Resume review -->
      <template v-if="type === 'resume_review'">
        <el-form-item label="筛选人">
          <el-input v-model="form.actor" placeholder="筛选人姓名" />
        </el-form-item>
        <el-form-item label="结论">
          <el-select v-model="form.conclusion" placeholder="请选择" style="width: 100%">
            <el-option label="通过" value="通过" />
            <el-option label="淘汰" value="淘汰" />
          </el-select>
        </el-form-item>
      </template>

      <!-- Note (always shown) -->
      <el-form-item :label="commentLabel">
        <el-input
          v-model="form.comment"
          type="textarea"
          :rows="3"
          :placeholder="commentPlaceholder"
        />
      </el-form-item>
    </el-form>

    <template #footer>
      <el-button @click="visible = false">取消</el-button>
      <el-button type="primary" :loading="loading" @click="handleSubmit">保存</el-button>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, computed, reactive } from 'vue'
import { ElMessage } from 'element-plus'
import { activitiesApi } from '../api/activities'

const props = defineProps({
  type: { type: String, required: true },
  linkId: { type: Number, default: null },
  activityId: { type: Number, default: null }, // for update mode
  initialData: { type: Object, default: () => ({}) },
})

const emit = defineEmits(['saved'])

const visible = ref(false)
const loading = ref(false)

const TYPE_TITLES = {
  interview: '面试记录',
  offer: 'Offer 详情',
  onboard: '入职确认',
  background_check: '背调记录',
  resume_review: '简历筛选',
  note: '添加备注',
}

const formTitle = computed(() => {
  if (props.type === 'interview') {
    if (!props.activityId) return '安排面试'
    return interviewMode.value === 'feedback' ? '编辑面评' : '编辑面试安排'
  }
  return TYPE_TITLES[props.type] || '活动记录'
})
const REJECT_REASONS = ['技术能力不达标', '经验不匹配', '文化/价值观不符', '背调有问题', '薪资期望过高', '其他']
const interviewMode = computed(() => {
  if (props.type !== 'interview') return 'schedule'
  const status = `${form.status || ''}`
  const hasConclusion = Boolean(form.conclusion)
  if (props.activityId && (status === 'completed' || hasConclusion)) return 'feedback'
  return 'schedule'
})
const commentLabel = computed(() => {
  if (props.type === 'interview') {
    return interviewMode.value === 'feedback' ? '面评内容' : '面试说明'
  }
  return '备注'
})
const commentPlaceholder = computed(() => {
  if (props.type === 'interview') {
    return interviewMode.value === 'feedback' ? '填写面评（选填）' : '补充安排说明（选填）'
  }
  return '补充说明（选填）'
})

const form = reactive({
  round: '',
  actor: '',
  scheduled_at: null,
  location: '',
  conclusion: '',
  score: 0,
  comment: '',
  monthly_salary: '',
  salary_months: '',
  other_cash: '',
  rejection_reason: '',
  status: '',
  start_date: null,
  salary: '',
})

function open(prefill = {}) {
  Object.assign(form, {
    round: '', actor: '', scheduled_at: null, location: '',
    conclusion: '', score: 0, comment: '',
    monthly_salary: '', salary_months: '', other_cash: '',
    rejection_reason: '', status: '',
    start_date: null, salary: '',
  }, prefill)
  visible.value = true
}

function resetForm() {
  Object.keys(form).forEach(k => {
    form[k] = k === 'score' ? 0 : k.includes('at') || k.includes('date') ? null : ''
  })
}

async function handleSubmit() {
  // Validate required fields
  if (props.type === 'resume_review' && !form.actor) {
    ElMessage.warning('请填写筛选人')
    return
  }
  if (['offer', 'background_check', 'resume_review'].includes(props.type) && !form.conclusion) {
    ElMessage.warning('请选择结论')
    return
  }
  if (props.type === 'interview' && interviewMode.value === 'schedule' && !form.scheduled_at) {
    ElMessage.warning('请选择面试时间')
    return
  }
  if (props.type === 'interview' && interviewMode.value === 'feedback' && !form.conclusion) {
    ElMessage.warning('请选择结论')
    return
  }
  if (props.type === 'interview' && interviewMode.value === 'feedback' && form.conclusion === '淘汰' && !form.rejection_reason) {
    ElMessage.warning('请选择淘汰原因')
    return
  }

  loading.value = true
  try {
    const payload = { ...form }
    if (props.type === 'interview') {
      if (interviewMode.value === 'schedule') {
        payload.status = 'scheduled'
        delete payload.conclusion
        delete payload.score
        delete payload.rejection_reason
      } else {
        payload.status = 'completed'
      }
    }
    if (payload.scheduled_at instanceof Date) payload.scheduled_at = payload.scheduled_at.toISOString()
    if (payload.start_date instanceof Date) payload.start_date = payload.start_date.toISOString().slice(0, 10)
    if (payload.score === 0) delete payload.score
    // Remove empty fields
    Object.keys(payload).forEach(k => {
      if (payload[k] === '' || payload[k] === null || payload[k] === undefined) {
        delete payload[k]
      }
    })

    if (props.activityId) {
      // Update mode
      await activitiesApi.update(props.activityId, payload)
    } else {
      // Create mode
      await activitiesApi.create({ link_id: props.linkId, type: props.type, ...payload })
    }

    visible.value = false
    emit('saved')
    ElMessage.success('保存成功')
  } finally {
    loading.value = false
  }
}

defineExpose({ open })
</script>
