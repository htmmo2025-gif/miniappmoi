<script setup>
import { ref, onMounted } from 'vue'
import BottomNav from '../components/BottomNav.vue'
const profile = ref(null)
const loading = ref(false)
const msg = ref('')

async function loadProfile() {
  const r = await fetch('/api/profile')
  if (r.ok) profile.value = await r.json()
}

async function doSwap() {
  msg.value = ''; loading.value = true
  const amt = Number(prompt('Nhập số HTW muốn đổi sang VND (tỉ giá 36):', '1'))
  if (!amt || amt <= 0) return (loading.value=false)
  const r = await fetch('/api/swap', {
    method: 'POST',
    headers: {'Content-Type':'application/json'},
    body: JSON.stringify({ amount_htw: amt, rate: 36 })
  })
  loading.value = false
  if (!r.ok) { msg.value = 'Đổi thất bại: ' + await r.text(); return }
  await loadProfile(); msg.value = `Đổi thành công ${amt} HTW → ${amt*36} VND`
}

async function doWithdraw() {
  msg.value = ''; loading.value = true
  const amt = Number(prompt('Nhập số VND muốn rút (min 1,000):', '1000'))
  if (!amt || amt <= 0) return (loading.value=false)
  const channel = prompt('Kênh rút (bank/momo/usdt):', 'momo') || 'momo'
  const dest = prompt('Thông tin đích (SĐT Momo / STK / Address):', '') || ''
  const r = await fetch('/api/withdraw', {
    method: 'POST',
    headers: {'Content-Type':'application/json'},
    body: JSON.stringify({ amount_vnd: amt, channel, dest })
  })
  loading.value = false
  if (!r.ok) { msg.value = 'Tạo lệnh rút thất bại: ' + await r.text(); return }
  await loadProfile(); msg.value = 'Đã tạo lệnh rút. Vui lòng chờ duyệt.'
}

const withdraws = ref([])
async function loadWithdraws(){
  const r = await fetch('/api/withdraw')
  if (r.ok) withdraws.value = await r.json()
}

onMounted(async ()=>{
  await loadProfile()
  await loadWithdraws()
})
</script>

<template>
  <div class="account">
    <h2>Tài khoản</h2>

    <div v-if="profile" class="card">
      <div class="row">
        <div>
          <div class="name">{{ profile.first_name }} {{ profile.last_name }}</div>
          <div class="uid">UID: {{ profile.id }}</div>
          <div class="uname" v-if="profile.username">@{{ profile.username }}</div>
        </div>
      </div>

      <div class="bal">
        <div><b>{{ (profile.htw_balance ?? 0).toLocaleString() }}</b> HTW</div>
        <div><b>{{ (profile.vnd_balance ?? 0).toLocaleString() }}</b> VND</div>
      </div>

      <div class="actions">
        <button class="btn" :disabled="loading" @click="doSwap">HTW → VND</button>
        <button class="btn" :disabled="loading" @click="doWithdraw">Rút VND</button>
      </div>

      <p class="msg" v-if="msg">{{ msg }}</p>
    </div>

    <div class="card">
      <h3>Lệnh rút gần đây</h3>
      <div v-if="!withdraws.length">Chưa có lệnh rút.</div>
      <ul v-else>
        <li v-for="w in withdraws" :key="w.id">
          #{{ w.id }} — {{ Number(w.amount_vnd).toLocaleString() }} VND —
          {{ w.channel }} → {{ w.dest }} —
          <b>{{ w.status }}</b> — {{ new Date(w.created_at).toLocaleString() }}
        </li>
      </ul>
    </div>
  </div>
  <BottomNav/>
</template>

<style scoped>
.account { max-width: 720px; margin: 0 auto; padding: 16px; }
.card { background:#0f172a; color:#fff; border:1px solid #1f2a37; border-radius:16px; padding:16px; margin-bottom:16px; }
.row { display:flex; align-items:center; gap:12px; }
.name { font-weight:700; font-size:18px; }
.uid,.uname { opacity:.8; font-size:12px; }
.bal { display:flex; justify-content:space-between; margin:12px 0; }
.actions { display:flex; gap:12px; }
.btn { background:#2563eb; color:#fff; border:0; padding:10px 14px; border-radius:10px; font-weight:700; cursor:pointer; }
.btn:disabled{ opacity:.6; cursor:not-allowed; }
.msg { margin-top:10px; color:#a7f3d0; }
ul{ padding-left:18px; }
</style>
