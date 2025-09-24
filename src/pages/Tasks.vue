<script setup>
import { ref, onMounted } from 'vue'
import BottomNav from '../components/BottomNav.vue'

/** ========= ENV =========
 * Task block:           VITE_ADSGRAM_BLOCK_ID=15248  hoặc task-15248
 * Interstitial block:   VITE_ADSGRAM_BLOCK_ID=int-12345
 */
const rawId = String(import.meta.env.VITE_ADSGRAM_BLOCK_ID ?? '').trim()
const rewardUi = Number(import.meta.env.VITE_ADSGRAM_REWARD_HTW ?? 1) // chỉ hiển thị

// nhận biết loại block
const isInt = /^int-\d+$/i.test(rawId)
const blockIdTask = /^task-\d+$/i.test(rawId)
  ? rawId
  : (/^\d+$/.test(rawId) ? `task-${rawId}` : '')
const blockIdInt = isInt ? rawId : ''

// SDK URL
const TASK_SDK_CANDIDATES = [
  'https://js.adsgram.ai/adsgram-task.min.js',
  'https://js.adsgram.ai/adsgram.min.js'
]
const INT_SDK_URL = 'https://sad.adsgram.ai/js/sad.min.js'

const sdkLoading  = ref(false)
const rewarding   = ref(false)
const prof        = ref(null)
const msg         = ref('')

async function loadProfile () {
  try {
    const r = await fetch('/api/profile', { credentials: 'include' })
    if (r.ok) prof.value = await r.json()
  } catch (e) { console.error(e) }
}

function toast(t) {
  const el = document.createElement('div')
  el.className = 'toast'
  el.textContent = t
  document.body.appendChild(el)
  requestAnimationFrame(() => el.classList.add('show'))
  setTimeout(() => { el.classList.remove('show'); setTimeout(() => el.remove(), 250) }, 1600)
}

function loadSdkOnce (url) {
  if ([...document.scripts].some(s => s.src === url)) return Promise.resolve()
  sdkLoading.value = true
  return new Promise((resolve, reject) => {
    const s = document.createElement('script')
    s.src = url
    s.async = true
    s.onload = () => { sdkLoading.value = false; resolve() }
    s.onerror = (e) => { sdkLoading.value = false; reject(e) }
    document.head.appendChild(s)
  })
}

async function loadTaskSdk () {
  let lastErr = null
  for (const url of TASK_SDK_CANDIDATES) {
    try {
      await loadSdkOnce(url)
      if (window.AdsgramTask || window.Adsgram?.Task) return
    } catch (e) { lastErr = e }
  }
  throw new Error('Không tìm thấy SDK Task (đã thử: ' + TASK_SDK_CANDIDATES.join(', ') + ').')
}

async function showAd () {
  msg.value = ''
  try {
    if (blockIdInt) {
      // Interstitial
      await loadSdkOnce(INT_SDK_URL)
      if (!window.Adsgram?.init) throw new Error('Không tìm thấy SDK Interstitial (sad.min.js).')
      rewarding.value = true
      const ctrl = window.Adsgram.init({ blockId: blockIdInt }) // ví dụ: int-12345
      await ctrl.show()
    } else if (blockIdTask) {
      // Task
      await loadTaskSdk()
      const api = window.AdsgramTask || window.Adsgram?.Task
      if (!api?.show) throw new Error('SDK Task đã tải nhưng không có API `show`.')
      rewarding.value = true
      await api.show({ blockId: blockIdTask }) // đảm bảo dạng task-XXXXX
    } else {
      throw new Error('Thiếu/sai VITE_ADSGRAM_BLOCK_ID. Task: 15248 / task-15248. Interstitial: int-XXXXX.')
    }

    // Xem xong → thưởng thật ở server
    const r = await fetch('/api/tasks/adsgram-reward', { method: 'POST', credentials: 'include' })
    if (!r.ok) throw new Error(await r.text())
    await loadProfile()
    toast(`+${rewardUi} HTW`)
    try { window.Telegram?.WebApp?.HapticFeedback?.notificationOccurred('success') } catch {}
  } catch (e) {
    console.error(e)
    msg.value = e?.message || 'Không hiển thị được quảng cáo'
  } finally {
    rewarding.value = false
  }
}

onMounted(loadProfile)
</script>

