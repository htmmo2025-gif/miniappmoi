<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import BottomNav from '../components/BottomNav.vue'

/** ENV: để đúng định dạng task-XXXXX */
const raw = String(import.meta.env.VITE_ADSGRAM_BLOCK_ID ?? '').trim()
const blockId = /^task-\d+$/i.test(raw) ? raw : ( /^\d+$/.test(raw) ? `task-${raw}` : '' )
const rewardUi = 10

const prof = ref(null)
const sdkReady = ref(false)
const msg = ref('')
const ag = ref(null)

// chặn double-fire
let rewardFired = false

async function loadProfile () {
  try {
    const r = await fetch('/api/profile', { credentials: 'include' })
    if (r.ok) prof.value = await r.json()
  } catch (e) { console.error(e) }
}

/** nạp SDK của Adsgram (theo docs cho Task) */
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

/** toast nhỏ */
function toast(t) {
  const el = document.createElement('div')
  el.className = 'toast'
  el.textContent = t
  document.body.appendChild(el)
  requestAnimationFrame(() => el.classList.add('show'))
  setTimeout(() => { el.classList.remove('show'); setTimeout(() => el.remove(), 250) }, 1600)
}

/** bind các event của <adsgram-task> */
  function bindEvents () {
  if (!ag.value) return

  // tiện ích đếm ngược
  let cdTimer = null
  function startCooldown(sec) {
    clearInterval(cdTimer)
    let left = Math.max(0, Number(sec) || 0)
    if (!left) return
    msg.value = `Bạn vừa nhận rồi, đợi ${left}s nữa nhé.`
    cdTimer = setInterval(() => {
      left--
      if (left <= 0) {
        clearInterval(cdTimer)
        msg.value = ''
      } else {
        msg.value = `Bạn vừa nhận rồi, đợi ${left}s nữa nhé.`
      }
    }, 1000)
  }

  ag.value.addEventListener('reward', async () => {
    if (rewardFired) return
    rewardFired = true
    try {
      const r = await fetch('/api/tasks/adsgram-reward', { method: 'POST', credentials: 'include' })

      if (!r.ok) {
        // xử lý riêng 429
        if (r.status === 429) {
          // cố đọc JSON; fallback text
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
        // các lỗi khác: hiện text
        const txt = await r.text().catch(() => '')
        throw new Error(txt || 'Lỗi máy chủ')
      }

      // OK
      await r.json().catch(()=>null)
      await loadProfile()
      msg.value = ''
      toast(`+${rewardUi} HTW`)
      try { window.Telegram?.WebApp?.HapticFeedback?.notificationOccurred('success') } catch {}
    } catch (e) {
      msg.value = 'Không cộng thưởng: ' + (e?.message || 'Lỗi máy chủ')
    }
  }, { once: true })

  ag.value.addEventListener('onEnterNotFound', () => {
    msg.value = 'Không bắt đầu được nhiệm vụ, thử lại sau.'
  }, { once: true })
}


onMounted(async () => {
  await Promise.all([loadProfile(), loadSdkOnce()])
  bindEvents()
})

onUnmounted(() => {
  // reset cờ khi rời trang (để lần sau dùng lại bình thường)
  rewardFired = false
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

        <adsgram-task
          v-if="sdkReady && blockId"
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

        <p v-else-if="!blockId" class="warn">
          Thiếu <b>VITE_ADSGRAM_BLOCK_ID</b> (đặt dạng <code>task-XXXXX</code> đúng với Block type: <b>Task</b>).
        </p>
        <p v-else-if="!sdkReady" class="warn">Đang tải SDK Adsgram…</p>

        <p v-if="msg" class="note err"><i class="bi bi-exclamation-circle"></i> {{ msg }}</p>
      </section>
    </main>
  </div>

  <BottomNav/>
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
.wrap{ width:100%; padding-top:12px; padding-bottom:calc(20px + env(safe-area-inset-bottom));
  padding-left:max(16px, env(safe-area-inset-left)); padding-right:max(16px, env(safe-area-inset-right));
  display:grid; gap:14px }
.card{ background:#0f172a; border:var(--ring); border-radius:14px; padding:16px; box-shadow:0 10px 30px rgba(2,8,23,.35) }
.title{display:flex; align-items:center; gap:8px; font-weight:800; margin-bottom:8px}
.mut{color:var(--mut); font-size:13px; margin:0 0 12px}

/* ====== Custom UI cho <adsgram-task> ====== */
.ag{ --adsgram-task-font-size:14px; --adsgram-task-icon-size:36px; --adsgram-task-title-gap:10px;
     --adsgram-task-icon-border-radius:12px; --adsgram-task-button-width:72px }
.ag-go{ width:var(--adsgram-task-button-width); height:36px; border:none; border-radius:10px;
  font-weight:900; text-transform:lowercase; background:#2563eb; color:#fff; box-shadow:0 6px 16px rgba(37,99,235,.35) }
.ag-reward{ margin-top:8px; display:inline-flex; gap:6px; align-items:center; padding:6px 10px; border-radius:999px;
  background:#0e1525; border:1px solid #334155; color:#cbd5e1; font-weight:800; font-size:12px }
.ag-claim{ margin-top:10px; width:var(--adsgram-task-button-width); height:36px; border:none; border-radius:10px;
  background:#f59e0b; color:#0b0f1a; font-weight:900; box-shadow:0 6px 16px rgba(245,158,11,.35) }
.ag-done{ margin-top:10px; display:inline-flex; gap:6px; align-items:center; padding:6px 12px; border-radius:999px;
  background:#16a34a22; border:1px solid #16a34a66; color:#22c55e; font-weight:900 }

/* notes & toast */
.warn{margin-top:8px; color:#fbbf24; font-size:12px}
:global(.toast){ position:fixed; top:calc(64px + env(safe-area-inset-top)); left:50%;
  transform:translateX(-50%) translateY(-10px); background:linear-gradient(135deg,#22c55e,#10b981); color:#0b0f1a;
  padding:10px 14px; border-radius:12px; font-weight:800; font-size:13px; box-shadow:0 10px 30px rgba(16,185,129,.35);
  opacity:0; z-index:1000; transition:transform .2s, opacity .2s }
:global(.toast.show){ opacity:1; transform:translateX(-50%) translateY(0) }
</style>
