<template>
  <div class="pipeline-page">
    <div class="page-toolbar">
      <h2 class="page-title">进行中 <span class="count-badge">{{ store.activeLinks.length }}</span></h2>
      <el-input
        v-model="searchQ"
        placeholder="搜索候选人/岗位..."
        clearable
        style="width: 220px"
        @input="debouncedSearch"
      />
      <el-button :loading="store.loading" @click="refresh">刷新</el-button>
    </div>

    <div v-if="store.loading && !store.activeLinks.length" class="loading-wrap">
      <el-skeleton :rows="6" animated />
    </div>

    <!-- Group by job -->
    <div v-for="group in groupedByJob" :key="group.jobId" class="job-group">
      <div class="job-group-header">
        <span class="job-title">{{ group.jobTitle }}</span>
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
            <el-tag size="small" type="info" style="margin-left: 8px">{{ link.stage }}</el-tag>
            <el-icon v-if="link.starred"><Star /></el-icon>
          </div>
          <div class="cc-right">
            <span v-if="link.days_since_update !== null" class="days-badge" :class="staleBadgeClass(link)">
              {{ link.days_since_update }}天前
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
              />
              <div v-else class="no-activities">暂无活动记录</div>
            </div>

            <!-- Inline action buttons (always shown) -->
            <div class="inline-actions">
              <el-button size="small" plain @click="openNoteForm(link)">+ 备注</el-button>
              <el-button size="small" plain type="warning" @click="openWithdrawForm(link)">退出</el-button>
              <el-button size="small" plain type="danger" @click="openRejectForm(link)">淘汰</el-button>
              <el-button size="small" plain @click="copyResumeSummary(link)">复制简历摘要</el-button>
              <el-tooltip content="请先在设置页配置邮件" placement="top" :disabled="true">
                <el-button
                  size="small"
                  plain
                  type="primary"
                  :loading="sendingInvite[link.id]"
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

              <!-- Reject -->
              <template v-if="inlineMode[link.id] === 'reject'">
                <el-select
                  v-model="inlineData[link.id].reason"
                  placeholder="选择淘汰原因"
                  style="width: 100%; margin-bottom: 8px"
                >
                  <el-option v-for="r in REJECT_REASONS" :key="r" :label="r" :value="r" />
                </el-select>
                <el-input
                  v-model="inlineData[link.id].comment"
                  placeholder="补充说明（选填）"
                  style="margin-bottom: 8px"
                />
                <div style="display: flex; gap: 8px">
                  <el-button size="small" type="danger" @click="saveReject(link)">确认淘汰</el-button>
                  <el-button size="small" @click="closeInlineForm(link.id)">取消</el-button>
                </div>
              </template>
            </div>
          </template>
        </div>
      </div>
    </div>

    <el-empty v-if="!store.loading && !filteredLinks.length" description="暂无进行中的候选人" />
  </div>
</template>

<script setup>
import { ref, computed, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { usePipelineStore } from '../stores/pipeline'
import { activitiesApi } from '../api/activities'
import { pipelineApi } from '../api/pipeline'
import { candidatesApi } from '../api/candidates'
import { emailApi } from '../api/email'
import ActivityCard from '../components/ActivityCard.vue'
import TailNode from '../components/TailNode.vue'

const store = usePipelineStore()

const searchQ = ref('')
const expandedId = ref(null)
const activitiesMap = reactive({})
const loadingActivityId = ref(null)
const inlineMode = reactive({})
const inlineData = reactive({})
const rejectedLinks = reactive(new Set())  // 记录刚被淘汰的 link，展示复制拒信

const WITHDRAW_REASONS = ['候选人主动放弃', '薪资谈不拢', '接受其他 Offer', '个人原因', '岗位暂停', '其他']
const REJECT_REASONS = ['技术能力不达标', '经验不匹配', '文化/价值观不符', '背调有问题', '薪资期望过高', '其他']

const filteredLinks = computed(() => {
  if (!searchQ.value) return store.activeLinks
  const q = searchQ.value.toLowerCase()
  return store.activeLinks.filter(l =>
    (l.candidate_name || '').toLowerCase().includes(q) ||
    (l.job_title || '').toLowerCase().includes(q)
  )
})

const groupedByJob = computed(() => {
  const groups = {}
  for (const link of filteredLinks.value) {
    const key = link.job_id
    if (!groups[key]) {
      groups[key] = { jobId: key, jobTitle: link.job_title || '未知岗位', links: [] }
    }
    groups[key].links.push(link)
  }
  return Object.values(groups).sort((a, b) => a.jobTitle.localeCompare(b.jobTitle))
})

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

function openRejectForm(link) {
  inlineMode[link.id] = 'reject'
  if (!inlineData[link.id]) inlineData[link.id] = {}
  inlineData[link.id].reason = ''
  inlineData[link.id].comment = ''
}

function closeInlineForm(linkId) {
  delete inlineMode[linkId]
}

// ── 邀约邮件 ──────────────────────────────────────────────────
const sendingInvite = reactive({})

async function sendInviteEmail(link) {
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
      ElMessage.warning('请先在设置页配置邮件发送')
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

// ── 拒信复制 ──────────────────────────────────────────────────
const DEFAULT_REJECTION_TEMPLATE = `尊敬的 {{candidate_name}}，\n\n感谢您对【{{job_title}}】职位的关注和投入。\n\n经过慎重评估，我们遗憾地通知您，本次未能与您进一步推进流程。希望您在求职过程中一切顺利。\n\n祝好，\n招聘团队`

async function copyRejectionText(link) {
  // 尝试从 settings 读取模板，失败则用默认
  let template = DEFAULT_REJECTION_TEMPLATE
  try {
    const { settingsApi } = await import('../api/settings')
    const cfg = await settingsApi.getEmail()
    if (cfg.rejection_template) template = cfg.rejection_template
  } catch {}
  const text = template
    .replace(/\{\{candidate_name\}\}/g, link.candidate_name || '')
    .replace(/\{\{job_title\}\}/g, link.job_title || '')
  try {
    await navigator.clipboard.writeText(text)
    ElMessage.success('已复制')
  } catch {
    ElMessage.error('复制失败，请手动复制')
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

async function saveReject(link) {
  const reason = inlineData[link.id]?.reason
  if (!reason) { ElMessage.warning('请选择淘汰原因'); return }
  await pipelineApi.reject(link.id, {
    reason,
    comment: inlineData[link.id]?.comment || '',
  })
  closeInlineForm(link.id)
  store.removeLink(link.id)
  expandedId.value = null
  ElMessage.success('已标记淘汰')
  // 淘汰后提示复制拒信
  try {
    await ElMessageBox.confirm('是否复制拒信文本？', '淘汰成功', {
      confirmButtonText: '复制拒信',
      cancelButtonText: '跳过',
      type: 'success',
    })
    await copyRejectionText(link)
  } catch {}
}

async function refresh() {
  await store.fetchActive()
  // Clear cached activities so they refresh on re-expand
  Object.keys(activitiesMap).forEach(k => delete activitiesMap[k])
}

onMounted(() => {
  store.fetchActive()
})
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
</style>
