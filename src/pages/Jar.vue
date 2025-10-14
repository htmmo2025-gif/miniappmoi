<!-- src/pages/Jar.vue (refined UI) -->
<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import BottomNav from '../components/BottomNav.vue'

const JAR_COOLDOWN_SEC = Number(import.meta.env.VITE_JAR_COOLDOWN_SEC || 1200)

/* ---------- State ---------- */
const profBal   = ref(0)
const opensLeft = ref(0)
const usedToday = ref(0)

const msg        = ref('')
const lastReward = ref(null)  // hiện số HTW nhận được sau khi mở
const busy       = ref(false)
const initialLoading = ref(true)

const cd = ref({ remaining: 0, cooldown: JAR_COOLDOWN_SEC })
let timer = null
const canOpen = computed(() =>
  !busy.value && cd.value.remaining <= 0 && opensLeft.value > 0
)

/* Cooldown progress (0 → 1) */
const cdProgress = computed(() => {
  const total = Number(cd.value.cooldown || 0)
  const rem   = Number(cd.value.remaining || 0)
  if (!total) return 0
  return Math.min(1, Math.max(0, 1 - rem / total))
})

/* ---------- Monetag SDK ---------- */
const MONETAG_ZONE = String(import.meta.env.VITE_MONETAG_ZONE_ID || '')
const MONETAG_SRC  = String(import.meta.env.VITE_MONETAG_SDK_URL  || '')
const MONETAG_FUNC = String(import.meta.env.VITE_MONETAG_FUNC     || '')
const MIN_REWARD_MS = Number(import.meta.env.VITE_MONETAG_MIN_VIEW_MS || 12000)
const loadingSdk = ref(false)

function loadMonetagSdk () {
  if (!MONETAG_SRC || !MONETAG_ZONE) return Promise.reject(new Error('Thiếu cấu hình Monetag'))
  if ([...document.scripts].some(s => s.src === MONETAG_SRC)) return Promise.resolve()
  loadingSdk.value = true
  return new Promise((resolve, reject) => {
    const s = document.createElement('script')
    s.src = MONETAG_SRC
    s.async = true
    s.setAttribute('data-zone', MONETAG_ZONE)
    s.setAttribute('data-sdk', MONETAG_FUNC || `show_${MONETAG_ZONE}`)
    s.onload  = () => { loadingSdk.value = false; resolve() }
    s.onerror = (e)  => { loadingSdk.value = false; reject(e) }
    document.head.appendChild(s)
  })
}
function showMonetagReward () {
  return new Promise(async (resolve, reject) => {
    try {
      await loadMonetagSdk()
      const fnName = MONETAG_FUNC || `show_${MONETAG_ZONE}`
      const fn = window[fnName]
      if (typeof fn !== 'function') return reject(new Error('Monetag SDK chưa sẵn sàng'))

      const started = Date.now()
      let rewarded = false
      const ret = fn({
        onRewarded: () => { rewarded = true; resolve(true) },
        onClose: () => {
          if (!rewarded) {
            const elapsed = Date.now() - started
            if (elapsed >= MIN_REWARD_MS) resolve(true)
            else reject(new Error('Bạn đóng quá nhanh, vui lòng xem hết quảng cáo.'))
          }
        }
      })
      if (ret && typeof ret.then === 'function') {
        ret.then(() => {
          if (rewarded) return
          const elapsed = Date.now() - started
          if (elapsed >= MIN_REWARD_MS) resolve(true)
          else reject(new Error('Bạn đóng quá nhanh, vui lòng xem hết quảng cáo.'))
        }).catch(reject)
      }
    } catch (e) { reject(e) }
  })
}

/* ---------- Ticker ---------- */
function startTicker () {
  stopTicker()
  timer = setInterval(() => {
    if (cd.value.remaining > 0) cd.value.remaining--
    else stopTicker()
  }, 1000)
}
function stopTicker () { if (timer) { clearInterval(timer); timer = null } }

