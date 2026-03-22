<template>
  <div v-if="showShell" class="app-shell">
    <NavSidebar
      @open-personal="showPersonal = true"
      @open-admin="showAdmin = true"
    />
    <main class="app-main">
      <router-view />
    </main>
    <CandidatePanel />
    <JobPanel />
    <PersonalSettings v-if="showPersonal" @close="showPersonal = false" />
    <SystemAdmin v-if="showAdmin" @close="showAdmin = false" />
  </div>
  <router-view v-else />
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRoute } from 'vue-router'
import NavSidebar from '@/components/NavSidebar.vue'
import CandidatePanel from '@/components/candidate-panel/CandidatePanel.vue'
import JobPanel from '@/components/job-panel/JobPanel.vue'
import PersonalSettings from '@/components/settings/PersonalSettings.vue'
import SystemAdmin from '@/components/settings/SystemAdmin.vue'

const route = useRoute()
const showPersonal = ref(false)
const showAdmin = ref(false)

const showShell = computed(() => {
  const name = route.name as string
  return name !== 'login' && name !== 'register'
})
</script>

<style scoped>
.app-shell {
  display: flex;
  height: 100%;
}

.app-main {
  flex: 1;
  overflow-y: auto;
  padding: var(--space-6);
}
</style>
