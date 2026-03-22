<template>
  <div v-if="panel" class="channel-panel">
    <div class="panel-header">
      <div class="panel-title">
        <h2>{{ panelTitle }}</h2>
        <div class="panel-meta">
          <span class="panel-type">{{ panelTypeLabel }}</span>
          <template v-if="panel.type === 'supplier' && panel.supplier && supplierContractStatus">
            <span class="contract-badge" :class="supplierContractStatus.class">{{ supplierContractStatus.label }}</span>
            <span v-if="panel.supplier.contract_end" class="contract-end">至 {{ panel.supplier.contract_end }}</span>
          </template>
        </div>
      </div>
      <button class="btn-close" @click="onClose()">✕</button>
    </div>

    <SupplierForm
      v-if="panel.type === 'supplier' && panelMode !== 'view'"
      :mode="panelMode === 'create_supplier' ? 'create' : 'edit'"
      :supplier="panel.supplier"
      :on-submit="onSubmitSupplier"
      :on-cancel="onCancelSupplierForm"
    />

    <template v-else-if="panel.loading">
      <div class="panel-loading">加载中...</div>
    </template>

    <template v-else-if="panel.error">
      <div class="panel-error" role="alert">{{ panel.error }}</div>
    </template>

    <template v-else>
      <div v-if="actionError" class="panel-error" role="alert">{{ actionError }}</div>

      <div v-if="panel.type === 'supplier' && panel.supplier" class="info-section">
        <h3>基本信息</h3>
        <div class="info-grid">
          <div class="info-item">
            <span class="info-label">联系人</span>
            <span>{{ panel.supplier.contact_name || '未填写' }}</span>
          </div>
          <div class="info-item">
            <span class="info-label">电话</span>
            <span>{{ panel.supplier.phone || '未填写' }}</span>
          </div>
          <div class="info-item">
            <span class="info-label">邮箱</span>
            <span>{{ panel.supplier.email || '未填写' }}</span>
          </div>
          <div class="info-item">
            <span class="info-label">担保期</span>
            <span>{{ panel.supplier.guarantee_months ? `${panel.supplier.guarantee_months} 个月` : '未填写' }}</span>
          </div>
          <div class="info-item">
            <span class="info-label">合同期</span>
            <span>{{ contractPeriod }}</span>
          </div>
          <div class="info-item info-item--full">
            <span class="info-label">合同条款</span>
            <span>{{ panel.supplier.contract_terms || '未填写' }}</span>
          </div>
          <div class="info-item info-item--full">
            <span class="info-label">备注</span>
            <span>{{ panel.supplier.notes || '未填写' }}</span>
          </div>
        </div>
      </div>

      <div v-if="panel.stats" class="stats-section">
        <div class="stat-item">
          <span class="stat-value">{{ panel.stats.candidate_count }}</span>
          <span class="stat-label">推荐人数</span>
        </div>
        <div class="stat-item">
          <span class="stat-value">{{ panel.stats.hired_count }}</span>
          <span class="stat-label">入职人数</span>
        </div>
      </div>

      <div class="candidates-section">
        <h3>候选人</h3>
        <div v-if="groupedCandidates.total === 0" class="empty-hint">暂无候选人</div>

        <template v-else>
          <section class="candidate-group">
            <div class="candidate-group__header">
              <span>进行中</span>
              <span>{{ groupedCandidates.inProgress.length }}</span>
            </div>
            <div v-if="groupedCandidates.inProgress.length === 0" class="empty-hint empty-hint--inner">暂无进行中候选人</div>
            <button
              v-for="candidate in groupedCandidates.inProgress"
              :key="candidate.id"
              class="candidate-row"
              @click="onOpenCandidate(candidate.id)"
            >
              <span class="candidate-name">{{ candidate.name }}</span>
              <span class="candidate-status">{{ getCandidateStatus(candidate) }}</span>
            </button>
          </section>

          <section class="candidate-group">
            <div class="candidate-group__header">
              <span>已入职</span>
              <span>{{ groupedCandidates.hired.length }}</span>
            </div>
            <div v-if="groupedCandidates.hired.length === 0" class="empty-hint empty-hint--inner">暂无已入职候选人</div>
            <button
              v-for="candidate in groupedCandidates.hired"
              :key="candidate.id"
              class="candidate-row"
              @click="onOpenCandidate(candidate.id)"
            >
              <span class="candidate-name">{{ candidate.name }}</span>
              <span class="candidate-status">{{ getCandidateStatus(candidate) }}</span>
            </button>
          </section>

          <section class="candidate-group">
            <button class="candidate-group__header candidate-group__header--button" @click="endedExpanded = !endedExpanded">
              <span>已结束</span>
              <span>{{ groupedCandidates.ended.length }} {{ endedExpanded ? '▾' : '▸' }}</span>
            </button>
            <div v-if="endedExpanded">
              <div v-if="groupedCandidates.ended.length === 0" class="empty-hint empty-hint--inner">暂无已结束候选人</div>
              <button
                v-for="candidate in groupedCandidates.ended"
                :key="candidate.id"
                class="candidate-row"
                @click="onOpenCandidate(candidate.id)"
              >
                <span class="candidate-name">{{ candidate.name }}</span>
                <span class="candidate-status">{{ getCandidateStatus(candidate) }}</span>
              </button>
            </div>
          </section>
        </template>
      </div>

      <div class="expenses-section">
        <div class="section-header-row">
          <h3>费用记录</h3>
          <button class="btn-text" @click="onStartAddExpense()">+ 记录</button>
        </div>
        <div v-if="mergedExpenses.length === 0" class="empty-hint">暂无费用记录</div>
        <div v-for="item in mergedExpenses" :key="item.key" class="expense-row">
          <div class="expense-main">
            <span class="expense-amount">¥{{ item.amount.toLocaleString() }}</span>
            <span class="expense-date">{{ item.date }}</span>
          </div>
          <span class="expense-desc">{{ item.label }}</span>
          <div v-if="!item.readonly" class="expense-actions">
            <button class="btn-icon" @click="onEditExpense(item.expense!)" title="编辑">✎</button>
            <button class="btn-icon btn-danger" @click="handleDeleteExpense(item.expense!.id)" title="删除">✕</button>
          </div>
        </div>
        <div v-if="mergedExpenses.length > 0" class="expense-total">累计 ¥{{ totalExpense.toLocaleString() }}</div>
      </div>

      <div v-if="panel.type === 'supplier'" class="panel-actions">
        <button class="btn-secondary" @click="onStartEditSupplier()">编辑</button>
        <button class="btn-danger-solid" @click="handleDeleteSupplier">删除</button>
      </div>

      <div v-if="panel.type === 'source_tag'" class="panel-actions">
        <button class="btn-secondary" @click="onEditSourceTagName()">编辑名称</button>
        <button class="btn-danger-solid" @click="handleDeleteSourceTag">删除</button>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { occurredAtToExpenseMonth, type Expense, type HeadhunterFeeItem, type SupplierCreatePayload } from '@/api/channels'
