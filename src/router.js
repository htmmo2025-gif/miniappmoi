import { createRouter, createWebHistory } from 'vue-router'
import Loading from './pages/Loading.vue'
import Mining from './pages/Mining.vue'
import Tasks from './pages/Tasks.vue'
import Invite from './pages/Invite.vue'
import Account from './pages/Account.vue'
import ErrorPage from './pages/Error.vue'
import Swap from './pages/Swap.vue'
import Withdraw from './pages/Withdraw.vue'
import Wheel from './pages/Wheel.vue'
import Checkin from './pages/Checkin.vue'
import AdminWithdraws from './pages/AdminWithdraws.vue'

export default createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', component: Loading },
    { path: '/mining', component: Mining },
    { path: '/tasks', component: Tasks },
    { path: '/invite', component: Invite },
    { path: '/account', component: Account },
    { path: '/swap', name: 'swap', component: Swap },
    { path: '/withdraw', name: 'withdraw', component: Withdraw },
    { path: '/wheel', name: 'wheel', component: Wheel },
    { path: '/checkin', name: 'checkin', component: Checkin },
    { path: '/admin', name: 'admin', component: AdminWithdraws },
    { path: '/error', component: ErrorPage },
  ],
})
