<template>
  <section class="term-section">
    <div class="section-header">
      <h2>{{ title }}</h2>
      <span class="term-count">{{ items.length }}</span>
      <button class="btn-text" @click="startAdd">+ 新增</button>
    </div>

    <div v-if="items.length === 0 && !adding" class="empty-state">
      <p>{{ emptyStateText }}</p>
    </div>

    <ul v-else class="term-list">
      <li
        v-for="item in items"
        :key="item.id"
        class="term-item"
        :class="{ dragging: dragId === item.id }"
        :draggable="editingId !== item.id"
        @dragstart="onDragStart(item.id)"
        @dragover.prevent
        @drop="onDrop(item.id)"
        @dragend="dragId = null"
      >
        <template v-if="editingId !== item.id">
          <div class="term-content">
            <span class="drag-handle" title="拖拽排序">⠿</span>
            <div class="term-info">
              <span class="term-name">{{ item.name }}</span>
              <span v-if="showAddress && item.address" class="term-address">{{ item.address }}</span>
            </div>
          </div>
          <div class="term-actions">
            <button class="btn-icon btn-more" @click.stop="toggleMenu(item.id)" title="更多操作">···</button>
            <div v-if="menuOpenId === item.id" class="action-menu" @click.stop>
              <button class="menu-item" @click="startEdit(item); menuOpenId = null">编辑</button>
              <button class="menu-item menu-item--danger" @click="handleDeleteWithUndo(item)">删除</button>
            </div>
          </div>
        </template>

        <template v-else>
          <div class="edit-form">
            <input
              ref="editInput"
              v-model="editName"
              class="input-inline"
              :placeholder="showAddress ? '地点简称' : `${title}名称`"
              @keyup.enter="confirmEdit"
              @keyup.escape="cancelEdit"
            />
            <input
              v-if="showAddress"
              v-model="editAddress"
              class="input-inline"
              placeholder="完整地址"
              @keyup.enter="confirmEdit"
              @keyup.escape="cancelEdit"
            />
            <div class="edit-actions">
              <button class="btn-sm btn-primary" @click="confirmEdit" :disabled="submitting">保存</button>
              <button class="btn-sm" @click="cancelEdit" :disabled="submitting">取消</button>
            </div>
          </div>
        </template>
      </li>
    </ul>

    <div v-if="adding" class="add-form">
      <input
        ref="addInput"
        v-model="newName"
        class="input-inline"
        :placeholder="showAddress ? '地点简称' : `${title}名称`"
        @keyup.enter="confirmAdd"
        @keyup.escape="cancelAdd"
      />
      <input
        v-if="showAddress"
        v-model="newAddress"
        class="input-inline"
        placeholder="完整地址"
        @keyup.enter="confirmAdd"
        @keyup.escape="cancelAdd"
      />
      <div class="edit-actions">
        <button class="btn-sm btn-primary" @click="confirmAdd" :disabled="submitting">添加</button>
        <button class="btn-sm" @click="cancelAdd" :disabled="submitting">取消</button>
      </div>
    </div>

    <p v-if="error" class="error-msg">{{ error }}</p>
  </section>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref } from 'vue'
import type { ReorderItem, Term } from '@/api/company'
import { showToastUndo } from '@/composables/useToastUndo'

const props = defineProps<{
  title: string
  items: Term[]
  showAddress?: boolean
  onAdd: (name: string, address?: string) => Promise<void>
  onUpdate: (id: number, name: string, address?: string) => Promise<void>
  onDelete: (id: number) => Promise<void>
  onReorder: (items: ReorderItem[]) => Promise<void>
}>()

const adding = ref(false)
const newName = ref('')
const newAddress = ref('')
const addInput = ref<HTMLInputElement>()

const editingId = ref<number | null>(null)
const editName = ref('')
const editAddress = ref('')
const editInput = ref<HTMLInputElement>()

const dragId = ref<number | null>(null)
const error = ref('')
const submitting = ref(false)
const menuOpenId = ref<number | null>(null)

function closeMenu() {
  menuOpenId.value = null
}

function toggleMenu(id: number) {
  menuOpenId.value = menuOpenId.value === id ? null : id
}

function onDocumentClick() {
  closeMenu()
}

if (typeof document !== 'undefined') {
  document.addEventListener('click', onDocumentClick)
}
onBeforeUnmount(() => {
  if (typeof document !== 'undefined') {
    document.removeEventListener('click', onDocumentClick)
  }
})

const emptyStateText = computed(() => {
  return props.showAddress ? '还没有办公地点，点击右上角新增' : '还没有部门，点击右上角新增'
})

function normalizeName(name: string) {
  return name.trim()
}

async function startAdd() {
  adding.value = true
  newName.value = ''
  newAddress.value = ''
  error.value = ''
  await nextTick()
  addInput.value?.focus()
}

async function confirmAdd() {
  const name = normalizeName(newName.value)
  if (!name) {
    error.value = props.showAddress ? '请输入地点简称' : '请输入名称'
    return
  }

  submitting.value = true
  error.value = ''
  try {
    await props.onAdd(name, props.showAddress ? newAddress.value : undefined)
    adding.value = false
    newName.value = ''
    newAddress.value = ''
  } catch (addError) {
    error.value = addError instanceof Error ? addError.message : '添加失败，请重试'
  } finally {
    submitting.value = false
  }
}

