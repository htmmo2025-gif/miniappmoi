<!-- /src/pages/Checkin.vue -->
<script setup>
import { ref, computed, onMounted } from 'vue'
import BottomNav from '../components/BottomNav.vue'

const profile = ref({ telegram_id: '' })
const day = ref(1)          // 1..7
const remaining = ref(0)    // giây cooldown tới 0h
const balance = ref(0)      // số dư thật
const busy = ref(false)
const ready = ref(false)    // Monetag SDK
const fnRef = ref(null)
const msg = ref('')

const REWARDS = [1,2,3,4,5,6,7]

const checkedToday = computed(() => remaining.value > 0)
const nextReward = computed(() => REWARDS[Math.max(0, day.value - 1)])

function todayStart() { const d = new Date(); d.setHours(0,0,0,0); return d.getTime() }

function getUserId() {
  return String(
    profile.value?.telegram_id ||
    window?.Telegram?.WebApp?.initDataUnsafe?.user?.id || ''
  )
}

/* ---------- Monetag ---------- */
function detectMonetagFnName() {
  const s = [...document.scripts].find(x => /liblt\.com\/sdk\.js|lib11\.com\/sdk\.js/.test(x.src))
  const zone = s?.getAttribute('data-zone')
  const name = s?.getAttribute('data-sdk')
  if (name) return name
  if (zone) return `show_${zone}`
  const z = import.meta.env.VITE_MONETAG_ZONE_ID
  return z ? `show_${z}` : null
}
async function waitSdk(ms=5000) {
  const name = detectMonetagFnName()
  const t0 = Date.now()
  while (Date.now()-t0 < ms) {
    const f = name && window[name]
    if (typeof f === 'function') {
      fnRef.value = f
      try { await f({ type:'preload', ymid: getUserId() }).catch(()=>{}) } catch {}
      ready.value = true
      return true
    }
    await new Promise(r => setTimeout(r, 100))
  }
  return false
}

/* ---------- API ---------- */
async function loadStatus() {
  const tid = getUserId()
  const r = await fetch(`/api/checkin?tid=${encodeURIComponent(tid)}`, { credentials:'include' })
  if (!r.ok) throw new Error(await r.text())
  const j = await r.json()
  day.value = j.day ?? 1
  remaining.value = j.remaining ?? 0
  balance.value = Number(j.balance ?? 0)
}

async function doCheckin() {
  if (busy.value || checkedToday.value || !ready.value) return
  busy.value = true; msg.value = ''
  try {
    const f = fnRef.value
    if (!f) throw new Error('SDK chưa sẵn sàng')
    const uid = getUserId()
    if (!uid) throw new Error('Thiếu Telegram ID')

    // BẮT BUỘC xem Ad
    await f({ ymid: uid })

    // GỌI API thật
    const r = await fetch(`/api/checkin?tid=${encodeURIComponent(uid)}`, {
      method: 'POST', credentials: 'include'
    })
    const j = await r.json().catch(()=> ({}))
    if (!r.ok || j.ok !== true) {
      remaining.value = Number(j.remaining ?? remaining.value)
      msg.value = 'Chưa thể điểm danh, thử lại sau.'
      return
    }

    balance.value = Number(j.balance ?? balance.value)
    day.value = j.day ?? day.value
    remaining.value = j.remaining ?? remaining.value

    msg.value = `+${j.add} HTW`
    try { window.Telegram?.WebApp?.HapticFeedback?.notificationOccurred('success') } catch {}
    setTimeout(()=> msg.value = '', 1500)
  } catch (e) {
    console.error(e)
    msg.value = e?.message?.includes('ID') ? 'Thiếu Telegram ID — hãy mở trong Telegram.' : 'Không xem được quảng cáo.'
    setTimeout(()=> msg.value='', 2000)
  } finally {
    busy.value = false
  }
}

/* ---------- init ---------- */
onMounted(async () => {
  try {
    // Lấy profile thật (để hiện số dư + id)
    const pr = await fetch('/api/profile', { credentials:'include' })
    if (pr.ok) {
      const j = await pr.json()
      profile.value.telegram_id = j.telegram_id || ''
      balance.value = Number(j.htw_balance || 0)
    }
  } catch {}
  await loadStatus().catch(()=>{})
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
          <div class="val">{{ balance.toLocaleString() }} HTW</div>
        </div>
      </section>

      <section class="card">
        <div class="days">
          <div
            v-for="d in 7" :key="d"
            :class="['day',
              d < day || (d===day && checkedToday) ? 'done' :
              d === day ? 'cur' : 'lock']"
          >
            <div class="n">{{ d }}</div>
            <div class="r">+{{ REWARDS[d-1] }}</div>
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
               'Xem quảng cáo & điểm danh (+'+ (nextReward||1) +' HTW)' }}
          </span>
        </button>

        <p v-if="msg" class="msg">{{ msg }}</p>
        <p v-else-if="!ready" class="hint">Đang loading...</p>
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
