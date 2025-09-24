<script setup>
import { ref, onMounted, computed } from 'vue'

/** 1 HTW = 3 VND */
const RATE = 3

const prof = ref(null)
const amount = ref('')        // số HTW
const msg = ref('')
const busy = ref(false)

async function loadProfile () {
  const r = await fetch('/api/profile', { credentials: 'include' })
  if (r.ok) prof.value = await r.json()
}

const htwBalance = computed(() => Number(prof.value?.htw_balance ?? 0))
const vndBalance = computed(() => Number(prof.value?.vnd_balance ?? 0))

const amountNum = computed(() => {
  const n = Number(amount.value)
  return Number.isFinite(n) ? n : 0
})

const vnd = computed(() => Math.floor(amountNum.value * RATE))

const canSwap = computed(() =>
  amountNum.value > 0 &&
  amountNum.value <= htwBalance.value &&
  !busy.value
)

function fillMax () {
  // làm tròn 3 chữ số thập phân cho đẹp
  const n = Math.max(0, htwBalance.value)
  amount.value = (Math.floor(n * 1000) / 1000).toString()
}

async function submit () {
  msg.value = ''
  if (!canSwap.value) {
    msg.value = amountNum.value > htwBalance.value
      ? 'Số HTW vượt quá số dư.'
      : 'Số HTW không hợp lệ.'
    return
  }
  try {
    busy.value = true
    const r = await fetch('/api/swap', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ amount_htw: amountNum.value, rate: RATE })
    })
    if (!r.ok) throw new Error(await r.text())
    await loadProfile()
    amount.value = ''
    msg.value = 'Đổi thành công!'
  } catch (e) {
    msg.value = 'Đổi thất bại: ' + (e.message || 'Lỗi không xác định')
  } finally {
    busy.value = false
  }
}

onMounted(loadProfile)
</script>

<template>
  <div class="page">
    <!-- Topbar -->
    <div class="topbar">
      <button class="icon-btn" @click="$router.back()">
        <i class="bi bi-arrow-left"></i>
      </button>
      <div class="top-title">
        <div class="tt">Đổi token</div>
        <div class="sub">HTW → VND</div>
      </div>
      <div class="spacer"></div>
    </div>

    <div class="wrap" v-if="prof">
      <!-- Số dư ví -->
      <div class="card wallet">
        <div class="row2">
          <div class="stat htw">
            <div class="label"><i class="bi bi-coin"></i> HTW</div>
            <div class="value">{{ htwBalance.toLocaleString() }}</div>
          </div>
          <div class="stat vnd">
            <div class="label"><i class="bi bi-currency-dollar"></i> VND</div>
            <div class="value">{{ vndBalance.toLocaleString() }}</div>
          </div>
        </div>
        <div class="rate">
          <i class="bi bi-graph-up-arrow"></i>
          Tỷ giá: <b>1 HTW = {{ RATE }} VND</b>
        </div>
      </div>

      <!-- Nhập số lượng -->
      <div class="card">
        <div class="field">
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
            <span class="suffix">HTW</span>
            <button class="pill" type="button" @click="fillMax">Tối đa</button>
          </div>
          <div class="hint">
            Sẽ nhận: <b>{{ vnd.toLocaleString() }}</b> VND
          </div>
          <div v-if="amountNum > htwBalance" class="err">Số HTW vượt quá số dư.</div>
        </div>

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
    </div>

    <div v-else class="wrap">
      <div class="card center">
        <i class="bi bi-hourglass-split spin big"></i>
        <div>Đang tải thông tin…</div>
      </div>
    </div>
  </div>
</template>

<style scoped>
@import url('https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.min.css');