import type { CandidateWithApplication, LatestApplication } from '@/api/types'
import type { ChannelPanelMode, SupplierWithStats } from '@/composables/useChannels'
import SupplierForm from '@/components/channels/SupplierForm.vue'

interface PanelData {
  type: 'supplier' | 'source_tag'
  mode?: ChannelPanelMode
  id: number | null
  name: string
  supplier?: SupplierWithStats
  candidates: CandidateWithApplication[]
  expenses: Expense[]
  headhunterFees?: HeadhunterFeeItem[]
  stats: { candidate_count: number; hired_count: number } | null
  loading: boolean
  error: string | null
}

const props = withDefaults(defineProps<{
  panel: PanelData | null
  onClose?: () => void
  onStartEditSupplier?: () => void
  onSubmitSupplier?: (payload: SupplierCreatePayload) => Promise<void>
  onCancelSupplierForm?: () => void
  onDeleteSupplier?: () => Promise<void>
  onOpenCandidate?: (candidateId: number) => void
  onStartAddExpense?: () => void
  onEditExpense?: (expense: Expense) => void
  onDeleteExpense?: (expenseId: number) => Promise<void>
  onEditSourceTagName?: () => void
  onDeleteSourceTag?: () => Promise<void>
}>(), {
  onClose: () => () => {},
  onStartEditSupplier: () => () => {},
  onSubmitSupplier: () => async () => {},
  onCancelSupplierForm: () => () => {},
  onDeleteSupplier: () => async () => {},
  onOpenCandidate: () => () => {},
  onStartAddExpense: () => () => {},
  onEditExpense: () => () => {},
  onDeleteExpense: () => async () => {},
  onEditSourceTagName: () => () => {},
  onDeleteSourceTag: () => async () => {},
})

const actionError = ref('')
const endedExpanded = ref(false)

watch(
  () => [props.panel?.id, props.panel?.type, props.panel?.mode],
  () => {
    actionError.value = ''
    endedExpanded.value = false
  },
)

