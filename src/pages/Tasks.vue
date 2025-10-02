<script setup>
import { ref, onMounted, onUnmounted, onActivated } from 'vue'
import BottomNav from '../components/BottomNav.vue'

/** BlockId phải là dạng task-xxx */
const raw = String(import.meta.env.VITE_ADSGRAM_BLOCK_ID ?? '').trim()
const blockId = /^task-\d+$/i.test(raw) ? raw : (/^\d+$/.test(raw) ? `task-${raw}` : '')
const rewardUi = 10

const prof = ref(null)
const sdkReady = ref(false)
const msg = ref('')
const ag = ref(null)
const taskKey = ref(0)

// Chống spam MẠNH HƠN
let processingReward = false
let lastRewardTime = 0
const MIN_INTERVAL_MS = 2000 // Tối thiểu 2s giữa các lần claim

let cdTimer = null

async function loadProfile() {
  try {
    const r = await fetch('/api/profile', { credentials: 'include' })
    if (r.ok) prof.value = await r.json()
  } catch (e) { 
    console.error('Load profile error:', e) 
  }
}

function loadSdkOnce() {
  const url = 'https://sad.adsgram.ai/js/sad.min.js'
  if ([...document.scripts].some(s => s.src === url)) { 
    sdkReady.value = true
    return Promise.resolve() 
  }
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
  setTimeout(() => { 
    el.classList.remove('show')
    setTimeout(() => el.remove(), 250) 
  }, 1600)
}

function startCooldown(sec) {
  clearInterval(cdTimer)
  let left = Math.max(0, Number(sec) || 0)
  if (!left) { msg.value = ''; return }
  
  msg.value = `Đợi ${left}s nữa nhé`
  cdTimer = setInterval(() => {
    left -= 1
    if (left <= 0) {
      clearInterval(cdTimer)
      msg.value = ''
      taskKey.value++ // Remount component
    } else {
      msg.value = `Đợi ${left}s nữa nhé`
    }
  }, 1000)
}

function bindEvents() {
  if (!ag.value) return

  ag.value.addEventListener('reward', async () => {
    const now = Date.now()
    
    // CHẶN 1: Đang xử lý reward khác
    if (processingReward) {
      console.warn('⚠️ Already processing reward, ignoring duplicate event')
      return
    }
    
    // CHẶN 2: Quá gần với lần claim trước (< 2s)
    if (now - lastRewardTime < MIN_INTERVAL_MS) {
      console.warn('⚠️ Too soon since last reward:', now - lastRewardTime, 'ms')
      return
    }
    
    processingReward = true
    lastRewardTime = now
    
    console.log('🎯 Processing reward at', new Date().toISOString())
    
    try {
      const r = await fetch('/api/tasks/adsgram-reward', { 
        method: 'POST', 
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' }
      })

      console.log('📡 API response status:', r.status)

      if (!r.ok) {
        if (r.status === 429) {
          let wait = 45
          try {
            const ct = r.headers.get('content-type') || ''
            if (ct.includes('application/json')) {
              const j = await r.json()
              wait = Number(j?.wait ?? wait)
            } else {
              const t = await r.text()
              const m = t.match(/"wait"\s*:\s*(\d+)/)
              if (m) wait = Number(m[1])
            }
          } catch {}
          startCooldown(wait)
          return
        }
        
        const errText = await r.text()
        console.error('❌ API error:', errText)
        throw new Error(errText)
      }

      const result = await r.json()
      console.log('✅ Reward success:', result)
      
      clearInterval(cdTimer)
      msg.value = ''
      
      await loadProfile()
      toast(`+${rewardUi} HTW`)
      
      try { 
        window.Telegram?.WebApp?.HapticFeedback?.notificationOccurred('success') 
      } catch {}
      
      // Reset component sau 1.5s
      setTimeout(() => {
        taskKey.value++
      }, 1500)
      
    } catch (e) {
      console.error('💥 Reward error:', e)
      msg.value = 'Lỗi: ' + (e?.message || 'Không xử lý được')
    } finally {
      // Delay để chắc chắn không có request nào khác leak qua
      setTimeout(() => {
        processingReward = false
      }, 1000)
    }
  })

  ag.value.addEventListener('onError', (ev) => {
    msg.value = 'Không tải được quảng cáo'
    console.warn('Adsgram onError', ev?.detail)
  })

  ag.value.addEventListener('onEnterNotFound', (ev) => {
    msg.value = 'Không có quảng cáo, thử lại sau'
    console.warn('Adsgram onEnterNotFound', ev?.detail)
  })

  ag.value.addEventListener('onTooLongSession', () => {
    msg.value = 'Phiên quá dài, đang làm mới...'
    setTimeout(() => { taskKey.value++ }, 1200)
  })
}

