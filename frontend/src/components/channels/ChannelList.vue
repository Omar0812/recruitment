<template>
  <div class="channel-list">
    <section class="channel-section">
      <div class="section-header" @click="toggleSection('suppliers')">
        <h2>猎头公司</h2>
        <span class="section-count">{{ suppliers.length }}</span>
        <button class="section-action" @click.stop="onAddSupplier()">+ 新增</button>
      </div>
      <div v-if="expandedSections.suppliers" class="section-body">
        <button
          v-for="supplier in suppliers"
          :key="`supplier-${supplier.id}`"
          class="channel-item channel-item--stacked"
          :class="{ active: activeType === 'supplier' && activeId === supplier.id }"
          @click="onSelectSupplier(supplier)"
        >
          <div class="item-main-row">
            <span class="item-name">{{ supplier.name }}</span>
            <span class="item-badge">{{ getSupplierContractStatus(supplier) }}</span>
          </div>
          <div class="item-sub-row">
            <span>{{ formatGuarantee(supplier.guarantee_months) }}</span>
            <span>{{ supplier.candidate_count }} 推 / {{ supplier.hired_count }} 入职</span>
          </div>
        </button>
        <div v-if="suppliers.length === 0" class="empty-hint">还没有猎头公司，点击右上角新增</div>
      </div>
    </section>

    <section class="channel-section">
      <div class="section-header" @click="toggleSection('platforms')">
        <h2>招聘平台</h2>
        <span class="section-count">{{ platformTags.length }}</span>
        <button class="section-action" @click.stop="startAdd('platforms')">+ 新增</button>
      </div>
      <div v-if="expandedSections.platforms" class="section-body">
        <div
          v-for="tag in platformTags"
          :key="`platform-${tag.id}`"
          class="channel-item channel-item--editable"
          :class="{ active: activeType === 'source_tag' && activeId === tag.id }"
          :draggable="editingTagId !== tag.id"
          @dragstart="onDragStart(tag.id)"
          @dragover.prevent
          @drop="onDrop('platforms', tag.id)"
        >
          <template v-if="editingTagId === tag.id">
            <div class="inline-edit">
              <input
                v-model="editTagName"
                class="input-inline"
                placeholder="来源名称"
                @keyup.enter="confirmEditTag(tag.id)"
                @keyup.escape="cancelEdit"
              />
              <button class="btn-sm btn-primary" @click="confirmEditTag(tag.id)">保存</button>
              <button class="btn-sm" @click="cancelEdit">取消</button>
            </div>
          </template>
          <template v-else>
            <button class="item-select" @click="onSelectTag(tag)">
              <span class="drag-handle" title="拖拽排序">⠿</span>
              <div class="item-copy">
                <span class="item-name">{{ tag.name }}</span>
                <span class="item-sub-row">{{ getTagCounts(tag.id) }}</span>
              </div>
            </button>
            <div class="row-actions">
              <button class="btn-icon" @click.stop="startEdit(tag)" title="编辑">✎</button>
              <button class="btn-icon btn-danger" @click.stop="confirmDeleteTag(tag.id)" title="删除">✕</button>
            </div>
          </template>
        </div>
        <div v-if="addingSection === 'platforms'" class="inline-add">
          <input
            ref="addInput"
            v-model="newTagName"
            class="input-inline"
            placeholder="平台名称"
            @keyup.enter="confirmAddTag"
            @keyup.escape="cancelAdd"
          />
          <button class="btn-sm btn-primary" @click="confirmAddTag">保存</button>
          <button class="btn-sm" @click="cancelAdd">取消</button>
        </div>
        <p v-if="sectionError.platforms" class="section-error">{{ sectionError.platforms }}</p>
        <div v-if="platformTags.length === 0 && addingSection !== 'platforms'" class="empty-hint">
          还没有招聘平台，点击右上角新增
        </div>
      </div>
    </section>

    <section class="channel-section">
      <div class="section-header" @click="toggleSection('others')">
        <h2>其他来源</h2>
        <span class="section-count">{{ otherTags.length }}</span>
        <button class="section-action" @click.stop="startAdd('others')">+ 新增</button>
      </div>
      <div v-if="expandedSections.others" class="section-body">
        <div
          v-for="tag in otherTags"
          :key="`other-${tag.id}`"
          class="channel-item channel-item--editable"
          :class="{ active: activeType === 'source_tag' && activeId === tag.id }"
          :draggable="editingTagId !== tag.id"
          @dragstart="onDragStart(tag.id)"
          @dragover.prevent
          @drop="onDrop('others', tag.id)"
        >
          <template v-if="editingTagId === tag.id">
            <div class="inline-edit">
              <input
                v-model="editTagName"
                class="input-inline"
                placeholder="来源名称"
                @keyup.enter="confirmEditTag(tag.id)"
                @keyup.escape="cancelEdit"
              />
              <button class="btn-sm btn-primary" @click="confirmEditTag(tag.id)">保存</button>
              <button class="btn-sm" @click="cancelEdit">取消</button>
            </div>
          </template>
          <template v-else>
            <button class="item-select" @click="onSelectTag(tag)">
              <span class="drag-handle" title="拖拽排序">⠿</span>
              <div class="item-copy">
                <span class="item-name">{{ tag.name }}</span>
                <span class="item-sub-row">{{ getTagCounts(tag.id) }}</span>
              </div>
            </button>
            <div class="row-actions">
              <button class="btn-icon" @click.stop="startEdit(tag)" title="编辑">✎</button>
              <button class="btn-icon btn-danger" @click.stop="confirmDeleteTag(tag.id)" title="删除">✕</button>
            </div>
          </template>
        </div>
        <div v-if="addingSection === 'others'" class="inline-add">
          <input
            ref="addInput"
            v-model="newTagName"
            class="input-inline"
            placeholder="来源名称"
            @keyup.enter="confirmAddTag"
            @keyup.escape="cancelAdd"
          />
          <button class="btn-sm btn-primary" @click="confirmAddTag">保存</button>
          <button class="btn-sm" @click="cancelAdd">取消</button>
        </div>
        <p v-if="sectionError.others" class="section-error">{{ sectionError.others }}</p>
        <div v-if="otherTags.length === 0 && addingSection !== 'others'" class="empty-hint">
          还没有其他来源，点击右上角新增
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, ref } from 'vue'
import { splitSourceTags } from '@/api/channels'
import { showToastUndo } from '@/composables/useToastUndo'
import type { ReorderItem, SourceTagStat } from '@/api/channels'
import type { SourceTag } from '@/api/types'
import type { SupplierWithStats } from '@/composables/useChannels'

