<!-- src/pages/Checkin.vue -->
<script setup>
import { ref, onMounted, computed } from 'vue'
import BottomNav from '../components/BottomNav.vue'

const profile = ref(null)
const state = ref({ remaining: 0, day_index: 0, htw_balance: 0 })
const loading = ref(true)
const busy = ref(false)
const msg = ref('')

const ZONE_ID = import.meta.env.VITE_MONETAG_ZONE_ID || '9966675'
const fnName = `show_${ZONE_ID}`
const monetagReady = ref(false)

function getMonetagFn() {
  const fn = window?.[fnName]
  return typeof fn === 'function' ? fn : null
}

// đợi SDK + preload
async function waitMonetagReady(maxMs = 5000) {
  const start = Date.now()
  while (Date.now() - start < maxMs) {
    const fn = getMonetagFn()
    if (fn) {
      try {
        // preload theo docs
        const ymid = String(profile.value?.telegram_id || '')
        await fn({ type: 'preload', ymid }).catch(()=>{})
        monetagReady.value = true
        return true
      } catch (_) {}
    }
    await new Promise(r => setTimeout(r, 200))
  }
  return false
}

const canCheckin = computed(() =>
  monetagReady.value && !busy.value && !loading.value && state.value.remaining <= 0
)

async function loadStatus() {
  loading.value = true
  msg.value = ''
  try {
    const p = await fetch('/api/profile', { credentials: 'include' })
    if (p.ok) profile.value = await p.json()

    const r = await fetch('/api/checkin', { credentials: 'include' })
    if (!r.ok) throw new Error(await r.text())
    const j = await r.json()
    state.value.remaining = Number(j.remaining ?? 0)
    state.value.day_index = Number(j.day_index ?? 0)
    state.value.htw_balance = Number(j.htw_balance ?? 0)
  } catch (e) {
    msg.value = 'Không tải được trạng thái điểm danh.'
  } finally {
    loading.value = false
  }
}

async function doCheckin() {
  if (!canCheckin.value) return
  busy.value = true
  msg.value = ''

  try {
    const fn = getMonetagFn()
    if (!fn) throw new Error('Monetag SDK chưa sẵn sàng.')

    const ymid = String(profile.value?.telegram_id || '')
    // hiển thị quảng cáo; resolve nếu xem xong
    await fn({ ymid })

    // sau khi xem xong → gọi claim
    const r = await fetch('/api/checkin', { method: 'POST', credentials: 'include' })
    const j = await r.json().catch(()=> ({}))
    if (!r.ok || j.ok !== true) {
      state.value.remaining = Number(j.remaining ?? state.value.remaining)
      msg.value = 'Hôm nay bạn đã điểm danh rồi.'
      return
    }

    // thành công
    state.value.htw_balance = Number(j.htw_balance ?? state.value.htw_balance)
    state.value.day_index = Number(j.day ?? 1)
    state.value.remaining = Number(j.remaining ?? 0)

    toast(`+${j.add} HTW • Ngày ${state.value.day_index}/7`)
  } catch (e) {
    msg.value = e?.message || 'Không điểm danh được.'
  } finally {
    busy.value = false
  }
}

// toast nho nhỏ
function toast(t) {
  const el = document.createElement('div')
  el.className = 'toast'
  el.textContent = t
  document.body.appendChild(el)
  requestAnimationFrame(() => el.classList.add('show'))
  setTimeout(() => { el.classList.remove('show'); setTimeout(() => el.remove(), 250) }, 1700)
}

onMounted(async () => {
  await loadStatus()
  await waitMonetagReady()
})
</script>

<template>
  <div class="page">
    <header class="top"><h1>Điểm danh 7 ngày</h1></header>

    <main class="wrap">
      <section class="card balance">
        <div class="ic"><i class="bi bi-calendar-check"></i></div>
        <div class="meta">
          <div class="label">Số dư HTW</div>
          <div class="val">{{ state.htw_balance.toLocaleString() }} <span>HTW</span></div>
        </div>
      </section>

      <section class="card days">
        <div
          v-for="d in 7" :key="d"
          class="d"
          :class="{ active: state.day_index === d }"
        >
          <div class="d-num">{{ d }}</div>
          <div class="d-bonus">+{{ d }}<small> HTW</small></div>
        </div>
      </section>

      <section class="card action">
        <button class="btn" :disabled="!canCheckin" @click="doCheckin">
          <i v-if="busy || loading" class="bi bi-arrow-repeat spin"></i>
          <i v-else class="bi bi-play-circle"></i>
          <span>Xem quảng cáo & điểm danh</span>
        </button>

        <p v-if="!monetagReady" class="note warn">Monetag SDK chưa sẵn sàng.</p>
        <p v-if="msg" class="note">{{ msg }}</p>
      </section>
    </main>

    <BottomNav />
  </div>
</template>

<style scoped>
.page{--bg:#0b0f1a;--card:#101826;--mut:#9aa3b2;--ring:1px solid rgba(148,163,184,.14);
  background:var(--bg);color:#e5e7eb;min-height:100dvh}
.top{position:sticky;top:0;z-index:10;padding:14px 16px;background:linear-gradient(180deg,rgba(11,15,26,.96),rgba(11,15,26,.7) 65%,transparent);backdrop-filter:blur(8px)}
.top h1{margin:0;font:800 20px/1 ui-sans-serif,system-ui}
.wrap{padding:16px 16px calc(92px + env(safe-area-inset-bottom));display:grid;gap:12px}

.card{background:var(--card);border:var(--ring);border-radius:16px;padding:16px;box-shadow:0 10px 30px rgba(2,8,23,.35)}
.balance{display:flex;gap:12px;align-items:center}
.balance .ic{width:44px;height:44px;border-radius:12px;background:linear-gradient(145deg,#22c55e,#16a34a);display:grid;place-items:center}
.balance .label{font-size:12px;color:var(--mut)}
.balance .val{font:800 22px/1.1 ui-sans-serif,system-ui}
.balance .val span{font:700 12px;opacity:.85;margin-left:6px}

.days{display:grid;grid-template-columns:repeat(7,1fr);gap:8px}
.d{background:#0e1525;border:var(--ring);border-radius:12px;padding:10px;text-align:center}
.d.active{outline:2px solid #60a5fa}
.d-num{font:800 16px}
.d-bonus{margin-top:4px;color:#9fb2d0;font-size:12px}
.action .btn{width:100%;padding:14px;border-radius:14px;border:none;color:#0b0f1a;font-weight:900;background:linear-gradient(145deg,#a7f3d0,#60a5fa);display:flex;align-items:center;justify-content:center;gap:8px}
.btn:disabled{opacity:.5;cursor:not-allowed}
.note{margin-top:10px;padding:10px 12px;border-radius:10px;background:#0e1525;color:#cbd5e1;font-size:13px}
.note.warn{background:#422006;color:#fed7aa;border:1px solid #92400e}
.spin{animation:spin 1s linear infinite}@keyframes spin{to{transform:rotate(360deg)}}

/* toast */
:global(.toast){position:fixed;top:calc(64px + env(safe-area-inset-top));left:50%;
  transform:translateX(-50%) translateY(-10px);background:linear-gradient(135deg,#22c55e,#10b981);color:#0b0f1a;
  padding:10px 14px;border-radius:12px;font-weight:800;font-size:13px;box-shadow:0 10px 30px rgba(16,185,129,.35);
  opacity:0;z-index:1000;transition:transform .2s,opacity .2s}
:global(.toast.show){opacity:1;transform:translateX(-50%) translateY(0)}
</style>