// QUAN TRỌNG: Reset component khi vào lại trang
onActivated(() => {
  console.log('🔄 Page activated, resetting component')
  taskKey.value++
  processingReward = false
  msg.value = ''
  clearInterval(cdTimer)
})

onMounted(async () => {
  await Promise.all([loadProfile(), loadSdkOnce()])
  bindEvents()
})

onUnmounted(() => {
  clearInterval(cdTimer)
  processingReward = false
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
          Thiếu <b>VITE_ADSGRAM_BLOCK_ID</b> (đặt <code>task-XXXXX</code>).
        </p>
        <p v-else class="warn">Đang tải SDK...</p>

        <p v-if="msg" class="note err"><i class="bi bi-exclamation-circle"></i> {{ msg }}</p>
      </section>
    </main>

    <BottomNav/>
  </div>
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
  display:grid; 
  gap:14px 
}
.card{ 
  background:#0f172a; 
  border:var(--ring); 
  border-radius:14px; 
  padding:16px; 
  box-shadow:0 10px 30px rgba(2,8,23,.35) 
}
.title{
  display:flex; 
  align-items:center; 
  gap:8px; 
  font-weight:800; 
  margin-bottom:8px
}
.mut{
  color:var(--mut); 
  font-size:13px; 
  margin:0 0 12px
}

.ag{
  --adsgram-task-font-size: 14px;
  --adsgram-task-icon-size: 36px;
  --adsgram-task-title-gap: 10px;
  --adsgram-task-icon-border-radius: 12px;
  --adsgram-task-button-width: 72px;
}
.ag-go{
  width:var(--adsgram-task-button-width); 
  height:36px;
  border:none; 
  border-radius:10px; 
  font-weight:900; 
  text-transform:lowercase;
  background:#2563eb; 
  color:#fff; 
  box-shadow: 0 6px 16px rgba(37,99,235,.35);
  cursor: pointer;
}
.ag-reward{
  margin-top:8px; 
  display:inline-flex; 
  gap:6px; 
  align-items:center;
  padding:6px 10px; 
  border-radius:999px; 
  background:#0e1525; 
  border:1px solid #334155;
  color:#cbd5e1; 
  font-weight:800; 
  font-size:12px;
}
.ag-claim{
  margin-top:10px; 
  width:var(--adsgram-task-button-width); 
  height:36px;
  border:none; 
  border-radius:10px; 
  background:#f59e0b; 
  color:#0b0f1a; 
  font-weight:900;
  box-shadow: 0 6px 16px rgba(245,158,11,.35);
  cursor: pointer;
}
.ag-done{
  margin-top:10px; 
  display:inline-flex; 
  gap:6px; 
  align-items:center;
  padding:6px 12px; 
  border-radius:999px; 
  background:#16a34a22; 
  border:1px solid #16a34a66; 
  color:#22c55e; 
  font-weight:900;
}

.warn{
  margin-top:8px; 
  color:#fbbf24; 
  font-size:12px
}
.note{
  margin-top:12px; 
  padding:10px; 
  background:#1e293b; 
  border-radius:8px; 
  font-size:12px;
  display:flex; 
  gap:6px; 
  align-items:center;
}
.err{
  color:#fca5a5; 
  background:#450a0a;
}

:global(.toast){
  position: fixed; 
  top: calc(64px + env(safe-area-inset-top)); 
  left: 50%;
  transform: translateX(-50%) translateY(-10px);
  background: linear-gradient(135deg,#22c55e,#10b981); 
  color:#0b0f1a;
  padding: 10px 14px; 
  border-radius: 12px; 
  font-weight: 800; 
  font-size: 13px;
  box-shadow: 0 10px 30px rgba(16,185,129,.35); 
  opacity: 0; 
  z-index: 1000; 
  transition: transform .2s, opacity .2s;
  pointer-events: none;
}
:global(.toast.show){ 
  opacity:1; 
  transform: translateX(-50%) translateY(0) 
}
</style>