<template>
  <el-drawer
    :model-value="true"
    :title="candidate?.display_name || '候选人详情'"
    size="520px"
    direction="rtl"
    @close="emit('close')"
    @opened="loadCandidate"
  >
    <div v-if="loading" class="loading-wrap">
      <el-skeleton :rows="8" animated />
    </div>

    <template v-else-if="candidate">
      <!-- Action buttons -->
      <div class="action-bar">
        <el-button v-if="!editMode" size="small" @click="editMode = true">编辑信息</el-button>
        <el-button v-if="!candidate.blacklisted" size="small" type="danger" plain @click="openBlacklist">加入黑名单</el-button>
        <el-button v-else size="small" type="warning" plain @click="openUnblacklist">解除黑名单</el-button>
        <el-button v-if="!editMode" size="small" type="primary" @click="openLinkToJob">加入流程</el-button>
        <el-button v-if="!editMode" size="small" plain @click="copyResumeSummary">复制简历摘要</el-button>
      </div>

      <!-- Blacklisted banner -->
      <el-alert
        v-if="candidate.blacklisted"
        type="error"
        :title="`黑名单：${candidate.blacklist_reason}`"
        :description="candidate.blacklist_note"
        show-icon
        :closable="false"
        style="margin-bottom: 12px"
      />

      <!-- Basic info -->
      <el-tabs v-model="activeTab">
        <el-tab-pane label="基本信息" name="info">
          <!-- Edit mode -->
          <el-form v-if="editMode" :model="editForm" label-width="80px" size="default">
            <el-form-item label="姓名">
              <el-input v-model="editForm.name" />
            </el-form-item>
            <el-form-item label="英文名">
              <el-input v-model="editForm.name_en" />
            </el-form-item>
            <el-form-item label="手机">
              <el-input v-model="editForm.phone" />
            </el-form-item>
            <el-form-item label="邮箱">
              <el-input v-model="editForm.email" />
            </el-form-item>
            <el-form-item label="城市">
              <el-input v-model="editForm.city" />
            </el-form-item>
            <el-form-item label="学历">
              <el-input v-model="editForm.education" />
            </el-form-item>
            <el-form-item label="学校">
              <el-input v-model="editForm.school" />
            </el-form-item>
            <el-form-item label="上家公司">
              <el-input v-model="editForm.last_company" />
            </el-form-item>
            <el-form-item label="上家职位">
              <el-input v-model="editForm.last_title" />
            </el-form-item>
            <el-form-item label="工作年限">
              <el-input-number v-model="editForm.years_exp" :precision="1" :step="0.5" :min="0" />
            </el-form-item>
            <el-form-item label="跟进状态">
              <el-select v-model="editForm.followup_status" placeholder="请选择" clearable style="width: 100%">
                <el-option label="待联系" value="pending" />
                <el-option label="已联系" value="contacted" />
                <el-option label="感兴趣" value="interested" />
                <el-option label="暂不考虑" value="not_now" />
              </el-select>
            </el-form-item>
            <el-form-item label="备注">
              <el-input v-model="editForm.notes" type="textarea" :rows="3" />
            </el-form-item>
            <el-form-item>
              <el-button type="primary" :loading="savingEdit" @click="saveEdit">保存</el-button>
              <el-button @click="editMode = false" style="margin-left: 8px">取消</el-button>
            </el-form-item>
          </el-form>

          <!-- View mode -->
          <template v-else>
            <el-descriptions :column="1" size="small" border>
              <el-descriptions-item label="姓名">{{ candidate.name }}</el-descriptions-item>
              <el-descriptions-item v-if="candidate.name_en" label="英文名">{{ candidate.name_en }}</el-descriptions-item>
              <el-descriptions-item label="手机">{{ candidate.phone || '—' }}</el-descriptions-item>
              <el-descriptions-item label="邮箱">{{ candidate.email || '—' }}</el-descriptions-item>
              <el-descriptions-item label="城市">{{ candidate.city || '—' }}</el-descriptions-item>
              <el-descriptions-item label="学历">
                {{ candidate.education || '—' }}{{ candidate.school ? ` · ${candidate.school}` : '' }}
              </el-descriptions-item>
              <el-descriptions-item label="上家">
                {{ candidate.last_title || '—' }}{{ candidate.last_company ? ` @ ${candidate.last_company}` : '' }}
              </el-descriptions-item>
              <el-descriptions-item label="工作年限">{{ candidate.years_exp != null ? `${candidate.years_exp}年` : '—' }}</el-descriptions-item>
              <el-descriptions-item v-if="candidate.supplier_name" label="来源">{{ candidate.supplier_name }}</el-descriptions-item>
              <el-descriptions-item v-else-if="candidate.source" label="来源">{{ candidate.source }}</el-descriptions-item>
              <el-descriptions-item v-if="candidate.referred_by" label="内推人">{{ candidate.referred_by }}</el-descriptions-item>
              <el-descriptions-item v-if="candidate.notes" label="备注">{{ candidate.notes }}</el-descriptions-item>
            </el-descriptions>

            <div class="last-app-card">
              <div class="last-app-card__title">最近一次申请</div>
              <template v-if="lastApplication">
                <div class="last-app-card__line">
                  岗位：{{ lastApplication.job_title || '未知岗位' }} · 阶段：{{ lastApplication.final_stage || '未知阶段' }}
                </div>
                <div class="last-app-card__line">
                  结果：{{ lastApplicationOutcome(lastApplication.outcome) }}
                  <span v-if="lastApplication.rejection_reason"> · 原因：{{ lastApplication.rejection_reason }}</span>
                  <span v-if="lastApplication.days_ago != null"> · {{ lastApplication.days_ago }} 天前</span>
                </div>
              </template>
              <div v-else class="last-app-card__empty">暂无申请记录</div>
            </div>

            <div v-if="(candidate.skill_tags || []).length" style="margin-top: 12px">
              <el-tag v-for="t in candidate.skill_tags" :key="t" size="small" style="margin: 2px">{{ t }}</el-tag>
            </div>

            <!-- Work experience list -->
            <div v-if="(candidate.work_experience || []).length" style="margin-top: 16px">
              <div style="font-size: 13px; font-weight: 600; color: #555; margin-bottom: 8px">工作经历</div>
              <div
                v-for="(job, i) in candidate.work_experience"
                :key="i"
                style="padding: 6px 0; border-bottom: 1px solid #f5f5f5; font-size: 13px"
              >
                <div style="font-weight: 600; color: #222">{{ job.title || '—' }} <span style="color: #888; font-weight: 400">@ {{ job.company || '—' }}</span></div>
                <div v-if="job.period" style="color: #aaa; font-size: 12px; margin-top: 2px">{{ job.period }}</div>
                <div v-if="job.description" style="color: #555; font-size: 12px; margin-top: 4px; white-space: pre-wrap; line-height: 1.5">
                  {{ job.description }}
                </div>
              </div>
            </div>

            <!-- Project experience list -->
            <div v-if="(candidate.project_experience || []).length" style="margin-top: 16px">
              <div style="font-size: 13px; font-weight: 600; color: #555; margin-bottom: 8px">项目经历</div>
              <div
                v-for="(proj, i) in candidate.project_experience"
                :key="i"
                style="padding: 8px 0; border-bottom: 1px solid #f5f5f5; font-size: 13px"
              >
                <div style="font-weight: 600; color: #222">
                  {{ proj.name || '—' }}
                  <span v-if="proj.role" style="color: #888; font-weight: 400"> · {{ proj.role }}</span>
                </div>
                <div v-if="proj.period" style="color: #aaa; font-size: 12px; margin-top: 2px">{{ proj.period }}</div>
                <div v-if="proj.tech_stack && proj.tech_stack.length" style="color: #666; font-size: 12px; margin-top: 4px">
                  技术栈：{{ Array.isArray(proj.tech_stack) ? proj.tech_stack.join('、') : proj.tech_stack }}
                </div>
                <div v-if="proj.description" style="color: #555; font-size: 12px; margin-top: 4px; white-space: pre-wrap; line-height: 1.5">
                  {{ proj.description }}
                </div>
              </div>
            </div>

            <!-- Education list -->
            <div v-if="(candidate.education_list || []).length" style="margin-top: 16px">
              <div style="font-size: 13px; font-weight: 600; color: #555; margin-bottom: 8px">教育经历</div>
              <div
                v-for="(edu, i) in candidate.education_list"
                :key="i"
                style="padding: 6px 0; border-bottom: 1px solid #f5f5f5; font-size: 13px"
              >
                <div style="font-weight: 600; color: #222">{{ edu.degree || '—' }} <span style="color: #888; font-weight: 400">· {{ edu.school || '—' }}</span><span v-if="edu.major" style="color: #aaa; font-weight: 400"> · {{ edu.major }}</span></div>
                <div v-if="edu.period" style="color: #aaa; font-size: 12px; margin-top: 2px">{{ edu.period }}</div>
              </div>
            </div>

            <!-- Job links -->
            <div v-if="(candidate.job_links || []).length" style="margin-top: 16px">
              <div style="font-size: 13px; color: #888; margin-bottom: 6px">流程记录</div>
              <div
                v-for="lnk in candidate.job_links"
                :key="lnk.id"
                class="job-link-row"
              >
                <el-tag
                  :type="lnk.outcome === 'hired' ? 'success' : lnk.outcome ? 'info' : 'primary'"
                  size="small"
                >
                  {{ lnk.job_title }} · {{ lnk.stage }}
                  <span v-if="lnk.outcome"> ({{ outcomeLabel(lnk.outcome) }})</span>
                </el-tag>
                <el-button
                  v-if="!lnk.outcome"
                  size="small"
                  link
                  type="primary"
                  @click="openTransferDialog(lnk)"
                >
                  转岗
                </el-button>
              </div>
            </div>
          </template>
        </el-tab-pane>

        <el-tab-pane label="活动记录" name="activities">
          <div v-if="loadingActivities" style="text-align: center; padding: 20px">
            <el-icon class="is-loading"><Loading /></el-icon>
          </div>
          <template v-else>
            <div v-if="!allActivities.length" style="color: #aaa; font-size: 13px; padding: 8px 0">
              暂无活动记录
            </div>
            <ActivityCard
              v-for="act in allActivities"
              :key="act.id"
              :activity="act"
            />
          </template>
        </el-tab-pane>

        <el-tab-pane label="简历" name="resume">
          <div v-if="!candidate.resume_path" style="color: #aaa; font-size: 13px; padding: 8px 0">
            暂无简历
          </div>
          <template v-else>
            <div v-if="resumeHtml" v-html="resumeHtml" class="resume-preview" />
            <iframe
              v-else-if="resumeRedirect"
              :src="resumeRedirect"
              width="100%"
              height="500"
              style="border: none; border-radius: 6px"
            />
          </template>
        </el-tab-pane>
      </el-tabs>
    </template>

    <!-- Blacklist dialog -->
    <el-dialog v-model="blacklistDialogVisible" title="加入黑名单" width="380px" append-to-body>
      <el-form :model="blacklistForm" label-width="70px">
        <el-form-item label="原因" required>
          <el-select v-model="blacklistForm.reason" placeholder="请选择" style="width: 100%">
            <el-option label="简历造假" value="简历造假" />
            <el-option label="背调不通过" value="背调不通过" />
            <el-option label="职业道德问题" value="职业道德问题" />
            <el-option label="面试失约" value="面试失约" />
            <el-option label="其他" value="其他" />
          </el-select>
        </el-form-item>
        <el-form-item label="说明">
          <el-input v-model="blacklistForm.note" type="textarea" :rows="2" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="blacklistDialogVisible = false">取消</el-button>
        <el-button type="danger" :loading="actionLoading" @click="saveBlacklist">确认加入</el-button>
      </template>
    </el-dialog>

    <!-- Unblacklist dialog -->
    <el-dialog v-model="unblacklistDialogVisible" title="解除黑名单" width="380px" append-to-body>
      <el-input v-model="unblacklistReason" placeholder="解除原因（必填）" />
      <template #footer>
        <el-button @click="unblacklistDialogVisible = false">取消</el-button>
        <el-button type="warning" :loading="actionLoading" @click="saveUnblacklist">确认解除</el-button>
      </template>
    </el-dialog>

    <!-- Link to job dialog -->
    <el-dialog v-model="linkDialogVisible" title="加入岗位流程" width="380px" append-to-body>
      <el-select v-model="selectedJobId" placeholder="选择岗位" style="width: 100%">
        <el-option v-for="j in openJobs" :key="j.id" :label="j.title" :value="j.id" />
      </el-select>
      <template #footer>
        <el-button @click="linkDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="actionLoading" @click="confirmLink">加入</el-button>
      </template>
    </el-dialog>

    <!-- Transfer dialog -->
    <el-dialog v-model="transferDialogVisible" title="转岗" width="420px" append-to-body>
      <div v-if="transferTargetLink" style="margin-bottom: 10px; color: #666; font-size: 13px">
        当前流程：{{ transferTargetLink.job_title }} · {{ transferTargetLink.stage }}
      </div>
      <el-form label-width="96px">
        <el-form-item label="目标岗位" required>
          <el-select v-model="transferForm.new_job_id" placeholder="请选择岗位" style="width: 100%">
            <el-option
              v-for="j in transferJobOptions"
              :key="j.id"
              :label="j.title"
              :value="j.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="历史记录">
          <el-switch
            v-model="transferForm.keep_records"
            inline-prompt
            active-text="保留"
            inactive-text="从头"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="transferDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="actionLoading" @click="confirmTransfer">确认转岗</el-button>
      </template>
    </el-dialog>
  </el-drawer>
