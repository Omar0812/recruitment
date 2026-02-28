<template>
  <div class="pipeline-page">
    <div class="page-toolbar">
      <h2 class="page-title">进行中 <span class="count-badge">{{ store.activeLinks.length }}</span></h2>
      <el-input
        v-model="searchQ"
        placeholder="搜索候选人/岗位..."
        clearable
        style="width: 220px"
      />
      <el-select v-model="viewMode" style="width: 130px">
        <el-option label="按候选人" value="candidate" />
        <el-option label="按岗位" value="job" />
        <el-option label="按阶段" value="stage" />
      </el-select>
      <el-button @click="filterDrawerVisible = true">筛选</el-button>
      <el-button :loading="store.loading" @click="refresh">刷新</el-button>
    </div>

    <div v-if="store.loading && !store.activeLinks.length" class="loading-wrap">
      <el-skeleton :rows="6" animated />
    </div>

    <div v-for="group in groupedLinks" :key="group.key" class="job-group">
      <div class="job-group-header">
        <span class="job-title">{{ group.title }}</span>
        <span class="job-count">{{ group.links.length }} 人</span>
      </div>
      <div
        v-for="link in group.links"
        :key="link.id"
        class="candidate-card"
        :class="{ 'is-expanded': expandedId === link.id }"
      >
        <div class="cc-header" @click="toggleCard(link)">
          <div class="cc-left">
            <span class="cc-name">{{ link.candidate_name }}</span>
            <span v-if="viewMode === 'candidate'" class="cc-sub">{{ link.job_title || '未知岗位' }}</span>
            <el-tag size="small" type="info" style="margin-left: 8px">{{ link.stage }}</el-tag>
            <el-icon v-if="link.starred"><Star /></el-icon>
          </div>
          <div class="cc-right">
            <span v-if="link.days_since_update !== null" class="days-badge" :class="staleBadgeClass(link)">
              {{ link.days_since_update }}天未更新
            </span>
            <el-icon class="cc-chevron" :class="{ 'is-open': expandedId === link.id }">
              <ArrowDown />
            </el-icon>
          </div>
        </div>

        <!-- Expanded area -->
        <div v-if="expandedId === link.id" class="cc-expand">
          <div v-if="loadingActivityId === link.id" style="padding: 16px; text-align: center">
            <el-icon class="is-loading"><Loading /></el-icon>
          </div>
          <template v-else>
            <!-- Activities timeline (non-tail) -->
            <div v-if="historyActivities(link.id).length" class="activity-timeline">
              <ActivityCard
                v-for="act in historyActivities(link.id)"
                :key="act.id"
                :activity="act"
                :editable="true"
                @edit="openActivityEditor(act, link.id)"
              />
            </div>

            <!-- Tail node / action area -->
            <div class="tail-area">
              <TailNode
                v-if="tailActivity(link.id)"
                :link="link"
                :tail="tailActivity(link.id)"
                :all-activities="activitiesMap[link.id] || []"
                @refresh="refreshLink(link)"
                @removed="store.removeLink(link.id)"
                @edit-activity="openActivityEditor($event, link.id)"
              />
              <div v-else class="no-activities">暂无活动记录</div>
            </div>

            <!-- Inline action buttons (always shown) -->
            <div class="inline-actions">
              <el-button size="small" plain @click="openNoteForm(link)">+ 备注</el-button>
              <el-button size="small" plain type="warning" @click="openWithdrawForm(link)">退出</el-button>
              <el-button size="small" plain @click="copyResumeSummary(link)">复制简历摘要</el-button>
              <el-tooltip :content="inviteTooltip" placement="top">
                <el-button
                  size="small"
                  plain
                  type="primary"
                  :loading="sendingInvite[link.id] || emailConfigLoading"
                  @click="sendInviteEmail(link)"
                >发送邀约邮件</el-button>
              </el-tooltip>
            </div>

            <!-- Inline forms -->
            <div v-if="inlineMode[link.id]" class="inline-form-area">
              <!-- Note -->
              <template v-if="inlineMode[link.id] === 'note'">
                <el-input
                  v-model="inlineData[link.id].comment"
                  type="textarea"
                  :rows="2"
                  placeholder="输入备注..."
                />
                <div style="margin-top: 8px; display: flex; gap: 8px">
                  <el-button size="small" type="primary" @click="saveNote(link)">保存</el-button>
                  <el-button size="small" @click="closeInlineForm(link.id)">取消</el-button>
                </div>
              </template>

              <!-- Withdraw -->
              <template v-if="inlineMode[link.id] === 'withdraw'">
                <el-select
                  v-model="inlineData[link.id].reason"
                  placeholder="选择退出原因"
                  style="width: 100%; margin-bottom: 8px"
                >
                  <el-option v-for="r in WITHDRAW_REASONS" :key="r" :label="r" :value="r" />
                </el-select>
                <el-input
                  v-model="inlineData[link.id].comment"
                  placeholder="补充说明（选填）"
                  style="margin-bottom: 8px"
                />
                <div style="display: flex; gap: 8px">
                  <el-button size="small" type="warning" @click="saveWithdraw(link)">确认退出</el-button>
                  <el-button size="small" @click="closeInlineForm(link.id)">取消</el-button>
                </div>
              </template>
            </div>
          </template>
        </div>
      </div>
    </div>

    <ActivityForm
      ref="editFormRef"
      :type="editingType"
      :link-id="editingLinkId"
      :activity-id="editingActivityId"
      @saved="handleActivityEdited"
    />

    <el-drawer v-model="filterDrawerVisible" title="筛选" size="320px">
      <el-form label-position="top" size="small">
        <el-form-item label="岗位">
          <el-select v-model="filters.job" clearable placeholder="全部岗位" style="width: 100%">
            <el-option v-for="job in jobOptions" :key="job" :label="job" :value="job" />
          </el-select>
        </el-form-item>
        <el-form-item label="阶段">
          <el-select v-model="filters.stage" clearable placeholder="全部阶段" style="width: 100%">
            <el-option v-for="stage in stageOptions" :key="stage" :label="stage" :value="stage" />
          </el-select>
        </el-form-item>
        <el-form-item label="停滞时长">
          <el-select v-model="filters.staleDays" clearable placeholder="不限" style="width: 100%">
            <el-option v-for="d in staleDayOptions" :key="d" :label="`≥ ${d} 天未更新`" :value="d" />
          </el-select>
        </el-form-item>
      </el-form>
      <div class="drawer-footer">
        <el-button @click="resetFilters">重置</el-button>
      </div>
    </el-drawer>

    <el-empty v-if="!store.loading && !filteredLinks.length" description="暂无进行中的候选人" />
  </div>
