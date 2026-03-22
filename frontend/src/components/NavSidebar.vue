<template>
  <nav class="nav-sidebar">
    <div class="nav-header">
      <span class="nav-logo">招聘管理</span>
      <button class="nav-create-btn" @click="onCreateCandidate">
        + 新建候选人
      </button>
    </div>

    <ul class="nav-list">
      <li v-for="item in primaryItems" :key="item.path">
        <router-link :to="item.path" class="nav-item" active-class="nav-item--active">
          <svg class="nav-icon" viewBox="0 0 16 16" fill="currentColor">
            <use :href="`#icon-${item.icon}`" />
          </svg>
          <span>{{ item.label }}</span>
        </router-link>
      </li>

      <li class="nav-divider" />

      <li v-for="item in secondaryItems" :key="item.path">
        <router-link :to="item.path" class="nav-item" active-class="nav-item--active">
          <svg class="nav-icon" viewBox="0 0 16 16" fill="currentColor">
            <use :href="`#icon-${item.icon}`" />
          </svg>
          <span>{{ item.label }}</span>
        </router-link>
      </li>
    </ul>

    <!-- 用户信息 -->
    <div class="nav-user">
      <div class="nav-user-row">
        <div class="nav-avatar">
          <img v-if="avatarUrl" :src="avatarUrl" alt="" />
          <span v-else>{{ initials }}</span>
        </div>
        <span class="nav-user-name">{{ displayName }}</span>
      </div>
      <div class="nav-user-row nav-user-bottom">
        <span v-if="auth.isAdmin" class="nav-admin-tag">管理员</span>
        <div class="nav-user-actions">
          <button class="nav-action-btn" title="个人设置" @click="$emit('open-personal')">⚙️</button>
          <button v-if="auth.isAdmin" class="nav-action-btn" title="系统管理" @click="$emit('open-admin')">🔧</button>
        </div>
      </div>
    </div>

    <!-- Inline SVG icon sprites -->
    <svg xmlns="http://www.w3.org/2000/svg" style="display: none">
      <symbol id="icon-briefing" viewBox="0 0 16 16">
        <path d="M2 3a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V3zm1 2v8h10V5H3zm2 1h6v1H5V6zm0 2.5h4v1H5v-1z"/>
      </symbol>
      <symbol id="icon-pipeline" viewBox="0 0 16 16">
        <path d="M1 3h14v2H1V3zm2 4h10v2H3V7zm2 4h6v2H5v-2z"/>
      </symbol>
      <symbol id="icon-talent" viewBox="0 0 16 16">
        <path d="M8 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6zm-5 6a5 5 0 0 1 10 0H3z"/>
      </symbol>
      <symbol id="icon-jobs" viewBox="0 0 16 16">
        <path d="M6 2a1 1 0 0 0-1 1v1H3a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1V5a1 1 0 0 0-1-1h-2V3a1 1 0 0 0-1-1H6zm0 1h4v1H6V3zm-3 3h10v7H3V6z"/>
      </symbol>
      <symbol id="icon-hired" viewBox="0 0 16 16">
        <path d="M8 1a7 7 0 1 0 0 14A7 7 0 0 0 8 1zm-.5 10.5L4 8l1-1 2.5 2.5L12 5l1 1-5.5 5.5z"/>
      </symbol>
      <symbol id="icon-channels" viewBox="0 0 16 16">
        <path d="M2 2h5v5H2V2zm7 0h5v5H9V2zM2 9h5v5H2V9zm7 0h5v5H9V9z"/>
      </symbol>
      <symbol id="icon-analytics" viewBox="0 0 16 16">
        <path d="M2 13V7h3v6H2zm4.5 0V3h3v10h-3zM11 13V9h3v4h-3z"/>
      </symbol>
      <symbol id="icon-company" viewBox="0 0 16 16">
        <path d="M3 2a1 1 0 0 0-1 1v11h4v-3h4v3h4V3a1 1 0 0 0-1-1H3zm1 2h2v2H4V4zm4 0h2v2H8V4zM4 7h2v2H4V7zm4 0h2v2H8V7z"/>
      </symbol>
      <symbol id="icon-settings" viewBox="0 0 16 16">
        <path d="M8 10a2 2 0 1 0 0-4 2 2 0 0 0 0 4zm6.32-1.906l-1.098-.634a5.38 5.38 0 0 0 0-1.32l1.098-.634a.5.5 0 0 0 .183-.683l-1-1.732a.5.5 0 0 0-.683-.183l-1.098.634a5.38 5.38 0 0 0-1.143-.66V1.5a.5.5 0 0 0-.5-.5h-2a.5.5 0 0 0-.5.5v1.268a5.38 5.38 0 0 0-1.143.66l-1.098-.634a.5.5 0 0 0-.683.183l-1 1.732a.5.5 0 0 0 .183.683l1.098.634a5.38 5.38 0 0 0 0 1.32l-1.098.634a.5.5 0 0 0-.183.683l1 1.732a.5.5 0 0 0 .683.183l1.098-.634c.35.272.734.497 1.143.66V14.5a.5.5 0 0 0 .5.5h2a.5.5 0 0 0 .5-.5v-1.268c.41-.163.793-.388 1.143-.66l1.098.634a.5.5 0 0 0 .683-.183l1-1.732a.5.5 0 0 0-.183-.683z"/>
      </symbol>
    </svg>
  </nav>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

