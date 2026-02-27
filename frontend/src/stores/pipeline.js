import { defineStore } from 'pinia'
import { ref } from 'vue'
import { pipelineApi } from '../api/pipeline'

export const usePipelineStore = defineStore('pipeline', () => {
  const activeLinks = ref([])
  const hiredLinks = ref([])
  const loading = ref(false)

  async function fetchActive() {
    loading.value = true
    try {
      activeLinks.value = await pipelineApi.getActive()
    } finally {
      loading.value = false
    }
  }

  async function fetchHired() {
    loading.value = true
    try {
      hiredLinks.value = await pipelineApi.getHired()
    } finally {
      loading.value = false
    }
  }

  function removeLink(linkId) {
    activeLinks.value = activeLinks.value.filter(l => l.id !== linkId)
  }

  function updateLink(linkId, patch) {
    const idx = activeLinks.value.findIndex(l => l.id === linkId)
    if (idx !== -1) {
      activeLinks.value[idx] = { ...activeLinks.value[idx], ...patch }
    }
  }

  return { activeLinks, hiredLinks, loading, fetchActive, fetchHired, removeLink, updateLink }
})
