<!-- src/pages/Wheel.vue -->
<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { LuckyWheel } from '@lucky-canvas/vue'
import BottomNav from '../components/BottomNav.vue'

/** ENV: reward-XXXXX (Block type: Reward) */
const raw = String(import.meta.env.VITE_ADSGRAM_REWARD_ID ?? '').trim()
const rewardBlockId = /^reward-\d+$/i.test(raw) ? raw : (/^\d+$/.test(raw) ? `reward-${raw}` : '')

/* ====== state ====== */
const sdkReady = ref(false)
const rewardEl = ref(null)

const wheelRef = ref(null)
const spinning = ref(false)
const toastMsg = ref('')
const msg = ref('')

const spins = ref(0)
const balance = ref(0)
const adWait = ref(0) // seconds
let waitTimer = null

let lastSpinResult = null

/* ====== wheel UI ====== */
const blocks = [{ padding: '12px', background: '#0f172a' }]
const prizes = [
  { background: '#0ea5e9', fonts: [{ text: '+1 HTW',  top: '18px' }] },
  { background: '#f59e0b', fonts: [{ text: '+2 HTW',  top: '18px' }] },
  { background: '#10b981', fonts: [{ text: 'Hụt 😅',  top: '18px' }] },
  { background: '#8b5cf6', fonts: [{ text: '+5 HTW',  top: '18px' }] },
  { background: '#ef4444', fonts: [{ text: 'Hụt 😅',  top: '18px' }] },
  { background: '#22c55e', fonts: [{ text: '+10 HTW', top: '18px' }] }
]
const buttons = [
  { radius: '40px', background: '#2563eb', pointer: true, fonts: [{ text: 'SPIN', top: '-18px' }] }
]

/* ====== helpers ====== */
function toast (t) {
  toastMsg.value = t
  const el = document.createElement('div')
  el.className = 'toast'
  el.textContent = t
  document.body.appendChild(el)
  requestAnimationFrame(() => el.classList.add('show'))
  setTimeout(() => { el.classList.remove('show'); setTimeout(() => el.remove(), 250) }, 1600)
}

const waitLabel = computed(() => {
  const s = Math.max(0, Number(adWait.value) || 0)
  const m = Math.floor(s / 60)
  const ss = String(s % 60).padStart(2, '0')
  return `${m}:${ss}`
})

function startWaitCountdown (sec) {
  clearInterval(waitTimer)
  adWait.value = Math.max(0, Number(sec) || 0)
  if (!adWait.value) return
  waitTimer = setInterval(() => {
    adWait.value -= 1
    if (adWait.value <= 0) clearInterval(waitTimer)
  }, 1000)
}

/* ====== AdsGram SDK (Reward) ====== */
function loadSdkOnce () {
  const url = 'https://sad.adsgram.ai/js/sad.min.js'
  if ([...document.scripts].some(s => s.src === url)) { sdkReady.value = true; return Promise.resolve() }
  return new Promise((resolve, reject) => {
    const s = document.createElement('script')
    s.src = url
    s.async = true
    s.onload = () => { sdkReady.value = true; resolve() }
    s.onerror = (e) => { msg.value = 'Không tải được SDK Adsgram.'; reject(e) }
    document.head.appendChild(s)
  })
}

function bindRewardEvents () {
  if (!rewardEl.value) return
  // Khi người dùng xem xong quảng cáo (server sẽ cộng lượt qua Reward URL)
  rewardEl.value.addEventListener('reward', () => {
    toast('Đã nhận +1 lượt quay')
    setTimeout(loadStatus, 900)
    try { window.Telegram?.WebApp?.HapticFeedback?.notificationOccurred('success') } catch {}
  })
  rewardEl.value.addEventListener('onError', (e) => {
    msg.value = 'Không xem được quảng cáo, thử lại sau.'
    console.warn('Adsgram reward onError', e?.detail)
  })
  rewardEl.value.addEventListener('onTooLongSession', () => {
    msg.value = 'Phiên quá dài, đang làm mới quảng cáo…'
  })
}
function showAd () {
  if (!sdkReady.value || !rewardBlockId) return
  if (adWait.value > 0) return
  rewardEl.value?.show?.()
}

/* ====== API ====== */
async function loadStatus () {
  try {
    const r = await fetch('/api/wheel/status', { credentials: 'include' })
    if (!r.ok) throw new Error(await r.text())
    const j = await r.json()
    spins.value = Number(j.spins ?? 0)
    balance.value = Number(j.balance ?? 0)
    startWaitCountdown(Number(j.ad_wait ?? 0))
  } catch (e) {
    console.error(e)
    msg.value = 'Không tải được trạng thái vòng quay.'
  }
}

async function onStart () {
  if (spinning.value) return
  if (spins.value <= 0) {
    msg.value = 'Hết lượt quay. Xem quảng cáo để nhận thêm nhé!'
    return
  }
  spinning.value = true
  msg.value = ''

  try {
    const r = await fetch('/api/wheel/spin', { method: 'POST', credentials: 'include' })
    lastSpinResult = r.ok ? await r.json() : null

    let idx = 0
    if (lastSpinResult && typeof lastSpinResult.index !== 'undefined') {
      idx = Number(lastSpinResult.index) % prizes.length
    } else {
      // fallback (nếu backend chưa trả index)
      idx = Math.floor(Math.random() * prizes.length)
    }

    wheelRef.value?.play?.()
    setTimeout(() => wheelRef.value?.stop?.(idx), 1200)
  } catch (e) {
    console.error(e)
    spinning.value = false
    msg.value = 'Không quay được, thử lại nhé.'
  }
}

