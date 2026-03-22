<template>
  <div class="job-create-form">
    <div class="form-header">
      <h2>{{ isEditMode ? '编辑岗位' : '新建岗位' }}</h2>
      <button class="close-btn" type="button" aria-label="关闭" @click="$emit('cancel')">×</button>
    </div>
    <form @submit.prevent="handleSubmit">
      <p v-if="formError" class="form-error">{{ formError }}</p>

      <div class="form-group" :class="{ 'form-group--error': fieldErrors.title }">
        <label>岗位名称 *</label>
        <input
          v-model="form.title"
          type="text"
          :class="{ 'input-error': fieldErrors.title }"
          @input="clearFieldError('title')"
        />
        <p v-if="fieldErrors.title" class="field-error">{{ fieldErrors.title }}</p>
      </div>

      <div class="form-group" :class="{ 'form-group--error': fieldErrors.department }">
        <label>部门 *</label>
        <div class="select-row">
          <select
            v-model="form.department"
            :class="{ 'input-error': fieldErrors.department }"
            @change="clearFieldError('department')"
          >
            <option value="">请选择部门</option>
            <option v-for="department in departments" :key="department.id" :value="department.name">
              {{ department.name }}
            </option>
          </select>
          <button class="btn-text" type="button" @click="toggleDepartmentCreate">
            {{ creatingDepartmentInline ? '取消新增' : '+ 新增部门' }}
          </button>
        </div>
        <div v-if="creatingDepartmentInline" class="inline-create">
          <input
            v-model="newDepartmentName"
            type="text"
            placeholder="输入新部门名称"
            @input="departmentInlineError = ''"
          />
          <div class="inline-actions">
            <button
              type="button"
              class="btn-primary"
              :disabled="creatingDepartment || !newDepartmentName.trim()"
              @click="handleCreateDepartment"
            >
              {{ creatingDepartment ? '添加中...' : '确认添加' }}
            </button>
          </div>
          <p v-if="departmentInlineError" class="field-error">{{ departmentInlineError }}</p>
        </div>
        <p v-if="fieldErrors.department" class="field-error">{{ fieldErrors.department }}</p>
      </div>

      <div class="form-group" :class="{ 'form-group--error': fieldErrors.location_name }">
        <label>办公地点 *</label>
        <div class="select-row">
          <select
            v-model="form.location_name"
            :class="{ 'input-error': fieldErrors.location_name }"
            @change="handleLocationChange"
          >
            <option value="">请选择办公地点</option>
            <option v-for="location in locations" :key="location.id" :value="location.name">
              {{ location.name }}
            </option>
          </select>
          <button class="btn-text" type="button" @click="toggleLocationCreate">
            {{ creatingLocationInline ? '取消新增' : '+ 新增地点' }}
          </button>
        </div>
        <div v-if="creatingLocationInline" class="inline-create">
          <input
            v-model="newLocationName"
            type="text"
            placeholder="地点简称"
            @input="locationInlineError = ''"
          />
          <input
            v-model="newLocationAddress"
            type="text"
            placeholder="完整地址（选填）"
            @input="locationInlineError = ''"
          />
          <div class="inline-actions">
            <button
              type="button"
              class="btn-primary"
              :disabled="creatingLocation || !newLocationName.trim()"
              @click="handleCreateLocation"
            >
              {{ creatingLocation ? '添加中...' : '确认添加' }}
            </button>
          </div>
          <p v-if="locationInlineError" class="field-error">{{ locationInlineError }}</p>
        </div>
        <p v-if="fieldErrors.location_name" class="field-error">{{ fieldErrors.location_name }}</p>
      </div>

      <div
        v-if="form.location_name && !creatingLocationInline"
        class="form-group"
      >
        <label>地点地址</label>
        <input
          v-model="form.location_address"
          type="text"
          :readonly="Boolean(selectedLocation?.address)"
          :placeholder="selectedLocation?.address ? '' : '该地点暂无地址，可选填'"
        />
      </div>

      <div class="form-group" :class="{ 'form-group--error': fieldErrors.headcount }">
        <label>headcount *</label>
        <input
          v-model.number="form.headcount"
          type="number"
          min="1"
          :class="{ 'input-error': fieldErrors.headcount }"
          @input="clearFieldError('headcount')"
        />
        <p v-if="fieldErrors.headcount" class="field-error">{{ fieldErrors.headcount }}</p>
      </div>

      <div class="form-group" :class="{ 'form-group--error': fieldErrors.jd }">
        <label>JD *</label>
        <textarea
          v-model="form.jd"
          rows="10"
          :class="{ 'input-error': fieldErrors.jd }"
          @input="clearFieldError('jd')"
        ></textarea>
        <p v-if="fieldErrors.jd" class="field-error">{{ fieldErrors.jd }}</p>
      </div>

      <div class="form-group">
        <label>优先级</label>
        <select v-model="form.priority">
          <option value="medium">中</option>
          <option value="high">高</option>
          <option value="low">低</option>
        </select>
      </div>

      <div class="form-group">
        <label>目标到岗日</label>
        <input v-model="form.target_onboard_date" type="date" />
      </div>

      <div class="form-group">
        <label>备注</label>
        <textarea v-model="form.notes" rows="4"></textarea>
      </div>

      <div class="form-actions">
        <button type="button" :disabled="submitting" @click="$emit('cancel')">取消</button>
        <button type="submit" class="btn-primary" :disabled="submitting || loadingTerms">
          {{ submitting ? (isEditMode ? '保存中...' : '创建中...') : (isEditMode ? '保存' : '创建') }}
        </button>
      </div>
    </form>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import {
  createDepartment,
  createLocation,
  fetchDepartments,
  fetchLocations,
  type Term,
} from '@/api/company'
import { createJob, updateJob } from '@/api/jobs'
import type { CreateJobPayload, Job } from '@/api/types'

