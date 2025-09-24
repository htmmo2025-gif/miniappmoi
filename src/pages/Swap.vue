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
const amountNum  = computed(() => {
  const n = Number(amount.value)
  return Number.isFinite(n) ? n : 0
})
const vnd = computed(() => Math.max(0, Math.floor(amountNum.value * RATE)))
const canSwap = computed(() =>
  !busy.value && amountNum.value > 0 && amountNum.value <= htwBalance.value
)

function fillMax () {
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
  <div class="swap-page">
    <!-- HEADER -->
    <header class="topbar">
      <div class="container top-inner">
        <button class="icon-btn" @click="$router.back()">
          <i class="bi bi-arrow-left"></i>
        </button>
        <div class="ttl">
          <div class="title">Đổi token</div>
          <div class="sub">HTW → VND</div>
        </div>
        <div class="grow"></div>
      </div>
    </header>

    <!-- CONTENT -->
    <main class="container main">
      <section v-if="prof" class="stack">
        <!-- BALANCE -->
        <div class="card wallet">
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
          <div class="rate">
            <i class="bi bi-graph-up-arrow"></i>
            Tỷ giá: <b>1 HTW = {{ RATE }} VND</b>
          </div>
        </div>

        <!-- FORM -->
        <div class="card">
          <label class="flabel"><i class="bi bi-input-cursor-text"></i> Số HTW muốn đổi</label>

          <div class="amount-box">
            <input
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

          <button class="primary" :disabled="!canSwap" @click="submit">
            <i v-if="busy" class="bi bi-hourglass-split spin"></i>
            <i v-else class="bi bi-arrow-repeat"></i>
            <span>{{ busy ? 'Đang xử lý...' : 'Thực hiện đổi' }}</span>
          </button>

          <div v-if="msg" :class="['msg', msg.includes('thành công') ? 'ok' : 'bad']">
            <i :class="msg.includes('thành công') ? 'bi bi-check-circle' : 'bi bi-exclamation-triangle'"></i>
            {{ msg }}
          </div>
        </div>
      </section>

      <!-- LOADING -->
      <section v-else class="card center">
        <i class="bi bi-hourglass-split spin big"></i>
        <div>Đang tải…</div>
      </section>
    </main>
  </div>
</template>

<style scoped>
@import url('https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.min.css');

/* ===== Root & Safe-area ===== */
.swap-page{
  --pad: 16px;
  --maxw: 560px;        /* cùng một chuẩn cho header & content */
  background:#0b0f1a;
  color:#e5e7eb;
  min-height:100vh;
}
@supports(padding:max(0px)){
  .swap-page{
    --padL: max(var(--pad), env(safe-area-inset-left));
    --padR: max(var(--pad), env(safe-area-inset-right));
    --padT: env(safe-area-inset-top, 0px);
  }
}

/* ===== Container dùng CHUNG ===== */
.container{
  max-width: var(--maxw);
  margin-inline: auto;
  padding-left: var(--padL, 16px);
  padding-right: var(--padR, 16px);
}

/* ===== Header ===== */
.topbar{
  position:sticky; top:0; z-index:20;
  background: linear-gradient(180deg, rgba(11,15,26,.96), rgba(11,15,26,.85) 70%, transparent);
  backdrop-filter: blur(8px);
}
.top-inner{
  padding-top: calc(8px + var(--padT, 0px));
  padding-bottom: 12px;
  display:flex; align-items:center; gap:12px;
}
.icon-btn{
  width:38px; height:38px;
  border-radius:12px;
  border:1px solid rgba(148,163,184,.18);
  background:rgba(148,163,184,.08);
  color:#e5e7eb; display:grid; place-items:center; font-size:18px;
}
.ttl .title{ font-weight:800; line-height:1.1 }
.ttl .sub{ font-size:12px; color:#93a4bd }
.grow{ flex:1 }

/* ===== Main wrapper (giữ cùng chiều ngang với header) ===== */
.main{ padding-top: 12px; padding-bottom: 20px }
.stack{ display:grid; gap:16px }

/* ===== Cards ===== */
.card{
  border:1px solid rgba(148,163,184,.16);
  background: linear-gradient(180deg, rgba(17,24,39,.82), rgba(15,23,42,.76));
  border-radius:18px; padding:16px;
  box-shadow:0 10px 30px rgba(2,8,23,.35);
}
.card.center{ display:grid; place-items:center; gap:10px; padding:28px }
.big{ font-size:38px }

/* Wallet */
.grid2{ display:grid; grid-template-columns:1fr 1fr; gap:12px; margin-bottom:10px }
.stat{
  padding:14px; border-radius:14px;
  background:rgba(241,245,249,.03);
  border:1px solid rgba(148,163,184,.16)
}
.stat .lbl{ display:flex; align-items:center; gap:8px; color:#99a7be; font-size:13px }
.stat .val{ font-size:20px; font-weight:800 }
.stat.htw .val{ color:#fde68a }
.stat.vnd .val{ color:#a5b4fc }
.rate{ margin-top:6px; font-size:12px; color:#97a6c4; display:flex; align-items:center; gap:6px }

/* Form */
.flabel{ display:flex; gap:8px; align-items:center; color:#cbd5e1; font-weight:600; font-size:14px; margin-bottom:8px }
.amount-box{
  position:relative; display:flex; align-items:center; gap:8px;
  background:rgba(241,245,249,.04);
  border:1.5px solid rgba(148,163,184,.22);
  border-radius:14px; padding:10px 12px; margin-bottom:8px
}
.amount-box input{
  flex:1; background:transparent; border:0; outline:none;
  color:#e5e7eb; font-size:18px; font-weight:700;
}
.amount-box .suf{ color:#9aa8c2; font-weight:700 }
.pill{
  border:1px solid rgba(148,163,184,.25);
  background:rgba(148,163,184,.08);
  color:#cbd5e1; padding:6px 10px;
  border-radius:12px; font-size:12px; font-weight:700
}
.hint{ font-size:12px; color:#8ba3c7 }
.err{ font-size:12px; color:#fca5a5; margin-top:4px }

/* Submit */
.primary{
  width:100%; display:flex; align-items:center; justify-content:center; gap:8px;
  border:0; border-radius:14px; padding:12px 16px;
  color:#0b0f1a; font-weight:800; margin-top:10px;
  background:linear-gradient(90deg, #fde68a, #60a5fa);
  box-shadow:0 10px 30px rgba(6,182,212,.22)
}
.primary:disabled{ opacity:.5 }
.spin{ animation:spin 1s linear infinite } @keyframes spin{ to{ transform:rotate(360deg) } }

/* Message */
.msg{
  margin-top:10px; padding:10px 12px; border-radius:12px;
  font-size:13px; font-weight:700; display:flex; gap:8px; align-items:center
}
.msg.ok{  background:rgba(34,197,94,.12); color:#34d399; border:1px solid rgba(34,197,94,.35) }
.msg.bad{ background:rgba(239,68,68,.12); color:#f87171; border:1px solid rgba(239,68,68,.35) }
</style>
