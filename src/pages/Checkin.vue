<script setup>
import { ref, onMounted, onUnmounted, computed } from 'vue'
import BottomNav from '../components/BottomNav.vue'

const state = ref({ reward: 10, cooldown: 86400, remaining: 0, htw_balance: 0 })
const loading = ref(true)
const busy = ref(false)
const msg = ref('')
let t = null

function tick() {
  clearInterval(t)
  t = setInterval(() => {
    if (state.value.remaining > 0) state.value.remaining--
    else clearInterval(t)
  }, 1000)
}
onUnmounted(() => clearInterval(t))

async function loadStatus() {
  loading.value = true
  msg.value = ''
  try {
    const r = await fetch('/api/checkin', { credentials: 'include' })
    if (!r.ok) throw new Error(await r.text())
    const d = await r.json()
    state.value = {
      reward: Number(d.reward ?? 10),
      cooldown: Number(d.cooldown ?? 86400),
      remaining: Number(d.remaining ?? 0),
      htw_balance: Number(d.htw_balance ?? 0),
    }
    if (state.value.remaining > 0) tick()
  } catch (e) {
    console.error(e); msg.value = 'Không tải được trạng thái điểm danh.'
  } finally { loading.value = false }
}

const canClaim = computed(() => !loading.value && !busy.value && state.value.remaining <= 0)

function fmt(sec){
  const h = String(Math.floor(sec/3600)).padStart(2,'0')
  const m = String(Math.floor((sec%3600)/60)).padStart(2,'0')
  const s = String(Math.floor(sec%60)).padStart(2,'0')
  return `${h}:${m}:${s}`
}

async function claim() {
  if (!canClaim.value) return
  busy.value = true; msg.value = ''
  try {
    const r = await fetch('/api/checkin', { method:'POST', credentials:'include' })
    const d = await r.json().catch(()=>({}))
    if (!r.ok || d?.ok !== true) {
      state.value.remaining = Number(d?.remaining ?? state.value.cooldown)
      tick()
      msg.value = 'Chưa đến giờ điểm danh.'
      return
    }
    state.value.htw_balance = Number(d.htw_balance ?? state.value.htw_balance)
    state.value.remaining = Number(d.remaining ?? state.value.cooldown)
    tick()
    toast(`+${state.value.reward} HTW`)
    try { window.Telegram?.WebApp?.HapticFeedback?.notificationOccurred('success') } catch {}
  } catch (e) {
    console.error(e); msg.value = 'Điểm danh thất bại.'
  } finally { busy.value = false }
}

function toast(t){
  const el=document.createElement('div'); el.className='toast'; el.textContent=t
  document.body.appendChild(el); requestAnimationFrame(()=>el.classList.add('show'))
  setTimeout(()=>{el.classList.remove('show'); setTimeout(()=>el.remove(),250)},1600)
}

onMounted(loadStatus)
</script>

<template>
  <div class="page">
    <header class="topbar"><h1>Điểm danh</h1></header>
    <main class="wrap">
      <section class="card hero">
        <div class="hero-ic"><i class="bi bi-calendar-check"></i></div>
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
            <div class="box-val">24 giờ</div>
          </div>
        </div>

        <div class="cooldown" v-if="state.remaining>0">
          <i class="bi bi-hourglass-split"></i> Còn lại: <b>{{ fmt(state.remaining) }}</b>
        </div>

        <button class="btn" :disabled="!canClaim" @click="claim">
          <i v-if="busy || loading" class="bi bi-arrow-repeat spin"></i>
          <i v-else class="bi bi-check2-circle"></i>
          <span>{{ state.remaining>0 ? 'Chưa thể điểm danh' : 'Điểm danh +' + state.reward + ' HTW' }}</span>
        </button>

        <p v-if="msg" class="note">{{ msg }}</p>
      </section>
    </main>
    <BottomNav/>
  </div>
</template>

<style scoped>
.page{--bg:#0b0f1a;--card:#101826;--mut:#9aa3b2;--ring:1px solid rgba(148,163,184,.14);
  background:var(--bg);color:#e5e7eb;min-height:100dvh}
.topbar{position:sticky;top:0;z-index:10;padding:14px 16px;background:linear-gradient(180deg,rgba(11,15,26,.96),rgba(11,15,26,.7) 65%,transparent);backdrop-filter:blur(8px)}
.topbar h1{margin:0;font:800 20px/1 ui-sans-serif,system-ui}
.wrap{padding:16px 16px calc(92px + env(safe-area-inset-bottom))}
.card{background:#0f172a;border:var(--ring);border-radius:16px;padding:18px;box-shadow:0 10px 30px rgba(2,8,23,.35)}
.hero{display:flex;gap:12px;align-items:center}
.hero-ic{width:44px;height:44px;border-radius:12px;background:linear-gradient(145deg,#22c55e,#16a34a);display:grid;place-items:center}
.hero-t .label{font-size:12px;color:var(--mut)}
.hero-t .amount{font:800 22px/1.1 ui-sans-serif,system-ui}
.hero-t .amount span{font:700 12px;opacity:.85;margin-left:6px}
.row{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:8px}
.box{background:#0e1525;border:var(--ring);border-radius:12px;padding:12px}
.box-lbl{display:flex;align-items:center;gap:8px;color:#9aa3b2;font-size:12px}
.box-val{font:800 18px/1.1 ui-sans-serif,system-ui}
.cooldown{display:flex;align-items:center;gap:8px;color:#9fb2d0;margin:10px 0}
.btn{width:100%;padding:14px;border-radius:14px;border:none;color:#0b0f1a;font-weight:900;
  background:linear-gradient(145deg,#a7f3d0,#60a5fa);display:flex;align-items:center;justify-content:center;gap:8px}
.btn:disabled{opacity:.5;cursor:not-allowed}
.spin{animation:spin 1s linear infinite}@keyframes spin{to{transform:rotate(360deg)}}
.note{margin-top:10px;padding:10px;border-radius:10px;background:#0e1525;color:#cbd5e1;font-size:13px}
:global(.toast){position:fixed;top:calc(64px + env(safe-area-inset-top));left:50%;transform:translateX(-50%) translateY(-10px);
  background:linear-gradient(135deg,#22c55e,#10b981);color:#0b0f1a;padding:10px 14px;border-radius:12px;font-weight:800;font-size:13px;
  box-shadow:0 10px 30px rgba(16,185,129,.35);opacity:0;z-index:1000;transition:.2s}
:global(.toast.show){opacity:1;transform:translateX(-50%) translateY(0)}
@media (max-width:360px){.row{grid-template-columns:1fr}}
</style>
