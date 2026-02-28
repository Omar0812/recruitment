<template>
  <div class="suppliers-page">
    <div class="page-toolbar">
      <h2 class="page-title">供应商管理</h2>
      <el-button type="primary" @click="openForm(null)">+ 新建供应商</el-button>
    </div>

    <div v-if="loading" class="loading-wrap">
      <el-skeleton :rows="5" animated />
    </div>

    <el-table v-else :data="suppliers" style="width: 100%">
      <el-table-column prop="name" label="供应商名称" min-width="140" />
      <el-table-column prop="type" label="类型" width="100" />
      <el-table-column prop="contact_name" label="联系人" width="100" />
      <el-table-column prop="phone" label="电话" width="130" />
      <el-table-column label="保证期" width="90">
        <template #default="{ row }">
          {{ isHeadhunterType(row.type) && row.fee_guarantee_days ? `${row.fee_guarantee_days}天` : '—' }}
        </template>
      </el-table-column>
      <el-table-column label="操作" width="120" align="right">
        <template #default="{ row }">
          <el-button size="small" plain @click="openForm(row)">编辑</el-button>
          <el-button size="small" plain type="danger" @click="deleteSupplier(row)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>

    <el-empty v-if="!loading && !suppliers.length" description="暂无供应商" />

    <el-dialog v-model="formVisible" :title="editItem ? '编辑供应商' : '新建供应商'" width="480px">
      <el-form :model="form" label-width="80px" size="default">
        <el-form-item label="名称" required>
          <el-input v-model="form.name" />
        </el-form-item>
        <el-form-item label="类型">
          <el-select v-model="form.type" placeholder="请选择" style="width: 100%">
            <el-option label="猎头公司" value="猎头公司" />
            <el-option label="招聘平台" value="招聘平台" />
            <el-option label="内部推荐" value="内部推荐" />
            <el-option label="其他" value="其他" />
          </el-select>
        </el-form-item>
        <el-form-item label="联系人">
          <el-input v-model="form.contact_name" />
        </el-form-item>
        <el-form-item label="电话">
          <el-input v-model="form.phone" />
        </el-form-item>
        <el-form-item label="邮箱">
          <el-input v-model="form.email" />
        </el-form-item>
        <el-form-item v-if="isHeadhunterType(form.type)" label="保证期(天)">
          <el-input-number v-model="form.fee_guarantee_days" :min="0" />
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="form.notes" type="textarea" :rows="2" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="formVisible = false">取消</el-button>
        <el-button type="primary" :loading="formLoading" @click="saveSupplier">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { suppliersApi } from '../api/suppliers'

const suppliers = ref([])
const loading = ref(false)
const formLoading = ref(false)
const formVisible = ref(false)
const editItem = ref(null)

const form = reactive({
  name: '', type: '', contact_name: '', phone: '', email: '',
  fee_guarantee_days: null, notes: '',
})

function isHeadhunterType(type) {
  return !!type && String(type).includes('猎头')
}

async function fetchSuppliers() {
  loading.value = true
  try {
    suppliers.value = await suppliersApi.list()
  } finally {
    loading.value = false
  }
}

function openForm(item) {
  editItem.value = item
  Object.assign(form, item
    ? { ...item }
    : { name: '', type: '', contact_name: '', phone: '', email: '', fee_guarantee_days: null, notes: '' }
  )
  if (!isHeadhunterType(form.type)) form.fee_guarantee_days = null
  formVisible.value = true
}

async function saveSupplier() {
  if (!form.name.trim()) { ElMessage.warning('请填写供应商名称'); return }
  formLoading.value = true
  try {
    if (editItem.value) {
      await suppliersApi.update(editItem.value.id, { ...form })
    } else {
      await suppliersApi.create({ ...form })
    }
    formVisible.value = false
    ElMessage.success('保存成功')
    await fetchSuppliers()
  } finally {
    formLoading.value = false
  }
}

async function deleteSupplier(item) {
  await ElMessageBox.confirm(`确认删除供应商「${item.name}」？`, '删除确认', { type: 'warning' })
  await suppliersApi.delete(item.id)
  ElMessage.success('已删除')
  await fetchSuppliers()
}

watch(() => form.type, (type) => {
  if (!isHeadhunterType(type)) form.fee_guarantee_days = null
})

onMounted(fetchSuppliers)
</script>

<style scoped>
.suppliers-page { }
.page-toolbar { display: flex; align-items: center; gap: 12px; margin-bottom: 20px; }
.page-title { font-size: 18px; font-weight: 700; color: #222; flex: 1; }
.loading-wrap { padding: 20px 0; }
</style>