defineEmits<{
  'open-personal': []
  'open-admin': []
}>()

interface NavItem {
  path: string
  label: string
  icon: string
}

const router = useRouter()
const auth = useAuthStore()

const displayName = computed(() => auth.user?.display_name || auth.user?.login_name || '')
const initials = computed(() => displayName.value.slice(0, 1).toUpperCase())
const avatarUrl = computed(() => {
  const p = auth.user?.avatar_path
  return p ? `/api/v1/files/${p}` : null
})

const primaryItems: NavItem[] = [
  { path: '/', label: '今日简报', icon: 'briefing' },
  { path: '/pipeline', label: '进行中', icon: 'pipeline' },
  { path: '/talent-pool', label: '人才库', icon: 'talent' },
  { path: '/jobs', label: '岗位', icon: 'jobs' },
]

const secondaryItems: NavItem[] = [
  { path: '/hired', label: '已入职', icon: 'hired' },
  { path: '/channels', label: '渠道', icon: 'channels' },
  { path: '/analytics', label: '数据分析', icon: 'analytics' },
  { path: '/company', label: '公司', icon: 'company' },
]

function onCreateCandidate() {
  router.push('/candidate/create')
}
</script>

<style scoped>
.nav-sidebar {
  width: var(--nav-width);
  height: 100%;
  border-right: 1px solid var(--color-line);
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
  background: var(--color-bg);
}

.nav-header {
  padding: var(--space-5) var(--space-4) var(--space-4);
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.nav-logo {
  font-size: 15px;
  font-weight: 500;
  letter-spacing: 0.02em;
}

.nav-create-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--space-2) var(--space-3);
  background: var(--color-text-primary);
  color: var(--color-bg);
  border-radius: 4px;
  font-size: 13px;
  font-weight: 400;
  transition: opacity 150ms;
}

.nav-create-btn:hover {
  opacity: 0.85;
}

.nav-list {
  flex: 1;
  padding: var(--space-2) var(--space-2);
  overflow-y: auto;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-2) var(--space-3);
  border-radius: 4px;
  font-size: 14px;
  font-weight: 400;
  color: var(--color-text-secondary);
  transition: background 150ms, color 150ms;
}

.nav-item:hover {
  background: rgba(26, 26, 24, 0.05);
  color: var(--color-text-primary);
}

.nav-item--active {
  background: rgba(26, 26, 24, 0.08);
  color: var(--color-text-primary);
  font-weight: 500;
}

.nav-icon {
  width: 16px;
  height: 16px;
  flex-shrink: 0;
  opacity: 0.7;
}

.nav-item--active .nav-icon {
  opacity: 1;
}

.nav-divider {
  height: 1px;
  background: var(--color-line);
  margin: var(--space-2) var(--space-3);
}

.nav-user {
  padding: var(--space-3) var(--space-4);
  border-top: 1px solid var(--color-line);
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.nav-user-row {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  min-width: 0;
}

.nav-user-bottom {
  justify-content: space-between;
}

.nav-avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  overflow: hidden;
  background: var(--color-bg-secondary, #f0f0f0);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  font-size: 13px;
  font-weight: 600;
  color: var(--color-text-secondary);
}

.nav-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.nav-user-name {
  font-size: 13px;
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.nav-admin-tag {
  font-size: 11px;
  color: var(--color-text-secondary);
  white-space: nowrap;
}

.nav-user-actions {
  display: flex;
  gap: 2px;
  flex-shrink: 0;
}

.nav-action-btn {
  background: none;
  border: none;
  cursor: pointer;
  font-size: 14px;
  padding: 4px;
  border-radius: 4px;
  line-height: 1;
}

.nav-action-btn:hover {
  background: rgba(26, 26, 24, 0.05);
}
</style>
