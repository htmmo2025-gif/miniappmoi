import { createApp } from 'vue'
import App from './App.vue'
import router from './router'   // <-- dùng router tách riêng
import './style.css'

// (tuỳ chọn) chặn mở ngoài Telegram, cho phép khi ?web=1 để dev
router.beforeEach((to, from, next) => {
  const allowWeb = new URLSearchParams(location.search).get('web') === '1'
  const isTg = !!window.Telegram?.WebApp
  if (!allowWeb && !isTg && to.path !== '/error') return next('/error')
  next()
})

createApp(App).use(router).mount('#app')
