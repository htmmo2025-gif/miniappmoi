<!-- src/pages/Checkin.vue -->
<script setup>
import { ref, computed, onMounted } from 'vue'
import BottomNav from '../components/BottomNav.vue'

const state = ref({ day: 1, checkedToday: false, balance: 0 })
const msg = ref('')
const busy = ref(false)
const ready = ref(false)      // Monetag SDK sẵn sàng?
const monetagFn = ref(null)   // window['show_<ZONE_ID>']

/* ==== Monetag (siêu gọn) ==== */
function detectMonetagFnName() {
  const s = [...document.scripts].find(x => /liblt\.com\/sdk\.js|lib11\.com\/sdk\.js/.test(x.src))
  const name = s?.getAttribute('data-sdk')
  if (name) return name
  const zone = s?.getAttribute('data-zone') || import.meta.env.VITE_MONETAG_ZONE_ID
  return zone ? `show_${zone}` : null
}
async function waitSdk(ms = 5000) {
  const name = detectMonetagFnName()
  const t0 = Date.now()
  while (Date.now() - t0 < ms) {
    const f = name && window[name]
    if (typeof f === 'function') { monetagFn.value = f; ready.value = true; return }
    await new Promise(r => setTimeout(r, 100))
  }
}

/* ==== API ==== */
async function loadStatus() {
  const r = await fetch('/api/checkin', { credentials: 'include' })
  const j = await r.json().catch(() => ({}))
  if (r.ok && j?.ok) {
    state.value.day = j.day
    state.value.checkedToday = !!j.checkedToday
    state.value.balance = Number(j.balance || 0)
  } else {
    msg.value = 'Không tải được trạng thái điểm danh.'
    setTimeout(()=>msg.value='', 2200)
  }
}

async function doCheckin() {
  if (busy.value || state.value.checkedToday || !ready.value) return
  busy.value = true; msg.value = ''

  try {
    // 1) Buộc xem quảng cáo
    await monetagFn.value?.({}).catch(() => { throw new Error('ad_failed') })

    // 2) Gọi API checkin
    const r = await fetch('/api/checkin', { method:'POST', credentials:'include' })
    const j = await r.json().catch(() => ({}))

    if (r.status === 409) {               // đã điểm danh hôm nay
      state.value.checkedToday = true
      msg.value = 'Đã điểm danh hôm nay.'
    } else if (r.ok && j?.ok) {           // thành công
      state.value.balance = Number(j.balance || state.value.balance)
      state.value.day = Math.min((j.day || state.value.day), 7)
      state.value.checkedToday = true
      msg.value = `+${j.add || 0} HTW`
      try { window.Telegram?.WebApp?.HapticFeedback?.notificationOccurred('success') } catch {}
    } else {
      msg.value = 'Không thể điểm danh, thử lại sau.'
    }
  } catch {
    msg.value = 'Không xem được quảng cáo.'
  } finally {
    busy.value = false
    setTimeout(()=>msg.value='', 1800)
  }
}

const nextReward = computed(() => Math.min(state.value.day, 7))
</script>

<template>
  <div class="page">
    <header class="top"><h1>Điểm danh 7 ngày</h1></header>

    <main class="wrap">
      <section class="card head">
        <div class="icon"><i class="bi bi-calendar-check"></i></div>
        <div class="info">
          <div class="lbl">Số dư HTW</div>
          <div class="val">{{ state.balance.toLocaleString() }} HTW</div>
        </div>
      </section>

      <section class="card">
        <div class="days">
          <div v-for="d in 7" :key="d"
               :class="['day',
                 d < state.day || (d===state.day && state.checkedToday) ? 'done' :
                 d === state.day ? 'cur' : 'lock'
               ]">
            <div class="n">{{ d }}</div>
            <div class="r">+{{ d }}</div>
          </div>
        </div>

        <button class="btn"
                :disabled="busy || state.checkedToday || !ready"
                @click="doCheckin">
          <i v-if="busy" class="bi bi-arrow-repeat spin"></i>
          <i v-else class="bi bi-play-circle"></i>
          <span>
            {{ !ready ? 'Đang tải quảng cáo...' :
               state.checkedToday ? 'Đã điểm danh hôm nay' :
               'Xem quảng cáo & điểm danh (+'+ nextReward +' HTW)' }}
          </span>
        </button>

        <p v-if="msg" class="msg">{{ msg }}</p>
        <p v-else-if="!ready" class="hint">Monetag SDK chưa sẵn sàng.</p>
      </section>
    </main>

    <BottomNav />
  </div>
</template>

<style scoped>
.page{--bg:#0b0f1a;--card:#101826;--mut:#9aa3b2;--ring:1px solid rgba(148,163,184,.14);
  background:var(--bg);color:#e5e7eb;min-height:100vh}
.top{position:sticky;top:0;z-index:10;padding:14px 16px;
  background:linear-gradient(180deg,rgba(11,15,26,.96),rgba(11,15,26,.7) 65%,transparent);
  backdrop-filter:blur(8px)}
.top h1{margin:0;font:800 20px/1 ui-sans-serif,system-ui}
.wrap{padding:12px 16px calc(96px + env(safe-area-inset-bottom));display:grid;gap:12px}

.card{background:var(--card);border:var(--ring);border-radius:14px;padding:14px}
.head{display:flex;align-items:center;gap:12px}
.icon{width:44px;height:44px;border-radius:12px;display:grid;place-items:center;
  background:linear-gradient(145deg,#06b6d4,#2563eb)}
.info .lbl{font-size:12px;color:var(--mut)}
.info .val{font:800 20px/1.1 ui-sans-serif,system-ui}

.days{display:grid;grid-template-columns:repeat(7,1fr);gap:8px;margin-bottom:10px}
.day{border-radius:12px;padding:8px 4px;text-align:center;border:var(--ring)}
.day .n{font-weight:800}
.day .r{font-size:12px;color:var(--mut)}
.day.cur{background:#132036;border-color:#3b82f6}
.day.done{background:#0f2a1c;border-color:#16a34a}
.day.lock{opacity:.6}

.btn{width:100%;padding:12px;border:none;border-radius:12px;
  background:linear-gradient(145deg,#9ae6b4,#60a5fa);color:#0b0f1a;font-weight:900;
  display:flex;align-items:center;justify-content:center;gap:8px}
.btn:disabled{opacity:.55}
.spin{animation:spin 1s linear infinite}@keyframes spin{to{transform:rotate(360deg)}}

.msg{margin-top:8px;background:#064e3b;color:#a7f3d0;border:1px solid #065f46;
  padding:8px 10px;border-radius:10px;text-align:center}
.hint{margin-top:8px;color:#eab308;font-size:13px}
</style>

<script setup>
onMounted(async () => { await waitSdk(); await loadStatus() })
</script>
