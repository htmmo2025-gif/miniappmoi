<!-- src/pages/Checkin.vue -->
<script setup>
import { ref, computed, onMounted } from 'vue'
import BottomNav from '../components/BottomNav.vue'

/* ----- STATE ----- */
const profile = ref({ telegram_id: '' })

// server trả về: day_index (1..7 là ngày cần claim kế tiếp), remaining (giây còn lại nếu đã claim hôm nay),
// htw_balance (số dư thật), checked_today (bool)
const state = ref({ day_index: 1, remaining: 0, htw_balance: 0, checked_today: false })

const msg   = ref('')
const busy  = ref(false)
const ready = ref(false)  // Monetag sẵn sàng
const fnRef = ref(null)   // window['show_xxx']

const rewards = [1,2,3,4,5,6,7]

/* ----- UI derived ----- */
const day = computed(() => state.value.day_index) // ngày sẽ claim kế tiếp
const checkedToday = computed(() => state.value.checked_today)
const nextReward   = computed(() => rewards[Math.max(0, day.value - 1)])

/* ----- Monetag helpers ----- */
function detectMonetagFnName () {
  const s = [...document.scripts].find(x => /liblt\.com\/sdk\.js|lib11\.com\/sdk\.js/.test(x.src))
  const zone = s?.getAttribute('data-zone')
  const name = s?.getAttribute('data-sdk')
  if (name) return name
  if (zone) return `show_${zone}`
  const z = import.meta.env.VITE_MONETAG_ZONE_ID
  return z ? `show_${z}` : null
}
async function waitSdk (ms = 5000) {
  const name = detectMonetagFnName()
  const t0 = Date.now()
  while (Date.now() - t0 < ms) {
    const f = name && window[name]
    if (typeof f === 'function') {
      fnRef.value = f
      try { await f({ type: 'preload', ymid: String(profile.value.telegram_id || '') }).catch(() => {}) } catch {}
      ready.value = true
      return true
    }
    await new Promise(r => setTimeout(r, 100))
  }
  return false
}

/* ----- API ----- */
async function loadStatus () {
  const r = await fetch('/api/checkin', { credentials: 'include' })
  if (!r.ok) throw new Error(await r.text())
  const data = await r.json()
  // đồng bộ client
  state.value.day_index     = Number(data.day_index || 1)
  state.value.remaining     = Number(data.remaining || 0)
  state.value.htw_balance   = Number(data.htw_balance || 0)
  state.value.checked_today = !!data.checked_today
  // lấy telegram id (nếu server trả kèm)
  if (data.telegram_id) profile.value.telegram_id = String(data.telegram_id)
}

async function doCheckin () {
  if (busy.value || checkedToday.value || !ready.value) return
  busy.value = true; msg.value = ''
  try {
    // 1) buộc xem ad trước
    const f = fnRef.value
    if (!f) throw new Error('SDK chưa sẵn sàng')
    await f({ ymid: String(profile.value.telegram_id || '') })

    // 2) gọi server chấm công thật
    const r = await fetch('/api/checkin', { method: 'POST', credentials: 'include' })
    const data = await r.json().catch(() => ({}))
    if (!r.ok || data?.ok !== true) {
      msg.value = data?.message || 'Điểm danh thất bại.'
      return
    }

    // 3) cập nhật UI theo dữ liệu thật từ server
    state.value.htw_balance   = Number(data.htw_balance ?? state.value.htw_balance)
    state.value.day_index     = Number(data.day_index   ?? state.value.day_index)
    state.value.remaining     = Number(data.remaining   ?? 0)
    state.value.checked_today = true

    const add = Number(data.add || 0)
    msg.value = `+${add} HTW`
    try { window.Telegram?.WebApp?.HapticFeedback?.notificationOccurred('success') } catch {}
    setTimeout(() => { msg.value = '' }, 1500)
  } catch (e) {
    msg.value = e?.message || 'Không xem được quảng cáo.'
  } finally {
    busy.value = false
  }
}

/* Init */
onMounted(async () => {
  try {
    await loadStatus()
  } catch (e) {
    console.error(e)
    // vẫn cố gắng lấy profile để ymid cho Monetag (không bắt buộc)
    try {
      const r = await fetch('/api/profile', { credentials: 'include' })
      if (r.ok) { const j = await r.json(); profile.value.telegram_id = j.telegram_id || '' }
    } catch {}
  }
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
          <div class="val">{{ state.htw_balance.toLocaleString() }} HTW</div>
        </div>
      </section>

      <section class="card">
        <div class="days">
          <div
            v-for="d in 7" :key="d"
            :class="['day',
              d < day || (d===day && checkedToday) ? 'done' :
              d === day ? 'cur' : 'lock'
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
.day .n{font-weight:800}.day .r{font-size:12px;color:var(--mut)}
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
