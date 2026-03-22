<template>
  <div class="company-view">
    <h1>公司</h1>

    <div v-if="state.loading" class="loading">加载中...</div>

    <div v-else-if="state.error" class="page-error" role="alert">
      <p>{{ state.error }}</p>
      <button class="btn-text" @click="loadAll">重试</button>
    </div>

    <div v-else class="sections">
      <TermSection
        title="部门"
        :items="state.departments"
        :on-add="handleAddDepartment"
        :on-update="handleUpdate"
        :on-delete="handleDelete"
        :on-reorder="handleReorder"
      />

      <TermSection
        title="办公地点"
        :items="state.locations"
        :show-address="true"
        :on-add="handleAddLocation"
        :on-update="handleUpdate"
        :on-delete="handleDelete"
        :on-reorder="handleReorder"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import { useCompany } from '@/composables/useCompany'
import TermSection from '@/components/company/TermSection.vue'

const { state, loadAll, addDepartment, addLocation, update, remove, reorder } = useCompany()

async function handleAddDepartment(name: string) {
  await addDepartment(name)
}

async function handleAddLocation(name: string, address?: string) {
  await addLocation(name, address)
}

async function handleUpdate(id: number, name: string, address?: string) {
  await update(id, { name, address })
}

async function handleDelete(id: number) {
  await remove(id)
}

async function handleReorder(items: { id: number; sort_order: number }[]) {
  await reorder(items)
}

onMounted(() => {
  loadAll()
})
</script>

<style scoped>
.company-view {
  max-width: 640px;
}

.company-view h1 {
  font-size: 24px;
  font-weight: 600;
  margin: 0 0 var(--space-5);
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
  background: color-mix(in srgb, var(--color-danger) 8%, white);
  color: var(--color-danger);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
}

.page-error p {
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

.sections {
  display: flex;
  flex-direction: column;
  gap: var(--space-5);
}
</style>
