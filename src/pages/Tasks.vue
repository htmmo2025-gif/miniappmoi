<!-- src/pages/Tasks.vue -->
<script setup>
import { ref, computed, watch, nextTick, onMounted, onUnmounted, onActivated } from 'vue'
import BottomNav from '../components/BottomNav.vue'

/** ===== Adsgram (xem quảng cáo) ===== */
const raw = String(import.meta.env.VITE_ADSGRAM_BLOCK_ID ?? '').trim()
// Chuẩn hoá: chấp nhận "12345" hoặc "task-12345" -> luôn render "task-12345"
const blockId = /^task-\d+$/i.test(raw) ? raw : (/^\d+$/.test(raw) ? `task-${raw}` : '')
const rewardUi = 7

const prof = ref(null)
const sdkReady = ref(false)
const msg = ref('')
const ag = ref(null)           // ref đến <adsgram-task>
const taskKey = ref(0)         // dùng để remount task khi cần

// Chống spam
let processingReward = false
let lastRewardTime = 0
const MIN_INTERVAL_MS = 2000

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
      taskKey.value++ // remount
    } else {
      msg.value = `Đợi ${left}s nữa nhé`
    }
  }, 1000)
}

function bindEvents() {
  const el = ag.value
  if (!el) return

  // Xoá listener cũ nếu component remount nhiều lần
  el.replaceWith(el) // thủ thuật nhanh để drop toàn bộ listener native gắn sẵn
  // Lưu ý: sau replaceWith, ref cũ không còn hợp lệ -> re-select lại
  // Nhưng vì đây là custom element, ta lấy lại qua query gần nhất:
  const host = document.querySelector('[data-adsgram-host]')
  const comp = host ? host.querySelector('adsgram-task.ag') : document.querySelector('adsgram-task.ag')
  if (comp) ag.value = comp

  // Debounce
  let rewardTimeout = null

  ag.value.addEventListener('reward', async () => {
    const now = Date.now()
    if (rewardTimeout) clearTimeout(rewardTimeout)
    if (processingReward) return
    if (now - lastRewardTime < MIN_INTERVAL_MS) return

    rewardTimeout = setTimeout(async () => {
      processingReward = true
      lastRewardTime = now
      try {
        const r = await fetch('/api/tasks/adsgram-reward', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' }
        })
        if (!r.ok) {
          if (r.status === 429) {
            let wait = 300
            try {
              const json = await r.json()
              wait = Number(json?.wait ?? wait)
            } catch {}
            startCooldown(wait)
            return
          }
          throw new Error(await r.text())
        }
        await r.json()
        clearInterval(cdTimer)
        msg.value = ''
        await loadProfile()
        toast(`+${rewardUi} HTW`)
        try { window.Telegram?.WebApp?.HapticFeedback?.notificationOccurred('success') } catch {}
        setTimeout(() => { taskKey.value++ }, 1500)
      } catch (e) {
        console.error('Adsgram reward error:', e)
        msg.value = 'Lỗi: ' + (e?.message || 'Không xử lý được')
      } finally {
        setTimeout(() => { processingReward = false }, 1500)
      }
    }, 500)
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

// Bảo đảm bind sau khi SDK sẵn sàng và DOM đã render <adsgram-task>
watch([sdkReady, taskKey], async () => {
  if (!sdkReady.value || !blockId) return
  await nextTick()
  bindEvents()
})

/** ===== Nhiệm vụ tham gia kênh Telegram ===== */
const joinChannelName = String(import.meta.env.VITE_JOIN_CHANNEL_NAME ?? '').replace(/^@/, '')
const joinChannelUrl  = computed(() => joinChannelName ? `https://t.me/${joinChannelName}` : '#')
const joinBusy = ref(false)
const joinOk   = ref(false)
const joinMsg  = ref('')

async function claimJoinChannel() {
  joinBusy.value = true; joinOk.value = false; joinMsg.value = ''
  try {
    const r = await fetch('/api/join-channel', { method: 'POST', credentials: 'include' })
    const j = await r.json().catch(()=> ({}))
    if (!r.ok || j?.ok !== true) { joinMsg.value = j?.error || 'Không xác minh được. Hãy chắc bạn đã tham gia kênh.'; return }
    joinOk.value = true
    joinMsg.value = j.already ? 'Bạn đã nhận nhiệm vụ này trước đó.' : 'Nhận +1 HTW thành công 🎉'
  } catch { joinMsg.value = 'Lỗi máy chủ, thử lại sau.' }
  finally { joinBusy.value = false }
}


/** ===== Lifecycle ===== */
onActivated(() => {
  // Reset khi quay lại trang
  taskKey.value++
  processingReward = false
  msg.value = ''
  clearInterval(cdTimer)
})

onMounted(async () => {
  await loadProfile()
  await loadSdkOnce()   // set sdkReady = true
  await nextTick()      // chờ DOM render <adsgram-task/>
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
      <!-- Nhiệm vụ xem quảng cáo -->
      <section class="card">
        <div class="title"><i class="bi bi-badge-ad"></i> Xem quảng cáo</div>
        <p class="mut">Mỗi lần xem thưởng <b>{{ rewardUi }}</b> HTW.</p>

        <div v-if="sdkReady && blockId" :key="taskKey" data-adsgram-host>
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

     
      <!-- Nhiệm vụ tham gia kênh Telegram (UI mới) -->
<section class="card join-card">
  <div class="join-head">
    <div class="join-icon"><i class="bi bi-telegram"></i></div>
    <div class="join-txt">
      <div class="title">Tham gia kênh Telegram</div>
      <div class="sub">Nhận thưởng <span class="chip">+1 HTW</span> • chỉ 1 lần</div>
    </div>
  </div>

  <ul class="steps">
    <li><i class="bi bi-1-circle"></i> Mở kênh chính thức</li>
    <li><i class="bi bi-2-circle"></i> Nhấn <b>Tham gia</b></li>
    <li><i class="bi bi-3-circle"></i> Quay lại đây và bấm <b>Xác minh</b></li>
  </ul>

  <div class="cta-row">
    <a
      class="btn btn-primary"
      :href="joinChannelUrl"
      target="_blank"
      rel="noopener"
      :aria-disabled="!joinChannelUrl || joinChannelUrl==='#'"
      :tabindex="(!joinChannelUrl || joinChannelUrl==='#') ? -1 : 0"
    >
      <i class="bi bi-box-arrow-up-right"></i>
      <span>Mở kênh</span>
    </a>

    <button class="btn btn-ghost" @click="claimJoinChannel" :disabled="joinBusy">
      <i v-if="joinBusy" class="bi bi-arrow-repeat spin"></i>
      <i v-else class="bi bi-patch-check"></i>
      <span>Xác minh & nhận 1 HTW</span>
    </button>
  </div>

  <div v-if="joinMsg" class="status" :class="{ success: joinOk, error: !joinOk }">
    <i :class="joinOk ? 'bi bi-check-circle-fill' : 'bi bi-exclamation-triangle-fill'"></i>
    <span>{{ joinMsg }}</span>
  </div>

  <p v-if="joinChannelUrl==='#'" class="warn mt8">
    Thiếu <b>VITE_JOIN_CHANNEL_NAME</b> — hãy cấu hình tên kênh (không kèm @).
  </p>
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
.success{
  color:#a7f3d0;
  background:#064e3b;
  border:1px solid #065f46;
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
/* ===== Join Channel (pretty) ===== */
.join-card { display: grid; gap: 12px }

.join-head { display:flex; align-items:center; gap:12px }
.join-icon{
  width:44px; height:44px; border-radius:12px;
  display:grid; place-items:center; font-size:20px;
  background:linear-gradient(145deg,#36b4ff22,#36b4ff44);
  border:1px solid #1e3a5f;
}
.join-txt .title{ font-weight:800; margin:0 }
.join-txt .sub{ color:var(--mut); font-size:12px; margin-top:2px }

.chip{
  display:inline-flex; align-items:center; gap:6px;
  padding:2px 8px; border-radius:999px; font-weight:900; font-size:12px;
  background:#0e1525; border:1px solid #334155; color:#cbd5e1;
}

.steps{ list-style:none; padding:0; margin:0; display:grid; gap:6px }
.steps li{ display:flex; align-items:center; gap:8px; color:#cbd5e1; font-size:13px }
.steps i{ color:#9fb2d0 }

.cta-row{ display:flex; gap:10px; flex-wrap:wrap }
.btn{
  height:40px; padding:0 14px; border-radius:12px; font-weight:900;
  display:inline-flex; align-items:center; gap:8px; border:1px solid transparent;
}
.btn[aria-disabled="true"]{ opacity:.5; pointer-events:none }

.btn-primary{
  color:#0b0f1a; background:linear-gradient(145deg,#a7f3d0,#60a5fa);
  box-shadow:0 6px 16px rgba(96,165,250,.25);
}
.btn-ghost{
  color:#e5e7eb; background:#0e1525; border-color:#334155;
}

.status{
  display:flex; align-items:center; gap:8px; padding:10px 12px; border-radius:10px;
  font-size:13px; border:1px solid transparent;
}
.status.success{ background:#064e3b; color:#a7f3d0; border-color:#065f46 }
.status.error{ background:#3a0d0d; color:#fecaca; border-color:#7f1d1d }

.mt8{ margin-top:8px }

</style>
