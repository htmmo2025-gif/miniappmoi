<script setup>
import { ref, onMounted, onUnmounted, computed } from 'vue'
import BottomNav from '../components/BottomNav.vue'

const state = ref({
  days: Array.from({length:7}, (_,i)=>({day:i+1, reward:i+1, done:false})),
  remaining: 0,
  htw_balance: 0,
})
const loading = ref(true)
const busy = ref(false)
const msg = ref('')
let timer = null

/* ===== Monetag Reward ===== */
const SDK_URL   = String(import.meta.env.VITE_MONETAG_SDK_URL || '')
const ZONE_ID   = String(import.meta.env.VITE_MONETAG_ZONE || '')
const FUNC_NAME = String(import.meta.env.VITE_MONETAG_FUNC || '')   // ví dụ "show_9966675"

function loadMonetag() {
  if (!SDK_URL || !ZONE_ID || !FUNC_NAME) return Promise.reject(new Error('Thiếu cấu hình Monetag'))
  if ([...document.scripts].some(s => s.src.includes(SDK_URL))) return Promise.resolve()
  return new Promise((resolve, reject) => {
    const s = document.createElement('script')
    s.src = SDK_URL
    s.dataset.zone = ZONE_ID
    s.dataset.sdk = FUNC_NAME
    s.async = true
    s.onload = resolve
    s.onerror = reject
    document.head.appendChild(s)
  })
}
function showReward() {
  return new Promise(async (resolve, reject) => {
    try {
      await loadMonetag()
      const fn = window[FUNC_NAME]
      if (typeof fn !== 'function') return reject(new Error('SDK Monetag chưa sẵn sàng'))
      fn().then(resolve).catch(reject)   // Monetag trả Promise
    } catch (e) { reject(e) }
  })
}

/* ===== API ===== */
async function fetchStatus() {
  loading.value = true; msg.value = ''
  try {
    const r = await fetch('/api/checkin', { credentials:'include' })
    if (!r.ok) throw new Error(await r.text())
    const d = await r.json()
    state.value.days = d.days || state.value.days
    state.value.remaining = Number(d.remaining || 0)
    state.value.htw_balance = Number(d.htw_balance || 0)
    tick()
  } catch (e) {
    console.error(e); msg.value = 'Không tải được trạng thái điểm danh.'
  } finally {
    loading.value = false
  }
}
async function claim() {
  if (!canClaim.value) return
  busy.value = true; msg.value = ''
  try {
    // BẮT BUỘC xem quảng cáo trước
    await showReward()

    const r = await fetch('/api/checkin', { method:'POST', credentials:'include' })
    const d = await r.json().catch(()=>({}))
    if (!r.ok || d?.ok !== true) {
      state.value.remaining = Number(d?.remaining ?? 0)
      tick()
      msg.value = d?.ok === false ? 'Hôm nay đã điểm danh rồi.' : 'Điểm danh thất bại.'
      return
    }
    state.value.htw_balance = Number(d.htw_balance || state.value.htw_balance)
    state.value.remaining = Number(d.remaining || 0)
    state.value.days = d.days || state.value.days
    tick()
    toast(`+${Number(d.add||0)} HTW`)
    try { window.Telegram?.WebApp?.HapticFeedback?.notificationOccurred('success') } catch {}
  } catch (e) {
    console.error(e); msg.value = e?.message || 'Không xem được quảng cáo.'
  } finally {
    busy.value = false
  }
}

/* ===== UI helpers ===== */
function tick() {
  clearInterval(timer)
  if (state.value.remaining <= 0) return
  timer = setInterval(() => {
    if (state.value.remaining > 0) state.value.remaining--
    else clearInterval(timer)
  }, 1000)
}
onUnmounted(() => clearInterval(timer))

const canClaim = computed(() => !loading.value && !busy.value && state.value.remaining <= 0)
function fmt(sec){
  const h = String(Math.floor(sec/3600)).padStart(2,'0')
  const m = String(Math.floor((sec%3600)/60)).padStart(2,'0')
  const s = String(Math.floor(sec%60)).padStart(2,'0')
  return `${h}:${m}:${s}`
}
function toast(t){
  const el = document.createElement('div')
  el.className = 'toast'
  el.textContent = t
  document.body.appendChild(el)
  requestAnimationFrame(()=>el.classList.add('show'))
  setTimeout(()=>{el.classList.remove('show'); setTimeout(()=>el.remove(),250)},1600)
}

onMounted(fetchStatus)
</script>

