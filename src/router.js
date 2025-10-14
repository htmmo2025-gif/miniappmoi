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
import Jar from './pages/Jar.vue'
import Checkin from './pages/Checkin.vue'
import Admin from './pages/Admin.vue'
import AdminWithdraws from './pages/AdminWithdraws.vue'
import AdminLookup from './pages/AdminLookup.vue'
import AdminStats from './pages/AdminStats.vue'

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
    { path: '/jar', name: 'jar', component: Jar },
    { path: '/checkin', name: 'checkin', component: Checkin },
    { path: '/admin', name: 'admin', component: Admin },
    { path: '/admin/withdraws', name: 'admin-withdraw', component: AdminWithdraws },
    { path: '/admin/lookup',    name: 'admin-lookup',    component: AdminLookup },
    { path: '/admin/stats',     name: 'admin-stats',     component: AdminStats },
    { path: '/error', component: ErrorPage },
  ],
})
