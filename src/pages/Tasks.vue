<script setup>
import { ref, onMounted } from 'vue'
import BottomNav from '../components/BottomNav.vue'

/** ENV: để đúng định dạng task-XXXXX */
const raw = String(import.meta.env.VITE_ADSGRAM_BLOCK_ID ?? '').trim()
const blockId = /^task-\d+$/i.test(raw) ? raw : ( /^\d+$/.test(raw) ? `task-${raw}` : '' )
const rewardUi = Number(import.meta.env.VITE_ADSGRAM_REWARD_HTW ?? 1) // chỉ hiển thị

const prof = ref(null)
const sdkReady = ref(false)
const msg = ref('')
const ag = ref(null)

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
  ag.value.addEventListener('reward', async () => {
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
  ag.value.addEventListener('onEnterNotFound', () => { msg.value = 'Không bắt đầu được nhiệm vụ, thử lại sau.' })
}

onMounted(async () => {
  await Promise.all([loadProfile(), loadSdkOnce()])
  bindEvents()
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

      <!-- Adsgram Task (dùng slots: button / reward / claim / done) -->
      <section class="card">
        <div class="title"><i class="bi bi-badge-ad"></i> Xem quảng cáo Adsgram</div>
        <p class="mut">Mỗi lần xem thưởng <b>{{ rewardUi }}</b> HTW.</p>

        <adsgram-task
          v-if="sdkReady && blockId"
          ref="ag"
          class="ag"
          :data-block-id="blockId"
          data-debug="false"
          data-debug-console="false"
        >
          <!-- nút bắt đầu (button slot) -->
          <button slot="button" class="ag-go">go</button>

          <!-- con tem thưởng (reward slot) -->
          <div slot="reward" class="ag-reward">
            <i class="bi bi-coin"></i><span>reward</span>
          </div>

          <!-- nút nhận thưởng (claim slot) -->
          <button slot="claim" class="ag-claim">claim</button>

          <!-- trạng thái xong (done slot) -->
          <div slot="done" class="ag-done"><i class="bi bi-check2-circle"></i> done</div>
        </adsgram-task>

        <p v-else-if="!blockId" class="warn">
          Thiếu <b>VITE_ADSGRAM_BLOCK_ID</b> (đặt dạng <code>task-XXXXX</code> đúng với Block type: <b>Task</b>).
        </p>
        <p v-else-if="!sdkReady" class="warn">Đang tải SDK Adsgram…</p>

        <p v-if="msg" class="note err"><i class="bi bi-exclamation-circle"></i> {{ msg }}</p>
      </section>

      <section class="card tip">
        <div class="title"><i class="bi bi-info-circle"></i> Lưu ý</div>
        <ul>
          <li>Dùng đúng Block type <b>Task</b> & <code>data-block-id="task-XXXXX"</code>.</li>
          <li>SDK dùng: <code>https://sad.adsgram.ai/js/sad.min.js</code>.</li>
        </ul>
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
.hero{display:flex; gap:12px; align-items:center}
.hero-ic{width:44px;height:44px;border-radius:12px;display:grid;place-items:center;background:linear-gradient(145deg,#22d3ee,#6366f1);color:#fff}
.lbl{color:#9aa3b2; font-size:12px}
.amt{font:800 22px/1.1 ui-sans-serif,system-ui}
.amt span{font:700 12px; opacity:.85; margin-left:6px}

/* ====== Custom UI cho <adsgram-task> theo docs (button/reward/claim/done) ====== */
.ag{
  /* các biến CSS mà Adsgram hỗ trợ */
  --adsgram-task-font-size: 14px;
  --adsgram-task-icon-size: 36px;
  --adsgram-task-title-gap: 10px;
  --adsgram-task-icon-border-radius: 12px;
  --adsgram-task-button-width: 72px;
}

/* nút “go” ở slot button */
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
}

/* chip reward ở slot reward */
.ag-reward{
  margin-top:8px;
  display:inline-flex; gap:6px; align-items:center;
  padding:6px 10px; border-radius:999px;
  background:#0e1525; border:1px solid #334155;
  color:#cbd5e1; font-weight:800; font-size:12px;
}

/* nút claim (nhận thưởng) */
.ag-claim{
  margin-top:10px;
  width:var(--adsgram-task-button-width);
  height:36px;
  border:none; border-radius:10px;
  background:#f59e0b; color:#0b0f1a; font-weight:900;
  box-shadow: 0 6px 16px rgba(245,158,11,.35);
}

/* trạng thái done */
.ag-done{
  margin-top:10px;
  display:inline-flex; gap:6px; align-items:center;
  padding:6px 12px; border-radius:999px;
  background:#16a34a22; border:1px solid #16a34a66; color:#22c55e; font-weight:900;
}

/* notes & toast */
.warn{margin-top:8px; color:#fbbf24; font-size:12px}
.tip ul{margin:6px 0 0 18px; padding:0}
.tip li{margin:6px 0; color:#9aa3b2; font-size:13px}
:global(.toast){
  position: fixed; top: calc(64px + env(safe-area-inset-top)); left: 50%;
  transform: translateX(-50%) translateY(-10px);
  background: linear-gradient(135deg,#22c55e,#10b981); color:#0b0f1a;
  padding: 10px 14px; border-radius: 12px; font-weight: 800; font-size: 13px;
  box-shadow: 0 10px 30px rgba(16,185,129,.35); opacity: 0; z-index: 1000; transition: transform .2s, opacity .2s
}
:global(.toast.show){ opacity:1; transform: translateX(-50%) translateY(0) }
</style>
