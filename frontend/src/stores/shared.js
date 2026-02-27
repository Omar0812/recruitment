import { defineStore } from 'pinia'
import { ref } from 'vue'
import { jobsApi } from '../api/jobs'
import { suppliersApi } from '../api/suppliers'

export const useSharedStore = defineStore('shared', () => {
  const jobs = ref([])
  const suppliers = ref([])

  async function fetchJobs(params) {
    jobs.value = await jobsApi.list(params || { include_closed: false })
  }

  async function fetchSuppliers() {
    suppliers.value = await suppliersApi.list()
  }

  return { jobs, suppliers, fetchJobs, fetchSuppliers }
})
