<!-- src/pages/Wheel.vue -->
<script setup>
import { ref, onMounted, onUnmounted, computed } from 'vue'
import BottomNav from '../components/BottomNav.vue'
import { LuckyWheel } from '@lucky-canvas/vue'

/* ====== STATE ====== */
const wheelRef = ref(null)

const state = ref({
  cooldown: 1200,      // 20 phút mặc định (server có thể trả khác)
  remaining: 0,       // giây còn lại để xem ad/quay
  htw_balance: 0,     // số dư
})
const busy = ref(false)
const loading = ref(true)
const msg = ref('')
const spinning = ref(false)
const claimInProgress = ref(false)
const pendingToast = ref('') // sẽ hiển thị khi vòng quay dừng

let timerId = null

/* ====== ADSGRAM REWARD ====== */
const REWARD_SDK_URL = 'https://sad.adsgram.ai/js/sad.min.js'
const rewardBlockId = String(import.meta.env.VITE_ADSGRAM_WHEEL_REWARD_BLOCK_ID || '')
const loadingRewardSdk = ref(false)

function loadRewardSdk () {
  if ([...document.scripts].some(s => s.src === REWARD_SDK_URL)) return Promise.resolve()
  loadingRewardSdk.value = true
  return new Promise((resolve, reject) => {
    const s = document.createElement('script')
    s.src = REWARD_SDK_URL
    s.async = true
    s.onload = () => { loadingRewardSdk.value = false; resolve() }
    s.onerror = (e) => { loadingRewardSdk.value = false; reject(e) }
    document.head.appendChild(s)
  })
}

// “Giống mining”: luôn buộc xem Reward trước khi quay
async function showRewardAd () {
  if (!rewardBlockId) throw new Error('Thiếu VITE_ADSGRAM_WHEEL_REWARD_BLOCK_ID')
  await loadRewardSdk()
  const ctrl = window.Adsgram?.init?.({ blockId: String(rewardBlockId) })
  if (!ctrl) throw new Error('Không khởi tạo được Adsgram Reward')
  await ctrl.show() // resolve khi người dùng đã xem xong
}

/* ====== WHEEL UI ====== */
const blocks = [{ padding: '12px', background: '#0f172a' }]
const prizes = [
  { background: '#0ea5e9', fonts: [{ text: '+1 HTW',  top: '18px' }] },
  { background: '#f59e0b', fonts: [{ text: '+2 HTW',  top: '18px' }] },
  { background: '#10b981', fonts: [{ text: '+3 HTW',  top: '18px' }] },
  { background: '#8b5cf6', fonts: [{ text: '+4 HTW',  top: '18px' }] },
  { background: '#ef4444', fonts: [{ text: 'Hụt 😅',  top: '18px' }] },
  { background: '#22c55e', fonts: [{ text: '+5 HTW', top: '18px' }] },
]
const buttons = [
  { radius: '40px', background: '#2563eb', pointer: true, fonts: [{ text: 'SPIN', top: '-18px' }] }
]

/* ====== API ====== */
async function loadStatus () {
  loading.value = true
  msg.value = ''
  try {
    const r = await fetch('/api/wheel', { credentials: 'include' })
    if (!r.ok) throw new Error(await r.text())
    const data = await r.json()
    state.value.cooldown    = Number(data.cooldown ?? state.value.cooldown)
    state.value.remaining   = Number(data.remaining ?? 0)
    state.value.htw_balance = Number(data.htw_balance ?? 0)
    if (state.value.remaining > 0) startTicker()
  } catch (e) {
    console.error(e)
    msg.value = 'Không tải được trạng thái vòng quay.'
  } finally {
    loading.value = false
  }
}

/* ====== AUTO-SPIN SAU KHI XEM AD (không dùng vé) ====== */
const MIN_SPIN_MS = 1000

async function spin () {
  if (!canSpin.value || claimInProgress.value) return
  claimInProgress.value = true
  busy.value = true
  msg.value = ''
  pendingToast.value = ''

  try {
    // 1) Buộc xem quảng cáo trước
    await showRewardAd()

    // 2) Bắt đầu quay ngay để mượt
    spinning.value = true
    wheelRef.value?.play?.()

    // 3) Song song gọi server quyết định kết quả + cộng HTW
    const [_, server] = await Promise.all([
      new Promise(res => setTimeout(res, MIN_SPIN_MS)), // đảm bảo quay tối thiểu
      fetch('/api/wheel/spin', { method: 'POST', credentials: 'include' })
        .then(async r => ({ ok: r.ok, data: await r.json().catch(()=>({})) }))
        .catch(() => ({ ok: false, data: null }))
    ])

    if (!server?.ok || server.data?.ok !== true) {
      // thất bại/cooldown: dừng quay và hiển thị thông báo
      wheelRef.value?.stop?.(0) // dừng lại (UI), không cộng thưởng
      const remain = Number(server?.data?.remaining ?? state.value.cooldown)
      state.value.remaining = remain
      startTicker()
      msg.value = server?.data?.ok === false ? 'Chưa hết thời gian chờ.' : 'Quay thất bại.'
      return
    }

    // an toàn & không làm lệch
const idxRaw = Number(server.data.index)
const idx = (Number.isFinite(idxRaw) && idxRaw >= 0 && idxRaw < prizes.length) ? idxRaw : 0
wheelRef.value?.stop?.(idx)


    // cập nhật số dư + cooldown (nếu có)
    state.value.htw_balance = Number(server.data.htw_balance ?? state.value.htw_balance)
    state.value.remaining   = Number(server.data.remaining ?? state.value.cooldown)
    startTicker()

    // chuẩn bị thông điệp để hiển thị KHI vòng quay dừng (@end)
    const add = Number(server.data.add ?? 0)
    pendingToast.value = add > 0 ? `+${add} HTW 🎉` : 'Hụt rồi, hẹn lần sau!'
  } catch (e) {
    console.error(e)
    spinning.value = false
    msg.value = e?.message || 'Quay thất bại, thử lại sau.'
  } finally {
    busy.value = false
    // mở khóa tránh spam
    setTimeout(() => { claimInProgress.value = false }, 1200)
  }
}

