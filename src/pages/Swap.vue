<script setup>
import { ref, onMounted, computed } from 'vue'

const RATE = 36
const prof = ref(null)
const amount = ref('')
const msg = ref('')
const busy = ref(false)

async function loadProfile() {
  const r = await fetch('/api/profile')
  if (r.ok) prof.value = await r.json()
}
const vnd = computed(() => {
  const n = Number(amount.value || 0)
  return Number.isFinite(n) ? n * RATE : 0
})

async function submit() {
  msg.value = ''; busy.value = true
  const n = Number(amount.value)
  if (!Number.isFinite(n) || n <= 0) { msg.value = 'Số HTW không hợp lệ'; busy.value=false; return }
  const r = await fetch('/api/swap', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ amount_htw: n, rate: RATE })
  })
  busy.value = false
  if (!r.ok) { msg.value = 'Đổi thất bại: ' + await r.text(); return }
  await loadProfile()
  amount.value = ''
  msg.value = 'Đổi thành công!'
}

onMounted(loadProfile)
</script>

<template>
  <div class="wrap">
    <h2>HTW → VND</h2>

    <div class="card" v-if="prof">
      <div class="row">
        <div><b>HTW:</b> {{ (prof.htw_balance ?? 0).toLocaleString() }}</div>
        <div><b>VND:</b> {{ (prof.vnd_balance ?? 0).toLocaleString() }}</div>
      </div>

      <label class="lbl">Số HTW muốn đổi</label>
      <input class="ipt" v-model="amount" type="number" min="0" step="0.001" placeholder="vd: 1" />

      <div class="hint">Tỉ giá: {{ RATE }} — Sẽ nhận: <b>{{ vnd.toLocaleString() }}</b> VND</div>

      <button class="btn" :disabled="busy" @click="submit">Đổi ngay</button>
      <p class="ok" v-if="msg">{{ msg }}</p>
    </div>
  </div>
</template>

<style scoped>
.wrap { max-width: 720px; margin: 0 auto; padding: 16px; }
h2 { color: #fff; margin-bottom: 12px; }
.card { background:#0f172a; border:1px solid #1f2a37; border-radius:16px; padding:16px; color:#fff; }
.row { display:flex; justify-content:space-between; margin-bottom:12px; }
.lbl { opacity:.9; }
.ipt { width:100%; margin:8px 0 6px; padding:10px 12px; border-radius:10px; border:1px solid #1f2a37; background:#0b1220; color:#fff; }
.hint { opacity:.8; margin-bottom:12px; }
.btn { width:100%; background:#2563eb; color:#fff; border:0; padding:12px 14px; border-radius:12px; font-weight:700; }
.ok { margin-top:10px; color:#a7f3d0; }
</style>