</template>

<script setup>
import { ref, reactive, computed, onMounted, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { candidatesApi } from '../api/candidates'
import { activitiesApi } from '../api/activities'
import { pipelineApi } from '../api/pipeline'
import { jobsApi } from '../api/jobs'
import ActivityCard from './ActivityCard.vue'

const props = defineProps({
  candidateId: { type: Number, required: true },
})

const emit = defineEmits(['close', 'updated'])

const candidate = ref(null)
const loading = ref(false)
const editMode = ref(false)
const savingEdit = ref(false)
const activeTab = ref('info')
const allActivities = ref([])
const loadingActivities = ref(false)
const resumeHtml = ref('')
const resumeRedirect = ref('')
const openJobs = ref([])
const lastApplication = ref(null)

const blacklistDialogVisible = ref(false)
const unblacklistDialogVisible = ref(false)
const linkDialogVisible = ref(false)
const transferDialogVisible = ref(false)
const actionLoading = ref(false)
const selectedJobId = ref(null)
const unblacklistReason = ref('')
const transferTargetLink = ref(null)
const transferForm = reactive({ new_job_id: null, keep_records: true })

const blacklistForm = reactive({ reason: '', note: '' })
const editForm = reactive({
  name: '', name_en: '', phone: '', email: '', city: '',
  education: '', school: '', last_company: '', last_title: '',
  years_exp: null, followup_status: '', notes: '',
})

const OUTCOME_LABELS = { hired: '已入职', rejected: '已淘汰', withdrawn: '已退出' }
function outcomeLabel(o) { return OUTCOME_LABELS[o] || o }
const transferJobOptions = computed(() => {
  if (!transferTargetLink.value) return openJobs.value
  return openJobs.value.filter(j => j.id !== transferTargetLink.value.job_id)
})
function lastApplicationOutcome(o) { return o ? (OUTCOME_LABELS[o] || o) : '进行中' }

async function loadCandidate() {
  loading.value = true
  lastApplication.value = null
  try {
    const [candidateData, lastAppData] = await Promise.all([
      candidatesApi.get(props.candidateId),
      candidatesApi.getLastApplication(props.candidateId).catch(() => ({ last_application: null })),
    ])
    candidate.value = candidateData
    lastApplication.value = lastAppData?.last_application || null
    Object.assign(editForm, {
      name: candidate.value.name || '',
      name_en: candidate.value.name_en || '',
      phone: candidate.value.phone || '',
      email: candidate.value.email || '',
      city: candidate.value.city || '',
      education: candidate.value.education || '',
      school: candidate.value.school || '',
      last_company: candidate.value.last_company || '',
      last_title: candidate.value.last_title || '',
      years_exp: candidate.value.years_exp,
      followup_status: candidate.value.followup_status || '',
      notes: candidate.value.notes || '',
    })
  } finally {
    loading.value = false
  }
}

watch(activeTab, async (tab) => {
  if (tab === 'activities' && !allActivities.value.length) {
    await loadActivities()
  }
  if (tab === 'resume') {
    await loadResume()
  }
})

async function loadActivities() {
  loadingActivities.value = true
  try {
    // Load activities for all job links
    const links = candidate.value?.job_links || []
    const results = await Promise.all(
      links.map(lnk => activitiesApi.list({ link_id: lnk.id }))
    )
    allActivities.value = results.flat().sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
  } finally {
    loadingActivities.value = false
  }
}

async function loadResume() {
  if (!candidate.value?.resume_path) return
  try {
    const res = await candidatesApi.resumePreview(candidate.value.id)
    if (res.html) resumeHtml.value = res.html
    else if (res.redirect) resumeRedirect.value = res.redirect
  } catch (_) {}
}

async function saveEdit() {
  savingEdit.value = true
  try {
    candidate.value = await candidatesApi.update(props.candidateId, { ...editForm })
    editMode.value = false
    ElMessage.success('信息已更新')
    emit('updated')
  } finally {
    savingEdit.value = false
  }
}

function openBlacklist() {
  blacklistForm.reason = ''
  blacklistForm.note = ''
  blacklistDialogVisible.value = true
}

async function saveBlacklist() {
  if (!blacklistForm.reason) { ElMessage.warning('请选择原因'); return }
  actionLoading.value = true
  try {
    candidate.value = await candidatesApi.blacklist(props.candidateId, { ...blacklistForm })
    blacklistDialogVisible.value = false
    ElMessage.success('已加入黑名单')
    emit('updated')
  } finally {
    actionLoading.value = false
  }
}

function openUnblacklist() {
  unblacklistReason.value = ''
  unblacklistDialogVisible.value = true
}

async function saveUnblacklist() {
  if (!unblacklistReason.value.trim()) { ElMessage.warning('请填写解除原因'); return }
  actionLoading.value = true
  try {
    candidate.value = await candidatesApi.unblacklist(props.candidateId, { reason: unblacklistReason.value })
    unblacklistDialogVisible.value = false
    ElMessage.success('已解除黑名单')
    emit('updated')
  } finally {
    actionLoading.value = false
  }
}

async function openLinkToJob() {
  openJobs.value = await jobsApi.list({ include_closed: false })
  selectedJobId.value = null
  linkDialogVisible.value = true
}

async function confirmLink() {
  if (!selectedJobId.value) { ElMessage.warning('请选择岗位'); return }
  actionLoading.value = true
  try {
    await pipelineApi.link({ candidate_id: props.candidateId, job_id: selectedJobId.value })
    linkDialogVisible.value = false
    ElMessage.success('已加入流程')
    await loadCandidate()
    emit('updated')
  } finally {
    actionLoading.value = false
  }
}

async function openTransferDialog(link) {
  openJobs.value = await jobsApi.list({ include_closed: false })
  transferTargetLink.value = link
  transferForm.new_job_id = null
  transferForm.keep_records = true
  transferDialogVisible.value = true
}

async function confirmTransfer() {
  if (!transferTargetLink.value) return
  if (!transferForm.new_job_id) { ElMessage.warning('请选择目标岗位'); return }
  actionLoading.value = true
  try {
    await pipelineApi.transfer(transferTargetLink.value.id, {
      new_job_id: transferForm.new_job_id,
      keep_records: transferForm.keep_records,
    })
    transferDialogVisible.value = false
    ElMessage.success('已完成转岗')
    await loadCandidate()
    emit('updated')
  } finally {
    actionLoading.value = false
  }
}

onMounted(loadCandidate)

async function copyResumeSummary() {
  if (!candidate.value) return
  const c = candidate.value
  const parts = []
  if (c.name || c.name_en) parts.push(c.name || c.name_en)
  const jobInfo = []
  if (c.last_title) jobInfo.push(c.last_title)
  if (c.last_company) jobInfo.push(`@ ${c.last_company}`)
  if (jobInfo.length) parts.push(jobInfo.join(' '))
  if (c.years_exp) parts.push(`${c.years_exp}年经验`)
  if (c.education) parts.push(c.education)
  if (c.skill_tags && c.skill_tags.length) parts.push(c.skill_tags.join('、'))
  const text = parts.join(' · ')
  try {
    await navigator.clipboard.writeText(text)
    ElMessage.success('已复制')
  } catch {
    ElMessage.error('复制失败')
  }
}
</script>

<style scoped>
.loading-wrap { padding: 20px 0; }

.action-bar {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  margin-bottom: 16px;
}

.last-app-card {
  margin-top: 12px;
  padding: 10px 12px;
  border: 1px solid #dbeafe;
  border-radius: 8px;
  background: #f8fbff;
}

.last-app-card__title {
  font-size: 12px;
  font-weight: 600;
  color: #1f2937;
  margin-bottom: 6px;
}

.last-app-card__line {
  font-size: 12px;
  color: #374151;
  line-height: 1.6;
}

.last-app-card__empty {
  font-size: 12px;
  color: #9ca3af;
}

.resume-preview {
  font-size: 13px;
  line-height: 1.6;
  color: #333;
}

.resume-preview :deep(p) { margin-bottom: 6px; }
.resume-preview :deep(table) { margin-bottom: 10px; }

.job-link-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 3px 0;
}
</style>
