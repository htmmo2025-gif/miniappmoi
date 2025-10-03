<!-- src/pages/Checkin.vue -->
<script setup>
import { ref, onMounted, computed } from 'vue'
import BottomNav from '../components/BottomNav.vue'

const zoneId = String(import.meta.env.VITE_MONETAG_ZONE_ID || '')
const sdkFnName = `show_${zoneId}`

const profile = ref(null)
const htw = ref(0)
const day = ref(0)
const remaining = ref(0)
const loading = ref(true)
const busy = ref(false)
const msg = ref('')
const sdkReady = ref(false)

/* ---------- Load profile & status ---------- */
async function loadProfile() {
  const r = await fetch('/api/profile', { credentials: 'include' })
  if (r.ok) profile.value = await r.json()
}
async function loadStatus() {
  const r = await fetch('/api/checkin', { credentials: 'include' })
  if (!r.ok) throw new Error(await r.text())
  const j = await r.json()
  htw.value = Number(j.htw_balance ?? 0)
  day.value = Number(j.day ?? 0)
  remaining.value = Number(j.remaining ?? 0)
}

/* ---------- Monetag SDK ---------- */
async function ensureMonetag() {
  // Nếu đã chèn vào index.html thì hàm global đã có
  if (zoneId && typeof window[sdkFnName] === 'function') {
    sdkReady.value = true
    return
  }
  // Nạp động (nếu bạn không muốn chỉnh index.html)
  if (!zoneId) throw new Error('Thiếu VITE_MONETAG_ZONE_ID')

  if (![...document.scripts].some(s => s.src?.includes('liblt.com/sdk.js'))) {
    await new Promise((resolve, reject) => {
      const s = document.createElement('script')
      s.src = 'https://liblt.com/sdk.js'
      s.setAttribute('data-zone', zoneId)
      s.setAttribute('data-sdk', sdkFnName)
      s.async = true
      s.onload = resolve
      s.onerror = reject
      document.head.appendChild(s)
    })
  }
  if (typeof window[sdkFnName] === 'function') {
    sdkReady.value = true
  } else {
    throw new Error('SDK Monetag chưa sẵn sàng')
  }
}

function fmt(sec) {
  const m = String(Math.floor(sec/60)).padStart(2,'0')
  const s = String(Math.floor(sec%60)).padStart(2,'0')
  return `${m}:${s}`
}

/* ---------- Checkin flow ---------- */
const canCheckin = computed(() => !busy.value && remaining.value <= 0 && sdkReady.value)

async function doCheckin() {
  if (!canCheckin.value) return
  busy.value = true; msg.value = ''

  try {
    await ensureMonetag()
    const show = window[sdkFnName]
    // ymid giúp bạn gắn ID user cho postback/đối soát
    await show?.({ ymid: String(profile.value?.telegram_id || '') })

    const r = await fetch('/api/checkin', { method: 'POST', credentials: 'include' })
    const j = await r.json().catch(()=>({}))
    if (!r.ok || j?.ok !== true) {
      remaining.value = Number(j?.remaining ?? 0)
      msg.value = 'Chưa đến giờ điểm danh.'
      return
    }

    htw.value = Number(j.htw_balance ?? htw.value)
    day.value = Number(j.day ?? day.value)
    remaining.value = Number(j.remaining ?? 86400)
    toast(`+${Number(j.add)} HTW (ngày ${day.value}/7)`)
    window.Telegram?.WebApp?.HapticFeedback?.notificationOccurred?.('success')
  } catch (e) {
    console.error(e)
    msg.value = e?.message || 'Không thực hiện được điểm danh.'
  } finally {
    busy.value = false
  }
}

/* ---------- UI helpers ---------- */
const days = computed(() => Array.from({ length: 7 }, (_, i) => i + 1))

function toast(t) {
  const el = document.createElement('div')
  el.className = 'toast'
  el.textContent = t
  document.body.appendChild(el)
  requestAnimationFrame(() => el.classList.add('show'))
  setTimeout(() => { el.classList.remove('show'); setTimeout(() => el.remove(), 220) }, 1600)
}

