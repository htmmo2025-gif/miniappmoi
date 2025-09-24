<script setup>
import { ref, computed, onMounted } from 'vue'

const RATE = 3 // 1 HTW = 3 VND

const prof = ref(null)
const amount = ref('')
const busy = ref(false)
const msg = ref('')

async function loadProfile () {
  try {
    const r = await fetch('/api/profile', { credentials: 'include' })
    if (r.ok) prof.value = await r.json()
  } catch (e) { console.error(e) }
}

const htwBalance = computed(() => Number(prof.value?.htw_balance ?? 0))
const vndBalance = computed(() => Number(prof.value?.vnd_balance ?? 0))

const amountNum = computed(() => {
  const n = Number(amount.value)
  return Number.isFinite(n) ? n : 0
})

// VND là số nguyên
const vnd = computed(() => Math.max(0, Math.floor(amountNum.value * RATE)))

const canSwap = computed(() =>
  !busy.value && amountNum.value > 0 && amountNum.value <= htwBalance.value
)

function fillMax () {
  // giữ tối đa 3 số lẻ để nhìn đẹp
  amount.value = (Math.floor(htwBalance.value * 1000) / 1000).toString()
}

async function submit () {
  if (!canSwap.value) return
  msg.value = ''; busy.value = true
  try {
    const r = await fetch('/api/swap', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ amount_htw: amountNum.value, rate: RATE })
    })
    if (!r.ok) throw new Error(await r.text() || 'Swap failed')
    await loadProfile()
    amount.value = ''
    msg.value = 'Đổi thành công!'
  } catch (e) {
    msg.value = 'Đổi thất bại: ' + e.message
  } finally {
    busy.value = false
  }
}

onMounted(loadProfile)
</script>

<template>
  <div class="page">
    <!-- Header (giống Withdraw.vue) -->
    <header class="topbar">
      <button class="back" @click="$router.go(-1)"><i class="bi bi-arrow-left"></i></button>
      <div class="ttl">
        <h1>Đổi token</h1>
        <div class="sub">HTW → VND</div>
      </div>
      <span class="spacer"></span>
    </header>
    <main class="wrap">
  <!-- Khi đã có profile -->
  <template v-if="prof">
    <!-- Số dư -->
    <section class="card hero">
      <div class="grid2">
        <div class="stat htw">
          <div class="lbl"><i class="bi bi-coin"></i> HTW</div>
          <div class="val">{{ htwBalance.toLocaleString() }}</div>
        </div>
        <div class="stat vnd">
          <div class="lbl"><i class="bi bi-currency-dollar"></i> VND</div>
          <div class="val">{{ vndBalance.toLocaleString() }}</div>
        </div>
      </div>
      <div class="rate"><i class="bi bi-graph-up-arrow"></i> Tỷ giá:
        <b>1 HTW = {{ RATE }} VND</b>
      </div>
    </section>

    <!-- Form swap -->
    <section class="card">
      <div class="group">
        <label class="lbl"><i class="bi bi-input-cursor-text"></i> Số HTW muốn đổi</label>
        <div class="amt-row">
          <input
            class="amt"
            v-model="amount"
            type="number"
            inputmode="decimal"
            min="0"
            step="0.001"
            placeholder="0.000"
          />
          <span class="suf">HTW</span>
          <button class="pill" type="button" @click="fillMax">Tối đa</button>
        </div>
        <div class="hint">Sẽ nhận: <b>{{ vnd.toLocaleString() }}</b> VND</div>
        <div v-if="amountNum > htwBalance" class="err">Số HTW vượt quá số dư.</div>
      </div>

      <button class="btn" :disabled="!canSwap" @click="submit">
        <i v-if="busy" class="bi bi-hourglass-split spin"></i>
        <i v-else class="bi bi-arrow-repeat"></i>
        <span>{{ busy ? 'Đang xử lý...' : 'Thực hiện đổi' }}</span>
      </button>

      <p v-if="msg" :class="['note', msg.includes('thành công') ? 'ok' : 'err']">
        <i :class="msg.includes('thành công') ? 'bi bi-check-circle' : 'bi bi-exclamation-triangle'"></i>
        {{ msg }}
      </p>
    </section>
  </template>

  <!-- Loading (phải đứng ngay sau template v-if ở trên) -->
  <section v-else class="card center">
    <i class="bi bi-hourglass-split spin big"></i>
    <div>Đang tải…</div>
  </section>
