<template>
  <div
    class="filter-multi-select"
    @click="focusInput"
  >
    <div class="filter-multi-select__values">
      <span
        v-for="item in selectedValues"
        :key="item"
        class="filter-multi-select__tag"
      >
        {{ item }}
        <button
          type="button"
          class="filter-multi-select__tag-remove"
          @click.stop="remove(item)"
        >
          &times;
        </button>
      </span>

      <input
        ref="inputRef"
        v-model="query"
        class="filter-multi-select__input"
        :class="inputClass"
        :placeholder="selectedValues.length ? '' : placeholder"
        @focus="isOpen = true"
        @blur="handleBlur"
        @keydown="handleKeydown"
      />
    </div>

    <div
      v-if="isOpen && (filteredOptions.length || canCreate || emptyText)"
      class="filter-multi-select__menu"
    >
      <button
        v-for="option in filteredOptions"
        :key="option"
        type="button"
        class="filter-multi-select__option"
        @mousedown.prevent="add(option)"
      >
        {{ option }}
      </button>

      <button
        v-if="canCreate"
        type="button"
        class="filter-multi-select__option filter-multi-select__option--create"
        @mousedown.prevent="add(trimmedQuery)"
      >
        添加“{{ trimmedQuery }}”
      </button>

      <div
        v-if="!filteredOptions.length && !canCreate && emptyText"
        class="filter-multi-select__empty"
      >
        {{ emptyText }}
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'

const props = withDefaults(defineProps<{
  modelValue?: string[]
  options?: string[]
  placeholder: string
  emptyText?: string
  allowCreate?: boolean
  inputClass?: string
}>(), {
  modelValue: () => [],
  options: () => [],
  emptyText: '',
  allowCreate: false,
  inputClass: '',
})

const emit = defineEmits<{
  'update:modelValue': [value: string[]]
}>()

const query = ref('')
const isOpen = ref(false)
const inputRef = ref<HTMLInputElement | null>(null)

const selectedValues = computed(() => props.modelValue ?? [])
const trimmedQuery = computed(() => query.value.trim())
const filteredOptions = computed(() => {
  const keyword = trimmedQuery.value.toLowerCase()
  return (props.options ?? []).filter((option) => {
    if (selectedValues.value.includes(option)) return false
    if (!keyword) return true
    return option.toLowerCase().includes(keyword)
  })
})
const canCreate = computed(() => {
  if (!props.allowCreate || !trimmedQuery.value) return false
  if (selectedValues.value.includes(trimmedQuery.value)) return false
  return !(props.options ?? []).some((option) => option === trimmedQuery.value)
})

function emitValue(next: string[]) {
  emit('update:modelValue', next)
}

function add(value: string) {
  const normalized = value.trim()
  if (!normalized || selectedValues.value.includes(normalized)) return
  emitValue([...selectedValues.value, normalized])
  query.value = ''
  isOpen.value = true
}

function remove(value: string) {
  emitValue(selectedValues.value.filter((item) => item !== value))
}

function handleKeydown(event: KeyboardEvent) {
  if (event.key === 'Enter' || event.key === ',') {
    event.preventDefault()
    if (filteredOptions.value.length) {
      add(filteredOptions.value[0])
      return
    }
    if (canCreate.value) add(trimmedQuery.value)
    return
  }

  if (event.key === 'Backspace' && !query.value && selectedValues.value.length) {
    remove(selectedValues.value[selectedValues.value.length - 1])
  }
}

function handleBlur() {
  window.setTimeout(() => {
    isOpen.value = false
  }, 120)
}

function focusInput() {
  inputRef.value?.focus()
}
</script>

<style scoped>
.filter-multi-select {
  position: relative;
  min-width: 180px;
}

.filter-multi-select__values {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  min-height: 34px;
  padding: 4px 8px;
  border: 1px solid var(--color-line, rgba(26,26,24,0.12));
  border-radius: 6px;
  background: #fff;
  cursor: text;
}

.filter-multi-select__tag {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 8px;
  border-radius: 999px;
  background: rgba(26,26,24,0.08);
  color: var(--color-text-primary, #1A1A18);
  font-size: 12px;
  line-height: 18px;
}

.filter-multi-select__tag-remove {
  border: none;
  background: transparent;
  padding: 0;
  color: inherit;
  cursor: pointer;
  line-height: 1;
}

.filter-multi-select__input {
  flex: 1;
  min-width: 72px;
  border: none;
  background: transparent;
  padding: 2px 0;
  font-size: 13px;
  color: var(--color-text-primary, #1A1A18);
  outline: none;
}

.filter-multi-select__menu {
  position: absolute;
  top: calc(100% + 6px);
  left: 0;
  right: 0;
  z-index: 10;
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 6px;
  border: 1px solid var(--color-line, rgba(26,26,24,0.12));
  border-radius: 8px;
  background: #fff;
  box-shadow: 0 10px 30px rgba(26,26,24,0.10);
  max-height: 220px;
  overflow-y: auto;
}

.filter-multi-select__option {
  border: none;
  background: transparent;
  text-align: left;
  padding: 8px 10px;
  border-radius: 6px;
  font-size: 13px;
  color: var(--color-text-primary, #1A1A18);
  cursor: pointer;
}

.filter-multi-select__option:hover {
  background: rgba(26,26,24,0.05);
}

.filter-multi-select__option--create {
  color: var(--color-text-secondary, rgba(26,26,24,0.72));
}

.filter-multi-select__empty {
  padding: 8px 10px;
  font-size: 12px;
  color: var(--color-text-secondary, rgba(26,26,24,0.60));
}
</style>
