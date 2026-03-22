<template>
  <div class="talent-pool-filters">
    <div class="filters__search">
      <input
        type="text"
        class="filters__search-input"
        placeholder="搜索姓名/手机/邮箱"
        :value="filters.search ?? ''"
        @input="$emit('search', ($event.target as HTMLInputElement).value)"
      />
    </div>

    <div class="filters__controls">
      <select
        class="filters__select filters__select--education"
        :value="filters.education ?? ''"
        @change="updateFilter('education', ($event.target as HTMLSelectElement).value || undefined)"
      >
        <option value="">学历</option>
        <option v-for="e in educationOptions" :key="e" :value="e">{{ e }}</option>
      </select>

      <div class="filters__field-group">
        <select
          class="filters__select filters__select--years"
          :value="yearsExpPreset"
          @change="handleYearsExpChange(($event.target as HTMLSelectElement).value)"
        >
          <option value="">工作年限</option>
          <option value="0-1">1年内</option>
          <option value="1-3">1-3年</option>
          <option value="3-5">3-5年</option>
          <option value="5-10">5-10年</option>
          <option value="10-">10年+</option>
          <option value="custom">自定义</option>
        </select>
        <div class="filters__range">
          <input
            type="number"
            step="0.5"
            min="0"
            class="filters__range-input filters__range-input--years-min"
            placeholder="最少年限"
            :value="displayNumber(filters.years_exp_min)"
            @input="updateRange('years_exp', 'min', ($event.target as HTMLInputElement).value)"
          />
          <span class="filters__range-sep">-</span>
          <input
            type="number"
            step="0.5"
            min="0"
            class="filters__range-input filters__range-input--years-max"
            placeholder="最多年限"
            :value="displayNumber(filters.years_exp_max)"
            @input="updateRange('years_exp', 'max', ($event.target as HTMLInputElement).value)"
          />
        </div>
      </div>

      <div class="filters__field-group">
        <select
          class="filters__select filters__select--age"
          :value="agePreset"
          @change="handleAgeChange(($event.target as HTMLSelectElement).value)"
        >
          <option value="">年龄</option>
          <option value="0-25">25以下</option>
          <option value="25-30">25-30</option>
          <option value="30-35">30-35</option>
          <option value="35-40">35-40</option>
          <option value="40-">40+</option>
          <option value="custom">自定义</option>
        </select>
        <div class="filters__range">
          <input
            type="number"
            min="0"
            class="filters__range-input filters__range-input--age-min"
            placeholder="最小年龄"
            :value="displayNumber(filters.age_min)"
            @input="updateRange('age', 'min', ($event.target as HTMLInputElement).value)"
          />
          <span class="filters__range-sep">-</span>
          <input
            type="number"
            min="0"
            class="filters__range-input filters__range-input--age-max"
            placeholder="最大年龄"
            :value="displayNumber(filters.age_max)"
            @input="updateRange('age', 'max', ($event.target as HTMLInputElement).value)"
          />
        </div>
      </div>

      <FilterMultiSelect
        :model-value="selectedTags"
        :options="skillOptions"
        placeholder="技能标签，可搜索"
        empty-text="暂无技能选项，可直接输入"
        :allow-create="true"
        input-class="filters__tag-input"
        @update:model-value="updateListFilter('tags', $event)"
      />

      <FilterMultiSelect
        :model-value="selectedSources"
        :options="sourceOptions"
        placeholder="来源渠道"
        empty-text="暂无来源选项"
        input-class="filters__source-input"
        @update:model-value="updateListFilter('source', $event)"
      />

      <select
        class="filters__select filters__select--pipeline"
        :value="filters.pipeline_status ?? ''"
        @change="updateFilter('pipeline_status', ($event.target as HTMLSelectElement).value || undefined)"
      >
        <option value="">流程状态</option>
        <option value="none">无流程</option>
        <option value="in_progress">进行中</option>
        <option value="ended">已结束</option>
      </select>

      <label class="filters__toggle">
        <input
          type="checkbox"
          :checked="!!filters.starred"
          @change="updateFilter('starred', ($event.target as HTMLInputElement).checked || undefined)"
        />
        只看星标
      </label>

      <select
        class="filters__select filters__select--blacklist"
        :value="filters.blacklist ?? ''"
        @change="updateFilter('blacklist', ($event.target as HTMLSelectElement).value || undefined)"
      >
        <option value="">黑名单（全部）</option>
        <option value="only">仅看黑名单</option>
        <option value="exclude">排除黑名单</option>
      </select>
    </div>

    <!-- Active filter tags -->
    <div v-if="activeFilterTags.length" class="filters__active">
      <span
        v-for="tag in activeFilterTags"
        :key="tag.key"
        class="filters__active-tag"
      >
        {{ tag.label }}
        <button class="filters__active-tag-clear" @click="clearFilter(tag.key)">&times;</button>
      </span>
      <button class="filters__clear-all" @click="$emit('clear')">清除全部</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { TalentPoolFilters } from '@/api/types'