/* ---------- Load status ---------- */
async function loadStatus () {
  msg.value = ''
  lastReward.value = null
  try {
    const r = await fetch('/api/jar', { credentials: 'include' })
    const j = await r.json().catch(() => ({}))
    if (!r.ok || j.error) throw new Error(j?.error || 'Không tải được trạng thái')

    profBal.value   = Number(j.htw_balance ?? 0)
    opensLeft.value = Number(j.opens_left ?? 0)
    usedToday.value = Number(j.used_today ?? 0)
    cd.value.cooldown  = Number(j.cooldown ?? JAR_COOLDOWN_SEC)
    cd.value.remaining = Number(j.remaining ?? 0)
    if (cd.value.remaining > 0) startTicker()
  } catch (e) {
    msg.value = e?.message || 'Lỗi tải dữ liệu'
  } finally {
    initialLoading.value = false
  }
}

/* ---------- Open jar (xem quảng cáo + cooldown) ---------- */
async function openJar () {
  if (!canOpen.value) return
  busy.value = true
  msg.value = ''
  lastReward.value = null
  try {
    // 1) xem quảng cáo bắt buộc
    await showMonetagReward()

    // 2) gọi API mở hũ
    const r = await fetch('/api/jar', { method: 'POST', credentials: 'include' })
    const j = await r.json().catch(() => ({}))

    if (!r.ok || j?.ok !== true) {
      cd.value.remaining = Number(j?.remaining ?? cd.value.cooldown ?? JAR_COOLDOWN_SEC)
      if (cd.value.remaining > 0) startTicker()
      if (typeof j?.opens_left !== 'undefined') opensLeft.value = Number(j.opens_left)
      if (typeof j?.used_today !== 'undefined') usedToday.value = Number(j.used_today)
      throw new Error(j?.error || 'Chưa thể mở hũ, vui lòng thử lại sau.')
    }

    // Thành công: CẬP NHẬT số HTW nhận được (vẫn hiển thị con số)
    lastReward.value = Number(j.reward ?? 0)
    profBal.value    = Number(j.htw_balance ?? profBal.value)
    opensLeft.value  = Number(j.opens_left ?? Math.max(0, opensLeft.value - 1))
    usedToday.value  = Number(j.used_today ?? usedToday.value + 1)

    // 3) Cooldown
    cd.value.cooldown  = Number(j?.cooldown ?? JAR_COOLDOWN_SEC)
    cd.value.remaining = Number(j?.remaining ?? cd.value.cooldown)
    if (!cd.value.remaining || cd.value.remaining < 1) cd.value.remaining = cd.value.cooldown
    startTicker()

    // Trigger confetti pulse once
    triggerPulse()
  } catch (e) {
    msg.value = e?.message || 'Không thể mở hũ.'
  } finally {
    busy.value = false
  }
}

/* ---------- Utils ---------- */
function fmtTime (s) {
  const m = Math.floor(s / 60).toString().padStart(2, '0')
  const ss = Math.floor(s % 60).toString().padStart(2, '0')
  return `${m}:${ss}`
}

const pulse = ref(false)
function triggerPulse () {
  pulse.value = true
  setTimeout(() => (pulse.value = false), 1200)
}

/* ---------- Lifecycle ---------- */
onMounted(loadStatus)
onUnmounted(stopTicker)
</script>