:global(*), :global(*::before), :global(*::after){ box-sizing: border-box }
:global(html, body, #app){ margin:0; background:#0b0f1a; color:#e5e7eb }

.page{ min-height:100vh; background: radial-gradient(1200px 600px at 10% -10%, #10223a 0%, transparent 60%) #0b0f1a; }

/* Topbar cân 2 bên, hỗ trợ safe-area */
.topbar{
  position: sticky; top:0; z-index:10;
  display:flex; align-items:center; gap:12px;
  padding-top: calc(10px + env(safe-area-inset-top));
  padding-bottom: 10px;
  padding-left: max(16px, env(safe-area-inset-left));
  padding-right: max(16px, env(safe-area-inset-right));
  background: linear-gradient(180deg, rgba(11,15,26,.96), rgba(11,15,26,.7) 65%, transparent);
  backdrop-filter: blur(8px);
}
.icon-btn{
  width:38px; height:38px; border-radius:12px;
  border:1px solid rgba(148,163,184,.18);
  background: rgba(148,163,184,.08); color:#e5e7eb;
  display:grid; place-items:center; font-size:18px;
}
.top-title .tt{ font-weight:800; letter-spacing:.3px }
.top-title .sub{ font-size:12px; color:#93a4bd }
.spacer{ flex:1 }

/* content wrap cân 2 bên */
.wrap{
  padding-left: max(16px, env(safe-area-inset-left));
  padding-right: max(16px, env(safe-area-inset-right));
  padding-bottom: calc(20px + env(safe-area-inset-bottom));
  padding-top: 12px;
  display:grid; gap:14px;
}

/* cards */
.card{
  width:100%; border-radius:18px; overflow:hidden;
  border:1px solid rgba(148,163,184,.16);
  background: linear-gradient(180deg, rgba(17,24,39,.82), rgba(15,23,42,.76));
  box-shadow: 0 10px 30px rgba(2,8,23,.35);
  padding:16px;
}
.card.center{ display:grid; place-items:center; gap:10px; padding:28px }

.wallet .row2{
  display:grid; grid-template-columns: 1fr 1fr; gap:12px; margin-bottom:10px;
}
.stat{
  padding:14px; border-radius:14px;
  background: linear-gradient(180deg, rgba(241,245,249,.03), rgba(241,245,249,.01));
  border:1px solid rgba(148,163,184,.16);
}
.stat .label{ display:flex; align-items:center; gap:8px; color:#99a7be; font-size:13px }
.stat .value{ font-size:20px; font-weight:800; letter-spacing:.3px }
.stat.htw .value{ color:#fde68a }
.stat.vnd .value{ color:#a5b4fc }

.wallet .rate{
  margin-top:6px; font-size:12px; color:#97a6c4; display:flex; align-items:center; gap:6px
}

/* field */
.field{ display:grid; gap:8px; margin-bottom:12px }
.flabel{ display:flex; gap:8px; align-items:center; color:#cbd5e1; font-weight:600; font-size:14px }
.amount-box{
  position:relative; display:flex; align-items:center;
  background: rgba(241,245,249,.04);
  border:1.5px solid rgba(148,163,184,.22);
  border-radius:14px; padding:10px 12px; gap:8px;
}
.amount-box input{
  flex:1; background:transparent; border:0; outline:none; color:#e5e7eb;
  font-size:18px; font-weight:700; letter-spacing:.3px;
}
.amount-box .suffix{ color:#9aa8c2; font-weight:700 }
.amount-box .pill{
  border:1px solid rgba(148,163,184,.25);
  background: rgba(148,163,184,.08);
  color:#cbd5e1; padding:6px 10px; border-radius:12px; font-size:12px; font-weight:700;
}
.hint{ font-size:12px; color:#8ba3c7 }
.err{ font-size:12px; color:#fca5a5 }

/* button */
.primary{
  width:100%;
  display:flex; align-items:center; justify-content:center; gap:8px;
  border:0; border-radius:14px; padding:12px 16px;
  color:#0b0f1a; font-weight:800;
  background: linear-gradient(90deg, #fde68a, #60a5fa);
  box-shadow: 0 10px 30px rgba(6,182,212,.22);
}
.primary:disabled{ opacity:.5; filter:saturate(.6) }
.spin{ animation:spin 1s linear infinite }
.big{ font-size:40px }
@keyframes spin{ to{ transform: rotate(360deg)}}

/* message */
.msg{
  margin-top:10px; padding:10px 12px; border-radius:12px; font-size:13px; font-weight:700;
  display:flex; align-items:center; gap:8px;
}
.msg.ok{ background: rgba(34,197,94,.12); color:#34d399; border:1px solid rgba(34,197,94,.35) }
.msg.bad{ background: rgba(239,68,68,.12); color:#f87171; border:1px solid rgba(239,68,68,.35) }

/* responsive */
@media (max-width: 360px){
  .stat .value{ font-size:18px }
}
</style>