</template>

<script setup>
import { ref, computed, reactive, onMounted, watch, nextTick } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useRoute, useRouter } from 'vue-router'
import { usePipelineStore } from '../stores/pipeline'
import { activitiesApi } from '../api/activities'
import { pipelineApi } from '../api/pipeline'
import { candidatesApi } from '../api/candidates'
import { emailApi } from '../api/email'
import { settingsApi } from '../api/settings'
import ActivityCard from '../components/ActivityCard.vue'
import ActivityForm from '../components/ActivityForm.vue'
import TailNode from '../components/TailNode.vue'

const store = usePipelineStore()
const route = useRoute()
const router = useRouter()

const searchQ = ref('')
const viewMode = ref('candidate')
const filterDrawerVisible = ref(false)
const expandedId = ref(null)
const activitiesMap = reactive({})
const loadingActivityId = ref(null)
const inlineMode = reactive({})
const inlineData = reactive({})
const emailConfigured = ref(false)
const emailConfigLoading = ref(false)
const filters = reactive({ job: '', stage: '', staleDays: null })
const editFormRef = ref(null)
const editingType = ref('note')
const editingLinkId = ref(null)
const editingActivityId = ref(null)
const editingContextLinkId = ref(null)

const WITHDRAW_REASONS = ['候选人主动放弃', '薪资谈不拢', '接受其他 Offer', '个人原因', '岗位暂停', '其他']
const staleDayOptions = [1, 3, 7, 14]

