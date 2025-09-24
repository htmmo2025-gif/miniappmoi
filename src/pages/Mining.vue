<script setup>
import { ref, onMounted, onUnmounted, computed } from 'vue'
import BottomNav from '../components/BottomNav.vue'

const state = ref({
  reward: 20,
  cooldown: 1800,
  remaining: 0,
  htw_balance: 0,
})
const busy = ref(false)
const loading = ref(true)
const msg = ref('')
let timerId = null

const canClaim = computed(() => !busy.value && state.value.remaining <= 0)

function startTicker() {
  stopTicker()
  timerId = setInterval(() => {
    if (state.value.remaining > 0) {
      state.value.remaining--
    }
  }, 1000)
}
function stopTicker() { if (timerId) { clearInterval(timerId); timerId = null } }

async function loadStatus() {
  loading.value = true
  try {
    const r = await fetch('/api/mine', { credentials: 'include' })
    if (!r.ok) throw new Error(await r.text())
    const data = await r.json()
    state.value = {
      reward: data.reward,
      cooldown: data.cooldown,
      remaining: data.remaining,
      htw_balance: Number(data.htw_balance ?? 0),
    }
    startTicker()
  } catch (e) {
    console.error(e)
    msg.value = 'Không tải được trạng thái mining.'
  } finally {
    loading.value = false
  }
}

async function claim() {
  if (!canClaim.value) return
  busy.value = true
  msg.value = ''
  try {
    const r = await fetch('/api/mine', {
      method: 'POST',
      credentials: 'include'
    })
    const data = await r.json().catch(() => ({}))
    if (!r.ok || data?.ok !== true) {
      const remain = Number(data?.remaining ?? state.value.cooldown)
      state.value.remaining = remain
      msg.value = 'Chưa hết thời gian chờ.'
      return
    }
    // Claim thành công
    state.value.htw_balance = Number(data.htw_balance ?? state.value.htw_balance + state.value.reward)
    state.value.remaining = state.value.cooldown
    msg.value = `Nhận +${state.value.reward} HTW thành công!`
  } catch (e) {
    console.error(e)
    msg.value = 'Claim thất bại, thử lại sau.'
  } finally {
    busy.value = false
  }
}

function fmtTime(sec) {
  const m = Math.floor(sec / 60).toString().padStart(2, '0')
  const s = Math.floor(sec % 60).toString().padStart(2, '0')
  return `${m}:${s}`
}

onMounted(loadStatus)
onUnmounted(stopTicker)
</script>

<template>
  <div class="page">
    <header class="topbar">
      <h1>Mining</h1>
      <span class="spacer"></span>
    </header>

    <main class="wrap">
      <section class="card hero">
        <div class="hero-ic"><i class="bi bi-lightning-charge"></i></div>
        <div class="hero-t">
          <div class="label">Số dư HTW</div>
          <div class="amount">{{ state.htw_balance.toLocaleString() }} <span>HTW</span></div>
        </div>
      </section>

      <section class="card">
        <div class="row">
          <div class="box">
            <div class="box-lbl"><i class="bi bi-gem"></i> Phần thưởng</div>
            <div class="box-val">+{{ state.reward }} HTW</div>
          </div>
          <div class="box">
            <div class="box-lbl"><i class="bi bi-clock-history"></i> Chu kỳ</div>
            <div class="box-val">30 phút</div>
          </div>
        </div>

        <div class="cooldown" v-if="state.remaining > 0">
          <i class="bi bi-hourglass-split"></i>
          Còn lại: <b>{{ fmtTime(state.remaining) }}</b>
        </div>

        <button class="btn" :disabled="!canClaim || loading" @click="claim">
          <i v-if="busy || loading" class="bi bi-arrow-repeat spin"></i>
          <i v-else class="bi bi-box-arrow-in-down"></i>
          <span>{{ state.remaining > 0 ? 'Chưa thể claim' : 'Claim +'+state.reward+' HTW' }}</span>
        </button>

        <p v-if="msg" class="note">{{ msg }}</p>
      </section>

      <section v-if="loading" class="card center">
        <i class="bi bi-hourglass-split big spin"></i>
        <div>Đang tải…</div>
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
.card.center{display:grid;place-items:center;gap:10px;padding:28px}
.big{font-size:38px}

.hero{display:flex; gap:12px; align-items:center}
.hero-ic{width:44px;height:44px;border-radius:12px;background:linear-gradient(145deg,#06b6d4,#2563eb);display:grid;place-items:center}
.hero-t .label{font-size:12px;color:var(--mut)}
.hero-t .amount{font:800 22px/1.1 ui-sans-serif,system-ui}
.hero-t .amount span{font:700 12px; opacity:.85; margin-left:6px}

.row{display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-bottom:8px}
.box{background:#0e1525;border:var(--ring);border-radius:12px;padding:12px}
.box-lbl{display:flex;align-items:center;gap:8px;color:#9aa3b2;font-size:12px}
.box-val{font:800 18px/1.1 ui-sans-serif,system-ui}

.cooldown{display:flex;align-items:center;gap:8px;color:#9fb2d0;margin:10px 0}

.btn{
  width:100%; padding:14px; border-radius:14px; border:none; color:#0b0f1a; font-weight:900;
  background:linear-gradient(145deg,#fde68a,#60a5fa);
  display:flex; align-items:center; justify-content:center; gap:8px;
}
.btn:disabled{opacity:.5}
.spin{animation:spin 1s linear infinite} @keyframes spin{to{transform:rotate(360deg)}}

.note{margin-top:10px; padding:10px 12px; border-radius:10px; background:#0e1525; color:#cbd5e1}
:global(*), :global(*::before), :global(*::after){ box-sizing: border-box }
:global(html, body, #app){ margin:0; overflow-x:hidden }
@media (max-width:360px){ .row{grid-template-columns:1fr} }
</style>