type SectionKey = 'suppliers' | 'platforms' | 'others'

const props = defineProps<{
  suppliers: SupplierWithStats[]
  sourceTags: SourceTag[]
  sourceTagStats: SourceTagStat[]
  activeType?: 'supplier' | 'source_tag'
  activeId?: number
  onSelectSupplier: (supplier: SupplierWithStats) => void | Promise<void>
  onSelectTag: (tag: SourceTag) => void | Promise<void>
  onAddSupplier: () => void | Promise<void>
  onAddTag: (name: string, type: 'platform' | 'other') => Promise<void>
  onEditTag: (id: number, name: string) => Promise<void>
  onDeleteTag: (id: number) => Promise<void>
  onReorderTags: (items: ReorderItem[]) => Promise<void>
}>()

const expandedSections = ref<Record<SectionKey, boolean>>({
  suppliers: true,
  platforms: true,
  others: true,
})

const addingSection = ref<'platforms' | 'others' | null>(null)
const newTagName = ref('')
const editingTagId = ref<number | null>(null)
const editTagName = ref('')
const draggingTagId = ref<number | null>(null)
const sectionError = ref<Record<'platforms' | 'others', string>>({
  platforms: '',
  others: '',
})
const addInput = ref<HTMLInputElement>()
const hiddenTagIds = ref(new Set<number>())

const platformTags = computed(() => splitSourceTags(props.sourceTags).platformTags.filter(t => !hiddenTagIds.value.has(t.id)))
const otherTags = computed(() => splitSourceTags(props.sourceTags).otherTags.filter(t => !hiddenTagIds.value.has(t.id)))

function toggleSection(section: SectionKey) {
  expandedSections.value[section] = !expandedSections.value[section]
}

function normalizeName(name: string) {
  return name.trim()
}