<template>
  <div class="page">
    <div class="gradient-bg" aria-hidden="true" />

    <header class="topbar" role="banner">
      <h1>Mở hũ</h1>
      <span class="spacer" />
    </header>

    <main class="wrap" role="main">
      <section class="card hero" :class="{ glow: canOpen }" aria-live="polite">
        <div class="hero-ic"><i class="bi bi-emoji-laughing" aria-hidden="true"></i></div>
        <div class="hero-t">
          <div class="label">Số dư HTW</div>
          <div class="amount">
            <span v-if="initialLoading" class="shimmer w-28 h-6"></span>
            <template v-else>{{ profBal.toLocaleString() }}</template>
            <span>HTW</span>
          </div>
          <div class="sub">Hôm nay đã mở: <b>{{ usedToday }}</b></div>
        </div>
      </section>

      <section class="card">
        <div class="row">
          <div class="box">
            <div class="box-lbl"><i class="bi bi-ticket-detailed" aria-hidden="true"></i> Lượt còn lại</div>
            <div class="box-val">
              <span v-if="initialLoading" class="shimmer w-10 h-5"></span>
              <template v-else>{{ opensLeft }}</template>
            </div>
          </div>

          <div class="box info">
            <div class="box-lbl">
              <i class="bi bi-clock-history" aria-hidden="true"></i>
              Phần thưởng ngẫu nhiên · Mời 1 bạn = +1 lượt
            </div>
          </div>
        </div>

        <!-- Cooldown Ring -->
        <div v-if="cd.remaining > 0" class="coolwrap" :aria-label="`Còn lại ${fmtTime(cd.remaining)}`">
          <div class="ring">
            <svg viewBox="0 0 120 120" class="ring-svg">
              <circle cx="60" cy="60" r="54" class="track" />
              <circle
                cx="60" cy="60" r="54" class="prog"
                :style="{
                  'stroke-dasharray': 2*Math.PI*54 + 'px',
                  'stroke-dashoffset': (1 - cdProgress) * 2*Math.PI*54 + 'px'
                }"
              />
            </svg>
            <div class="ring-t">
              <i class="bi bi-hourglass-split" aria-hidden="true"></i>
              <b>{{ fmtTime(cd.remaining) }}</b>
            </div>
          </div>
        </div>

        <!-- Action button -->
        <button class="btn" :class="{ pulse }" :disabled="!canOpen || loadingSdk" @click="openJar" aria-live="polite">
          <i v-if="busy || loadingSdk" class="bi bi-arrow-repeat spin" aria-hidden="true"></i>
          <i v-else class="bi bi-gift" aria-hidden="true"></i>
          <span>
            {{ opensLeft <= 0 ? 'Hết lượt mở' : (cd.remaining>0 ? 'Chờ hết thời gian' : 'Xem quảng cáo & mở hũ') }}
          </span>
        </button>

        <!-- Reward toast -->
        <transition name="pop">
          <p v-if="lastReward !== null" class="note success">
            <i class="bi bi-check2-circle" aria-hidden="true"></i> Nhận <b>+{{ lastReward }}</b> HTW!
          </p>
        </transition>

        <!-- Error / info toast -->
        <transition name="pop">
          <p v-if="msg" class="note err">
            <i class="bi bi-exclamation-circle" aria-hidden="true"></i> {{ msg }}
          </p>
        </transition>

        <p v-if="!MONETAG_SRC || !MONETAG_ZONE" class="note warn">
          ⚠️ Thiếu cấu hình Monetag (<code>VITE_MONETAG_SDK_URL</code>, <code>VITE_MONETAG_ZONE_ID</code>).
        </p>
      </section>
    </main>

    <BottomNav />
  </div>
</template>