import FilterMultiSelect from './FilterMultiSelect.vue'

const props = defineProps<{
  filters: TalentPoolFilters
  skillOptions: string[]
  sourceOptions: string[]
}>()

const emit = defineEmits<{
  update: [filters: TalentPoolFilters]
  search: [value: string]
  clear: []
}>()

const educationOptions = ['大专', '本科', '硕士', '博士', '其他']

function updateFilter(key: string, value: any) {
  const next = { ...props.filters, [key]: value }
  emit('update', cleanupFilters(next))
}

function normalizeList(value: string | string[] | undefined) {
  if (Array.isArray(value)) return value
  if (value) return [value]
  return []
}

function cleanupFilters(filters: TalentPoolFilters) {
  const next = { ...filters } as Record<string, any>
  Object.keys(next).forEach((key) => {
    const value = next[key]
    if (value === undefined || value === '') delete next[key]
    if (Array.isArray(value) && value.length === 0) delete next[key]
  })
  return next as TalentPoolFilters
}

function updateListFilter(key: 'tags' | 'source', value: string[]) {
  updateFilter(key, value.length ? value : undefined)
}

function displayNumber(value: number | undefined) {
  return value == null ? '' : String(value)
}

function updateRange(kind: 'years_exp' | 'age', bound: 'min' | 'max', rawValue: string) {
  const next = { ...props.filters } as Record<string, any>
  const key = `${kind}_${bound}`

  if (rawValue === '') {
    delete next[key]
    emit('update', cleanupFilters(next))
    return
  }

  const parsed = kind === 'years_exp' ? Number(rawValue) : Math.trunc(Number(rawValue))
  if (Number.isNaN(parsed)) return
  next[key] = parsed
  emit('update', cleanupFilters(next as TalentPoolFilters))
}

function clearFilter(key: string) {
  const next = { ...props.filters }
  if (key.startsWith('tags:')) {
    const value = key.slice(5)
    const remaining = normalizeList(next.tags).filter((item) => item !== value)
    if (remaining.length) next.tags = remaining
    else delete (next as any).tags
    emit('update', cleanupFilters(next))
    return
  }
  if (key.startsWith('source:')) {
    const value = key.slice(7)
    const remaining = normalizeList(next.source).filter((item) => item !== value)
    if (remaining.length) next.source = remaining
    else delete (next as any).source
    emit('update', cleanupFilters(next))
    return
  }

  delete (next as any)[key]
  if (key === 'years_exp') {
    delete (next as any).years_exp_min
    delete (next as any).years_exp_max
  }
  if (key === 'age') {
    delete (next as any).age_min
    delete (next as any).age_max
  }
  emit('update', cleanupFilters(next))
}

const yearsExpPreset = computed(() => {
  const min = props.filters.years_exp_min
  const max = props.filters.years_exp_max
  if (min == null && max == null) return ''
  if (min === 0 && max === 1) return '0-1'
  if (min === 1 && max === 3) return '1-3'
  if (min === 3 && max === 5) return '3-5'
  if (min === 5 && max === 10) return '5-10'
  if (min === 10 && max == null) return '10-'
  return 'custom'
})

function handleYearsExpChange(val: string) {
  if (!val) {
    const next = { ...props.filters }
    delete next.years_exp_min
    delete next.years_exp_max
    emit('update', next)
    return
  }
  if (val === 'custom') return
  const [minStr, maxStr] = val.split('-')
  const next = { ...props.filters }
  next.years_exp_min = Number(minStr)
  if (maxStr) next.years_exp_max = Number(maxStr)
  else delete next.years_exp_max
  emit('update', next)
}

const agePreset = computed(() => {
  const min = props.filters.age_min
  const max = props.filters.age_max
  if (min == null && max == null) return ''
  if (min === 0 && max === 25) return '0-25'
  if (min === 25 && max === 30) return '25-30'
  if (min === 30 && max === 35) return '30-35'
  if (min === 35 && max === 40) return '35-40'
  if (min === 40 && max == null) return '40-'
  return 'custom'
})