</main>

  </div>
</template>

<style scoped>
/* GIỐNG layout Withdraw.vue: full-bleed + safe-area */
.page{
  --bg:#0b0f1a; --card:#101826; --mut:#9aa3b2;
  --ring:1px solid rgba(148,163,184,.14);
  background:var(--bg); color:#e5e7eb; width:100dvw; min-height:100dvh;
}
.topbar{
  position: sticky; top: 0; z-index: 10;
  padding-block: calc(10px + env(safe-area-inset-top)) 10px;
  padding-left: max(16px, env(safe-area-inset-left));
  padding-right: max(16px, env(safe-area-inset-right));
  display: flex; align-items: center; gap: 10px;
  background: linear-gradient(180deg, rgba(11,15,26,.96), rgba(11,15,26,.7) 65%, transparent);
  backdrop-filter: blur(8px);
}
.back{
  width:36px;height:36px;border-radius:50%;border:var(--ring);background:#0e1726;
  display:grid;place-items:center;color:#cbd5e1;
}
.ttl h1{margin:0; font:800 20px/1 ui-sans-serif,system-ui}
.ttl .sub{font-size:12px; color:#93a4bd; margin-top:2px}
.spacer{flex:1}

.wrap{
  width:100%;
  padding-top:12px;
  padding-bottom:calc(20px + env(safe-area-inset-bottom));
  padding-left:max(16px, env(safe-area-inset-left));
  padding-right:max(16px, env(safe-area-inset-right));
  display:grid; gap:14px;
}

/* Card base */
.card{
  width:100%; margin-inline:0; overflow:hidden;
  background:#0f172a; border:var(--ring); border-radius:14px; padding:16px;
  box-shadow:0 10px 30px rgba(2,8,23,.35);
}
.card.center{display:grid; place-items:center; gap:10px; padding:28px}
.big{font-size:38px}

/* Hero / balances */
.hero{display:grid; gap:10px}
.grid2{display:grid; grid-template-columns:1fr 1fr; gap:10px}
.stat{
  background:#0e1525; border:var(--ring); border-radius:12px; padding:12px
}
.stat .lbl{display:flex; align-items:center; gap:8px; color:#9aa3b2; font-size:12px}
.stat .val{font:800 20px/1.1 ui-sans-serif,system-ui}
.stat.htw .val{color:#fde68a}
.stat.vnd .val{color:#a5b4fc}
.rate{font-size:12px; color:#9fb2d0; display:flex; gap:6px; align-items:center}

/* Form */
.group{display:grid; gap:10px; margin-bottom:6px}
.lbl{display:flex; align-items:center; gap:8px; font-weight:700}
.amt-row{position:relative}
.amt{
  width:100%; padding:14px 110px 14px 14px; border-radius:14px; border:var(--ring);
  background:#0b1222; color:#fff; font:700 18px/1.2 ui-sans-serif,system-ui; outline:none;
}
.amt:focus{box-shadow:0 0 0 2px #22d3ee55 inset}
.suf{position:absolute; right:66px; top:50%; transform:translateY(-50%); color:#a5b0c4; font-weight:800}
.pill{
  position:absolute; right:10px; top:50%; transform:translateY(-50%);
  padding:6px 10px; border-radius:999px; border:var(--ring); background:#0e1726; color:#cbd5e1;
  font-size:12px; font-weight:800;
}
.hint{font-size:12px; color:#8fb0d1}
.err{font-size:12px; color:#fca5a5}

/* Button & message */
.btn{
  width:100%; padding:14px; border-radius:14px; border:none; color:#0b0f1a; font-weight:900;
  background:linear-gradient(145deg,#fde68a,#60a5fa);
  display:flex; align-items:center; justify-content:center; gap:8px;
}
.btn:disabled{opacity:.5}
.spin{animation:spin 1s linear infinite} @keyframes spin{to{transform:rotate(360deg)}}
.note{margin-top:10px; padding:10px 12px; border-radius:10px; display:flex; gap:8px; align-items:center}
.ok{background:#16a34a1a; border:1px solid #16a34a50; color:#22c55e}
.err.note{background:#ef44441a; border:1px solid #ef444450; color:#ef4444}

/* Utility */
:global(*), :global(*::before), :global(*::after){ box-sizing: border-box }
:global(html, body, #app){ margin:0; overflow-x:hidden }
@media (max-width:360px){ .grid2{grid-template-columns:1fr} }
</style>
