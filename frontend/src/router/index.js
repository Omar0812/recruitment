import { createRouter, createWebHashHistory } from 'vue-router'

const routes = [
  { path: '/', redirect: '/today' },
  { path: '/today', component: () => import('../pages/Today.vue') },
  { path: '/pipeline', component: () => import('../pages/Pipeline.vue') },
  { path: '/talent', component: () => import('../pages/Talent.vue') },
  { path: '/jobs', component: () => import('../pages/Jobs.vue') },
  { path: '/hired', component: () => import('../pages/Hired.vue') },
  { path: '/suppliers', component: () => import('../pages/Suppliers.vue') },
  { path: '/analytics', component: () => import('../pages/Analytics.vue') },
  { path: '/settings', component: () => import('../pages/Settings.vue') },
]

const router = createRouter({
  history: createWebHashHistory(),
  routes,
})

export default router