<template>
  <div class="page">
    <header class="topbar">
      <h1>Nhiệm vụ</h1>
      <span class="spacer"></span>
    </header>

    <main class="wrap">
      <section class="card hero" v-if="prof">
        <div class="hero-ic"><i class="bi bi-wallet2"></i></div>
        <div class="hero-t">
          <div class="lbl">Số dư hiện tại</div>
          <div class="amt">{{ (prof.htw_balance ?? 0).toLocaleString() }} <span>HTW</span></div>
        </div>
      </section>

      <section class="card">
        <div class="title"><i class="bi bi-badge-ad"></i> Xem quảng cáo Adsgram</div>
        <p class="mut">
          Mỗi lần xem thưởng <b>{{ rewardUi }}</b> HTW.
          (Có giới hạn thời gian giữa các lượt để chống spam)
        </p>

        <button class="btn" :disabled="rewarding || sdkLoading || !(blockIdTask || blockIdInt)" @click="showAd">
          <i v-if="rewarding" class="bi bi-hourglass-split spin"></i>
          <i v-else class="bi bi-play-circle"></i>
          <span>{{ rewarding ? 'Đang thưởng...' : 'Xem quảng cáo' }}</span>
        </button>

        <p v-if="!(blockIdTask || blockIdInt)" class="warn">
          Thiếu <b>VITE_ADSGRAM_BLOCK_ID</b> (Task: <code>15248</code> / <code>task-15248</code>;
          Interstitial: <code>int-XXXXX</code>).
        </p>
        <p v-if="msg" class="note err"><i class="bi bi-exclamation-circle"></i> {{ msg }}</p>
      </section>

      <section class="card tip">
        <div class="title"><i class="bi bi-info-circle"></i> Lưu ý</div>
        <ul>
          <li>Nếu ad không hiện, kiểm tra “Block type” trong Adsgram (Task hay Interstitial).</li>
          <li>Nếu là <b>Task</b>, bạn có thể đặt ENV là <code>15248</code> hoặc <code>task-15248</code>.</li>
          <li>Nếu là <b>Interstitial</b>, đặt ENV là <code>int-XXXXX</code>.</li>
        </ul>
      </section>
    </main>
  </div>

  <BottomNav/>
</template>

<style scoped>
.page{
  --bg:#0b0f1a; --card:#101826; --mut:#9aa3b2; --ring:1px solid rgba(148,163,184,.14);
  background:var(--bg); color:#e5e7eb; width:100dvw; min-height:100dvh;
}
.topbar{
  position: sticky; top: 0; z-index: 10;
  padding-block: calc(10px + env(safe-area-inset-top)) 10px;
  padding-left: max(16px, env(safe-area-inset-left));
  padding-right: max(16px, env(safe-area-inset-right));
  display: flex; align-items: center; gap: 10px;
  background: linear-gradient(180deg, rgba(11,15,26,.96), rgba(11,15,26,.7) 65%, transparent);
  backdrop-filter: blur(8px);
}
.topbar h1{margin:0; font:800 20px/1 ui-sans-serif,system-ui}
.spacer{flex:1}

.wrap{
  width:100%;
  padding-top:12px;
  padding-bottom:calc(20px + env(safe-area-inset-bottom));
  padding-left:max(16px, env(safe-area-inset-left));
  padding-right:max(16px, env(safe-area-inset-right));
  display:grid; gap:14px;
}

.card{
  width:100%; margin-inline:0; overflow:hidden;
  background:#0f172a; border:var(--ring); border-radius:14px; padding:16px;
  box-shadow:0 10px 30px rgba(2,8,23,.35);
}
.title{display:flex; align-items:center; gap:8px; font-weight:800; margin-bottom:8px}
.mut{color:var(--mut); font-size:13px; margin:0 0 12px}

.hero{display:flex; gap:12px; align-items:center}
.hero-ic{width:44px;height:44px;border-radius:12px;display:grid;place-items:center;
  background:linear-gradient(145deg,#22d3ee,#6366f1); color:#fff}
.lbl{color:#9aa3b2; font-size:12px}
.amt{font:800 22px/1.1 ui-sans-serif,system-ui}
.amt span{font:700 12px; opacity:.85; margin-left:6px}

.btn{
  width:100%; padding:14px; border-radius:14px; border:none; color:#0b0f1a; font-weight:900;
  background:linear-gradient(145deg,#fde68a,#60a5fa);
  display:flex; align-items:center; justify-content:center; gap:8px;
}
.btn:disabled{opacity:.5}
.spin{animation:spin 1s linear infinite} @keyframes spin{to{transform:rotate(360deg)}}
.warn{margin-top:10px; color:#fbbf24; font-size:12px}
.tip ul{margin:6px 0 0 18px; padding:0}
.tip li{margin:6px 0; color:#9aa3b2; font-size:13px}

:global(.toast){
  position: fixed; top: calc(64px + env(safe-area-inset-top)); left: 50%;
  transform: translateX(-50%) translateY(-10px);
  background: linear-gradient(135deg,#22c55e,#10b981); color:#0b0f1a;
  padding: 10px 14px; border-radius: 12px; font-weight: 800; font-size: 13px;
  box-shadow: 0 10px 30px rgba(16,185,129,.35);
  opacity: 0; z-index: 1000; transition: transform .2s ease, opacity .2s ease;
}
:global(.toast.show){ opacity: 1; transform: translateX(-50%) translateY(0) }
</style>
