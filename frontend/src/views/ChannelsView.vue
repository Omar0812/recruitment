<template>
  <div class="channels-view">
    <h1>渠道</h1>

    <div v-if="state.loading" class="loading">加载中...</div>

    <div v-else-if="state.error" class="page-error" role="alert">
      <p>{{ state.error }}</p>
      <button class="btn-text" @click="loadAll">重试</button>
    </div>

    <div v-else class="channels-layout">
      <div class="channels-sidebar">
        <ChannelList
          :suppliers="state.suppliers"
          :source-tags="state.sourceTags"
          :source-tag-stats="state.sourceTagStats"
          :active-type="state.panel?.type"
          :active-id="state.panel?.id ?? undefined"
          :on-select-supplier="handleSelectSupplier"
          :on-select-tag="handleSelectTag"
          :on-add-supplier="handleAddSupplier"
          :on-add-tag="handleAddTag"
          :on-edit-tag="handleEditTag"
          :on-delete-tag="handleDeleteTag"
          :on-reorder-tags="handleReorderTags"
        />
      </div>

      <div class="channels-content">
        <ChannelPanel
          v-if="state.panel"
          :panel="state.panel"
          :on-close="handleClosePanel"
          :on-start-edit-supplier="handleStartEditSupplier"
          :on-submit-supplier="handleSubmitSupplier"
          :on-cancel-supplier-form="handleCancelSupplierForm"
          :on-delete-supplier="handleDeleteSupplier"
          :on-open-candidate="handleOpenCandidate"
          :on-start-add-expense="handleStartAddExpense"
          :on-edit-expense="handleEditExpense"
          :on-delete-expense="handleDeleteExpense"
        />
        <div v-else class="no-selection">
          <p>选择一个渠道查看详情</p>
        </div>
      </div>
    </div>

    <ExpenseForm
      v-if="showExpenseForm && state.panel"
      :channel-type="state.panel.type"
      :channel-id="state.panel.id ?? 0"
      :expense="editingExpense ?? undefined"
      :on-submit="handleExpenseSubmit"
      :on-cancel="closeExpenseForm"
    />
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useChannels, type SupplierWithStats } from '@/composables/useChannels'
import { useCandidatePanel } from '@/composables/useCandidatePanel'
import ChannelList from '@/components/channels/ChannelList.vue'
import ChannelPanel from '@/components/channels/ChannelPanel.vue'
import ExpenseForm from '@/components/channels/ExpenseForm.vue'
import type { SourceTag } from '@/api/types'
import type { Expense, ExpenseCreatePayload, ReorderItem, SupplierCreatePayload } from '@/api/channels'

const {
  state,
  loadAll,
  openCreateSupplierPanel,
  openSupplierPanel,
  openSourceTagPanel,
  startEditingSupplier,
  closeSupplierForm,
  closePanel,
  addSupplier,
  editSupplier,
  removeSupplier,
  addSourceTag,
  editSourceTag,
  removeSourceTag,
  applySourceTagReorder,
  addExpense,
  editExpense,
  removeExpense,
} = useChannels()

const { open: openCandidatePanel } = useCandidatePanel()
const route = useRoute()
const router = useRouter()

const showExpenseForm = ref(false)
const editingExpense = ref<Expense | null>(null)


async function consumeRouteSelection() {
  const panelType = Array.isArray(route.query.panel_type) ? route.query.panel_type[0] : route.query.panel_type
  const panelIdRaw = Array.isArray(route.query.panel_id) ? route.query.panel_id[0] : route.query.panel_id
  const sourceName = Array.isArray(route.query.source_name) ? route.query.source_name[0] : route.query.source_name

  if (!panelType && !panelIdRaw && !sourceName) return

  if (panelType === 'supplier' && panelIdRaw) {
    const supplier = state.suppliers.find((item) => item.id === Number(panelIdRaw))
    if (supplier) {
      await openSupplierPanel(supplier)
    }
  } else if (panelType === 'source_tag' && panelIdRaw) {
    const tag = state.sourceTags.find((item) => item.id === Number(panelIdRaw))
    if (tag) {
      await openSourceTagPanel(tag)
    }
  } else if (typeof sourceName === 'string' && sourceName) {
    const supplier = state.suppliers.find((item) => item.name === sourceName)
    if (supplier) {
      await openSupplierPanel(supplier)
    } else {
      const tag = state.sourceTags.find((item) => item.name === sourceName)
      if (tag) {
        await openSourceTagPanel(tag)
      }
    }
  }

  await router.replace({ query: {} })
}