function getSupplierContractStatus(supplier: SupplierWithStats) {
  if (!supplier.contract_start && !supplier.contract_end) {
    return '合同未填'
  }

  const today = new Date().toISOString().slice(0, 10)
  if (supplier.contract_end && supplier.contract_end < today) {
    return '已到期'
  }
  if (supplier.contract_start && supplier.contract_start > today) {
    return '未生效'
  }
  return '生效中'
}

function formatGuarantee(months: number | null) {
  if (!months) {
    return '担保期未填'
  }
  return `担保 ${months} 个月`
}

function getTagCounts(tagId: number) {
  const stats = props.sourceTagStats.find((item) => item.id === tagId)
  if (!stats) {
    return '0 推 / 0 入职'
  }
  return `${stats.candidate_count} 推 / ${stats.hired_count} 入职`
}

async function startAdd(section: 'platforms' | 'others') {
  addingSection.value = section
  newTagName.value = ''
  sectionError.value[section] = ''
  await nextTick()
  addInput.value?.focus()
}

function cancelAdd() {
  if (addingSection.value) {
    sectionError.value[addingSection.value] = ''
  }
  addingSection.value = null
  newTagName.value = ''
}

async function confirmAddTag() {
  if (!addingSection.value) {
    return
  }
  const section = addingSection.value
  const name = normalizeName(newTagName.value)
  if (!name) {
    sectionError.value[section] = '请输入名称'
    return
  }
  sectionError.value[section] = ''
  try {
    await props.onAddTag(name, section === 'platforms' ? 'platform' : 'other')
    cancelAdd()
  } catch (error) {
    sectionError.value[section] = error instanceof Error ? error.message : '保存失败，请重试'
  }
}

function startEdit(tag: SourceTag) {
  editingTagId.value = tag.id
  editTagName.value = tag.name
  sectionError.value.platforms = ''
  sectionError.value.others = ''
}

function cancelEdit() {
  editingTagId.value = null
  editTagName.value = ''
}

function getEditingSection(tagId: number) {
  return platformTags.value.some((tag) => tag.id === tagId) ? 'platforms' : 'others'
}

async function confirmEditTag(tagId: number) {
  const name = normalizeName(editTagName.value)
  const section = getEditingSection(tagId)
  if (!name) {
    sectionError.value[section] = '请输入名称'
    return
  }
  sectionError.value[section] = ''
  try {
    await props.onEditTag(tagId, name)
    cancelEdit()
  } catch (error) {
    sectionError.value[section] = error instanceof Error ? error.message : '保存失败，请重试'
  }
}

function confirmDeleteTag(tagId: number) {
  const tag = props.sourceTags.find(t => t.id === tagId)
  const tagName = tag?.name ?? ''
  const section = getEditingSection(tagId)

  // 乐观移除
  hiddenTagIds.value.add(tagId)
  if (editingTagId.value === tagId) {
    cancelEdit()
  }

  showToastUndo(
    `已删除「${tagName}」`,
    async () => {
      // 5 秒后真正删除
      sectionError.value[section] = ''
      try {
        await props.onDeleteTag(tagId)
      } catch (error) {
        sectionError.value[section] = error instanceof Error ? error.message : '删除失败，请重试'
      }
      hiddenTagIds.value.delete(tagId)
    },
    () => {
      // 撤回：恢复显示
      hiddenTagIds.value.delete(tagId)
    },
    '确认删除'
  )
}

function onDragStart(tagId: number) {
  draggingTagId.value = tagId
}

function buildReorderItems(section: 'platforms' | 'others', reorderedIds: number[]) {
  const currentPlatformIds = platformTags.value.map((tag) => tag.id)
  const currentOtherIds = otherTags.value.map((tag) => tag.id)
  const nextPlatformIds = section === 'platforms' ? reorderedIds : currentPlatformIds
  const nextOtherIds = section === 'others' ? reorderedIds : currentOtherIds

  return [...nextPlatformIds, ...nextOtherIds].map((id, index) => ({
    id,
    sort_order: index,
  }))
}

