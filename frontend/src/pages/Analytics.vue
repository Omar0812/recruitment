<template>
  <div class="analytics-page">
    <div class="page-toolbar">
      <h2 class="page-title">数据分析</h2>
      <el-button :loading="loading" @click="fetchData">刷新</el-button>
    </div>

    <div v-if="loading" class="loading-wrap">
      <el-skeleton :rows="6" animated />
    </div>

    <template v-else>
      <!-- Week summary cards -->
      <div class="stat-cards">
        <div class="stat-card">
          <strong>{{ summary.in_progress ?? '--' }}</strong>
          <span>进行中候选人</span>
        </div>
        <div class="stat-card">
          <strong>{{ summary.interviews_this_week ?? '--' }}</strong>
          <span>本周面试</span>
        </div>
        <div class="stat-card">
          <strong>{{ summary.offers_pending ?? '--' }}</strong>
          <span>待回复 Offer</span>
        </div>
        <div class="stat-card">
          <strong>{{ summary.hired_this_week ?? '--' }}</strong>
          <span>本周入职</span>
        </div>
      </div>

      <!-- Funnel -->
      <el-card style="margin-top: 20px" header="招聘漏斗">
        <div class="funnel">
          <div v-for="stage in funnel" :key="stage.label" class="funnel-row">
            <span class="funnel-label">{{ stage.label }}</span>
            <div class="funnel-bar-wrap">
              <div
                class="funnel-bar"
                :style="{ width: `${stage.pct}%`, background: stage.color }"
              />
            </div>
            <span class="funnel-count">{{ stage.count }}</span>
          </div>
        </div>
      </el-card>
    </template>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { insightsApi } from '../api/insights'
import { pipelineApi } from '../api/pipeline'

const loading = ref(false)
const summary = ref({})
const activeLinks = ref([])

async function fetchData() {
  loading.value = true
  try {
    const [insightData, linksData] = await Promise.all([
      insightsApi.getToday(),
      pipelineApi.getActive(),
    ])
    summary.value = insightData.week_summary || {}
    activeLinks.value = linksData || []
  } finally {
    loading.value = false
  }
}

const funnel = computed(() => {
  const stageCounts = {}
  for (const l of activeLinks.value) {
    if (l.stage) stageCounts[l.stage] = (stageCounts[l.stage] || 0) + 1
  }
  const stageOrder = ['简历筛选', '电话初筛', '面试', 'Offer', '背调', '入职']
  const total = Object.values(stageCounts).reduce((a, b) => a + b, 0) || 1
  const colors = ['#1677ff', '#13c2c2', '#722ed1', '#d4380d', '#fa8c16', '#52c41a']
  return stageOrder
    .filter(s => stageCounts[s] > 0)
    .map((s, i) => ({
      label: s,
      count: stageCounts[s],
      pct: Math.round((stageCounts[s] / total) * 100),
      color: colors[i % colors.length],
    }))
})

onMounted(fetchData)
</script>

<style scoped>
.analytics-page { }
.page-toolbar { display: flex; align-items: center; gap: 12px; margin-bottom: 20px; }
.page-title { font-size: 18px; font-weight: 700; color: #222; flex: 1; }
.loading-wrap { padding: 20px 0; }

.stat-cards {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
  gap: 12px;
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
</style>
