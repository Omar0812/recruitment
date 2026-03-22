<template>
  <div class="source-picker">
    <label class="field-label">来源渠道 <span class="required">*</span></label>

    <div class="channel-tabs">
      <button
        v-for="ch in channels"
        :key="ch.key"
        class="channel-tab"
        :class="{ 'channel-tab--active': selected === ch.key }"
        @click="selectChannel(ch.key)"
      >
        {{ ch.label }}
      </button>
    </div>

    <!-- 招聘平台 -->
    <div v-if="selected === 'platform'" class="sub-panel">
      <div v-if="loadingTags" class="sub-loading">加载中...</div>
      <template v-else>
        <div class="sub-tools">
          <input v-model="platformQuery" class="sub-search" placeholder="搜索平台" />
          <button class="sub-add" @click="startCreate('platform')">+ 新增平台</button>
        </div>
        <div v-if="creatingType === 'platform'" class="sub-create">
          <input v-model="newOptionName" class="sub-search" placeholder="平台名称" @keyup.enter="confirmCreate('platform')" />
          <button class="sub-add" :disabled="creating || !newOptionName.trim()" @click="confirmCreate('platform')">保存</button>
          <button class="sub-cancel" @click="cancelCreate">取消</button>
        </div>
        <div class="sub-list">
          <button
            v-for="tag in filteredPlatformTags"
            :key="tag.id"
            class="sub-option"
            :class="{ 'sub-option--active': modelValue === tag.name }"
            @click="pick(tag.name)"
          >
            {{ tag.name }}
          </button>
          <span v-if="!filteredPlatformTags.length" class="sub-empty">暂无平台</span>
        </div>
      </template>
    </div>

    <!-- 猎头 -->
    <div v-if="selected === 'headhunter'" class="sub-panel">
      <div v-if="loadingSuppliers" class="sub-loading">加载中...</div>
      <template v-else>
        <div class="sub-tools">
          <input v-model="headhunterQuery" class="sub-search" placeholder="搜索猎头" />
          <button class="sub-add" @click="startCreate('headhunter')">+ 新增猎头</button>
        </div>
        <div v-if="creatingType === 'headhunter'" class="sub-create">
          <input v-model="newOptionName" class="sub-search" placeholder="猎头公司名称" @keyup.enter="confirmCreate('headhunter')" />
          <button class="sub-add" :disabled="creating || !newOptionName.trim()" @click="confirmCreate('headhunter')">保存</button>
          <button class="sub-cancel" @click="cancelCreate">取消</button>
        </div>
        <div class="sub-list">
          <button
            v-for="s in filteredSuppliers"
            :key="s.id"
            class="sub-option"
            :class="{
              'sub-option--active': supplierId === s.id,
              'sub-option--expired': !!s.deleted_at,
            }"
            @click="pickSupplier(s)"
          >
            {{ s.name }}
            <span v-if="s.deleted_at" class="expired-badge">已到期</span>
          </button>
          <span v-if="!filteredSuppliers.length" class="sub-empty">暂无猎头</span>
        </div>
      </template>
    </div>

    <!-- 内推 -->
    <div v-if="selected === 'referral'" class="sub-input">
      <input
        :value="referredBy"
        placeholder="内推人姓名"
        class="text-input"
        @input="onReferralInput"
      />
    </div>

    <!-- 其他 -->
    <div v-if="selected === 'other'" class="sub-panel">
      <div v-if="loadingTags" class="sub-loading">加载中...</div>
      <template v-else>
        <div class="sub-tools">
          <input v-model="otherQuery" class="sub-search" placeholder="搜索其他来源" />
          <button class="sub-add" @click="startCreate('other')">+ 新增来源</button>
        </div>
        <div v-if="creatingType === 'other'" class="sub-create">
          <input v-model="newOptionName" class="sub-search" placeholder="来源名称" @keyup.enter="confirmCreate('other')" />
          <button class="sub-add" :disabled="creating || !newOptionName.trim()" @click="confirmCreate('other')">保存</button>
          <button class="sub-cancel" @click="cancelCreate">取消</button>
        </div>
        <div class="sub-list">
          <button
            v-for="tag in filteredOtherTags"
            :key="tag.id"
            class="sub-option"
            :class="{ 'sub-option--active': modelValue === tag.name }"
            @click="pick(tag.name)"
          >
            {{ tag.name }}
          </button>
          <span v-if="!filteredOtherTags.length" class="sub-empty">暂无来源</span>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { createSourceTag, createSupplier, fetchSourceTags, fetchSuppliers, splitSourceTags } from '@/api/channels'
import type { SourceTag, Supplier } from '@/api/types'

type ChannelKey = 'platform' | 'headhunter' | 'referral' | 'other'

const channels: { key: ChannelKey; label: string }[] = [
  { key: 'platform', label: '招聘平台' },
  { key: 'headhunter', label: '猎头' },
  { key: 'referral', label: '内推' },
  { key: 'other', label: '其他' },
]

const props = defineProps<{
  modelValue: string | undefined
  supplierId: number | undefined
  referredBy: string | undefined
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
  'update:supplierId': [value: number | undefined]
  'update:referredBy': [value: string | undefined]
}>()

const selected = ref<ChannelKey | null>(null)
const allTags = ref<SourceTag[]>([])
const allSuppliers = ref<Supplier[]>([])
const loadingTags = ref(false)
const loadingSuppliers = ref(false)
const platformQuery = ref('')
const headhunterQuery = ref('')
const otherQuery = ref('')
const creatingType = ref<Exclude<ChannelKey, 'referral'> | null>(null)
const newOptionName = ref('')
const creating = ref(false)