const jobOptions = computed(() => Array.from(new Set(store.activeLinks.map(l => l.job_title).filter(Boolean))).sort())
const stageOptions = computed(() => Array.from(new Set(store.activeLinks.map(l => l.stage).filter(Boolean))).sort())
const filteredLinks = computed(() => {
  const q = searchQ.value.trim().toLowerCase()
  return store.activeLinks.filter(l => {
    if (q) {
      const hit = (l.candidate_name || '').toLowerCase().includes(q) ||
        (l.job_title || '').toLowerCase().includes(q)
      if (!hit) return false
    }
    if (filters.job && l.job_title !== filters.job) return false
    if (filters.stage && l.stage !== filters.stage) return false
    if (filters.staleDays !== null && filters.staleDays !== '') {
      const days = Number(filters.staleDays)
      if ((l.days_since_update ?? -1) < days) return false
    }
    return true
  })
})

function getGroupMeta(link) {
  if (viewMode.value === 'job') {
    return { key: `job-${link.job_id}`, title: link.job_title || '未知岗位' }
  }
  if (viewMode.value === 'stage') {
    return { key: `stage-${link.stage || '未知阶段'}`, title: link.stage || '未知阶段' }
  }
  return { key: `candidate-${link.candidate_id}`, title: link.candidate_name || `候选人#${link.candidate_id}` }
}

const groupedLinks = computed(() => {
  const groups = {}
  for (const link of filteredLinks.value) {
    const { key, title } = getGroupMeta(link)
    if (!groups[key]) {
      groups[key] = { key, title, links: [] }
    }
    groups[key].links.push(link)
  }
  return Object.values(groups).sort((a, b) => a.title.localeCompare(b.title))
})
const inviteTooltip = computed(() => (emailConfigured.value ? '发送面试邀约邮件' : '请先在设置页配置邮件'))

function staleBadgeClass(link) {
  const days = link.days_since_update
  if (days >= 7) return 'stale-high'
  if (days >= 3) return 'stale-mid'
  return ''
}

function tailActivity(linkId) {
  const acts = activitiesMap[linkId] || []
  const chain = acts.filter(a => !['note', 'stage_change'].includes(a.type))
  return chain.length ? chain[chain.length - 1] : null
}

function historyActivities(linkId) {
  const acts = activitiesMap[linkId] || []
  const chain = acts.filter(a => !['note', 'stage_change'].includes(a.type))
  return chain.slice(0, -1)
}

async function toggleCard(link) {
  if (expandedId.value === link.id) {
    expandedId.value = null
    return
  }
  expandedId.value = link.id
  if (!activitiesMap[link.id]) {
    await loadActivities(link.id)
  }
}

async function loadActivities(linkId) {
  loadingActivityId.value = linkId
  try {
    activitiesMap[linkId] = await activitiesApi.list({ link_id: linkId })
  } finally {
    loadingActivityId.value = null
  }
}

async function refreshLink(link) {
  await loadActivities(link.id)
  await store.fetchActive()
  // Update the link in store with fresh stage
  const fresh = store.activeLinks.find(l => l.id === link.id)
  if (fresh) link.stage = fresh.stage
}

function openNoteForm(link) {
  inlineMode[link.id] = 'note'
  if (!inlineData[link.id]) inlineData[link.id] = {}
  inlineData[link.id].comment = ''
}

function openWithdrawForm(link) {
  inlineMode[link.id] = 'withdraw'
  if (!inlineData[link.id]) inlineData[link.id] = {}
  inlineData[link.id].reason = ''
  inlineData[link.id].comment = ''
}

function closeInlineForm(linkId) {
  delete inlineMode[linkId]
}

function resetFilters() {
  filters.job = ''
  filters.stage = ''
  filters.staleDays = null
}

function buildActivityPrefill(activity) {
  const p = activity.payload || {}
  return {
    actor: activity.actor || '',
    comment: p.comment || p.notes || activity.comment || '',
    conclusion: p.conclusion || activity.conclusion || '',
    rejection_reason: p.rejection_reason || activity.rejection_reason || '',
    round: p.round || activity.round || '',
    scheduled_at: p.scheduled_at ? new Date(p.scheduled_at) : (activity.scheduled_at ? new Date(activity.scheduled_at) : null),
    location: p.location || activity.location || '',
    status: p.status || activity.status || '',
    score: p.score || activity.score || 0,
    monthly_salary: p.monthly_salary ?? '',
    salary_months: p.salary_months ?? '',
    other_cash: p.other_cash || '',
    start_date: p.start_date ? new Date(p.start_date) : (activity.start_date ? new Date(activity.start_date) : null),
    salary: p.salary || activity.salary || '',
  }
}