function onEnd (prize) {
  spinning.value = false

  if (lastSpinResult?.ok) {
    // backend đã trừ lượt & cộng HTW; dùng số liệu server trả về
    spins.value = Number(lastSpinResult.spins ?? Math.max(0, spins.value - 1))
    balance.value = Number(lastSpinResult.balance ?? balance.value)
    const add = Number(lastSpinResult.add ?? 0)
    if (add > 0) toast(`+${add} HTW`)
  } else {
    // fallback client – trừ 1 lượt
    spins.value = Math.max(0, spins.value - 1)
  }

  const t = prize?.fonts?.[0]?.text || '—'
  msg.value = `Kết quả: ${t}`
  try { window.Telegram?.WebApp?.HapticFeedback?.impactOccurred('light') } catch {}
}

/* ====== lifecycle ====== */
onMounted(async () => {
  await Promise.all([loadSdkOnce(), loadStatus()])
  bindRewardEvents()
})

onUnmounted(() => {
  clearInterval(waitTimer)
})
</script>

<template>
  <div class="page">
    <header class="topbar">
      <h1>Vòng quay may mắn</h1>
    </header>

    <main class="wrap">
      <section class="card wheel-card">
        <LuckyWheel
          ref="wheelRef"
          :width="320"
          :height="320"
          :blocks="blocks"
          :prizes="prizes"
          :buttons="buttons"
          @start="onStart"
          @end="onEnd"
        />

        <div class="stats">
          <div class="pill">Lượt quay: <b>{{ spins }}</b></div>
          <div class="pill">Số dư: <b>{{ balance.toLocaleString() }}</b> HTW</div>
        </div>

        <button
          class="ad-btn"
          :disabled="!sdkReady || !rewardBlockId || adWait>0"
          @click="showAd"
        >
          <i class="bi bi-play-circle"></i>
          <span>Xem quảng cáo</span>
          <small>+1 lượt</small>
        </button>
        <p class="mut" v-if="adWait>0">Chờ xem quảng cáo: <b>{{ waitLabel }}</b></p>

        <p v-if="msg" class="msg"><i class="bi bi-info-circle"></i> {{ msg }}</p>
      </section>

      <!-- web component AdsGram Reward (ẩn, gọi bằng .show()) -->
      <adsgram-reward
        v-if="sdkReady && rewardBlockId"
        ref="rewardEl"
        :data-block-id="rewardBlockId"
        data-debug="false"
        data-debug-console="false"
        style="display:none"
      />
      <p v-else-if="!rewardBlockId" class="warn">
        Thiếu <b>VITE_ADSGRAM_REWARD_ID</b> (đặt dạng <code>reward-XXXXX</code>).
      </p>
      <p v-else-if="!sdkReady" class="warn">Đang tải SDK Adsgram…</p>
    </main>

    <BottomNav/>
  </div>
</template>

<style scoped>
.page{
  --bg:#0b0f1a; --card:#101826; --mut:#9aa3b2; --ring:1px solid rgba(148,163,184,.14);
  background:var(--bg); color:#e5e7eb; min-height:100dvh;
}
.topbar{
  position: sticky; top: 0; z-index: 10;
  padding: 14px 16px;
  background: linear-gradient(180deg, rgba(11,15,26,.96), rgba(11,15,26,.7) 65%, transparent);
  backdrop-filter: blur(8px);
}
.topbar h1{margin:0; font:800 20px/1 ui-sans-serif,system-ui}
.wrap{padding:16px 16px calc(92px + env(safe-area-inset-bottom))}
.card{
  background:var(--card); border:var(--ring); border-radius:16px; padding:18px;
  box-shadow: 0 10px 30px rgba(2,8,23,.35)
}
.wheel-card{ display:grid; place-items:center; gap:12px }
.stats{display:flex; gap:8px; flex-wrap:wrap; justify-content:center}
.pill{
  background:#0e1525; border:1px solid #334155; color:#cbd5e1;
  padding:6px 10px; border-radius:999px; font-size:12px; font-weight:800;
}
.ad-btn{
  display:inline-flex; align-items:center; gap:8px;
  background:#2563eb; color:#fff; border:none; border-radius:12px;
  height:40px; padding:0 14px; font-weight:900; cursor:pointer;
  box-shadow:0 6px 16px rgba(37,99,235,.35);
}
.ad-btn:disabled{ opacity:.55; cursor:not-allowed }
.ad-btn small{ font-weight:700; opacity:.9 }
.mut{margin:4px 0 0; color:var(--mut); font-size:12px}
.msg{
  margin-top:6px; padding:8px 10px; background:#1e293b; border-radius:10px; font-size:12px;
  display:inline-flex; gap:6px; align-items:center
}
.warn{margin-top:10px; color:#fbbf24; font-size:12px}

/* toast */
:global(.toast){
  position: fixed; top: calc(64px + env(safe-area-inset-top)); left: 50%;
  transform: translateX(-50%) translateY(-10px);
  background: linear-gradient(135deg,#22c55e,#10b981); color:#0b0f1a;
  padding: 10px 14px; border-radius: 12px; font-weight: 800; font-size: 13px;
  box-shadow: 0 10px 30px rgba(16,185,129,.35); opacity: 0; z-index: 1000; transition: transform .2s, opacity .2s
}
:global(.toast.show){ opacity:1; transform: translateX(-50%) translateY(0) }
</style>