async function onDrop(section: 'platforms' | 'others', targetId: number) {
  if (draggingTagId.value === null || draggingTagId.value === targetId) {
    draggingTagId.value = null
    return
  }

  const currentTags = section === 'platforms' ? [...platformTags.value] : [...otherTags.value]
  const fromIndex = currentTags.findIndex((tag) => tag.id === draggingTagId.value)
  const toIndex = currentTags.findIndex((tag) => tag.id === targetId)
  if (fromIndex < 0 || toIndex < 0) {
    draggingTagId.value = null
    return
  }

  const [moved] = currentTags.splice(fromIndex, 1)
  currentTags.splice(toIndex, 0, moved)
  const items = buildReorderItems(section, currentTags.map((tag) => tag.id))

  sectionError.value[section] = ''
  try {
    await props.onReorderTags(items)
  } catch (error) {
    sectionError.value[section] = error instanceof Error ? error.message : '排序失败，请重试'
  } finally {
    draggingTagId.value = null
  }
}
</script>

<style scoped>
.channel-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  padding: var(--space-3);
}

.channel-section {
  border: 1px solid var(--color-border);
  border-radius: 10px;
  overflow: hidden;
  background: var(--color-bg);
}

.section-header {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: 12px 14px;
  background: var(--color-bg-secondary);
  cursor: pointer;
}

.section-header h2 {
  font-size: 14px;
  font-weight: 600;
  margin: 0;
  flex: 1;
}

.section-count {
  font-size: 11px;
  color: var(--color-text-tertiary);
  background: var(--color-bg);
  padding: 2px 8px;
  border-radius: 999px;
}

.section-action {
  border: none;
  background: none;
  color: var(--color-primary);
  cursor: pointer;
  font-size: 13px;
  padding: 0;
}

.section-body {
  border-top: 1px solid var(--color-border);
}

.channel-item {
  border-bottom: 1px solid var(--color-border);
}

.channel-item:last-child {
  border-bottom: none;
}

.channel-item.active {
  background: var(--color-bg-active);
}

.channel-item--stacked {
  width: 100%;
  border: none;
  background: none;
  text-align: left;
  padding: 12px 14px;
  cursor: pointer;
}

.item-main-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-2);
}

.item-sub-row {
  display: flex;
  justify-content: space-between;
  gap: var(--space-2);
  font-size: 12px;
  color: var(--color-text-secondary);
  margin-top: 6px;
}

.item-name {
  font-size: 14px;
  font-weight: 500;
}

.item-badge {
  font-size: 11px;
  color: var(--color-text-tertiary);
  background: var(--color-bg-secondary);
  padding: 2px 8px;
  border-radius: 999px;
}

.channel-item--editable {
  display: flex;
  align-items: stretch;
  justify-content: space-between;
}

.item-select {
  flex: 1;
  display: flex;
  align-items: center;
  gap: var(--space-2);
  border: none;
  background: none;
  padding: 10px 14px;
  text-align: left;
  cursor: pointer;
}

.item-copy {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.drag-handle {
  color: var(--color-text-tertiary);
  font-size: 14px;
}

.row-actions {
  display: flex;
  align-items: center;
  gap: 4px;
  padding-right: 10px;
  opacity: 0;
  transition: opacity 0.15s;
}

.channel-item--editable:hover .row-actions {
  opacity: 1;
}

.btn-icon {
  border: none;
  background: none;
  color: var(--color-text-secondary);
  cursor: pointer;
  padding: 4px 6px;
  border-radius: 6px;
}

.btn-icon:hover {
  background: var(--color-bg-secondary);
}

.btn-danger:hover {
  color: var(--color-danger);
}

.inline-add,
.inline-edit {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: 10px 14px;
}

.input-inline {
  flex: 1;
  min-width: 0;
  padding: 8px 10px;
  border: 1px solid var(--color-border);
  border-radius: 6px;
  font-size: 14px;
}

.btn-sm {
  border: 1px solid var(--color-border);
  background: var(--color-bg);
  padding: 7px 10px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 13px;
}

.btn-primary {
  background: var(--color-primary);
  border-color: var(--color-primary);
  color: white;
}

.empty-hint {
  padding: 14px;
  color: var(--color-text-tertiary);
  font-size: 13px;
}

.section-error {
  color: var(--color-danger);
  font-size: 13px;
  margin: 0;
  padding: 0 14px 12px;
}
</style>