const props = defineProps<{
  initialData?: Job
}>()

const emit = defineEmits<{
  cancel: []
  created: [jobId: number]
  saved: [jobId: number]
}>()

const isEditMode = computed(() => !!props.initialData)

type JobCreateFormState = {
  title: string
  department: string
  location_name: string
  location_address: string
  headcount: number
  jd: string
  priority: 'medium' | 'high' | 'low'
  target_onboard_date: string
  notes: string
}

const form = reactive<JobCreateFormState>({
  title: props.initialData?.title ?? '',
  department: props.initialData?.department ?? '',
  location_name: props.initialData?.location_name ?? '',
  location_address: props.initialData?.location_address ?? '',
  headcount: props.initialData?.headcount ?? 1,
  jd: props.initialData?.jd ?? '',
  priority: (props.initialData?.priority as 'medium' | 'high' | 'low') ?? 'medium',
  target_onboard_date: props.initialData?.target_onboard_date ?? '',
  notes: props.initialData?.notes ?? '',
})

const departments = ref<Term[]>([])
const locations = ref<Term[]>([])
const loadingTerms = ref(false)
const submitting = ref(false)
const formError = ref('')
const creatingDepartmentInline = ref(false)
const creatingLocationInline = ref(false)
const creatingDepartment = ref(false)
const creatingLocation = ref(false)
const newDepartmentName = ref('')
const newLocationName = ref('')
const newLocationAddress = ref('')
const departmentInlineError = ref('')
const locationInlineError = ref('')
const fieldErrors = reactive<Record<string, string>>({
  title: '',
  department: '',
  location_name: '',
  headcount: '',
  jd: '',
})

const selectedLocation = computed(() => {
  return locations.value.find(location => location.name === form.location_name) ?? null
})

function sortTerms(items: Term[]) {
  return [...items].sort((a, b) => {
    if (a.sort_order !== b.sort_order) {
      return a.sort_order - b.sort_order
    }
    return a.id - b.id
  })
}

onMounted(() => {
  void loadTerms()
})

async function loadTerms() {
  loadingTerms.value = true
  formError.value = ''
  try {
    const [departmentItems, locationItems] = await Promise.all([
      fetchDepartments(),
      fetchLocations(),
    ])
    departments.value = sortTerms(departmentItems)
    locations.value = sortTerms(locationItems)
  } catch (error) {
    formError.value = error instanceof Error ? error.message : '加载部门和地点失败，请重试'
  } finally {
    loadingTerms.value = false
  }
}

function clearFieldError(field: string) {
  fieldErrors[field] = ''
  if (formError.value === '请填写所有必填字段') {
    formError.value = ''
  }
}

function toggleDepartmentCreate() {
  creatingDepartmentInline.value = !creatingDepartmentInline.value
  departmentInlineError.value = ''
  newDepartmentName.value = ''
}

function toggleLocationCreate() {
  creatingLocationInline.value = !creatingLocationInline.value
  locationInlineError.value = ''
  newLocationName.value = ''
  newLocationAddress.value = ''
}

async function handleCreateDepartment() {
  const name = newDepartmentName.value.trim()
  if (!name) {
    departmentInlineError.value = '请输入部门名称'
    return
  }

  try {
    creatingDepartment.value = true
    departmentInlineError.value = ''
    const department = await createDepartment({
      type: 'department',
      name,
    })
    departments.value = sortTerms([...departments.value, department])
    form.department = department.name
    clearFieldError('department')
    creatingDepartmentInline.value = false
    newDepartmentName.value = ''
  } catch (error) {
    departmentInlineError.value = error instanceof Error ? error.message : '新增部门失败，请重试'
  } finally {
    creatingDepartment.value = false
  }
}