async function openActivityEditor(activity, fallbackLinkId = null) {
  if (!['resume_review', 'interview', 'offer', 'background_check', 'onboard', 'note'].includes(activity.type)) {
    ElMessage.warning('该类型记录暂不支持编辑')
    return
  }
  editingType.value = activity.type
  editingLinkId.value = activity.link_id || fallbackLinkId
  editingActivityId.value = activity.id
  editingContextLinkId.value = editingLinkId.value
  await nextTick()
  editFormRef.value?.open(buildActivityPrefill(activity))
}

async function handleActivityEdited() {
  const linkId = editingContextLinkId.value
  if (linkId) {
    await loadActivities(linkId)
  }
  await store.fetchActive()
}

// ── 邀约邮件 ──────────────────────────────────────────────────
const sendingInvite = reactive({})

async function loadEmailConfigStatus() {
  emailConfigLoading.value = true
  try {
    const cfg = await settingsApi.getEmail()
    emailConfigured.value = Boolean(cfg.smtp_host && cfg.smtp_user && cfg.smtp_password_masked)
  } catch {
    emailConfigured.value = false
  } finally {
    emailConfigLoading.value = false
  }
}

async function sendInviteEmail(link) {
  if (!emailConfigured.value) {
    ElMessage.warning('请先在设置页完成 SMTP 配置')
    router.push('/settings')
    return
  }
  sendingInvite[link.id] = true
  try {
    await ElMessageBox.confirm(
      `确认向 ${link.candidate_name} 发送面试邀约邮件？`,
      '发送邀约邮件',
      { confirmButtonText: '发送', cancelButtonText: '取消', type: 'info' }
    )
    const res = await emailApi.sendInterviewInvite(link.id)
    ElMessage.success(`邀约邮件已发送至 ${res.sent_to}`)
  } catch (e) {
    if (e === 'cancel') return
    const detail = e.response?.data?.detail || ''
    if (detail === 'SMTP_NOT_CONFIGURED') {
      emailConfigured.value = false
      ElMessage.warning('请先在设置页配置邮件发送')
      router.push('/settings')
    } else if (detail.includes('未填写邮箱')) {
      ElMessage.warning('候选人未填写邮箱，无法发送')
    } else {
      ElMessage.error(detail || '邮件发送失败')
    }
  } finally {
    sendingInvite[link.id] = false
  }
}

// ── 简历摘要复制 ───────────────────────────────────────────────
function buildResumeSummary(cand, jobTitle) {
  const parts = []
  if (cand.name || cand.name_en) parts.push(cand.name || cand.name_en)
  const jobInfo = []
  if (cand.last_title) jobInfo.push(cand.last_title)
  if (cand.last_company) jobInfo.push(`@ ${cand.last_company}`)
  if (jobInfo.length) parts.push(jobInfo.join(' '))
  if (cand.years_exp) parts.push(`${cand.years_exp}年经验`)
  if (cand.education) parts.push(cand.education)
  if (cand.skill_tags && cand.skill_tags.length) parts.push(cand.skill_tags.join('、'))
  if (jobTitle) parts.push(`应聘：${jobTitle}`)
  return parts.join(' · ')
}

async function copyResumeSummary(link) {
  try {
    const cand = await candidatesApi.get(link.candidate_id)
    const text = buildResumeSummary(cand, link.job_title)
    await navigator.clipboard.writeText(text)
    ElMessage.success('已复制')
  } catch {
    ElMessage.error('复制失败')
  }
}

async function saveNote(link) {
  const comment = inlineData[link.id]?.comment?.trim()
  if (!comment) { ElMessage.warning('请输入备注内容'); return }
  await activitiesApi.create({ link_id: link.id, type: 'note', comment })
  closeInlineForm(link.id)
  await loadActivities(link.id)
  ElMessage.success('备注已保存')
}

