<script setup>
import { ref, computed, onMounted } from 'vue'
import BottomNav from '../components/BottomNav.vue'
import { useMonetag } from '../lib/useMonetag.js'

const st = ref({ day: 0, today_claimed: false, remaining: 0, htw_balance: 0 })
const loading = ref(true)
const busy = ref(false)
const msg = ref('')

const { ready, loading: adLoading, preload, show } = useMonetag()

const days = computed(() => Array.from({ length: 7 }, (_, i) => i + 1))
const nextLabel = computed(() => st.value.today_claimed ? 'Đã điểm danh hôm nay' : 'Xem quảng cáo & điểm danh')

async function loadStatus() {
  loading.value = true
  msg.value = ''
  try {
    const r = await fetch('/api/checkin', { credentials: 'include' })
    const j = await r.json()
    st.value = j
  } catch (e) {
    msg.value = 'Không tải được trạng thái điểm danh.'
  } finally {
    loading.value = false
  }
}

function fmt(sec) {
  const m = String(Math.floor(sec / 60)).padStart(2, '0')
  const s = String(sec % 60).padStart(2, '0')
  return `${m}:${s}`
}

const canCheckin = computed(() =>
  !loading.value && !busy.value && st.value.remaining <= 0 && !st.value.today_claimed
)

async function doCheckin() {
  if (!canCheckin.value) return
  busy.value = true
  msg.value = ''
  try {
    // Preload (1 lần / mỗi lần mở trang là đủ)
    if (!ready.value) {
      await preload('checkin-' + Date.now()).catch(()=>{})
    }
    // Hiển thị ad bắt buộc
    await show('checkin-' + Date.now())

    const r = await fetch('/api/checkin', { method: 'POST', credentials: 'include' })
    const j = await r.json()
    if (!j.ok) {
      st.value.remaining = Number(j.remaining || 0)
      st.value.htw_balance = Number(j.htw_balance || st.value.htw_balance)
      st.value.today_claimed = true
      return
    }
    // thành công
    st.value.htw_balance = j.htw_balance
    st.value.day = j.day
    st.value.today_claimed = true
    st.value.remaining = j.remaining
    toast(`+${j.add} HTW 🎉`)
  } catch (e) {
    msg.value = e?.message || 'Điểm danh thất bại.'
  } finally {
    busy.value = false
  }
}

function toast(t) {
  const el = document.createElement('div')
  el.className = 'toast'
  el.textContent = t
  document.body.appendChild(el)
  requestAnimationFrame(() => el.classList.add('show'))
  setTimeout(() => { el.classList.remove('show'); setTimeout(() => el.remove(), 250) }, 1600)
}

onMounted(loadStatus)
</script>

<template>
  <div class="page">
    <header class="topbar"><h1>Điểm danh 7 ngày</h1></header>

    <main class="wrap">
      <section class="card balance">
        <div class="ic"><i class="bi bi-calendar2-check"></i></div>
        <div class="meta">
          <div class="mut">Số dư HTW</div>
          <div class="val">{{ (st.htw_balance || 0).toLocaleString() }} <span>HTW</span></div>
        </div>
      </section>

      <section class="card">
        <div class="days">
          <div
            v-for="d in days"
            :key="d"
            class="day"
            :class="{
              done: st.today_claimed && d === st.day,
              active: d === (st.day || 1)
            }">
            <div class="n">{{ d }}</div>
            <div class="r">+{{ d }}<small> HTW</small></div>
          </div>
        </div>

        <button class="btn" :disabled="!canCheckin || adLoading" @click="doCheckin">
          <i v-if="busy || adLoading" class="bi bi-arrow-repeat spin"></i>
          <i v-else class="bi bi-play-circle"></i>
          <span>{{ nextLabel }}</span>
        </button>

        <p v-if="st.remaining > 0" class="note">
          <i class="bi bi-hourglass-split"></i> Còn lại: <b>{{ fmt(st.remaining) }}</b>
        </p>
        <p v-if="msg" class="note warn">{{ msg }}</p>
      </section>
    </main>

    <BottomNav />
  </div>
</template>

<style scoped>
.page{ --bg:#0b0f1a; --card:#101826; --mut:#9aa3b2; --ring:1px solid rgba(148,163,184,.14);
  background:var(--bg); color:#e5e7eb; min-height:100dvh; }
.topbar{ position:sticky; top:0; z-index:10; padding:14px 16px;
  background:linear-gradient(180deg,rgba(11,15,26,.96),rgba(11,15,26,.7) 65%,transparent);
  backdrop-filter:blur(8px) }
.topbar h1{ margin:0; font:800 20px/1 ui-sans-serif,system-ui }
.wrap{ padding:16px 16px calc(92px + env(safe-area-inset-bottom)) }
.card{ background:var(--card); border:var(--ring); border-radius:16px; padding:16px;
  box-shadow:0 10px 30px rgba(2,8,23,.35) }

.balance{ display:flex; gap:12px; align-items:center }
.balance .ic{ width:44px;height:44px;border-radius:12px;
  background:linear-gradient(145deg,#22c55e,#10b981); display:grid;place-items:center }
.balance .mut{ color:var(--mut); font-size:12px }
.balance .val{ font:800 22px/1.1 ui-sans-serif,system-ui }
.balance .val span{ font:700 12px; opacity:.85; margin-left:6px }

.days{ display:grid; grid-template-columns:repeat(7,1fr); gap:10px; margin:8px 0 12px }
.day{ display:grid; place-items:center; gap:4px; padding:10px 6px; border-radius:12px;
  border:1px solid rgba(148,163,184,.14); background:#0e1525 }
.day.active{ border-color:#60a5fa; box-shadow:0 0 0 1px #60a5fa22 inset }
.day.done{ border-color:#22c55e; background:#052e1a }
.n{ font-weight:800; width:26px;height:26px; display:grid;place-items:center; border-radius:999px;
  background:#111827; }
.r{ font-weight:700; font-size:12px; color:#cbd5e1 }
.r small{ opacity:.8 }

.btn{ width:100%; padding:14px; border-radius:14px; border:none; color:#0b0f1a; font-weight:900;
  background:linear-gradient(145deg,#a7f3d0,#60a5fa); display:flex; align-items:center;
  justify-content:center; gap:8px; transition:opacity .2s }
.btn:disabled{ opacity:.5; cursor:not-allowed }
.spin{ animation:spin 1s linear infinite } @keyframes spin{ to{ transform:rotate(360deg) } }

.note{ margin-top:10px; padding:10px 12px; border-radius:10px; background:#0e1525; color:#cbd5e1 }
.note.warn{ background:#422006; color:#fed7aa; border:1px solid #92400e }

/* toast */
:global(.toast){
  position:fixed; top:calc(64px + env(safe-area-inset-top)); left:50%;
  transform:translateX(-50%) translateY(-10px);
  background:linear-gradient(135deg,#22c55e,#10b981); color:#0b0f1a;
  padding:10px 14px; border-radius:12px; font-weight:800; font-size:13px;
  box-shadow:0 10px 30px rgba(16,185,129,.35); opacity:0; z-index:1000;
  transition:transform .2s, opacity .2s;
}
:global(.toast.show){ opacity:1; transform:translateX(-50%) translateY(0) }
</style>
