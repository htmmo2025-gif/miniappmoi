<script setup>
import { ref, computed, onMounted } from 'vue'
import BottomNav from '../components/BottomNav.vue'

/* ----- STATE ----- */
const profile = ref({ telegram_id: '' })
const state = ref({ day: 1, last: 0, balance: 0 }) // day: 1..7, last: ms epoch (0 nếu chưa)
const msg = ref('')
const busy = ref(false)
const ready = ref(false) // Monetag sẵn sàng
const fnRef = ref(null)  // window['show_xxx']

const rewards = [1,2,3,4,5,6,7]
const todayStart = () => { const d=new Date(); d.setHours(0,0,0,0); return d.getTime() }

/* ----- UI derived ----- */
const checkedToday = computed(() => {
  if (!state.value.last) return false
  return state.value.last >= todayStart()
})
const nextReward = computed(() => rewards[state.value.day-1])

/* ----- Helpers ----- */
const save = () => localStorage.setItem('checkin_v1', JSON.stringify(state.value))
const load = () => {
  try {
    const raw = localStorage.getItem('checkin_v1')
    if (raw) state.value = JSON.parse(raw)
  } catch {}
  // tính lại tiến trình theo ngày
  if (state.value.last) {
    const lastDay = new Date(state.value.last); lastDay.setHours(0,0,0,0)
    const diff = Math.floor((todayStart() - lastDay.getTime())/86400000) // số ngày cách nhau
    if (diff >= 2) state.value.day = 1               // bỏ lỡ ≥1 ngày => về ngày 1
    else if (diff === 1) state.value.day = Math.min(state.value.day+1, 7) // sang ngày kế
  }
}

/* Lấy đúng tên hàm từ thẻ SDK trong index.html (tránh lệch zone id) */
function detectMonetagFnName() {
  const s = [...document.scripts].find(x => /liblt\.com\/sdk\.js|lib11\.com\/sdk\.js/.test(x.src))
  const zone = s?.getAttribute('data-zone')
  const name = s?.getAttribute('data-sdk')
  if (name) return name
  if (zone) return `show_${zone}`
  const z = import.meta.env.VITE_MONETAG_ZONE_ID
  return z ? `show_${z}` : null
}

/* Chờ SDK sẵn sàng (rất gọn) */
async function waitSdk(ms=5000) {
  const name = detectMonetagFnName()
  const t0 = Date.now()
  while (Date.now()-t0 < ms) {
    const f = name && window[name]
    if (typeof f === 'function') {
      fnRef.value = f
      // preload nhanh (không quan trọng, có cũng tốt)
      try { await f({ type:'preload', ymid: String(profile.value.telegram_id||'') }).catch(()=>{}) } catch {}
      ready.value = true
      return true
    }
    await new Promise(r => setTimeout(r, 100))
  }
  return false
}

/* Điểm danh: xem quảng cáo -> cộng thưởng -> lưu */
async function doCheckin() {
  if (busy.value || checkedToday.value || !ready.value) return
  busy.value = true; msg.value = ''

  try {
    const f = fnRef.value
    if (!f) throw new Error('SDK chưa sẵn sàng')
    // show ad
    await f({ ymid: String(profile.value.telegram_id||'') })

    // cộng thưởng
    const add = rewards[state.value.day-1] || 1
    state.value.balance = Number(state.value.balance||0) + add
    state.value.last = Date.now()
    state.value.day = state.value.day === 7 ? 1 : state.value.day+1
    save()

    msg.value = `+${add} HTW`
    try { window.Telegram?.WebApp?.HapticFeedback?.notificationOccurred('success') } catch {}
    setTimeout(()=> msg.value='', 1500)
  } catch (e) {
    msg.value = 'Không xem được quảng cáo.'
    setTimeout(()=> msg.value='', 2000)
  } finally {
    busy.value = false
  }
}

/* Init */
onMounted(async () => {
  // lấy profile tối giản (không có cũng okay)
  try {
    const r = await fetch('/api/profile', { credentials:'include' })
    if (r.ok) {
      const j = await r.json()
      profile.value.telegram_id = j.telegram_id || ''
      state.value.balance = Number(j.htw_balance || state.value.balance || 0)
    }
  } catch {}
  load()
  await waitSdk()
})
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
          <div
            v-for="d in 7" :key="d"
            :class="['day',
              d < state.day || (d===state.day && checkedToday) ? 'done' :
              d === state.day ? 'cur' : 'lock'
            ]"
          >
            <div class="n">{{ d }}</div>
            <div class="r">+{{ rewards[d-1] }}</div>
          </div>
        </div>

        <button class="btn"
          :disabled="busy || checkedToday || !ready"
          @click="doCheckin">
          <i v-if="busy" class="bi bi-arrow-repeat spin"></i>
          <i v-else class="bi bi-play-circle"></i>
          <span>
            {{ !ready ? 'Đang tải quảng cáo...' :
               checkedToday ? 'Đã điểm danh hôm nay' :
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
/* layout */
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

/* days */
.days{display:grid;grid-template-columns:repeat(7,1fr);gap:8px;margin-bottom:10px}
.day{border-radius:12px;padding:8px 4px;text-align:center;border:var(--ring)}
.day .n{font-weight:800}
.day .r{font-size:12px;color:var(--mut)}
.day.cur{background:#132036;border-color:#3b82f6}
.day.done{background:#0f2a1c;border-color:#16a34a}
.day.lock{opacity:.6}

/* button */
.btn{width:100%;padding:12px;border:none;border-radius:12px;
  background:linear-gradient(145deg,#9ae6b4,#60a5fa);color:#0b0f1a;font-weight:900;
  display:flex;align-items:center;justify-content:center;gap:8px}
.btn:disabled{opacity:.55}
.spin{animation:spin 1s linear infinite}@keyframes spin{to{transform:rotate(360deg)}}

/* misc */
.msg{margin-top:8px;background:#064e3b;color:#a7f3d0;border:1px solid #065f46;
  padding:8px 10px;border-radius:10px;text-align:center}
.hint{margin-top:8px;color:#eab308;font-size:13px}
</style>