async function handleCreateLocation() {
  const name = newLocationName.value.trim()
  const address = newLocationAddress.value.trim()
  if (!name) {
    locationInlineError.value = '请输入地点简称'
    return
  }

  try {
    creatingLocation.value = true
    locationInlineError.value = ''
    const location = await createLocation({
      type: 'location',
      name,
      ...(address ? { address } : {}),
    })
    locations.value = sortTerms([...locations.value, location])
    form.location_name = location.name
    form.location_address = location.address ?? ''
    clearFieldError('location_name')
    creatingLocationInline.value = false
    newLocationName.value = ''
    newLocationAddress.value = ''
  } catch (error) {
    locationInlineError.value = error instanceof Error ? error.message : '新增地点失败，请重试'
  } finally {
    creatingLocation.value = false
  }
}

function handleLocationChange() {
  clearFieldError('location_name')
  form.location_address = selectedLocation.value?.address ?? ''
}

function validateForm() {
  let hasError = false
  fieldErrors.title = form.title.trim() ? '' : '请填写岗位名称'
  fieldErrors.department = form.department.trim() ? '' : '请选择部门'
  fieldErrors.location_name = form.location_name.trim() ? '' : '请选择办公地点'
  fieldErrors.headcount = Number.isFinite(form.headcount) && form.headcount >= 1 ? '' : 'headcount 至少为 1'
  fieldErrors.jd = form.jd.trim() ? '' : '请填写 JD'

  for (const value of Object.values(fieldErrors)) {
    if (value) {
      hasError = true
    }
  }

  formError.value = hasError ? '请填写所有必填字段' : ''
  return !hasError
}

async function handleSubmit() {
  if (!validateForm()) return

  const payload: CreateJobPayload = {
    title: form.title.trim(),
    department: form.department.trim(),
    location_name: form.location_name.trim(),
    headcount: form.headcount,
    jd: form.jd.trim(),
    priority: form.priority,
    target_onboard_date: form.target_onboard_date || undefined,
    notes: form.notes.trim() || undefined,
    ...(form.location_address.trim() ? { location_address: form.location_address.trim() } : {}),
  }

  try {
    submitting.value = true
    formError.value = ''
    if (isEditMode.value && props.initialData) {
      const job = await updateJob(props.initialData.id, { ...payload, version: props.initialData.version })
      emit('saved', job.id)
    } else {
      const job = await createJob(payload)
      emit('created', job.id)
    }
  } catch (error) {
    formError.value = error instanceof Error ? error.message : (isEditMode.value ? '保存失败，请重试' : '创建失败，请重试')
  } finally {
    submitting.value = false
  }
}
</script>

<style scoped>
.job-create-form {
  padding: 24px;
}

.form-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 24px;
}

.job-create-form h2 {
  margin: 0;
}

.close-btn {
  width: 32px;
  height: 32px;
  border: none;
  background: none;
  font-size: 24px;
  line-height: 1;
  color: var(--color-text-secondary);
  cursor: pointer;
}

.form-error {
  margin: 0 0 16px;
  padding: 10px 12px;
  border-radius: 8px;
  background: var(--error-bg);
  color: var(--error-color);
  font-size: 13px;
}

.form-group {
  margin-bottom: 16px;
}

.form-group--error label {
  color: var(--error-color);
}

.form-group label {
  display: block;
  margin-bottom: 4px;
  font-size: 14px;
  color: var(--color-text-secondary);
}

.form-group input,
.form-group select,
.form-group textarea {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid var(--color-border);
  border-radius: 6px;
  background: var(--color-bg-secondary);
}

.select-row {
  display: flex;
  gap: 12px;
  align-items: center;
}

.select-row select {
  flex: 1;
}

.btn-text {
  border: none;
  background: none;
  color: var(--color-primary);
  cursor: pointer;
  padding: 0;
  white-space: nowrap;
}

.inline-create {
  margin-top: 10px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px;
  border-radius: 8px;
  background: var(--color-bg-secondary);
}

.inline-actions {
  display: flex;
  justify-content: flex-end;
}

.field-error {
  margin: 6px 0 0;
  font-size: 12px;
  color: var(--error-color);
}

.input-error {
  border-color: var(--error-color) !important;
}

.form-actions {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
  margin-top: 24px;
}

.form-actions button {
  padding: 10px 20px;
  border: 1px solid var(--color-border);
  background: var(--color-bg-secondary);
  border-radius: 6px;
  cursor: pointer;
}

.btn-primary {
  background: var(--color-primary);
  color: white;
  border-color: var(--color-primary);
}

.form-actions button:disabled,
.inline-actions button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
</style>