const panelTitle = computed(() => {
  if (!props.panel) {
    return ''
  }
  if (props.panel.type === 'supplier' && panelMode.value === 'create_supplier') {
    return '新建猎头公司'
  }
  if (props.panel.type === 'supplier' && panelMode.value === 'edit_supplier') {
    return `编辑 ${props.panel.name}`
  }
  return props.panel.name
})

const panelTypeLabel = computed(() => {
  if (!props.panel) {
    return ''
  }
  if (props.panel.type === 'supplier') {
    return '猎头公司'
  }
  return '来源渠道'
})

const panelMode = computed<ChannelPanelMode>(() => props.panel?.mode ?? 'view')

const contractPeriod = computed(() => {
  const supplier = props.panel?.supplier
  if (!supplier) {
    return '未填写'
  }
  if (!supplier.contract_start && !supplier.contract_end) {
    return '未填写'
  }
  return `${supplier.contract_start || '未设开始'} - ${supplier.contract_end || '未设结束'}`
})

const supplierContractStatus = computed(() => {
  const supplier = props.panel?.supplier
  if (!supplier) return null
  if (!supplier.contract_start && !supplier.contract_end) return null
  if (supplier.contract_end) {
    const endDate = new Date(supplier.contract_end)
    if (endDate < new Date()) {
      return { label: '已到期', class: 'contract-badge--expired' }
    }
  }
  return { label: '合作中', class: 'contract-badge--active' }
})

function classifyCandidate(latestApplication: LatestApplication | null) {
  if (!latestApplication) {
    return 'ended'
  }
  if (latestApplication.state === 'IN_PROGRESS') {
    return 'inProgress'
  }
  if (latestApplication.state === 'HIRED') {
    return 'hired'
  }
  return 'ended'
}

const groupedCandidates = computed(() => {
  const groups = {
    inProgress: [] as CandidateWithApplication[],
    hired: [] as CandidateWithApplication[],
    ended: [] as CandidateWithApplication[],
    total: props.panel?.candidates.length ?? 0,
  }

  for (const candidate of props.panel?.candidates ?? []) {
    const group = classifyCandidate(candidate.latest_application)
    groups[group].push(candidate)
  }

  return groups
})

interface MergedExpenseItem {
  key: string
  amount: number
  date: string
  label: string
  readonly: boolean
  expense?: Expense
}

const mergedExpenses = computed<MergedExpenseItem[]>(() => {
  const items: MergedExpenseItem[] = []

  // 聚合猎头费行（只读）
  for (const fee of props.panel?.headhunterFees ?? []) {
    items.push({
      key: `hf-${fee.application_id}`,
      amount: fee.headhunter_fee,
      date: fee.hire_date.slice(0, 7),
      label: `${fee.candidate_name}入职·猎头费`,
      readonly: true,
    })
  }

  // 手动费用行（可编辑/删除）
  for (const expense of props.panel?.expenses ?? []) {
    items.push({
      key: `exp-${expense.id}`,
      amount: expense.amount,
      date: occurredAtToExpenseMonth(expense.occurred_at),
      label: expense.description || '无说明',
      readonly: false,
      expense,
    })
  }

  // 按日期倒序
  items.sort((a, b) => b.date.localeCompare(a.date))
  return items
})

const totalExpense = computed(() => {
  return mergedExpenses.value.reduce((sum, item) => sum + item.amount, 0)
})

const STATE_LABELS: Record<string, string> = {
  IN_PROGRESS: '进行中',
  HIRED: '已入职',
  REJECTED: '已淘汰',
  WITHDRAWN: '已退出',
  LEFT: '已离职',
}

function getCandidateStatus(candidate: CandidateWithApplication) {
  if (!candidate.latest_application) {
    return '暂无流程'
  }
  const stateLabel = STATE_LABELS[candidate.latest_application.state] ?? candidate.latest_application.state
  return `${candidate.latest_application.job_title} · ${stateLabel}`
}

async function handleDeleteSupplier() {
  actionError.value = ''
  try {
    await props.onDeleteSupplier()
  } catch (error) {
    actionError.value = error instanceof Error ? error.message : '删除失败，请重试'
  }
}

async function handleDeleteExpense(expenseId: number) {
  actionError.value = ''
  try {
    await props.onDeleteExpense(expenseId)
  } catch (error) {
    actionError.value = error instanceof Error ? error.message : '删除失败，请重试'
  }
}

async function handleDeleteSourceTag() {
  actionError.value = ''
  try {
    await props.onDeleteSourceTag()
  } catch (error) {
    actionError.value = error instanceof Error ? error.message : '删除失败，请重试'
  }
}
</script>

