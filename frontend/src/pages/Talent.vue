<template>
  <div class="talent-page">
    <div class="page-toolbar">
      <h2 class="page-title">人才库 <span class="count-badge">{{ candidates.length }}</span></h2>
      <el-input
        v-model="searchQ"
        placeholder="搜索姓名/手机/邮箱..."
        clearable
        style="width: 220px"
        @input="debouncedFetch"
      />
      <el-select v-model="filterEducation" placeholder="学历" clearable style="width: 110px" @change="fetchCandidates">
        <el-option label="本科" value="本科" />
        <el-option label="硕士" value="硕士" />
        <el-option label="博士" value="博士" />
        <el-option label="大专" value="大专" />
      </el-select>
      <el-select v-model="filterFollowup" placeholder="跟进状态" clearable style="width: 120px" @change="fetchCandidates">
        <el-option label="待联系" value="pending" />
        <el-option label="已联系" value="contacted" />
        <el-option label="感兴趣" value="interested" />
        <el-option label="暂不考虑" value="not_now" />
      </el-select>
      <el-checkbox v-model="filterStarred" label="只看星标" @change="fetchCandidates" />
      <el-button type="primary" @click="createDialogVisible = true">新建候选人</el-button>
    </div>

    <div v-if="loading" class="loading-wrap">
      <el-skeleton :rows="6" animated />
    </div>

    <div v-else class="candidate-grid">
      <div
        v-for="c in candidates"
        :key="c.id"
        class="candidate-card"
        @click="openDetail(c)"
      >
        <div class="cc-header">
          <span class="cc-name">{{ c.name || c.name_en }}</span>
          <el-icon v-if="c.starred" color="#faad14"><Star /></el-icon>
          <el-tag v-if="c.blacklisted" type="danger" size="small" style="margin-left: 4px">黑名单</el-tag>
        </div>
        <div class="cc-meta-row">
          <span v-if="c.last_title">{{ c.last_title }}</span>
          <span v-if="c.last_company">@ {{ c.last_company }}</span>
        </div>
        <div class="cc-meta-row">
          <span v-if="c.education">{{ c.education }}</span>
          <span v-if="c.school"> · {{ c.school }}</span>
          <span v-if="c.years_exp"> · {{ c.years_exp }}年</span>
        </div>
        <div class="cc-tags">
          <el-tag
            v-for="tag in (c.skill_tags || []).slice(0, 4)"
            :key="tag"
            size="small"
            type="info"
            style="margin: 2px"
          >{{ tag }}</el-tag>
        </div>
        <div class="cc-links">
          <el-tag
            v-for="lnk in (c.active_links || [])"
            :key="lnk.job_id"
            size="small"
            type="success"
            style="margin: 2px"
          >
            {{ lnk.job_title }} · {{ lnk.stage }}
          </el-tag>
        </div>
        <div class="cc-source" v-if="c.supplier_name || c.source">
          来源：{{ c.supplier_name || c.source }}
        </div>
      </div>
    </div>

    <el-empty v-if="!loading && !candidates.length" description="暂无候选人" />

    <!-- Candidate detail drawer -->
    <CandidateDetail
      v-if="selectedCandidate"
      :candidate-id="selectedCandidate.id"
      @close="selectedCandidate = null"
      @updated="fetchCandidates"
    />

    <CreateCandidateDialog v-model="createDialogVisible" @created="fetchCandidates" />
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { candidatesApi } from '../api/candidates'
import { debounce } from '../api/utils'
import CandidateDetail from '../components/CandidateDetail.vue'
import CreateCandidateDialog from '../components/CreateCandidateDialog.vue'

const candidates = ref([])
const loading = ref(false)
const searchQ = ref('')
const filterEducation = ref('')
const filterFollowup = ref('')
const filterStarred = ref(false)
const createDialogVisible = ref(false)
const selectedCandidate = ref(null)

async function fetchCandidates() {
  loading.value = true
  try {
    const params = {
      q: searchQ.value || undefined,
      education: filterEducation.value || undefined,
      followup_status: filterFollowup.value || undefined,
      starred: filterStarred.value || undefined,
    }
    Object.keys(params).forEach(k => params[k] === undefined && delete params[k])
    candidates.value = await candidatesApi.list(params)
  } finally {
    loading.value = false
  }
}

const debouncedFetch = debounce(fetchCandidates, 250)

function openDetail(c) {
  selectedCandidate.value = c
}

onMounted(fetchCandidates)
</script>

<style scoped>
.talent-page { }

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

.count-badge {
  background: #e6f4ff;
  color: #1677ff;
  font-size: 13px;
  padding: 1px 8px;
  border-radius: 10px;
}

.loading-wrap { padding: 20px 0; }

.candidate-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 12px;
}

.candidate-card {
  background: #fff;
  border: 1px solid #e8e8e8;
  border-radius: 10px;
  padding: 14px 16px;
  cursor: pointer;
  transition: box-shadow 0.15s, border-color 0.15s;
}

.candidate-card:hover {
  border-color: #91caff;
  box-shadow: 0 2px 12px rgba(22, 119, 255, 0.12);
}

.cc-header {
  display: flex;
  align-items: center;
  margin-bottom: 6px;
}

.cc-name {
  font-weight: 700;
  font-size: 15px;
  color: #222;
  flex: 1;
}

.cc-meta-row {
  font-size: 13px;
  color: #666;
  margin-bottom: 2px;
}

.cc-tags { margin-top: 6px; }
.cc-links { margin-top: 4px; }

.cc-source {
  font-size: 12px;
  color: #aaa;
  margin-top: 6px;
}
</style>
