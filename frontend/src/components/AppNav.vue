<template>
  <nav class="app-nav">
    <div class="nav-inner">
      <span class="nav-brand">招聘管理</span>
      <div class="nav-links">
        <router-link
          v-for="item in navItems"
          :key="item.path"
          :to="item.path"
          class="nav-link"
          :class="{ active: route.path === item.path }"
        >
          {{ item.label }}
        </router-link>
      </div>
    </div>
  </nav>
</template>

<script setup>
import { useRoute } from 'vue-router'

const route = useRoute()

const navItems = [
  { path: '/today', label: '今日待办' },
  { path: '/pipeline', label: '进行中' },
  { path: '/talent', label: '人才库' },
  { path: '/jobs', label: '岗位管理' },
  { path: '/hired', label: '已入职' },
  { path: '/suppliers', label: '供应商' },
  { path: '/analytics', label: '数据分析' },
  { path: '/settings', label: '设置' },
]
</script>

<style scoped>
.app-nav {
  background: #fff;
  border-bottom: 1px solid #e8e8e8;
  position: sticky;
  top: 0;
  z-index: 100;
  box-shadow: 0 1px 4px rgba(0,0,0,0.06);
}

.nav-inner {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 16px;
  display: flex;
  align-items: center;
  height: 52px;
  gap: 24px;
}

.nav-brand {
  font-weight: 700;
  font-size: 16px;
  color: #333;
  white-space: nowrap;
}

.nav-links {
  display: flex;
  gap: 4px;
  overflow-x: auto;
  scrollbar-width: none;
}

.nav-links::-webkit-scrollbar { display: none; }

.nav-link {
  padding: 6px 12px;
  border-radius: 6px;
  font-size: 14px;
  color: #666;
  text-decoration: none;
  white-space: nowrap;
  transition: all 0.15s;
}

.nav-link:hover {
  background: #f0f0f0;
  color: #333;
}

.nav-link.active {
  background: #e8f4ff;
  color: #1677ff;
  font-weight: 500;
}
</style>
