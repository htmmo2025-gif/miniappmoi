<!-- src/pages/Checkin.vue -->
<script setup>
import { ref, onMounted, computed } from 'vue'
import BottomNav from '../components/BottomNav.vue'

const state = ref({
  day: 1,          // ngày sẽ nhận (1..7)
  today_done: false,
  htw_balance: 0,
})

const loading = ref(true)
const busy = ref(false)
const msg = ref('')

async function loadStatus () {
  loading.value = true
  msg.value = ''
  try {
    const r = await fetch('/api/checkin', { credentials: 'include' })
    if (!r.ok) throw new Error(await r.text())
    const data = await r.json()
    state.value.day = Number(data.day ?? 1)
    state.value.today_done = !!data.today_done
    state.value.htw_balance = Number(data.htw_balance ?? 0)
  } catch (e) {
    console.error(e)
    msg.value = 'Không tải được trạng thái điểm danh.'
  } finally {
    loading.value = false
  }
}

/* ========== MONETAG ========== */
/** Sử dụng wrapper đã gắn trong index.html: window.monetagShow(opts) */
async function showReward() {
  const fn = window.monetagShow
  if (typeof fn !== 'function') {
    throw new Error('SDK Monetag chưa sẵn sàng.')
  }
  // có thể truyền ymid để định danh người dùng/sự kiện
  await fn({ ymid: 'checkin' })
}

/* ========== UI / LOGIC ========== */
const canClick = computed(() =>
  !loading.value && !busy.value && !state.value.today_done
)

function toast (t) {
  const el = document.createElement('div')
  el.className = 'toast'
  el.textContent = t
  document.body.appendChild(el)
  requestAnimationFrame(() => el.classList.add('show'))
  setTimeout(() => { el.classList.remove('show'); setTimeout(() => el.remove(), 250) }, 1600)
}

async function doCheckin () {
  if (!canClick.value) return
  busy.value = true
  msg.value = ''

  try {
    // 1) Bắt buộc xem quảng cáo trước, nhưng KHÔNG chặn click nếu SDK chưa sẵn sàng
    await showReward()

    // 2) Gọi API điểm danh
    const r = await fetch('/api/checkin', { method: 'POST', credentials: 'include' })
    const data = await r.json().catch(() => ({}))
    if (!r.ok || data?.ok !== true) {
      throw new Error(data?.error || 'Điểm danh thất bại.')
    }

    // 3) Cập nhật UI
    state.value.htw_balance = Number(data.htw_balance ?? state.value.htw_balance)
    state.value.day = Number(data.next_day ?? state.value.day)
    state.value.today_done = true

    const add = Number(data.add ?? 0)
    if (add > 0) toast(`+${add} HTW 🎉`)
  } catch (e) {
    msg.value = e?.message || 'Không thể điểm danh.'
  } finally {
    busy.value = false
  }
}

onMounted(loadStatus)
</script>

<template>
  <div class="page">
    <header class="topbar"><h1>Điểm danh 7 ngày</h1></header>

    <main class="wrap">
      <section class="card balance">
        <div class="ic"><i class="bi bi-calendar2-check"></i></div>
        <div class="txt">
          <div class="mut">Số dư HTW</div>
          <div class="amt">{{ state.htw_balance.toLocaleString() }} <span>HTW</span></div>
        </div>
      </section>

      <section class="card board">
        <div class="days">
          <div
            v-for="i in 7" :key="i"
            class="day"
            :class="{ active: state.day === i, done: state.today_done && i < state.day }"
          >
            <div class="num">{{ i }}</div>
            <div class="rwd">+{{ i }}<small> HTW</small></div>
          </div>
        </div>

        <button
          type="button"
          class="btn"
          :disabled="!canClick"
          @click="doCheckin"
        >
          <i v-if="busy || loading" class="bi bi-arrow-repeat spin"></i>
          <i v-else class="bi bi-play-circle"></i>
          <span>{{ state.today_done ? 'Đã điểm danh hôm nay' : 'Xem quảng cáo & điểm danh' }}</span>
        </button>

        <p v-if="msg" class="note warn">{{ msg }}</p>
      </section>
    </main>

    <BottomNav/>
  </div>
</template>

<style scoped>
.page{ --bg:#0b0f1a; --card:#101826; --ring:1px solid rgba(148,163,184,.14); --mut:#9aa3b2;
  background:var(--bg); color:#e5e7eb; min-height:100dvh }
.topbar{ position:sticky; top:0; z-index:10; padding:14px 16px;
  background:linear-gradient(180deg,rgba(11,15,26,.96),rgba(11,15,26,.7) 65%,transparent);
  backdrop-filter:blur(8px)}
.topbar h1{ margin:0; font:800 20px/1 ui-sans-serif,system-ui }
.wrap{ padding:16px 16px calc(92px + env(safe-area-inset-bottom)) }
.card{ background:var(--card); border:var(--ring); border-radius:16px; padding:16px; box-shadow:0 10px 30px rgba(2,8,23,.35) }

.balance{ display:flex; gap:12px; align-items:center }
.balance .ic{ width:44px; height:44px; border-radius:12px; display:grid; place-items:center;
  background:linear-gradient(145deg,#10b981,#22c55e)}
.balance .mut{ font-size:12px; color:var(--mut) }
.balance .amt{ font:800 22px/1.1 ui-sans-serif,system-ui }
.balance .amt span{ font:700 12px; opacity:.85; margin-left:6px }

.board{ margin-top:12px; display:grid; gap:12px }
.days{ display:grid; grid-template-columns: repeat(7, 1fr); gap:10px }
.day{ border:1px solid rgba(148,163,184,.14); background:#0e1525; border-radius:14px; padding:10px; text-align:center }
.day.active{ outline:2px solid #60a5fa }
.day.done{ opacity:.6 }
.num{ font:800 16px/1 ui-sans-serif,system-ui }
.rwd{ font-size:12px; color:#cbd5e1; margin-top:4px }
.rwd small{ opacity:.85 }

.btn{ width:100%; padding:14px; border-radius:14px; border:none; color:#0b0f1a; font-weight:900;
  background:linear-gradient(145deg,#a7f3d0,#60a5fa); display:flex; align-items:center; justify-content:center; gap:8px;
  cursor:pointer; }
.btn:disabled{ opacity:.5; cursor:not-allowed }
.spin{ animation:spin 1s linear infinite } @keyframes spin{ to{ transform:rotate(360deg) } }

.note.warn{ background:#422006; color:#fed7aa; border:1px solid #92400e; border-radius:10px; padding:10px }

:global(.toast){
  position: fixed; top: calc(64px + env(safe-area-inset-top)); left:50%; transform:translateX(-50%) translateY(-10px);
  background:linear-gradient(135deg,#22c55e,#10b981); color:#0b0f1a; padding:10px 14px; border-radius:12px; font-weight:800; font-size:13px;
  box-shadow:0 10px 30px rgba(16,185,129,.35); opacity:0; z-index:1000; transition:transform .2s, opacity .2s }
:global(.toast.show){ opacity:1; transform:translateX(-50%) translateY(0) }
@media (max-width:380px){ .days{ grid-template-columns: repeat(4, 1fr) } }
</style>
