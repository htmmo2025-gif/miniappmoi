import { createApp } from 'vue'
import { createRouter, createWebHistory } from 'vue-router'
import App from './App.vue'
import router from './router'
import Loading from './pages/Loading.vue'
import Mining from './pages/Mining.vue'
import Tasks from './pages/Tasks.vue'
import Invite from './pages/Invite.vue'
import Account from './pages/Account.vue'
import ErrorPage from './pages/Error.vue'
import 'bootstrap-icons/font/bootstrap-icons.css'
const routes = [
  { path: '/', component: Loading },
  { path: '/mining', component: Mining },
  { path: '/tasks', component: Tasks },
  { path: '/invite', component: Invite },
  { path: '/account', component: Account },
  { path: '/error', component: ErrorPage },
]
const router = createRouter({ history: createWebHistory(), routes })

// chặn web ngoài Telegram (bypass khi thêm ?web=1 để dev)
router.beforeEach((to, from, next) => {
  const allowWeb = new URLSearchParams(location.search).get('web') === '1'
  const tg = window.Telegram?.WebApp
  const inTG = !!(tg && typeof tg.initData === 'string' && tg.initData.length > 0)
  if (!inTG && !allowWeb && to.path !== '/error') return next('/error')
  if ((inTG || allowWeb) && to.path === '/error') return next('/mining')
  next()
})

createApp(App).use(router).mount('#app')
