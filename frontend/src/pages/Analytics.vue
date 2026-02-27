<template>
  <div class="analytics-page">
    <div class="page-toolbar">
      <h2 class="page-title">洞察</h2>
      <el-radio-group v-model="period" @change="fetchData" size="small">
        <el-radio-button value="all">全部</el-radio-button>
        <el-radio-button value="year">本年</el-radio-button>
        <el-radio-button value="quarter">本季</el-radio-button>
        <el-radio-button value="month">本月</el-radio-button>
      </el-radio-group>
      <el-button @click="openWeeklyReport" :loading="reportLoading" size="small">生成周报</el-button>
      <el-button :loading="loading" @click="fetchData" size="small">刷新</el-button>
    </div>

    <div v-if="loading" class="loading-wrap">
      <el-skeleton :rows="8" animated />
    </div>

    <template v-else>
      <el-tabs v-model="activeTab">
        <!-- 总览 Tab -->
        <el-tab-pane label="总览" name="overview">
          <div class="stat-cards">
            <div class="stat-card">
              <strong>{{ data.overview?.in_progress ?? '--' }}</strong>
              <span>当前在途</span>
            </div>
            <div class="stat-card">
              <strong>{{ data.overview?.new_candidates ?? '--' }}</strong>
              <span>新增简历</span>
            </div>
            <div class="stat-card">
              <strong>{{ data.overview?.new_interviews ?? '--' }}</strong>
              <span>安排面试</span>
            </div>
            <div class="stat-card">
              <strong class="green">{{ data.overview?.new_hired ?? '--' }}</strong>
              <span>入职</span>
            </div>
            <div class="stat-card">
              <strong class="gray">{{ data.overview?.new_rejected ?? '--' }}</strong>
              <span>淘汰</span>
            </div>
          </div>

          <el-card style="margin-top: 20px" header="招聘漏斗">
            <div v-if="!data.funnel?.length" class="empty-text">暂无在途候选人</div>
            <div v-else class="funnel">
              <div v-for="stage in data.funnel" :key="stage.stage" class="funnel-row">
                <span class="funnel-label">{{ stage.stage }}</span>
                <div class="funnel-bar-wrap">
                  <div class="funnel-bar" :style="{ width: `${stage.pct}%`, background: stage.color }" />
                </div>
                <span class="funnel-count">{{ stage.count }}</span>
              </div>
            </div>
          </el-card>
        </el-tab-pane>

        <!-- 岗位分析 Tab -->
        <el-tab-pane label="岗位分析" name="jobs">
          <el-table :data="data.job_health || []" empty-text="暂无数据" style="width: 100%">
            <el-table-column prop="job_title" label="岗位" min-width="120">
              <template #default="{ row }">
                {{ row.job_title }}
                <el-tag v-if="row.job_status === 'closed'" type="info" size="small" style="margin-left: 4px">已关闭</el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="in_progress" label="在途" width="60" align="center" />
            <el-table-column prop="new_links" label="新增" width="60" align="center" />
            <el-table-column prop="hired" label="入职" width="60" align="center" />
            <el-table-column prop="rejected" label="淘汰" width="60" align="center" />
            <el-table-column label="进面率" width="80" align="center">
              <template #default="{ row }">
                {{ row.interview_rate != null ? row.interview_rate + '%' : '—' }}
              </template>
            </el-table-column>
            <el-table-column label="平均周期" width="80" align="center">
              <template #default="{ row }">
                {{ row.avg_days != null ? row.avg_days + '天' : '—' }}
              </template>
            </el-table-column>
            <el-table-column label="主要淘汰原因" min-width="120">
              <template #default="{ row }">
                {{ row.top_rejection_reason || '—' }}
              </template>
            </el-table-column>
          </el-table>
        </el-tab-pane>

        <!-- 渠道分析 Tab -->
        <el-tab-pane label="渠道分析" name="channels">
          <el-table :data="data.channel_roi || []" empty-text="暂无数据" style="width: 100%">
            <el-table-column prop="source" label="来源" min-width="120" />
            <el-table-column prop="candidates" label="候选人数" width="90" align="center" />
            <el-table-column prop="interviewed" label="进面数" width="80" align="center" />
            <el-table-column prop="hired" label="入职数" width="80" align="center" />
            <el-table-column label="猎头费合计" width="120" align="right">
              <template #default="{ row }">
                {{ row.fee_total != null ? '¥' + row.fee_total.toLocaleString() : '—' }}
              </template>
            </el-table-column>
          </el-table>
        </el-tab-pane>

        <!-- 淘汰分析 Tab -->
        <el-tab-pane label="淘汰分析" name="rejection">
          <div v-if="!data.rejection_dist?.length" class="empty-text">暂无淘汰数据</div>
          <div v-else class="rejection-list">
            <div v-for="item in data.rejection_dist" :key="item.reason" class="rejection-row">
              <span class="rejection-label">{{ item.reason }}</span>
              <div class="funnel-bar-wrap">
                <div class="funnel-bar" style="background: #ff7875" :style="{ width: `${item.pct}%` }" />
              </div>
              <span class="rejection-count">{{ item.count }}次</span>
            </div>
          </div>
        </el-tab-pane>
      </el-tabs>
    </template>

    <!-- 周报弹窗 -->
    <el-dialog v-model="reportDialogVisible" title="招聘周报" width="600px">
      <div v-if="reportLoading" style="text-align: center; padding: 20px">
        <el-skeleton :rows="6" animated />
      </div>
      <pre v-else class="report-text">{{ reportText }}</pre>
      <template #footer>
        <el-button @click="copyReport" type="primary">{{ copied ? '已复制' : '复制' }}</el-button>
        <el-button @click="reportDialogVisible = false">关闭</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { analyticsApi } from '../api/analytics'