onMounted(async () => {
  try {
    await Promise.all([loadProfile(), loadStatus()])
    await ensureMonetag().catch(()=>{}) // thử nạp, nếu fail sẽ hiển thị cảnh báo dưới nút
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <div class="page">
    <header class="top"><h1>Điểm danh 7 ngày</h1></header>

    <main class="wrap">
      <section class="card balance">
        <div class="badge"><i class="bi bi-calendar-check"></i></div>
        <div class="info">
          <div class="label">Số dư HTW</div>
          <div class="amount">{{ htw.toLocaleString() }} <span>HTW</span></div>
        </div>
      </section>

      <section class="card">
        <div class="days">
          <div v-for="d in days" :key="d" class="day" :class="{ done: d <= day }">
            <div class="dnum">{{ d }}</div>
            <div class="drew">+{{ d }} HTW</div>
            <i class="bi bi-check2 tick"></i>
          </div>
        </div>

        <div v-if="remaining > 0" class="cooldown">
          <i class="bi bi-hourglass-split"></i>
          Còn lại: <b>{{ fmt(remaining) }}</b>
        </div>

        <button class="btn" :disabled="!canCheckin" @click="doCheckin">
          <i v-if="busy" class="bi bi-arrow-repeat spin"></i>
          <i v-else class="bi bi-play-circle"></i>
          <span>Xem quảng cáo & điểm danh</span>
        </button>

        <p v-if="!sdkReady" class="note warn">SDK Monetag chưa sẵn sàng.</p>
        <p v-if="msg" class="note">{{ msg }}</p>
      </section>
    </main>

    <BottomNav/>
  </div>
</template>

<style scoped>
.page{ --bg:#0b0f1a; --card:#101826; --mut:#9aa3b2; --ring:1px solid rgba(148,163,184,.14);
  background:var(--bg); color:#e5e7eb; min-height:100dvh }
.top{position:sticky;top:0;z-index:10;padding:14px 16px;
  background:linear-gradient(180deg,rgba(11,15,26,.96),rgba(11,15,26,.7) 65%,transparent);
  backdrop-filter:blur(8px)}
.top h1{margin:0;font:800 20px/1 ui-sans-serif,system-ui}
.wrap{padding:16px 16px calc(92px + env(safe-area-inset-bottom))}
.card{background:#0f172a;border:var(--ring);border-radius:16px;padding:16px;box-shadow:0 10px 30px rgba(2,8,23,.35)}
/* balance */
.balance{display:flex;gap:12px;align-items:center}
.badge{width:44px;height:44px;border-radius:12px;display:grid;place-items:center;
  background:linear-gradient(145deg,#16a34a,#22c55e)}
.info .label{font-size:12px;color:var(--mut)}
.info .amount{font:800 22px/1.1 ui-sans-serif,system-ui}
.info .amount span{font:700 12px;opacity:.85;margin-left:6px}
/* days */
.days{display:grid;grid-template-columns:repeat(7,1fr);gap:10px}
.day{position:relative;background:#0e1525;border:var(--ring);border-radius:12px;padding:10px 8px;text-align:center}
.day .dnum{font:900 14px/1 ui-sans-serif;opacity:.9}
.day .drew{font:12px ui-sans-serif;color:#9aa3b2;margin-top:2px}
.day .tick{position:absolute;right:8px;top:8px;opacity:0;transform:scale(.8)}
.day.done{background:linear-gradient(180deg,#0f172a,#0b1f14)}
.day.done .tick{opacity:1;color:#22c55e}
.cooldown{display:flex;align-items:center;gap:8px;color:#9fb2d0;margin:10px 0}
/* button */
.btn{width:100%;padding:14px;border-radius:14px;border:none;color:#0b0f1a;font-weight:900;
  background:linear-gradient(145deg,#60a5fa,#34d399);display:flex;align-items:center;justify-content:center;gap:8px}
.btn:disabled{opacity:.5;cursor:not-allowed}
.spin{animation:spin 1s linear infinite} @keyframes spin{to{transform:rotate(360deg)}}
/* notes & toast */
.note{margin-top:10px;padding:10px 12px;border-radius:10px;background:#0e1525;color:#cbd5e1;font-size:13px}
.note.warn{background:#422006;color:#fed7aa;border:1px solid #92400e}
:global(.toast){position:fixed;top:calc(64px + env(safe-area-inset-top));left:50%;
  transform:translateX(-50%) translateY(-10px);background:linear-gradient(135deg,#22c55e,#10b981);
  color:#0b0f1a;padding:10px 14px;border-radius:12px;font-weight:800;font-size:13px;
  box-shadow:0 10px 30px rgba(16,185,129,.35);opacity:0;z-index:1000;transition:transform .2s,opacity .2s}
:global(.toast.show){opacity:1;transform:translateX(-50%) translateY(0)}
@media (max-width:360px){ .days{grid-template-columns:repeat(4,1fr)} }
</style>