<style scoped>
/* ---------- Theme ---------- */
:root { color-scheme: dark; }
.page{--bg:#0b0f1a;--card:#0f172a;--mut:#94a3b8;--ring:1px solid rgba(148,163,184,.14);
  background:var(--bg);color:#e5e7eb;width:100dvw;min-height:100dvh;position:relative;overflow-x:hidden}
.gradient-bg{position:fixed;inset:-20% -10% auto -10%;height:60vh;filter:blur(60px);opacity:.35;
  background:radial-gradient(1200px 600px at 20% 20%, #3b82f6 0%, transparent 60%),
             radial-gradient(900px 500px at 90% 0%, #f59e0b 0%, transparent 55%),
             radial-gradient(1000px 600px at 50% 100%, #a855f7 0%, transparent 60%);
  pointer-events:none}

/* ---------- Topbar ---------- */
.topbar{position:sticky;top:0;z-index:10;padding-block:calc(10px + env(safe-area-inset-top)) 10px;
  padding-left:max(16px, env(safe-area-inset-left));padding-right:max(16px, env(safe-area-inset-right));
  display:flex;align-items:center;gap:10px;background:linear-gradient(180deg,rgba(11,15,26,.96),rgba(11,15,26,.7) 65%,transparent);
  backdrop-filter:blur(8px)}
.topbar h1{margin:0;font:800 20px/1 ui-sans-serif,system-ui}
.hint{color:var(--mut)}
.spacer{flex:1}

/* ---------- Layout ---------- */
.wrap{width:100%;padding-top:12px;padding-bottom:calc(20px + env(safe-area-inset-bottom));
  padding-left:max(16px, env(safe-area-inset-left));padding-right:max(16px, env(safe-area-inset-right));display:grid;gap:14px}
.card{background:rgba(15,23,42,.75);border:var(--ring);border-radius:16px;padding:16px;box-shadow:0 10px 30px rgba(2,8,23,.35);backdrop-filter:blur(6px)}
.hero{display:flex;gap:12px;align-items:center;transition:box-shadow .25s, transform .25s}
.hero.glow{box-shadow:0 0 0 2px rgba(34,197,94,.35), 0 10px 30px rgba(2,8,23,.45)}
.hero-ic{width:48px;height:48px;border-radius:14px;background:linear-gradient(145deg,#f59e0b,#f97316);display:grid;place-items:center}
.hero-t .label{font-size:12px;color:var(--mut)}
.hero-t .amount{font:800 24px/1.1 ui-sans-serif,system-ui;display:flex;align-items:baseline;gap:6px}
.hero-t .amount span{font:700 12px;opacity:.85}
.hero .sub{margin-top:4px;color:#9fb2d0;font-size:12px}

.row{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:12px}
.box{background:#0e1525;border:var(--ring);border-radius:12px;padding:12px}
.box.info{background:linear-gradient(180deg,rgba(14,21,37,.7),rgba(15,23,42,.7))}
.box-lbl{display:flex;align-items:center;gap:8px;color:#9aa3b2;font-size:12px}
.box-val{font:800 20px/1.1 ui-sans-serif,system-ui}

/* ---------- Cooldown ring ---------- */
.coolwrap{display:grid;place-items:center;margin:8px 0 14px}
.ring{position:relative;width:120px;height:120px}
.ring-svg{width:120px;height:120px;transform:rotate(-90deg)}
.track{fill:none;stroke:rgba(148,163,184,.18);stroke-width:10}
.prog{fill:none;stroke:#60a5fa;stroke-width:10;stroke-linecap:round;transition:stroke-dashoffset .8s ease}
.ring-t{position:absolute;inset:0;display:grid;place-items:center;text-align:center;gap:2px}
.ring-t b{font:800 18px/1 ui-sans-serif,system-ui}
.ring-t span{font-size:11px;color:#9fb2d0}

/* ---------- Button ---------- */
.btn{width:100%;padding:14px;border-radius:14px;border:none;color:#0b0f1a;font-weight:900;
  background:linear-gradient(145deg,#fde68a,#60a5fa);display:flex;align-items:center;justify-content:center;gap:8px;transition:opacity .2s, transform .08s}
.btn:disabled{opacity:.5;cursor:not-allowed}
.btn:not(:disabled):active{transform:translateY(1px)}
.pulse{animation:pulseGlow 1.2s ease-out}
@keyframes pulseGlow{0%{box-shadow:0 0 0 0 rgba(96,165,250,.6)}100%{box-shadow:0 0 0 18px rgba(96,165,250,0)}}

/* ---------- Notes / toasts ---------- */
.note{margin-top:10px;padding:10px 12px;border-radius:10px;background:#0e1525;color:#cbd5e1;font-size:13px;border:1px solid transparent}
.note.warn{background:#422006;color:#fed7aa;border-color:#92400e}
.note.err{background:#450a0a;color:#fca5a5;border-color:#7f1d1d}
.note.success{background:#064e3b;color:#a7f3d0;border-color:#065f46}
.pop-enter-active,.pop-leave-active{transition:all .18s ease}
.pop-enter-from,.pop-leave-to{opacity:0;transform:translateY(6px)}

/* ---------- Helpers ---------- */
.spin{animation:spin 1s linear infinite}
@keyframes spin{to{transform:rotate(360deg)}}
.shimmer{display:inline-block;position:relative;overflow:hidden;border-radius:6px;background:linear-gradient(90deg,#0b1220 0%,#0d1526 20%,#0b1220 40%);
  background-size:200% 100%;animation:shimmer 1.2s infinite}
@keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}

@media (max-width:360px){.row{grid-template-columns:1fr}}
</style>
