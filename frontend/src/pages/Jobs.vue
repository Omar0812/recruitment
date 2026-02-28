<template>
  <div class="jobs-page">
    <div class="page-toolbar">
      <h2 class="page-title">岗位管理</h2>
      <el-input v-model="searchQ" placeholder="搜索岗位..." clearable style="width: 200px" @input="debouncedFetch" />
      <el-select v-model="filterStatus" style="width: 110px" @change="fetchJobs">
        <el-option label="招募中" value="open" />
        <el-option label="全部" value="all" />
      </el-select>
      <el-button type="primary" @click="openJobForm(null)">+ 新建岗位</el-button>
    </div>

    <div v-if="loading" class="loading-wrap">
      <el-skeleton :rows="5" animated />
    </div>

    <el-table v-else :data="jobs" row-key="id" style="width: 100%">
      <el-table-column label="岗位名称" min-width="160">
        <template #default="{ row }">
          <span class="job-title-cell">{{ row.title }}</span>
          <el-tag v-if="row.status === 'closed'" type="info" size="small" style="margin-left: 6px">已关闭</el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="department" label="部门" width="110" />
      <el-table-column prop="city" label="城市" width="90" />
      <el-table-column prop="hr_owner" label="HR" width="90" />
      <el-table-column label="优先级" width="80">
        <template #default="{ row }">
          <el-tag
            v-if="row.priority"
            :type="{ P0: 'danger', P1: 'warning', P2: 'info' }[row.priority] || 'info'"
            size="small"
          >{{ row.priority }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="在途/招聘目标" width="120" align="center">
        <template #default="{ row }">
          {{ row.active_count }} / {{ row.headcount || 1 }}
        </template>
      </el-table-column>
      <el-table-column label="本周入职" width="90" align="center" prop="hired_count" />
      <el-table-column label="操作" width="180" align="right">
        <template #default="{ row }">
          <el-button size="small" plain @click="openJobForm(row)">编辑</el-button>
          <el-button size="small" plain @click="copyJob(row)">复制</el-button>
          <el-button
            v-if="row.status !== 'closed'"
            size="small"
            plain
            type="danger"
            @click="handleClose(row)"
          >关闭</el-button>
          <el-button
            v-else
            size="small"
            plain
            type="success"
            @click="handleReopen(row)"
          >重开</el-button>
        </template>
      </el-table-column>
    </el-table>

    <el-empty v-if="!loading && !jobs.length" description="暂无岗位" />

    <!-- Job form dialog -->
    <el-dialog
      v-model="formVisible"
      :title="editJob ? '编辑岗位' : '新建岗位'"
      width="560px"
      :close-on-click-modal="false"
    >
      <el-form :model="form" label-width="90px" size="default">
        <el-form-item label="岗位名称" required>
          <el-input v-model="form.title" placeholder="如：高级前端工程师" />
        </el-form-item>
        <el-form-item label="部门">
          <el-input v-model="form.department" />
        </el-form-item>
        <el-form-item label="HR 负责人">
          <el-input v-model="form.hr_owner" />
        </el-form-item>
        <el-form-item label="城市">
          <el-input v-model="form.city" />
        </el-form-item>
        <el-form-item label="岗位类型">
          <el-select v-model="form.employment_type" placeholder="请选择" style="width: 100%">
            <el-option label="全职" value="全职" />
            <el-option label="兼职" value="兼职" />
            <el-option label="实习" value="实习" />
          </el-select>
        </el-form-item>
        <el-form-item label="优先级">
          <el-select v-model="form.priority" placeholder="请选择" style="width: 100%">
            <el-option label="P0 - 紧急" value="P0" />
            <el-option label="P1 - 重要" value="P1" />
            <el-option label="P2 - 普通" value="P2" />
          </el-select>
        </el-form-item>
        <el-form-item label="招聘人数">
          <el-input-number v-model="form.headcount" :min="1" />
        </el-form-item>
        <el-form-item label="目标入职">
          <el-date-picker v-model="form.target_onboard_date" type="date" style="width: 100%" />
        </el-form-item>
        <el-form-item label="岗位描述">
          <el-input v-model="form.jd" type="textarea" :rows="4" />
        </el-form-item>
        <el-form-item label="画像要求">
          <el-input v-model="form.persona" type="textarea" :rows="3" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="formVisible = false">取消</el-button>
        <el-button type="primary" :loading="formLoading" @click="saveJob">保存</el-button>
      </template>
    </el-dialog>

    <!-- Close job dialog -->
    <el-dialog v-model="closeDialogVisible" title="关闭岗位" width="420px">
      <p style="color: #555; margin-bottom: 12px">
        关闭后，所有在途候选人将被标记为退出。
      </p>
      <div v-if="activeInJob.length">
        <p style="color: #888; font-size: 13px; margin-bottom: 8px">
          当前在途候选人（{{ activeInJob.length }} 人）：
        </p>
        <el-tag v-for="c in activeInJob" :key="c.link_id" size="small" style="margin: 2px">
          {{ c.candidate_name }}
        </el-tag>
      </div>
      <template #footer>
        <el-button @click="closeDialogVisible = false">取消</el-button>
        <el-button type="danger" :loading="formLoading" @click="confirmClose">批量退出并关闭</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { jobsApi } from '../api/jobs'
import { debounce } from '../api/utils'

const jobs = ref([])
const loading = ref(false)
const formLoading = ref(false)
const searchQ = ref('')
const filterStatus = ref('open')
const formVisible = ref(false)
const closeDialogVisible = ref(false)
const editJob = ref(null)
const closingJob = ref(null)
const activeInJob = ref([])

const form = reactive({
  title: '', department: '', hr_owner: '', city: '',
  employment_type: '', priority: '', headcount: 1,
  target_onboard_date: null, jd: '', persona: '',
})

async function fetchJobs() {
  loading.value = true
  try {
    const params = {
      include_closed: filterStatus.value === 'all',
      q: searchQ.value || undefined,
    }
    jobs.value = await jobsApi.list(params)
  } finally {
    loading.value = false
  }
}

const debouncedFetch = debounce(fetchJobs, 250)

function openJobForm(job) {
  editJob.value = job
  if (job) {
    Object.assign(form, {
      title: job.title || '', department: job.department || '',
      hr_owner: job.hr_owner || '', city: job.city || '',
      employment_type: job.employment_type || '', priority: job.priority || '',
      headcount: job.headcount || 1,
      target_onboard_date: job.target_onboard_date ? new Date(job.target_onboard_date) : null,
      jd: job.jd || '', persona: job.persona || '',
    })
  } else {
    Object.assign(form, {
      title: '', department: '', hr_owner: '', city: '',
      employment_type: '', priority: '', headcount: 1,
      target_onboard_date: null, jd: '', persona: '',
    })
  }
  formVisible.value = true
}

function copyJob(job) {
  openJobForm({ ...job, id: null, title: `${job.title}（复制）` })
  editJob.value = null // treat as new
}

async function saveJob() {
  if (!form.title.trim()) { ElMessage.warning('请填写岗位名称'); return }
  formLoading.value = true
  const payload = { ...form }
  if (payload.target_onboard_date instanceof Date) {
    const d = payload.target_onboard_date
    payload.target_onboard_date = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  }
  try {
    if (editJob.value) {
      await jobsApi.update(editJob.value.id, payload)
    } else {
      await jobsApi.create(payload)
    }
    formVisible.value = false
    ElMessage.success('保存成功')
    await fetchJobs()
  } finally {
    formLoading.value = false
  }
}

async function handleClose(job) {
  // Check for active candidates
  const res = await jobsApi.close(job.id, {})
  if (res.requires_action) {
    activeInJob.value = res.active_candidates || []
    closingJob.value = job
    closeDialogVisible.value = true
  } else {
    ElMessage.success('岗位已关闭')
    await fetchJobs()
  }
}

async function confirmClose() {
  formLoading.value = true
  try {
    await jobsApi.close(closingJob.value.id, { bulk: true })
    closeDialogVisible.value = false
    ElMessage.success('岗位已关闭，在途候选人已退出')
    await fetchJobs()
  } finally {
    formLoading.value = false
  }
}

async function handleReopen(job) {
  await jobsApi.reopen(job.id)
  ElMessage.success('岗位已重新开放')
  await fetchJobs()
}

onMounted(fetchJobs)
</script>

<style scoped>
.jobs-page { }

.page-toolbar {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 20px;
  flex-wrap: wrap;
}

.page-title {
  font-size: 18px;
  font-weight: 700;
  color: #222;
  flex: 1;
}

.loading-wrap { padding: 20px 0; }

.job-title-cell {
  font-weight: 600;
  color: #222;
}
</style>
