<template>
  <div class="hired-page">
    <div class="page-toolbar">
      <h2 class="page-title">已入职 <span class="count-badge">{{ links.length }}</span></h2>
      <el-button :loading="loading" @click="fetchHired">刷新</el-button>
    </div>

    <div v-if="loading" class="loading-wrap">
      <el-skeleton :rows="5" animated />
    </div>

    <el-table v-else :data="links" style="width: 100%">
      <el-table-column label="候选人" width="130">
        <template #default="{ row }">
          <span style="font-weight: 600">{{ row.candidate_name }}</span>
        </template>
      </el-table-column>
      <el-table-column prop="job_title" label="岗位" min-width="140" />
      <el-table-column label="入职日期" width="120">
        <template #default="{ row }">
          {{ row.start_date ? formatDate(row.start_date) : '—' }}
        </template>
      </el-table-column>
      <el-table-column label="月薪" width="110">
        <template #default="{ row }">
          {{ row.monthly_salary ? `¥${Number(row.monthly_salary).toLocaleString()}` : '—' }}
        </template>
      </el-table-column>
      <el-table-column label="担保期状态" width="130">
        <template #default="{ row }">
          <el-tag :type="guaranteeTagType(row)" size="small">
            {{ guaranteeLabel(row) }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="供应商" width="120">
        <template #default="{ row }">{{ row.supplier_name || '—' }}</template>
      </el-table-column>
    </el-table>

    <el-empty v-if="!loading && !links.length" description="暂无已入职记录" />
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { pipelineApi } from '../api/pipeline'

const links = ref([])
const loading = ref(false)

async function fetchHired() {
  loading.value = true
  try {
    links.value = await pipelineApi.getHired()
  } finally {
    loading.value = false
  }
}

function formatDate(dt) {
  if (!dt) return ''
  return new Date(dt).toLocaleDateString('zh-CN')
}

function guaranteeLabel(row) {
  if (!row.guarantee_days || !row.start_date) return '无担保'
  const start = new Date(row.start_date)
  const expiry = new Date(start.getTime() + row.guarantee_days * 86400000)
  const now = new Date()
  if (now > expiry) return '已过保'
  const daysLeft = Math.ceil((expiry - now) / 86400000)
  if (daysLeft <= 7) return `${daysLeft}天到期`
  return `担保中 (${daysLeft}天)`
}

function guaranteeTagType(row) {
  if (!row.guarantee_days || !row.start_date) return 'info'
  const start = new Date(row.start_date)
  const expiry = new Date(start.getTime() + row.guarantee_days * 86400000)
  const now = new Date()
  if (now > expiry) return 'info'
  const daysLeft = Math.ceil((expiry - now) / 86400000)
  return daysLeft <= 7 ? 'warning' : 'success'
}

onMounted(fetchHired)
</script>

<style scoped>
.hired-page { }
.page-toolbar { display: flex; align-items: center; gap: 12px; margin-bottom: 20px; }
.page-title { font-size: 18px; font-weight: 700; color: #222; flex: 1; }
.count-badge { background: #f6ffed; color: #52c41a; font-size: 13px; padding: 1px 8px; border-radius: 10px; }
.loading-wrap { padding: 20px 0; }
</style>