import { ElMessage } from 'element-plus'

const loading = ref(false)
const data = ref({})
const period = ref('all')
const activeTab = ref('overview')

const reportDialogVisible = ref(false)
const reportLoading = ref(false)
const reportText = ref('')
const copied = ref(false)

async function fetchData() {
  loading.value = true
  try {
    data.value = await analyticsApi.getDashboard(period.value)
  } finally {
    loading.value = false
  }
}

async function openWeeklyReport() {
  reportDialogVisible.value = true
  reportLoading.value = true
  copied.value = false
  try {
    const res = await analyticsApi.getWeeklyReport(period.value)
    reportText.value = res.text || '暂无数据'
  } finally {
    reportLoading.value = false
  }
}

async function copyReport() {
  try {
    await navigator.clipboard.writeText(reportText.value)
    copied.value = true
    ElMessage.success('已复制')
    setTimeout(() => { copied.value = false }, 2000)
  } catch {
    ElMessage.error('复制失败，请手动复制')
  }
}

onMounted(fetchData)
</script>

<style scoped>
.analytics-page { }
.page-toolbar { display: flex; align-items: center; gap: 12px; margin-bottom: 20px; flex-wrap: wrap; }
.page-title { font-size: 18px; font-weight: 700; color: #222; flex: 1; }
.loading-wrap { padding: 20px 0; }
.empty-text { color: #aaa; font-size: 13px; padding: 20px 0; text-align: center; }

.stat-cards {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  gap: 12px;
  margin-bottom: 4px;
}

.stat-card {
  background: #fff;
  border: 1px solid #e8e8e8;
  border-radius: 10px;
  padding: 20px;
  text-align: center;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.stat-card strong {
  font-size: 28px;
  font-weight: 700;
  color: #1677ff;
}

.stat-card strong.green { color: #52c41a; }
.stat-card strong.gray { color: #8c8c8c; }

.stat-card span {
  font-size: 13px;
  color: #888;
}

.funnel { display: flex; flex-direction: column; gap: 10px; }

.funnel-row {
  display: flex;
  align-items: center;
  gap: 12px;
}

.funnel-label {
  width: 70px;
  font-size: 13px;
  color: #555;
  text-align: right;
  flex-shrink: 0;
}

.funnel-bar-wrap {
  flex: 1;
  height: 22px;
  background: #f5f5f5;
  border-radius: 4px;
  overflow: hidden;
}

.funnel-bar {
  height: 100%;
  border-radius: 4px;
  transition: width 0.3s;
  min-width: 4px;
}

.funnel-count {
  width: 30px;
  font-size: 13px;
  color: #333;
  font-weight: 600;
  text-align: right;
  flex-shrink: 0;
}

.rejection-list { display: flex; flex-direction: column; gap: 10px; }

.rejection-row {
  display: flex;
  align-items: center;
  gap: 12px;
}

.rejection-label {
  width: 100px;
  font-size: 13px;
  color: #555;
  text-align: right;
  flex-shrink: 0;
}

.rejection-count {
  width: 44px;
  font-size: 13px;
  color: #333;
  font-weight: 600;
  text-align: right;
  flex-shrink: 0;
}

.report-text {
  white-space: pre-wrap;
  font-family: inherit;
  font-size: 14px;
  line-height: 1.8;
  background: #f9f9f9;
  border-radius: 6px;
  padding: 16px;
  margin: 0;
  color: #333;
}
</style>