function handleAgeChange(val: string) {
  if (!val) {
    const next = { ...props.filters }
    delete next.age_min
    delete next.age_max
    emit('update', next)
    return
  }
  if (val === 'custom') return
  const [minStr, maxStr] = val.split('-')
  const next = { ...props.filters }
  next.age_min = Number(minStr)
  if (maxStr) next.age_max = Number(maxStr)
  else delete next.age_max
  emit('update', next)
}

const selectedTags = computed(() => normalizeList(props.filters.tags))
const selectedSources = computed(() => normalizeList(props.filters.source))

const activeFilterTags = computed(() => {
  const tags: { key: string; label: string }[] = []
  const f = props.filters
  if (f.education) tags.push({ key: 'education', label: `学历: ${f.education}` })
  normalizeList(f.source).forEach((source) => {
    tags.push({ key: `source:${source}`, label: `来源: ${source}` })
  })
  normalizeList(f.tags).forEach((tag) => {
    tags.push({ key: `tags:${tag}`, label: `技能: ${tag}` })
  })
  if (f.pipeline_status) {
    const map: Record<string, string> = { none: '无流程', in_progress: '进行中', ended: '已结束' }
    tags.push({ key: 'pipeline_status', label: `流程: ${map[f.pipeline_status] ?? f.pipeline_status}` })
  }
  if (f.starred) tags.push({ key: 'starred', label: '只看星标' })
  if (f.blacklist) {
    const map: Record<string, string> = { only: '仅看黑名单', exclude: '排除黑名单' }
    tags.push({ key: 'blacklist', label: map[f.blacklist] ?? f.blacklist })
  }
  if (f.years_exp_min != null || f.years_exp_max != null) {
    const min = f.years_exp_min ?? 0
    const max = f.years_exp_max
    tags.push({ key: 'years_exp', label: `年限: ${min}${max != null ? `-${max}` : '+'}年` })
  }
  if (f.age_min != null || f.age_max != null) {
    const min = f.age_min ?? 0
    const max = f.age_max
    tags.push({ key: 'age', label: `年龄: ${min}${max != null ? `-${max}` : '+'}岁` })
  }
  return tags
})
</script>

<style scoped>
.talent-pool-filters {
  padding: 16px;
  border-bottom: 1px solid var(--color-line, rgba(26,26,24,0.12));
}

.filters__search {
  margin-bottom: 12px;
}

.filters__search-input {
  width: 100%;
  max-width: 360px;
  padding: 6px 12px;
  font-size: 14px;
  border: 1px solid var(--color-line, rgba(26,26,24,0.12));
  border-radius: 6px;
  background: #fff;
  outline: none;
  transition: border-color 0.15s;
}

.filters__search-input:focus {
  border-color: var(--color-text-secondary, rgba(26,26,24,0.40));
}

.filters__controls {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: flex-start;
}

.filters__select {
  padding: 4px 8px;
  font-size: 13px;
  border: 1px solid var(--color-line, rgba(26,26,24,0.12));
  border-radius: 4px;
  background: #fff;
  cursor: pointer;
  color: var(--color-text-primary, #1A1A18);
}

.filters__field-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.filters__range {
  display: flex;
  align-items: center;
  gap: 6px;
}

.filters__range-input {
  width: 88px;
  padding: 4px 8px;
  font-size: 12px;
  border: 1px solid var(--color-line, rgba(26,26,24,0.12));
  border-radius: 4px;
  background: #fff;
}

.filters__range-sep {
  font-size: 12px;
  color: var(--color-text-secondary, rgba(26,26,24,0.60));
}

.filters__tag-input,
.filters__source-input {
  min-width: 120px;
}

.filters__toggle {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 13px;
  cursor: pointer;
  color: var(--color-text-primary, #1A1A18);
}

.filters__active {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 10px;
  align-items: center;
}

.filters__active-tag {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 8px;
  font-size: 12px;
  background: rgba(26,26,24,0.06);
  border-radius: 3px;
  color: var(--color-text-primary, #1A1A18);
}

.filters__active-tag-clear {
  border: none;
  background: transparent;
  cursor: pointer;
  font-size: 14px;
  color: var(--color-text-secondary, rgba(26,26,24,0.60));
  padding: 0 2px;
  line-height: 1;
}

.filters__clear-all {
  border: none;
  background: transparent;
  cursor: pointer;
  font-size: 12px;
  color: var(--color-text-secondary, rgba(26,26,24,0.60));
  text-decoration: underline;
  padding: 0;
}
</style>