/* ====== xử lý khi vòng quay dừng ====== */
function onEnd (prize) {
  spinning.value = false

  if (pendingToast.value) {
    toast(pendingToast.value)
    try {
      const type = pendingToast.value.includes('+') ? 'success' : 'warning'
      window.Telegram?.WebApp?.HapticFeedback?.notificationOccurred(type)
    } catch {}
    pendingToast.value = ''
    return
  }

  // fallback nếu không có pendingToast
  const t = prize?.fonts?.[0]?.text || ''
  toast(t.includes('HTW') ? `Nhận ${t} 🎉` : 'Hụt rồi, hẹn lần sau!')
}

/* ====== countdown giống mining ====== */
function startTicker () {
  stopTicker()
  timerId = setInterval(() => {
    if (state.value.remaining > 0) {
      state.value.remaining--
    } else {
      stopTicker()
    }
  }, 1000)
}
function stopTicker () {
  if (timerId) { clearInterval(timerId); timerId = null }
}
const canSpin = computed(() =>
  !busy.value && !spinning.value && !claimInProgress.value && state.value.remaining <= 0 && !loading.value
)
function fmtTime (sec) {
  const m = String(Math.floor(sec / 60)).padStart(2, '0')
  const s = String(Math.floor(sec % 60)).padStart(2, '0')
  return `${m}:${s}`
}

/* ====== toast ====== */
function toast (t) {
  const el = document.createElement('div')
  el.className = 'toast'
  el.textContent = t
  document.body.appendChild(el)
  requestAnimationFrame(() => el.classList.add('show'))
  setTimeout(() => { el.classList.remove('show'); setTimeout(() => el.remove(), 250) }, 1600)
}

/* ====== LIFECYCLE ====== */
onMounted(loadStatus)
onUnmounted(stopTicker)
</script>

<template>
  <div class="page">
    <header class="topbar"><h1>Vòng quay may mắn</h1></header>

    <main class="wrap">
      <!-- Số dư -->
      <section class="card hero">
        <div class="hero-ic"><i class="bi bi-bullseye"></i></div>
        <div class="hero-t">
          <div class="label">Số dư HTW</div>
          <div class="amount">{{ state.htw_balance.toLocaleString() }} <span>HTW</span></div>
        </div>
      </section>

      <section class="card wheel">
        <LuckyWheel
          ref="wheelRef"
          :width="320"
          :height="320"
          :blocks="blocks"
          :prizes="prizes"
          :buttons="buttons"
          @end="onEnd"
        />

        <div class="cooldown" v-if="state.remaining > 0">
          <i class="bi bi-hourglass-split"></i>
          Còn lại: <b>{{ fmtTime(state.remaining) }}</b>
        </div>

        <button
          class="btn"
          :disabled="!canSpin || loading || loadingRewardSdk"
          @click="spin"
        >
          <i v-if="busy || loading || loadingRewardSdk" class="bi bi-arrow-repeat spin"></i>
          <i v-else class="bi bi-play-circle"></i>
          <span>{{ state.remaining > 0 ? 'Chưa thể quay' : 'Quay ngay' }}</span>
        </button>

        <p v-if="!rewardBlockId" class="note warn">
          ⚠️ Thiếu <b>VITE_ADSGRAM_WHEEL_REWARD_BLOCK_ID</b> nên không thể hiển thị quảng cáo Reward.
        </p>
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
  box-shadow:0 10px 30px rgba(2,8,23,.35)
}
.card.center{display:grid;place-items:center;gap:10px;padding:28px}
.big{font-size:38px}

/* hero */
.hero{display:flex; gap:12px; align-items:center}
.hero-ic{
  width:44px;height:44px;border-radius:12px;
  background:linear-gradient(145deg,#06b6d4,#2563eb);
  display:grid;place-items:center
}
.hero-t .label{font-size:12px;color:var(--mut)}
.hero-t .amount{font:800 22px/1.1 ui-sans-serif,system-ui}
.hero-t .amount span{font:700 12px; opacity:.85; margin-left:6px}

/* wheel */
.wheel{display:grid;place-items:center;gap:12px}
.cooldown{display:flex;align-items:center;gap:8px;color:#9fb2d0;margin:6px 0 2px}

/* button */
.btn{
  width:100%; padding:14px; border-radius:14px; border:none; color:#0b0f1a; font-weight:900;
  background:linear-gradient(145deg,#fde68a,#60a5fa);
  display:flex; align-items:center; justify-content:center; gap:8px;
  transition: opacity .2s;
}
.btn:disabled{opacity:.5; cursor:not-allowed;}
.btn:not(:disabled):active{opacity:.85}

.note{
  margin-top:10px; padding:10px 12px; border-radius:10px;
  background:#0e1525; color:#cbd5e1; font-size:13px;
}
.note.warn{background:#422006; color:#fed7aa; border:1px solid #92400e}

.spin{animation:spin 1s linear infinite}
@keyframes spin{to{transform:rotate(360deg)}}

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
