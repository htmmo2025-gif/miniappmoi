<script setup>
import { ref, onMounted } from 'vue'

const prof = ref(null)
const amount = ref('')
const channel = ref('momo')   // bank | momo | usdt ...
const dest = ref('')
const msg = ref('')
const busy = ref(false)
const items = ref([])

async function loadProfile() {
  const r = await fetch('/api/profile', { credentials: 'include' })
  if (r.ok) prof.value = await r.json()
}
async function loadList() {
  const r = await fetch('/api/withdraw', { credentials: 'include' })
  if (r.ok) items.value = await r.json()
}
async function submit() {
  msg.value = ''; busy.value = true
  const n = Number(amount.value)
  if (!Number.isFinite(n) || n <= 0) { msg.value = 'Số VND không hợp lệ'; busy.value=false; return }
  if (!dest.value) { msg.value = 'Thiếu thông tin nhận'; busy.value=false; return }

  const r = await fetch('/api/withdraw', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ amount_vnd: n, channel: channel.value, dest: dest.value })
  })
  busy.value = false
  if (!r.ok) { msg.value = 'Tạo lệnh rút thất bại: ' + await r.text(); return }
  amount.value = ''; dest.value = ''
  await Promise.all([loadProfile(), loadList()])
  msg.value = 'Đã tạo lệnh rút, vui lòng chờ duyệt.'
}

onMounted(async () => { await loadProfile(); await loadList() })
</script>

<template>
  <div class="wrap">
    <h2>Rút VND</h2>

    <div class="card" v-if="prof">
      <div class="row"><b>Số dư VND:</b> {{ (prof.vnd_balance ?? 0).toLocaleString() }}</div>

      <label class="lbl">Số tiền muốn rút (VND)</label>
      <input class="ipt" v-model="amount" type="number" min="0" step="1" placeholder="vd: 10000" />

      <label class="lbl">Kênh</label>
      <select class="ipt" v-model="channel">
        <option value="momo">Momo</option>
        <option value="bank">Ngân hàng</option>
        <option value="usdt">USDT</option>
      </select>

      <label class="lbl">Thông tin nhận (SĐT Momo / STK / Address)</label>
      <input class="ipt" v-model="dest" placeholder="vd: 09xxxxxxx" />

      <button class="btn" :disabled="busy" @click="submit">Tạo lệnh rút</button>
      <p class="ok" v-if="msg">{{ msg }}</p>
    </div>

    <div class="card">
      <h3>Lệnh rút gần đây</h3>
      <div v-if="!items.length">Chưa có lệnh rút.</div>
      <ul v-else>
        <li v-for="w in items" :key="w.id">
          #{{ w.id }} — {{ Number(w.amount_vnd).toLocaleString() }} VND — {{ w.channel }} → {{ w.dest }}
          — <b>{{ w.status }}</b> — {{ new Date(w.created_at).toLocaleString() }}
        </li>
      </ul>
    </div>
  </div>
</template>

<style scoped>
.wrap { max-width: 720px; margin: 0 auto; padding: 16px; }
h2,h3 { color:#fff; margin-bottom:12px; }
.card { background:#0f172a; border:1px solid #1f2a37; border-radius:16px; padding:16px; color:#fff; margin-bottom:16px; }
.row { margin-bottom:12px; }
.lbl { opacity:.9; }
.ipt { width:100%; margin:8px 0 6px; padding:10px 12px; border-radius:10px; border:1px solid #1f2a37; background:#0b1220; color:#fff; }
.btn { width:100%; background:#2563eb; color:#fff; border:0; padding:12px 14px; border-radius:12px; font-weight:700; }
.ok { margin-top:10px; color:#a7f3d0; }
ul{ padding-left:18px; }
</style>
