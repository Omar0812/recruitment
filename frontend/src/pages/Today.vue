<template>
  <div class="today-page">
    <!-- Week summary -->
    <div class="week-summary">
      <div class="ws-item">
        <strong>{{ weekSummary.in_progress ?? '--' }}</strong>
        <span>进行中</span>
      </div>
      <div class="ws-item">
        <strong>{{ weekSummary.interviews_this_week ?? '--' }}</strong>
        <span>本周面试</span>
      </div>
      <div class="ws-item">
        <strong>{{ weekSummary.offers_pending ?? '--' }}</strong>
        <span>待跟进 Offer</span>
      </div>
      <div class="ws-item">
        <strong>{{ weekSummary.hired_this_week ?? '--' }}</strong>
        <span>本周入职</span>
      </div>
      <el-button
        size="small"
        :loading="store.loading"
        @click="store.fetchToday()"
        style="margin-left: auto"
      >刷新</el-button>
    </div>

    <div v-if="store.loading" class="loading-wrap">
      <el-skeleton :rows="5" animated />
    </div>

    <template v-else>
      <!-- P0 -->
      <section v-if="p0.length" class="today-section">
        <div class="section-header section-header--p0">
          <span class="priority-badge">P0</span> 今天需要处理
        </div>
        <div v-for="item in p0" :key="`p0-${item.activity_id}`" class="today-card">
          <!-- Interview today -->
          <template v-if="item.type === 'interview_today'">
            <div class="tc-header" @click="toggleExpand(item)">
              <div class="tc-main">
                <span class="tc-candidate">{{ item.candidate_name }}</span>
                <el-tag size="small" type="primary" style="margin-left: 8px">
                  {{ item.stage }}
                </el-tag>
                <span class="tc-job">{{ item.job_title }}</span>
              </div>
              <div class="tc-meta">
                <el-icon><Calendar /></el-icon>
                {{ formatScheduled(item.scheduled_at) }}
                <span v-if="item.interviewer"> · {{ item.interviewer }}</span>
                <span v-if="item.location"> · {{ item.location }}</span>
              </div>
              <el-icon class="tc-chevron"><ArrowDown /></el-icon>
            </div>
            <div v-if="item._expanded" class="tc-expand">
              <div v-if="item.last_interview_summary" class="tc-prev-summary">
                <strong>上轮面评：</strong>
                {{ item.last_interview_summary.round }}
                <template v-if="item.last_interview_summary.score">
                  · {{ '★'.repeat(item.last_interview_summary.score) }}
                </template>
                {{ item.last_interview_summary.conclusion }}
                <span v-if="item.last_interview_summary.comment">
                  · {{ item.last_interview_summary.comment }}
                </span>
              </div>
              <div class="tc-actions">
                <el-button size="small" type="primary" @click="openFeedbackForm(item)">
                  填写面评
                </el-button>
                <el-button size="small" @click="goToPipeline(item)">
                  查看详情
                </el-button>
              </div>
            </div>
          </template>

          <!-- Offer waiting -->
          <template v-else-if="item.type === 'offer_waiting'">
            <div class="tc-header" @click="toggleExpand(item)">
              <div class="tc-main">
                <span class="tc-candidate">{{ item.candidate_name }}</span>
                <el-tag size="small" type="warning" style="margin-left: 8px">Offer 等待中</el-tag>
                <span class="tc-job">{{ item.job_title }}</span>
              </div>
              <div class="tc-meta">
                已发出 {{ item.offer_days }} 天
                <template v-if="item.monthly_salary"> · {{ item.monthly_salary }}/月</template>
              </div>
              <el-icon class="tc-chevron"><ArrowDown /></el-icon>
            </div>
            <div v-if="item._expanded" class="tc-expand">
              <div class="tc-actions">
                <el-button size="small" type="primary" @click="openOfferConclusionForm(item)">
                  更新结论
                </el-button>
              </div>
            </div>
          </template>
        </div>
      </section>

      <!-- P1 -->
      <section v-if="p1.length" class="today-section">
        <div class="section-header section-header--p1">
          <span class="priority-badge priority-badge--p1">P1</span> 需要跟进
        </div>
        <div v-for="item in p1" :key="`p1-${item.type}-${item.activity_id || item.link_id}`" class="today-card today-card--p1">
          <template v-if="item.type === 'interview_feedback_missing'">
            <div class="tc-header">
              <div class="tc-main">
                <span class="tc-candidate">{{ item.candidate_name }}</span>
                <el-tag size="small" type="warning" style="margin-left: 8px">待填面评</el-tag>
                <span class="tc-job">{{ item.job_title }}</span>
              </div>
              <div class="tc-meta">面试已过 {{ item.days_missing }} 天</div>
              <el-button size="small" type="warning" plain @click="openFeedbackForm(item)">
                填写面评
              </el-button>
            </div>
          </template>
          <template v-else-if="item.type === 'pipeline_stale'">
            <div class="tc-header">
              <div class="tc-main">
                <span class="tc-candidate">{{ item.candidate_name }}</span>
                <el-tag size="small" type="info" style="margin-left: 8px">停滞 {{ item.days_stale }} 天</el-tag>
                <span class="tc-job">{{ item.job_title }}</span>
              </div>
              <div class="tc-meta">阶段：{{ item.stage }}</div>
              <el-button size="small" plain @click="goToPipeline(item)">查看</el-button>
            </div>
          </template>
          <template v-else-if="item.type === 'guarantee_expiring'">
            <div class="tc-header">
              <div class="tc-main">
                <span class="tc-candidate">{{ item.candidate_name }}</span>
                <el-tag size="small" type="warning" style="margin-left: 8px">担保期 {{ item.days_left }} 天到期</el-tag>
                <span class="tc-job">{{ item.job_title }}</span>
              </div>
              <div class="tc-meta">
                来源：{{ item.supplier_name }} · 到期：{{ item.expiry_date }}
              </div>
              <el-button size="small" plain @click="goToHired">查看已入职</el-button>
            </div>
          </template>
        </div>
      </section>

      <!-- P2 -->
      <section v-if="p2.length" class="today-section">
        <div class="section-header section-header--p2">
          <span class="priority-badge priority-badge--p2">P2</span> 待处理
        </div>
        <div v-for="item in p2" :key="`p2-${item.type}`" class="today-card today-card--p2">
          <template v-if="item.type === 'unassigned_candidates'">
            <div class="tc-header">
              <div class="tc-main">
                <span>{{ item.candidates.length }} 位候选人未分配岗位</span>
              </div>
              <el-button size="small" @click="goToTalent">去人才库</el-button>
            </div>
            <div class="unassigned-list">
              <el-tag
                v-for="c in item.candidates.slice(0, 8)"
                :key="c.id"
                size="small"
                style="margin: 2px"
              >
                {{ c.name }}
              </el-tag>
              <span v-if="item.candidates.length > 8" style="font-size: 12px; color: #999">
                等 {{ item.candidates.length }} 人
              </span>
            </div>
          </template>
        </div>
      </section>

      <!-- Empty state -->
      <div v-if="!p0.length && !p1.length && !p2.length" class="empty-state">
        <el-empty description="今天没有待处理事项 🎉" />
      </div>
    </template>

    <!-- Activity form for filling in interview feedback -->
    <ActivityForm
      ref="activityFormRef"
      type="interview"
      :link-id="selectedLinkId"
      :activity-id="selectedActivityId"
      @saved="onActivitySaved"
    />

    <!-- Offer conclusion form -->
    <el-dialog
      v-model="offerDialogVisible"
      title="更新 Offer 结论"
      width="380px"
    >
      <el-form label-width="60px">
        <el-form-item label="结论">
          <el-select v-model="offerConclusion" style="width: 100%">
            <el-option label="接受" value="接受" />
            <el-option label="拒绝" value="拒绝" />
            <el-option label="谈判中" value="谈判中" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="offerDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="offerLoading" @click="saveOfferConclusion">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { useTodayStore } from '../stores/today'
