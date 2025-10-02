<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import BottomNav from '../components/BottomNav.vue'

/** BlockId phải là dạng task-xxx (xxx là số) */
const raw = String(import.meta.env.VITE_ADSGRAM_BLOCK_ID ?? '').trim()
const blockId = /^task-\d+$/i.test(raw) ? raw : (/^\d+$/.test(raw) ? `task-${raw}` : '')
const rewardUi = 10

const prof = ref(null)
const sdkReady = ref(false)
const msg = ref('')

const ag = ref(null)
const taskKey = ref(0)      // ép remount sau cooldown

// chống double-fire
let inFlight = false
let justCreditedAt = 0
let cdTimer = null

async function loadProfile () {
  try {
    const r = await fetch('/api/profile', { credentials: 'include' })
    if (r.ok) prof.value = await r.json()
  } catch (e) { console.error(e) }
}

/** nạp SDK đúng như docs */
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

function toast(t) {
  const el = document.createElement('div')
  el.className = 'toast'
  el.textContent = t
  document.body.appendChild(el)
  requestAnimationFrame(() => el.classList.add('show'))
  setTimeout(() => { el.classList.remove('show'); setTimeout(() => el.remove(), 250) }, 1600)
}

function startCooldown (sec) {
  clearInterval(cdTimer)
  let left = Math.max(0, Number(sec) || 0)
  if (!left) { msg.value = ''; return }
  msg.value = `Bạn vừa nhận rồi, đợi ${left}s nữa nhé.`
  cdTimer = setInterval(() => {
    left -= 1
    if (left <= 0) {
      clearInterval(cdTimer)
      msg.value = ''
      taskKey.value++        // remount để quay về nút go
    } else {
      msg.value = `Bạn vừa nhận rồi, đợi ${left}s nữa nhé.`
    }
  }, 1000)
}

/** đăng ký event đúng như docs (reward / onError / onEnterNotFound / onTooLongSession) */
function bindEvents () {
  if (!ag.value) return

  // Fired when user completed the task
  ag.value.addEventListener('reward', async () => {
    console.log('🎯 Event reward fired!', { inFlight, justCreditedAt })
    if (inFlight) { 
    console.warn('⚠️ Duplicate reward event blocked')
    return 
    }
    inFlight = true
    try {
      const r = await fetch('/api/tasks/adsgram-reward', { method: 'POST', credentials: 'include' })

      if (!r.ok) {
        // Adsgram đôi khi bắn 2 lần; nếu vừa thành công thì bỏ qua 429 kế tiếp
        if (r.status === 429 && Date.now() - justCreditedAt < 1500) return

        if (r.status === 429) {
  let wait = 45
  try {
    const text = await r.text()
    const json = JSON.parse(text)
    wait = Number(json?.wait ?? wait)
  } catch {}
  startCooldown(wait)
  return
}
        throw new Error(await r.text())
      }

      await r.json().catch(()=>null)
      clearInterval(cdTimer)
      msg.value = ''
      justCreditedAt = Date.now()
      await loadProfile()
      toast(`+${rewardUi} HTW`)
      try { window.Telegram?.WebApp?.HapticFeedback?.notificationOccurred('success') } catch {}
    } catch (e) {
      msg.value = 'Không cộng thưởng: ' + (e?.message || 'Lỗi máy chủ')
    } finally {
      setTimeout(() => { inFlight = false }, 800)
    }
  })

  // Error while loading/rendering the block
  ag.value.addEventListener('onError', (ev) => {
    msg.value = 'Không tải được block Adsgram.'
    console.warn('Adsgram onError', ev?.detail)
  })

  // No banner/ad available for this block
  ag.value.addEventListener('onEnterNotFound', (ev) => {
    msg.value = 'Không tìm thấy banner cho block này, thử lại sau.'
    console.warn('Adsgram onEnterNotFound', ev?.detail)
  })

  // Session too long – theo docs: yêu cầu restart app/refresh
  ag.value.addEventListener('onTooLongSession', () => {
    msg.value = 'Phiên làm nhiệm vụ quá dài, vui lòng mở lại trang.'
    // Có thể tự refresh nhanh:
    setTimeout(() => { taskKey.value++ }, 1200)
  })
}

onMounted(async () => {
  await Promise.all([loadProfile(), loadSdkOnce()])
  bindEvents()
})