function resetExpenseForm() {
  showExpenseForm.value = false
  editingExpense.value = null
}

function handleSelectSupplier(supplier: SupplierWithStats) {
  resetExpenseForm()
  return openSupplierPanel(supplier)
}

function handleSelectTag(tag: SourceTag) {
  resetExpenseForm()
  return openSourceTagPanel(tag)
}

function handleAddSupplier() {
  resetExpenseForm()
  openCreateSupplierPanel()
}

async function handleAddTag(name: string, type: 'platform' | 'other') {
  await addSourceTag(name, type)
}

async function handleEditTag(id: number, name: string) {
  await editSourceTag(id, name)
}

async function handleDeleteTag(id: number) {
  await removeSourceTag(id)
}

async function handleReorderTags(items: ReorderItem[]) {
  await applySourceTagReorder(items)
}

function handleStartEditSupplier() {
  startEditingSupplier()
}

function handleCancelSupplierForm() {
  closeSupplierForm()
}

async function handleSubmitSupplier(payload: SupplierCreatePayload) {
  if (state.panel?.type !== 'supplier') {
    return
  }

  if (state.panel.mode === 'edit_supplier' && state.panel.id !== null) {
    await editSupplier(state.panel.id, payload)
    closeSupplierForm()
    return
  }

  const supplier = await addSupplier(payload)
  await openSupplierPanel(supplier)
}

async function handleDeleteSupplier() {
  if (state.panel?.type !== 'supplier' || state.panel.id === null) {
    return
  }
  await removeSupplier(state.panel.id)
}

function handleClosePanel() {
  if (state.panel?.type === 'supplier' && state.panel.mode !== 'view') {
    closeSupplierForm()
    return
  }
  resetExpenseForm()
  closePanel()
}

function handleOpenCandidate(candidateId: number) {
  openCandidatePanel(candidateId)
}

function handleStartAddExpense() {
  editingExpense.value = null
  showExpenseForm.value = true
}

function handleEditExpense(expense: Expense) {
  editingExpense.value = expense
  showExpenseForm.value = true
}

async function handleDeleteExpense(expenseId: number) {
  await removeExpense(expenseId)
}

async function handleExpenseSubmit(payload: ExpenseCreatePayload) {
  if (editingExpense.value) {
    await editExpense(editingExpense.value.id, payload)
  } else {
    await addExpense(payload)
  }
}

function closeExpenseForm() {
  resetExpenseForm()
}

onMounted(async () => {
  await loadAll()
  await consumeRouteSelection()
})
</script>

<style scoped>
.channels-view {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.channels-view h1 {
  font-size: 24px;
  font-weight: 600;
  margin: 0 0 var(--space-4);
}

.loading {
  color: var(--color-text-secondary);
  font-size: 14px;
  padding: var(--space-5) 0;
}

.page-error {
  border: 1px solid var(--color-danger);
  border-radius: 8px;
  padding: var(--space-4);
  color: var(--color-danger);
  background: color-mix(in srgb, var(--color-danger) 8%, white);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
}

.page-error p {
  margin: 0;
}

.channels-layout {
  display: flex;
  flex: 1;
  gap: 0;
  min-height: 0;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  overflow: hidden;
}

.channels-sidebar {
  width: 320px;
  flex-shrink: 0;
  overflow-y: auto;
  border-right: 1px solid var(--color-border);
  background: var(--color-bg-secondary);
}

.channels-content {
  flex: 1;
  overflow-y: auto;
  background: var(--color-bg);
}

.no-selection {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: var(--color-text-tertiary);
  font-size: 14px;
}

.no-selection p {
  margin: 0;
}

.btn-text {
  border: none;
  background: none;
  color: var(--color-primary);
  cursor: pointer;
  padding: 0;
  font-size: 14px;
}
</style>