async function saveWithdraw(link) {
  const reason = inlineData[link.id]?.reason
  if (!reason) { ElMessage.warning('请选择退出原因'); return }
  await pipelineApi.withdraw(link.id, {
    reason,
    comment: inlineData[link.id]?.comment || '',
  })
  closeInlineForm(link.id)
  store.removeLink(link.id)
  expandedId.value = null
  ElMessage.success('已标记退出')
}

async function refresh() {
  await store.fetchActive()
  await loadEmailConfigStatus()
  // Clear cached activities so they refresh on re-expand
  Object.keys(activitiesMap).forEach(k => delete activitiesMap[k])
}

async function expandLinkFromRoute() {
  const linkId = Number(route.query.link_id)
  if (!Number.isFinite(linkId) || linkId <= 0) return
  const target = store.activeLinks.find(l => l.id === linkId)
  if (!target) return
  expandedId.value = target.id
  if (!activitiesMap[target.id]) {
    await loadActivities(target.id)
  }
}

onMounted(async () => {
  await store.fetchActive()
  await loadEmailConfigStatus()
  await expandLinkFromRoute()
})

watch(
  () => route.query.link_id,
  async () => {
    await expandLinkFromRoute()
  }
)
</script>

<style scoped>
.pipeline-page { }

.page-toolbar {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 20px;
  flex-wrap: wrap;
}

.page-title {
  font-size: 18px;
  font-weight: 700;
  color: #222;
  flex: 1;
}

.count-badge {
  background: #e6f4ff;
  color: #1677ff;
  font-size: 13px;
  padding: 1px 8px;
  border-radius: 10px;
}

.loading-wrap { padding: 20px 0; }

.job-group {
  margin-bottom: 24px;
}

.job-group-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 0;
  border-bottom: 2px solid #e8e8e8;
  margin-bottom: 8px;
}

.job-title {
  font-size: 15px;
  font-weight: 700;
  color: #333;
}

.job-count {
  font-size: 12px;
  color: #888;
  background: #f0f0f0;
  padding: 1px 8px;
  border-radius: 10px;
}

.candidate-card {
  background: #fff;
  border: 1px solid #e8e8e8;
  border-radius: 10px;
  margin-bottom: 8px;
  overflow: hidden;
}

.candidate-card.is-expanded {
  border-color: #91caff;
  box-shadow: 0 2px 8px rgba(22, 119, 255, 0.1);
}

.cc-header {
  display: flex;
  align-items: center;
  padding: 12px 16px;
  cursor: pointer;
  transition: background 0.15s;
}

.cc-header:hover { background: #fafafa; }

.cc-left {
  display: flex;
  align-items: center;
  flex: 1;
  gap: 6px;
  min-width: 0;
}

.cc-name {
  font-weight: 600;
  font-size: 14px;
  color: #222;
}

.cc-sub {
  font-size: 12px;
  color: #888;
  max-width: 220px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.cc-right {
  display: flex;
  align-items: center;
  gap: 8px;
}

.days-badge {
  font-size: 11px;
  padding: 1px 6px;
  border-radius: 4px;
  background: #f5f5f5;
  color: #888;
}

.days-badge.stale-mid { background: #fff7e6; color: #fa8c16; }
.days-badge.stale-high { background: #fff1f0; color: #ff4d4f; }

.cc-chevron {
  color: #bbb;
  transition: transform 0.2s;
}

.cc-chevron.is-open { transform: rotate(180deg); }

.cc-expand {
  border-top: 1px solid #f0f0f0;
  padding: 16px;
}

.activity-timeline {
  margin-bottom: 12px;
}

.tail-area {
  margin-bottom: 12px;
}

.no-activities {
  color: #aaa;
  font-size: 13px;
  padding: 4px 0;
}

.inline-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  padding-top: 8px;
  border-top: 1px solid #f5f5f5;
  margin-top: 8px;
}

.inline-form-area {
  margin-top: 12px;
  padding: 14px;
  background: #fafafa;
  border-radius: 8px;
  border: 1px solid #e8e8e8;
}

.drawer-footer {
  display: flex;
  justify-content: flex-end;
  margin-top: 16px;
}
</style>
