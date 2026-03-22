// Polyfill: crypto.randomUUID 在非 HTTPS 环境（如 LAN IP 访问）不可用
if (typeof crypto.randomUUID !== 'function') {
  crypto.randomUUID = () =>
    '10000000-1000-4000-8000-100000000000'.replace(/[018]/g, (c: string) =>
      (+c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> +c / 4).toString(16)
    ) as `${string}-${string}-${string}-${string}-${string}`
}

import { createApp } from 'vue'
import { createPinia } from 'pinia'
import './styles/tokens.css'
import './styles/reset.css'
import './styles/buttons.css'
import './styles/forms.css'
import './styles/toast.css'
import App from './App.vue'
import { router } from './router'

const app = createApp(App)
app.use(createPinia())
app.use(router)
app.mount('#app')