onUnmounted(() => {
  clearInterval(cdTimer)
})
</script>

<template>
  <div class="page">
    <header class="topbar">
      <h1>Nhiệm vụ</h1>
      <span class="spacer"></span>
    </header>

    <main class="wrap">
      <section class="card">
        <div class="title"><i class="bi bi-badge-ad"></i> Xem quảng cáo</div>
        <p class="mut">Mỗi lần xem thưởng <b>{{ rewardUi }}</b> HTW.</p>

        <!-- ĐÚNG luật Vue: v-if ở wrapper, else-if/else liền kề -->
        <div v-if="sdkReady && blockId" :key="taskKey">
          <adsgram-task
            ref="ag"
            class="ag"
            :data-block-id="blockId"
            data-debug="false"
            data-debug-console="false"
          >
            <button slot="button" class="ag-go">go</button>
            <div slot="reward" class="ag-reward"><i class="bi bi-coin"></i><span>reward</span></div>
            <button slot="claim" class="ag-claim">claim</button>
            <div slot="done" class="ag-done"><i class="bi bi-check2-circle"></i> done</div>
          </adsgram-task>
        </div>

        <p v-else-if="!blockId" class="warn">
          Thiếu <b>VITE_ADSGRAM_BLOCK_ID</b> (đặt <code>task-XXXXX</code>, Block type: <b>Task</b>).
        </p>
        <p v-else class="warn">Đang tải SDK Adsgram…</p>

        <p v-if="msg" class="note err"><i class="bi bi-exclamation-circle"></i> {{ msg }}</p>
      </section>
    </main>

    <BottomNav/>
  </div>
</template>

<style scoped>
/* ===== layout chung ===== */
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
.wrap{ width:100%; padding-top:12px; padding-bottom:calc(20px + env(safe-area-inset-bottom)); padding-left:max(16px, env(safe-area-inset-left)); padding-right:max(16px, env(safe-area-inset-right)); display:grid; gap:14px }
.card{ background:#0f172a; border:var(--ring); border-radius:14px; padding:16px; box-shadow:0 10px 30px rgba(2,8,23,.35) }
.title{display:flex; align-items:center; gap:8px; font-weight:800; margin-bottom:8px}
.mut{color:var(--mut); font-size:13px; margin:0 0 12px}

/* ===== CSS variables đúng như docs ===== */
.ag{
  --adsgram-task-font-size: 14px;
  --adsgram-task-icon-size: 36px;
  --adsgram-task-title-gap: 10px;
  --adsgram-task-icon-border-radius: 12px;
  --adsgram-task-button-width: 72px;
}
.ag-go{
  width:var(--adsgram-task-button-width); height:36px;
  border:none; border-radius:10px; font-weight:900; text-transform:lowercase;
  background:#2563eb; color:#fff; box-shadow: 0 6px 16px rgba(37,99,235,.35);
}
.ag-reward{
  margin-top:8px; display:inline-flex; gap:6px; align-items:center;
  padding:6px 10px; border-radius:999px; background:#0e1525; border:1px solid #334155;
  color:#cbd5e1; font-weight:800; font-size:12px;
}
.ag-claim{
  margin-top:10px; width:var(--adsgram-task-button-width); height:36px;
  border:none; border-radius:10px; background:#f59e0b; color:#0b0f1a; font-weight:900;
  box-shadow: 0 6px 16px rgba(245,158,11,.35);
}
.ag-done{
  margin-top:10px; display:inline-flex; gap:6px; align-items:center;
  padding:6px 12px; border-radius:999px; background:#16a34a22; border:1px solid #16a34a66; color:#22c55e; font-weight:900;
}

/* toast */
.warn{margin-top:8px; color:#fbbf24; font-size:12px}
:global(.toast){
  position: fixed; top: calc(64px + env(safe-area-inset-top)); left: 50%;
  transform: translateX(-50%) translateY(-10px);
  background: linear-gradient(135deg,#22c55e,#10b981); color:#0b0f1a;
  padding: 10px 14px; border-radius: 12px; font-weight: 800; font-size: 13px;
  box-shadow: 0 10px 30px rgba(16,185,129,.35); opacity: 0; z-index: 1000; transition: transform .2s, opacity .2s
}
:global(.toast.show){ opacity:1; transform: translateX(-50%) translateY(0) }
</style>
