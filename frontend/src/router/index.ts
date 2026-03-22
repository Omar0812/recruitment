import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const routes = [
  { path: '/login', name: 'login', component: () => import('@/views/LoginView.vue'), meta: { title: '登录', guest: true } },
  { path: '/register', name: 'register', component: () => import('@/views/RegisterView.vue'), meta: { title: '注册', guest: true } },
  { path: '/', name: 'briefing', component: () => import('@/views/BriefingView.vue'), meta: { title: '今日简报' } },
  { path: '/pipeline', name: 'pipeline', component: () => import('@/views/PipelineView.vue'), meta: { title: '进行中' } },
  { path: '/candidate/create', name: 'candidate-create', component: () => import('@/views/CandidateCreateView.vue'), meta: { title: '新建候选人' } },
  { path: '/talent-pool', name: 'talent-pool', component: () => import('@/views/TalentPoolView.vue'), meta: { title: '人才库' } },
  { path: '/jobs', name: 'jobs', component: () => import('@/views/JobsView.vue'), meta: { title: '岗位' } },
  { path: '/hired', name: 'hired', component: () => import('@/views/HiredView.vue'), meta: { title: '已入职' } },
  { path: '/channels', name: 'channels', component: () => import('@/views/ChannelsView.vue'), meta: { title: '渠道' } },
  { path: '/analytics', name: 'analytics', component: () => import('@/views/AnalyticsView.vue'), meta: { title: '数据分析' } },
  { path: '/company', name: 'company', component: () => import('@/views/CompanyView.vue'), meta: { title: '公司' } },
  { path: '/:pathMatch(.*)*', redirect: '/' },
]

export const router = createRouter({
  history: createWebHistory(),
  routes,
})

router.beforeEach(async (to) => {
  const auth = useAuthStore()

  // 首次加载：有 token 但没 user，尝试拉取
  if (auth.token && !auth.user) {
    await auth.loadUser()
  }

  const isGuest = to.meta.guest === true

  // 未登录 → 只能访问 guest 页面
  if (!auth.isLoggedIn && !isGuest) {
    return { name: 'login', query: { redirect: to.fullPath } }
  }

  // 已登录但未完成注册第二步 → 强制跳注册页
  if (auth.isLoggedIn && !auth.isSetupComplete && to.name !== 'register') {
    return { name: 'register' }
  }

  // 已登录且已完成设置 → 不让访问 login/register
  if (auth.isLoggedIn && auth.isSetupComplete && isGuest) {
    return { path: '/' }
  }
})
