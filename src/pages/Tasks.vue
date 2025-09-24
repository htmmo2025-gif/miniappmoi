<script setup>
import { ref, onMounted } from 'vue'
import BottomNav from '../components/BottomNav.vue'

/** ENV — đặt VITE_ADSGRAM_BLOCK_ID = task-15248 (đúng Block type: Task) */
const rawId = String(import.meta.env.VITE_ADSGRAM_BLOCK_ID ?? '').trim()
const blockId = /^task-\d+$/i.test(rawId) ? rawId : ( /^\d+$/.test(rawId) ? `task-${rawId}` : '' )
const rewardUi = Number(import.meta.env.VITE_ADSGRAM_REWARD_HTW ?? 1) // chỉ hiển thị

const prof = ref(null)
const sdkReady = ref(false)
const msg = ref('')
const elTask = ref(null)

async function loadProfile () {
  try {
    const r = await fetch('/api/profile', { credentials: 'include' })
    if (r.ok) prof.value = await r.json()
  } catch (e) { console.error(e) }
}

/** Load SDK Task một lần theo tài liệu */
function loadSdkOnce () {
  if ([...document.scripts].some(s => s.src === 'https://sad.adsgram.ai/js/sad.min.js')) {
    sdkReady.value = true
    return Promise.resolve()
  }
  return new Promise((resolve, reject) => {
    const s = document.createElement('script')
    s.src = 'https://sad.adsgram.ai/js/sad.min.js'
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

/** Gắn listeners cho <adsgram-task> */
function bindTaskEvents () {
  if (!elTask.value) return
  // thưởng thành công
  elTask.value.addEventListener('reward', async () => {
    try {
      const r = await fetch('/api/tasks/adsgram-reward', { method: 'POST', credentials: 'include' })
      if (!r.ok) throw new Error(await r.text())
      await loadProfile()
      toast(`+${rewardUi} HTW`)
      try { window.Telegram?.WebApp?.HapticFeedback?.notificationOccurred('success') } catch {}
    } catch (e) {
      msg.value = 'Không cộng thưởng: ' + (e?.message || 'Lỗi máy chủ')
    }
  })

  // optional: các event khác theo docs
  elTask.value.addEventListener('onEnterNotFound', () => {
    msg.value = 'Không thể bắt đầu nhiệm vụ. Thử lại sau.'
  })
}

onMounted(async () => {
  await Promise.all([loadProfile(), loadSdkOnce()])
  bindTaskEvents()
})
</script>

<template>
  <div class="page">
    <header class="topbar">
      <h1>Nhiệm vụ</h1>
      <span class="spacer"></span>
    </header>

    <main class="wrap">
      <!-- Số dư -->
      <section class="card hero" v-if="prof">
        <div class="hero-ic"><i class="bi bi-wallet2"></i></div>
        <div class="hero-t">
          <div class="lbl">Số dư hiện tại</div>
          <div class="amt">{{ (prof.htw_balance ?? 0).toLocaleString() }} <span>HTW</span></div>
        </div>
      </section>

      <!-- Task Adsgram -->
      <section class="card">
        <div class="title"><i class="bi bi-badge-ad"></i> Xem quảng cáo Adsgram</div>
        <p class="mut">Mỗi lần xem thưởng <b>{{ rewardUi }}</b> HTW.</p>

        <!-- Web component theo docs -->
        <adsgram-task
          v-if="sdkReady && blockId"
          ref="elTask"
          class="ag-task"
          :data-block-id="blockId"
          data-debug="false"
          data-debug-console="false"
        >
          <!-- button slot -->
          <button slot="button" class="btn">
            <i class="bi bi-play-circle"></i>
            <span>Xem quảng cáo</span>
          </button>

          <!-- reward slot (tuỳ chọn, hiện số coin do Adsgram cung cấp) -->
          <div slot="reward" class="reward-chip">
            <i class="bi bi-coin"></i><span>Thưởng</span>
          </div>

          <!-- claim slot (nút nhận thưởng khi hoàn thành) -->
          <button slot="claim" class="btn-claim">Nhận thưởng</button>

          <!-- done slot (sau khi claim) -->
          <div slot="done" class="done-chip"><i class="bi bi-check2-circle"></i> Đã nhận</div>
        </adsgram-task>

        <p v-else-if="!blockId" class="warn">
          Thiếu <b>VITE_ADSGRAM_BLOCK_ID</b>. Đặt dạng <code>task-XXXXX</code> (đúng với Block type: <b>Task</b>).
        </p>
        <p v-else-if="!sdkReady" class="warn">Đang tải SDK Adsgram…</p>

        <p v-if="msg" class="note err"><i class="bi bi-exclamation-circle"></i> {{ msg }}</p>
      </section>

      <section class="card tip">
        <div class="title"><i class="bi bi-info-circle"></i> Lưu ý</div>
        <ul>
          <li>Trong Adsgram, “Block type” phải là <b>Task</b> và bạn dùng đúng <code>data-block-id="task-XXXXX"</code>.</li>
          <li>Đã chèn SDK: <code>https://sad.adsgram.ai/js/sad.min.js</code> theo tài liệu.</li>
          <li>Reward URL trong Adsgram có thể trỏ tới webhook của bạn; ngoài ra, app cũng cộng HTW khi bắt sự kiện <code>reward</code>.</li>
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
.wrap{ width:100%; padding:12px max(16px, env(safe-area-inset-right)) calc(20px + env(safe-area-inset-bottom)) max(16px, env(safe-area-inset-left)); display:grid; gap:14px }

.card{ background:#0f172a; border:var(--ring); border-radius:14px; padding:16px; box-shadow:0 10px 30px rgba(2,8,23,.35) }
.title{display:flex; align-items:center; gap:8px; font-weight:800; margin-bottom:8px}
.mut{color:var(--mut); font-size:13px; margin:0 0 12px}
.hero{display:flex; gap:12px; align-items:center}
.hero-ic{width:44px;height:44px;border-radius:12px;display:grid;place-items:center;background:linear-gradient(145deg,#22d3ee,#6366f1);color:#fff}
.lbl{color:#9aa3b2; font-size:12px}
.amt{font:800 22px/1.1 ui-sans-serif,system-ui}
.amt span{font:700 12px; opacity:.85; margin-left:6px}

/* Nút start trong slot "button" */
.btn{
  width:100%; padding:14px; border-radius:14px; border:none; color:#0b0f1a; font-weight:900;
  background:linear-gradient(145deg,#fde68a,#60a5fa); display:flex; align-items:center; justify-content:center; gap:8px;
}
.btn:disabled{opacity:.6}
.btn-claim{
  margin-top:10px; width:100%; padding:12px; border-radius:12px; border:1px solid #22c55e66; background:#16a34a22; color:#22c55e; font-weight:800
}
.reward-chip{margin-top:8px; display:inline-flex; gap:6px; align-items:center; padding:6px 10px; border-radius:999px; background:#0e1525; border:var(--ring); color:#cbd5e1; font-weight:700}
.done-chip{margin-top:10px; display:inline-flex; gap:6px; align-items:center; padding:6px 10px; border-radius:999px; background:#0e1525; border:1px solid #22c55e55; color:#22c55e; font-weight:800}

.warn{margin-top:8px; color:#fbbf24; font-size:12px}
.tip ul{margin:6px 0 0 18px; padding:0}
.tip li{margin:6px 0; color:#9aa3b2; font-size:13px}

/* Toast */
:global(.toast){
  position: fixed; top: calc(64px + env(safe-area-inset-top)); left: 50%; transform: translateX(-50%) translateY(-10px);
  background: linear-gradient(135deg,#22c55e,#10b981); color:#0b0f1a;
  padding: 10px 14px; border-radius: 12px; font-weight: 800; font-size: 13px;
  box-shadow: 0 10px 30px rgba(16,185,129,.35); opacity: 0; z-index: 1000; transition: transform .2s, opacity .2s
}
:global(.toast.show){ opacity:1; transform: translateX(-50%) translateY(0) }
</style>