import { activitiesApi } from '../api/activities'
import ActivityForm from '../components/ActivityForm.vue'

const store = useTodayStore()
const router = useRouter()

const p0 = computed(() => store.todayItems.filter(t => t.priority === 'P0'))
const p1 = computed(() => store.todayItems.filter(t => t.priority === 'P1'))
const p2 = computed(() => store.todayItems.filter(t => t.priority === 'P2'))
const weekSummary = computed(() => store.weekSummary)

const activityFormRef = ref(null)
const selectedLinkId = ref(null)
const selectedActivityId = ref(null)
const offerDialogVisible = ref(false)
const offerConclusion = ref('')
const offerLoading = ref(false)
const selectedOfferItem = ref(null)

function toggleExpand(item) {
  item._expanded = !item._expanded
}

function formatScheduled(dt) {
  if (!dt) return ''
  const d = new Date(dt)
  const today = new Date()
  const isToday = d.toDateString() === today.toDateString()
  const prefix = isToday ? '今天' : '明天'
  return `${prefix} ${d.getHours().toString().padStart(2,'0')}:${d.getMinutes().toString().padStart(2,'0')}`
}

function openFeedbackForm(item) {
  selectedLinkId.value = item.link_id
  selectedActivityId.value = item.activity_id
  activityFormRef.value?.open({
    round: item.stage || '',
  })
}

