<template>
  <div class="basic-info">
    <!-- Blacklist Warning -->
    <div v-if="candidate.blacklisted" class="basic-info__blacklist-warning">
      <span class="basic-info__warning-icon">⚠</span>
      <div>
        <div class="basic-info__warning-title">黑名单：{{ candidate.blacklist_reason || '未注明原因' }}</div>
        <div v-if="candidate.blacklist_note" class="basic-info__warning-note">备注：{{ candidate.blacklist_note }}</div>
      </div>
    </div>

    <!-- Contact -->
    <section class="basic-info__section">
      <div class="basic-info__field">
        <span class="basic-info__label">手机</span>
        <input v-if="editing" v-model="form.phone" class="basic-info__input" placeholder="手机号" />
        <span v-else class="basic-info__value">{{ candidate.phone || '—' }}</span>
      </div>
      <div class="basic-info__field">
        <span class="basic-info__label">邮箱</span>
        <input v-if="editing" v-model="form.email" class="basic-info__input" placeholder="邮箱" />
        <span v-else class="basic-info__value">{{ candidate.email || '—' }}</span>
      </div>
    </section>

    <!-- Basic Facts -->
    <section class="basic-info__section">
      <div class="basic-info__field">
        <span class="basic-info__label">学历</span>
        <input v-if="editing" v-model="form.education" class="basic-info__input" placeholder="学历" />
        <span v-else-if="candidate.education" class="basic-info__value">{{ candidate.education }}</span>
      </div>
      <div class="basic-info__field">
        <span class="basic-info__label">学校</span>
        <input v-if="editing" v-model="form.school" class="basic-info__input" placeholder="学校" />
        <span v-else-if="candidate.school" class="basic-info__value">{{ candidate.school }}</span>
      </div>
      <div class="basic-info__field">
        <span class="basic-info__label">工作年限</span>
        <input v-if="editing" v-model.number="form.years_exp" class="basic-info__input" type="number" placeholder="年" />
        <span v-else-if="candidate.years_exp != null" class="basic-info__value">{{ candidate.years_exp }}年</span>
      </div>
      <div class="basic-info__field">
        <span class="basic-info__label">年龄</span>
        <input v-if="editing" v-model.number="form.age" class="basic-info__input" type="number" placeholder="年龄" />
        <span v-else-if="candidate.age != null" class="basic-info__value">{{ candidate.age }}</span>
      </div>
      <div v-if="!editing && candidate.source" class="basic-info__field">
        <span class="basic-info__label">来源</span>
        <span class="basic-info__value">{{ candidate.source }}</span>
      </div>
      <div v-if="!editing && candidate.referred_by" class="basic-info__field">
        <span class="basic-info__label">内推人</span>
        <span class="basic-info__value">{{ candidate.referred_by }}</span>
      </div>
    </section>

    <!-- Skills -->
    <section class="basic-info__section">
      <div class="basic-info__label">技能</div>
      <div v-if="editing">
        <input v-model="skillsText" class="basic-info__input basic-info__input--full" placeholder="用逗号分隔，如：Java, Python" />
      </div>
      <div v-else-if="candidate.skill_tags?.length" class="basic-info__tags">
        <span v-for="tag in candidate.skill_tags" :key="tag" class="basic-info__tag">{{ tag }}</span>
      </div>
    </section>

    <!-- Education History (read-only) -->
    <section v-if="candidate.education_list?.length" class="basic-info__section">
      <div class="basic-info__section-title">教育经历</div>
      <div v-for="(edu, i) in candidate.education_list" :key="i" class="basic-info__entry">
        <div class="basic-info__entry-main">{{ edu.school }} · {{ edu.degree }}</div>
        <div v-if="edu.major" class="basic-info__entry-sub">{{ edu.major }}</div>
        <div v-if="edu.start" class="basic-info__entry-time">{{ edu.start }} – {{ edu.end || '至今' }}</div>
      </div>
    </section>

    <!-- Work Experience (read-only) -->
    <section v-if="candidate.work_experience?.length" class="basic-info__section">
      <div class="basic-info__section-title">工作经历</div>
      <div v-for="(exp, i) in candidate.work_experience" :key="i" class="basic-info__entry">
        <div class="basic-info__entry-main">{{ exp.company }} · {{ exp.title }}</div>
        <div v-if="exp.start" class="basic-info__entry-time">{{ exp.start }} – {{ exp.end || '至今' }}</div>
        <div v-if="exp.description" class="basic-info__entry-desc">{{ exp.description }}</div>
      </div>
    </section>

    <!-- Project Experience (read-only) -->
    <section v-if="candidate.project_experience?.length" class="basic-info__section">
      <div class="basic-info__section-title">项目经历</div>
      <div v-for="(project, i) in candidate.project_experience" :key="i" class="basic-info__entry">
        <div class="basic-info__entry-main">{{ project.name || '未命名项目' }}<span v-if="project.role"> · {{ project.role }}</span></div>
        <div v-if="project.start || project.end" class="basic-info__entry-time">{{ project.start || '未知时间' }} – {{ project.end || '至今' }}</div>
        <div v-if="project.description" class="basic-info__entry-desc">{{ project.description }}</div>
      </div>
    </section>

    <!-- Notes -->
    <section class="basic-info__section">
      <div class="basic-info__section-title">备注</div>
      <textarea v-if="editing" v-model="form.notes" class="basic-info__textarea" rows="3" placeholder="备注"></textarea>
      <div v-else-if="candidate.notes" class="basic-info__notes">{{ candidate.notes }}</div>
    </section>

    <!-- Edit Actions -->
    <div v-if="editing" class="basic-info__edit-actions">
      <button class="basic-info__btn" @click="$emit('cancel')">取消</button>
      <button class="basic-info__btn basic-info__btn--primary" :disabled="saving" @click="handleSave">
        {{ saving ? '保存中...' : '保存' }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import type { CandidateDetail } from '@/api/types'

const props = defineProps<{
  candidate: CandidateDetail
  editing?: boolean
}>()

const emit = defineEmits<{
  save: [formData: Record<string, unknown>]
  cancel: []
}>()

const saving = ref(false)

interface EditForm {
  phone: string
  email: string
  education: string
  school: string
  years_exp: number | null
  age: number | null
  notes: string
}

const form = ref<EditForm>({
  phone: '',
  email: '',
  education: '',
  school: '',
  years_exp: null,
  age: null,
  notes: '',
})

const skillsText = ref('')

// 进入编辑模式时初始化表单
watch(() => props.editing, (val) => {
  if (val) {
    form.value = {
      phone: props.candidate.phone || '',
      email: props.candidate.email || '',
      education: props.candidate.education || '',
      school: props.candidate.school || '',
      years_exp: props.candidate.years_exp,
      age: props.candidate.age,
      notes: props.candidate.notes || '',
    }
    skillsText.value = (props.candidate.skill_tags || []).join(', ')
  }
}, { immediate: true })

async function handleSave() {
  saving.value = true
  try {
    const data: Record<string, unknown> = {}
    const f = form.value
    if (f.phone !== (props.candidate.phone || '')) data.phone = f.phone || null
    if (f.email !== (props.candidate.email || '')) data.email = f.email || null
    if (f.education !== (props.candidate.education || '')) data.education = f.education || null
    if (f.school !== (props.candidate.school || '')) data.school = f.school || null
    if (f.years_exp !== props.candidate.years_exp) data.years_exp = f.years_exp
    if (f.age !== props.candidate.age) data.age = f.age
    if (f.notes !== (props.candidate.notes || '')) data.notes = f.notes || null

    const newTags = skillsText.value.split(/[,，]/).map(s => s.trim()).filter(Boolean)
    const oldTags = props.candidate.skill_tags || []
    if (JSON.stringify(newTags) !== JSON.stringify(oldTags)) data.skill_tags = newTags

    emit('save', data)
  } finally {
    saving.value = false
  }
}
</script>

<style scoped>
.basic-info__blacklist-warning {
  display: flex;
  gap: var(--space-2);
  padding: var(--space-3);
  margin-bottom: var(--space-4);
  border: 1px solid var(--color-urgent);
  border-radius: 3px;
  background: rgba(196, 71, 42, 0.05);
}

.basic-info__warning-icon {
  color: var(--color-urgent);
  flex-shrink: 0;
}

.basic-info__warning-title {
  font-size: 13px;
  font-weight: 500;
  color: var(--color-urgent);
}

.basic-info__warning-note {
  font-size: 12px;
  color: var(--color-text-secondary);
  margin-top: 2px;
}

.basic-info__section {
  padding-bottom: var(--space-3);
  margin-bottom: var(--space-3);
  border-bottom: 1px solid var(--color-line);
}

.basic-info__section:last-child {
  border-bottom: none;
  margin-bottom: 0;
}

.basic-info__section-title {
  font-size: 13px;
  font-weight: 500;
  margin-bottom: var(--space-2);
}

.basic-info__field {
  display: flex;
  gap: var(--space-3);
  padding: 3px 0;
  font-size: 13px;
  align-items: center;
}

.basic-info__label {
  color: var(--color-text-secondary);
  min-width: 64px;
  flex-shrink: 0;
  font-size: 13px;
}

.basic-info__value {
  color: var(--color-text-primary);
}

.basic-info__input {
  flex: 1;
  padding: 4px 8px;
  border: 1px solid var(--color-line);
  border-radius: 3px;
  font-size: 13px;
  background: var(--color-bg);
  outline: none;
}

.basic-info__input:focus {
  border-color: var(--color-text-secondary);
}

.basic-info__input--full {
  width: 100%;
  margin-top: 4px;
}

.basic-info__textarea {
  width: 100%;
  padding: 6px 8px;
  border: 1px solid var(--color-line);
  border-radius: 3px;
  font-size: 13px;
  background: var(--color-bg);
  outline: none;
  resize: vertical;
  font-family: inherit;
}

.basic-info__textarea:focus {
  border-color: var(--color-text-secondary);
}

.basic-info__tags {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin-top: 4px;
}

.basic-info__tag {
  font-size: 12px;
  padding: 2px 8px;
  background: var(--color-line);
  border-radius: 2px;
}

.basic-info__entry {
  margin-bottom: var(--space-2);
}

.basic-info__entry-main {
  font-size: 13px;
  font-weight: 400;
}

.basic-info__entry-sub {
  font-size: 12px;
  color: var(--color-text-secondary);
}

.basic-info__entry-time {
  font-size: 12px;
  color: var(--color-text-secondary);
  font-family: 'JetBrains Mono', monospace;
}

.basic-info__entry-desc {
  font-size: 12px;
  color: var(--color-text-secondary);
  margin-top: 2px;
  line-height: 1.5;
}

.basic-info__notes {
  font-size: 13px;
  line-height: 1.6;
  white-space: pre-wrap;
}

.basic-info__edit-actions {
  display: flex;
  gap: var(--space-2);
  justify-content: flex-end;
  padding-top: var(--space-3);
  border-top: 1px solid var(--color-line);
  margin-top: var(--space-3);
}

.basic-info__btn {
  font-size: 13px;
  padding: 6px 14px;
  border: 1px solid var(--color-line);
  background: none;
  border-radius: 3px;
  cursor: pointer;
  color: var(--color-text-primary);
}

.basic-info__btn:hover:not(:disabled) {
  background: rgba(26, 26, 24, 0.04);
}

.basic-info__btn--primary {
  background: var(--color-text-primary);
  color: var(--color-bg);
  border-color: var(--color-text-primary);
}

.basic-info__btn--primary:hover:not(:disabled) {
  opacity: 0.85;
  background: var(--color-text-primary);
}

.basic-info__btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