<template>
  <div class="page">
    <header class="topbar"><h1>Điểm danh 7 ngày</h1></header>
    <main class="wrap">
      <section class="card hero">
        <div class="hero-ic"><i class="bi bi-calendar-check"></i></div>
        <div class="hero-t">
          <div class="label">Số dư HTW</div>
          <div class="amount">{{ state.htw_balance.toLocaleString() }} <span>HTW</span></div>
        </div>
      </section>

      <section class="card">
        <div class="days">
          <div v-for="d in state.days" :key="d.day" class="day" :class="{done:d.done}">
            <div class="dot">{{ d.day }}</div>
            <div class="rw">+{{ d.reward }} HTW</div>
            <i v-if="d.done" class="bi bi-check-circle-fill ck"></i>
          </div>
        </div>

        <div v-if="state.remaining>0" class="cd">
          <i class="bi bi-hourglass-split"></i> Còn lại: <b>{{ fmt(state.remaining) }}</b>
        </div>

        <button class="btn" :disabled="!canClaim" @click="claim">
          <i v-if="busy||loading" class="bi bi-arrow-repeat spin"></i>
          <i v-else class="bi bi-play-circle"></i>
          <span>{{ state.remaining>0 ? 'Đã điểm danh hôm nay' : 'Xem quảng cáo & điểm danh' }}</span>
        </button>

        <p v-if="msg" class="note">{{ msg }}</p>
      </section>

      <section v-if="loading" class="card center">
        <i class="bi bi-hourglass-split big spin"></i>
        <div>Đang tải…</div>
      </section>
    </main>
    <BottomNav />
  </div>
</template>

<style scoped>
.page{--bg:#0b0f1a;--card:#101826;--mut:#9aa3b2;--ring:1px solid rgba(148,163,184,.14);
  background:var(--bg);color:#e5e7eb;min-height:100dvh}
.topbar{position:sticky;top:0;z-index:10;padding:14px 16px;background:linear-gradient(180deg,rgba(11,15,26,.96),rgba(11,15,26,.7) 65%,transparent);backdrop-filter:blur(8px)}
.topbar h1{margin:0;font:800 20px/1 ui-sans-serif,system-ui}
.wrap{padding:16px 16px calc(92px + env(safe-area-inset-bottom))}
.card{background:#0f172a;border:var(--ring);border-radius:16px;padding:18px;box-shadow:0 10px 30px rgba(2,8,23,.35)}
.card.center{display:grid;place-items:center;gap:10px;padding:28px}
.big{font-size:38px}
.hero{display:flex;gap:12px;align-items:center}
.hero-ic{width:44px;height:44px;border-radius:12px;background:linear-gradient(145deg,#22c55e,#16a34a);display:grid;place-items:center}
.hero-t .label{font-size:12px;color:var(--mut)}
.hero-t .amount{font:800 22px/1.1 ui-sans-serif,system-ui}
.hero-t .amount span{font:700 12px;opacity:.85;margin-left:6px}

.days{display:grid;grid-template-columns:repeat(7,1fr);gap:10px;margin-bottom:10px}
.day{position:relative;background:#0e1525;border:var(--ring);border-radius:12px;padding:10px;text-align:center}
.day.done{outline:2px solid #22c55e55}
.dot{width:28px;height:28px;border-radius:50%;margin:0 auto 6px;display:grid;place-items:center;
  background:#111827;border:1px solid #334155;font-weight:800}
.rw{font-size:12px;color:#9aa3b2}
.ck{position:absolute;right:6px;top:6px;color:#22c55e}

.cd{display:flex;align-items:center;gap:8px;color:#9fb2d0;margin:8px 0}

.btn{width:100%;padding:14px;border-radius:14px;border:none;color:#0b0f1a;font-weight:900;
  background:linear-gradient(145deg,#a7f3d0,#60a5fa);display:flex;align-items:center;justify-content:center;gap:8px}
.btn:disabled{opacity:.5;cursor:not-allowed}
.spin{animation:spin 1s linear infinite}@keyframes spin{to{transform:rotate(360deg)}}

.note{margin-top:10px;padding:10px 12px;border-radius:10px;background:#0e1525;color:#cbd5e1;font-size:13px}
:global(.toast){position:fixed;top:calc(64px + env(safe-area-inset-top));left:50%;transform:translateX(-50%) translateY(-10px);
  background:linear-gradient(135deg,#22c55e,#10b981);color:#0b0f1a;padding:10px 14px;border-radius:12px;font-weight:800;font-size:13px;
  box-shadow:0 10px 30px rgba(16,185,129,.35);opacity:0;z-index:1000;transition:.2s}
:global(.toast.show){opacity:1;transform:translateX(-50%) translateY(0)}
@media (max-width:360px){.days{grid-template-columns:repeat(4,1fr)}}
</style>