<style scoped>
.channel-panel {
  height: 100%;
  overflow-y: auto;
  padding: var(--space-4);
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: var(--space-4);
}

.panel-title h2 {
  font-size: 20px;
  font-weight: 600;
  margin: 0;
}

.panel-type {
  font-size: 12px;
  color: var(--color-text-tertiary);
}

.panel-meta {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  margin-top: 2px;
}

.contract-badge {
  font-size: 11px;
  padding: 1px 6px;
  border-radius: 4px;
}

.contract-badge--active {
  background: color-mix(in srgb, var(--color-material-moss) 15%, transparent);
  color: var(--color-material-moss);
}

.contract-badge--expired {
  background: color-mix(in srgb, var(--color-danger) 10%, transparent);
  color: var(--color-danger);
}

.contract-end {
  font-size: 11px;
  color: var(--color-text-tertiary);
}

.btn-close {
  background: none;
  border: none;
  font-size: 16px;
  cursor: pointer;
  color: var(--color-text-secondary);
  padding: 4px;
}

.panel-loading {
  color: var(--color-text-secondary);
  font-size: 14px;
  padding: var(--space-4) 0;
}

.panel-error {
  border: 1px solid var(--color-danger);
  background: color-mix(in srgb, var(--color-danger) 8%, white);
  color: var(--color-danger);
  font-size: 14px;
  padding: var(--space-3);
  border-radius: 8px;
  margin-bottom: var(--space-4);
}

.info-section,
.candidates-section,
.expenses-section {
  margin-bottom: var(--space-5);
  padding-bottom: var(--space-4);
  border-bottom: 1px solid var(--color-border);
}

.info-section h3,
.candidates-section h3,
.expenses-section h3 {
  font-size: 13px;
  font-weight: 600;
  color: var(--color-text-secondary);
  margin: 0 0 var(--space-3);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.info-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--space-3);
}

.info-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 14px;
}

.info-item--full {
  grid-column: 1 / -1;
}

.info-label {
  color: var(--color-text-secondary);
  font-size: 12px;
}

.stats-section {
  display: flex;
  gap: var(--space-4);
  margin-bottom: var(--space-5);
  padding-bottom: var(--space-4);
  border-bottom: 1px solid var(--color-border);
}

.stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  min-width: 96px;
}

.stat-value {
  font-size: 24px;
  font-weight: 600;
}

.stat-label {
  font-size: 12px;
  color: var(--color-text-secondary);
}

.candidate-group {
  margin-bottom: var(--space-3);
}

.candidate-group__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 13px;
  color: var(--color-text-secondary);
  margin-bottom: var(--space-2);
}

.candidate-group__header--button {
  width: 100%;
  border: none;
  background: none;
  padding: 0;
  cursor: pointer;
}

.candidate-row {
  width: 100%;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: var(--space-2);
  padding: 8px 0;
  border: none;
  background: none;
  cursor: pointer;
  text-align: left;
}

.candidate-row:hover .candidate-name {
  color: var(--color-primary);
}

.candidate-name {
  font-size: 14px;
  font-weight: 500;
}

.candidate-status {
  font-size: 12px;
  color: var(--color-text-tertiary);
}

.empty-hint {
  color: var(--color-text-tertiary);
  font-size: 13px;
}

.empty-hint--inner {
  padding: 4px 0 8px;
}

.section-header-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--space-2);
}

.expense-row {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: 10px 0;
  border-bottom: 1px solid var(--color-border);
}

.expense-row:last-of-type {
  border-bottom: none;
}

.expense-main {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 96px;
}

.expense-amount {
  font-weight: 500;
  font-size: 14px;
}

.expense-date {
  font-size: 12px;
  color: var(--color-text-secondary);
}

.expense-desc {
  flex: 1;
  color: var(--color-text-secondary);
  font-size: 13px;
}

.expense-actions {
  display: flex;
  gap: 4px;
}

.btn-icon {
  background: none;
  border: none;
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

.expense-total {
  margin-top: var(--space-3);
  text-align: right;
  font-size: 14px;
  font-weight: 600;
}

.panel-actions {
  display: flex;
  gap: var(--space-2);
}

.btn-text,
.btn-secondary,
.btn-danger-solid {
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
}

.btn-text {
  border: none;
  background: none;
  color: var(--color-primary);
  padding: 0;
}

.btn-secondary {
  border: 1px solid var(--color-border);
  background: var(--color-bg);
  padding: 9px 14px;
}

.btn-danger-solid {
  border: 1px solid var(--color-danger);
  background: var(--color-danger);
  color: white;
  padding: 9px 14px;
}
</style>