function cancelAdd() {
  adding.value = false
  newName.value = ''
  newAddress.value = ''
  error.value = ''
}

async function startEdit(item: Term) {
  editingId.value = item.id
  editName.value = item.name
  editAddress.value = item.address || ''
  error.value = ''
  await nextTick()
  editInput.value?.focus()
}

async function confirmEdit() {
  if (editingId.value === null) {
    return
  }

  const name = normalizeName(editName.value)
  if (!name) {
    error.value = props.showAddress ? '请输入地点简称' : '请输入名称'
    return
  }

  submitting.value = true
  error.value = ''
  try {
    await props.onUpdate(editingId.value, name, props.showAddress ? editAddress.value : undefined)
    editingId.value = null
    editName.value = ''
    editAddress.value = ''
  } catch (updateError) {
    error.value = updateError instanceof Error ? updateError.message : '更新失败，请重试'
  } finally {
    submitting.value = false
  }
}

function cancelEdit() {
  editingId.value = null
  editName.value = ''
  editAddress.value = ''
  error.value = ''
}

function handleDeleteWithUndo(item: Term) {
  menuOpenId.value = null
  showToastUndo(
    `已删除「${item.name}」`,
    async () => {
      try {
        await props.onDelete(item.id)
      } catch (deleteError) {
        error.value = deleteError instanceof Error ? deleteError.message : '删除失败，请重试'
      }
    },
    () => { /* undo: do nothing, item was never deleted */ },
  )
}

function onDragStart(id: number) {
  dragId.value = id
}

async function onDrop(targetId: number) {
  if (dragId.value === null || dragId.value === targetId) {
    dragId.value = null
    return
  }

  const items = [...props.items]
  const fromIndex = items.findIndex((item) => item.id === dragId.value)
  const toIndex = items.findIndex((item) => item.id === targetId)
  if (fromIndex < 0 || toIndex < 0) {
    dragId.value = null
    return
  }

  const [moved] = items.splice(fromIndex, 1)
  items.splice(toIndex, 0, moved)

  submitting.value = true
  error.value = ''
  try {
    await props.onReorder(items.map((item, index) => ({
      id: item.id,
      sort_order: index,
    })))
  } catch (reorderError) {
    error.value = reorderError instanceof Error ? reorderError.message : '排序失败，请重试'
  } finally {
    dragId.value = null
    submitting.value = false
  }
}
</script>

<style scoped>
.term-section {
  margin-bottom: var(--space-6);
}

.section-header {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  margin-bottom: var(--space-3);
}

.section-header h2 {
  font-size: 16px;
  font-weight: 600;
  margin: 0;
}

.term-count {
  font-size: 12px;
  color: var(--color-text-tertiary);
  background: var(--color-bg-secondary);
  padding: 1px 8px;
  border-radius: 10px;
}

.btn-text {
  margin-left: auto;
  border: none;
  background: none;
  color: var(--color-primary);
  cursor: pointer;
  padding: 0;
  font-size: 14px;
}

.empty-state {
  color: var(--color-text-tertiary);
  font-size: 13px;
  padding: 4px 0;
}

.empty-state p {
  margin: 0;
}

.term-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.term-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 12px;
  border-bottom: 1px solid var(--color-border);
  cursor: grab;
  transition: background 0.15s;
}

.term-item:hover {
  background: var(--color-bg-hover);
}

.term-item.dragging {
  opacity: 0.5;
}

.term-content {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.drag-handle {
  color: var(--color-text-tertiary);
  cursor: grab;
  font-size: 14px;
  user-select: none;
}

.term-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.term-name {
  font-size: 14px;
}

.term-address {
  font-size: 12px;
  color: var(--color-text-secondary);
}

.term-actions {
  display: flex;
  gap: var(--space-1);
  opacity: 0;
  transition: opacity 0.15s;
  position: relative;
}

.term-item:hover .term-actions {
  opacity: 1;
}

.btn-more {
  background: none;
  border: none;
  cursor: pointer;
  padding: 4px 6px;
  border-radius: 4px;
  font-size: 14px;
  color: var(--color-text-secondary);
  letter-spacing: 1px;
}

.btn-more:hover {
  background: var(--color-bg-secondary);
}

.action-menu {
  position: absolute;
  top: 100%;
  right: 0;
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: 6px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  min-width: 96px;
  z-index: 10;
  padding: 4px 0;
}

.menu-item {
  display: block;
  width: 100%;
  padding: 6px 12px;
  border: none;
  background: none;
  font-size: 13px;
  color: var(--color-text-primary);
  cursor: pointer;
  text-align: left;
}

.menu-item:hover {
  background: var(--color-bg-hover);
}

.menu-item--danger {
  color: var(--color-danger);
}

.edit-form,
.add-form {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: 10px 0;
}

.input-inline {
  flex: 1;
  min-width: 0;
  padding: 8px 10px;
  border: 1px solid var(--color-border);
  border-radius: 6px;
  font-size: 14px;
}

.edit-actions {
  display: flex;
  gap: var(--space-2);
}

.btn-sm {
  padding: 7px 10px;
  border-radius: 6px;
  border: 1px solid var(--color-border);
  background: var(--color-bg);
  cursor: pointer;
  font-size: 13px;
}

.btn-primary {
  background: var(--color-primary);
  border-color: var(--color-primary);
  color: white;
}

.error-msg {
  margin: var(--space-2) 0 0;
  font-size: 13px;
  color: var(--color-danger);
}
</style>