const platformTags = computed(() => splitSourceTags(allTags.value).platformTags)
const otherTags = computed(() => splitSourceTags(allTags.value).otherTags)
const filteredPlatformTags = computed(() =>
  platformTags.value.filter((tag) => tag.name.toLowerCase().includes(platformQuery.value.trim().toLowerCase())),
)
const filteredOtherTags = computed(() =>
  otherTags.value.filter((tag) => tag.name.toLowerCase().includes(otherQuery.value.trim().toLowerCase())),
)
const filteredSuppliers = computed(() =>
  allSuppliers.value.filter((supplier) => supplier.name.toLowerCase().includes(headhunterQuery.value.trim().toLowerCase())),
)

function selectChannel(key: ChannelKey) {
  selected.value = key
  creatingType.value = null
  newOptionName.value = ''
  if (key === 'platform' || key === 'other') loadTags()
  if (key === 'headhunter') loadSupplierList()
  if (key === 'referral') {
    emit('update:modelValue', '内推')
    emit('update:supplierId', undefined)
  }
}

async function loadTags() {
  if (allTags.value.length) return
  loadingTags.value = true
  try {
    allTags.value = await fetchSourceTags()
  } catch { /* ignore */ }
  finally { loadingTags.value = false }
}

async function loadSupplierList() {
  if (allSuppliers.value.length) return
  loadingSuppliers.value = true
  try {
    const res = await fetchSuppliers()
    allSuppliers.value = res.items
  } catch { /* ignore */ }
  finally { loadingSuppliers.value = false }
}

function pick(name: string) {
  emit('update:modelValue', name)
  emit('update:supplierId', undefined)
  emit('update:referredBy', undefined)
}

function pickSupplier(s: Supplier) {
  emit('update:supplierId', s.id)
  emit('update:modelValue', s.name)
  emit('update:referredBy', undefined)
}

function onReferralInput(e: Event) {
  const val = (e.target as HTMLInputElement).value
  emit('update:referredBy', val || undefined)
}

function startCreate(type: Exclude<ChannelKey, 'referral'>) {
  creatingType.value = type
  newOptionName.value = ''
}

function cancelCreate() {
  creatingType.value = null
  newOptionName.value = ''
  creating.value = false
}

async function confirmCreate(type: Exclude<ChannelKey, 'referral'>) {
  const name = newOptionName.value.trim()
  if (!name || creating.value) return

  creating.value = true
  try {
    if (type === 'headhunter') {
      const supplier = await createSupplier(name)
      allSuppliers.value = [supplier, ...allSuppliers.value]
      pickSupplier(supplier)
    } else {
      const created = await createSourceTag(name, type)
      allTags.value = [...allTags.value, created]
      pick(created.name)
    }
    cancelCreate()
  } finally {
    creating.value = false
  }
}
</script>

<style scoped>
.source-picker {
  margin-top: var(--space-4);
}

.field-label {
  display: block;
  font-size: 13px;
  font-weight: 500;
  color: var(--color-text-secondary);
  margin-bottom: var(--space-2);
}

.required { color: var(--color-urgent); }

.channel-tabs {
  display: flex;
  gap: var(--space-2);
  margin-bottom: var(--space-3);
}

.channel-tab {
  padding: var(--space-1) var(--space-3);
  border: 1px solid var(--color-line);
  border-radius: 4px;
  font-size: 13px;
  background: transparent;
  color: var(--color-text-secondary);
  transition: all 150ms;
}

.channel-tab:hover { border-color: var(--color-text-secondary); }

.channel-tab--active {
  background: var(--color-text-primary);
  color: var(--color-bg);
  border-color: var(--color-text-primary);
}

.sub-list {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
}

.sub-panel {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.sub-tools,
.sub-create {
  display: flex;
  gap: var(--space-2);
  align-items: center;
}

.sub-search {
  flex: 1;
  min-width: 0;
  padding: var(--space-2);
  border: 1px solid var(--color-line);
  border-radius: 4px;
  font-size: 13px;
  outline: none;
}

.sub-search:focus {
  border-color: var(--color-text-secondary);
}

.sub-add,
.sub-cancel {
  font-size: 13px;
  color: var(--color-text-secondary);
}

.sub-add:hover,
.sub-cancel:hover {
  color: var(--color-text-primary);
}

.sub-option {
  padding: var(--space-1) var(--space-3);
  border: 1px solid var(--color-line);
  border-radius: 4px;
  font-size: 13px;
  transition: all 150ms;
}

.sub-option:hover { border-color: var(--color-text-secondary); }

.sub-option--active {
  background: var(--color-text-primary);
  color: var(--color-bg);
  border-color: var(--color-text-primary);
}

.sub-option--expired { opacity: 0.5; }

.expired-badge {
  font-size: 11px;
  color: var(--color-text-tertiary);
  margin-left: var(--space-1);
}

.sub-empty {
  font-size: 13px;
  color: var(--color-text-tertiary);
}

.sub-loading {
  font-size: 13px;
  color: var(--color-text-tertiary);
}

.sub-input {
  max-width: 240px;
}

.text-input {
  width: 100%;
  padding: var(--space-2);
  border: 1px solid var(--color-line);
  border-radius: 4px;
  font-size: 14px;
  outline: none;
  transition: border-color 150ms;
}

.text-input:focus { border-color: var(--color-text-secondary); }
</style>