function openOfferConclusionForm(item) {
  selectedOfferItem.value = item
  offerConclusion.value = ''
  offerDialogVisible.value = true
}

async function saveOfferConclusion() {
  if (!offerConclusion.value) {
    ElMessage.warning('请选择结论')
    return
  }
  offerLoading.value = true
  try {
    await activitiesApi.update(selectedOfferItem.value.activity_id, {
      conclusion: offerConclusion.value,
    })
    offerDialogVisible.value = false
    ElMessage.success('已更新')
    store.fetchToday()
  } finally {
    offerLoading.value = false
  }
}

function goToPipeline(item) {
  router.push('/pipeline')
}

function goToTalent() {
  router.push('/talent')
}

function goToHired() {
  router.push('/hired')
}

function onActivitySaved() {
  store.fetchToday()
}

onMounted(() => {
  store.fetchToday()
})
</script>

<style scoped>
.today-page {
  max-width: 800px;
  margin: 0 auto;
}

.week-summary {
  display: flex;
  gap: 24px;
  align-items: center;
  background: #fff;
  border-radius: 10px;
  padding: 16px 20px;
  margin-bottom: 20px;
  box-shadow: 0 1px 4px rgba(0,0,0,0.06);
}

.ws-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  min-width: 60px;
}

.ws-item strong {
  font-size: 22px;
  font-weight: 700;
  color: #1677ff;
}

.ws-item span {
  font-size: 12px;
  color: #888;
}

.loading-wrap { padding: 20px 0; }

.today-section { margin-bottom: 20px; }

.section-header {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  font-weight: 600;
  color: #333;
  padding: 8px 0;
  margin-bottom: 8px;
}

.priority-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 20px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 700;
  background: #ff4d4f;
  color: #fff;
}

.priority-badge--p1 { background: #fa8c16; }
.priority-badge--p2 { background: #8c8c8c; }

.today-card {
  background: #fff;
  border: 1px solid #e8e8e8;
  border-radius: 10px;
  margin-bottom: 8px;
  overflow: hidden;
  transition: box-shadow 0.15s;
}

.today-card:hover { box-shadow: 0 2px 8px rgba(0,0,0,0.08); }
.today-card--p1 { border-left: 3px solid #fa8c16; }
.today-card--p2 { border-left: 3px solid #d9d9d9; }

.tc-header {
  display: flex;
  align-items: center;
  padding: 12px 16px;
  cursor: pointer;
  gap: 12px;
  flex-wrap: wrap;
}

.tc-main {
  display: flex;
  align-items: center;
  gap: 6px;
  flex: 1;
  min-width: 0;
}

.tc-candidate {
  font-weight: 600;
  font-size: 15px;
  color: #222;
  white-space: nowrap;
}

.tc-job {
  font-size: 13px;
  color: #888;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.tc-meta {
  font-size: 13px;
  color: #666;
  display: flex;
  align-items: center;
  gap: 4px;
}

.tc-chevron {
  color: #bbb;
  flex-shrink: 0;
}

.tc-expand {
  border-top: 1px solid #f0f0f0;
  padding: 12px 16px;
  background: #fafafa;
}

.tc-prev-summary {
  font-size: 13px;
  color: #555;
  margin-bottom: 10px;
  line-height: 1.5;
}

.tc-actions {
  display: flex;
  gap: 8px;
}

.unassigned-list {
  padding: 8px 16px 12px;
}

.empty-state {
  padding: 60px 0;
  text-align: center;
}
</style>
