<script setup>
import { ref, onMounted, onUnmounted, computed } from 'vue'
import BottomNav from '../components/BottomNav.vue'

/* ---------------- Mining (hiện có) ---------------- */
const state = ref({
  reward: 20,        // HTW/ lần đào
  cooldown: 1800,    // 30 phút
  remaining: 0,
  htw_balance: 0,
})

const busy = ref(false)
const loading = ref(true)
const msg = ref('')
const claimInProgress = ref(false) // ngăn double click

let timerId = null
const canClaim = computed(() =>
  !busy.value && !claimInProgress.value && state.value.remaining <= 0 && !loading.value
)

/* ========= Reward Ad (Adsgram) cho Mining ========= */
const rewardBlockId = String(import.meta.env.VITE_ADSGRAM_REWARD_BLOCK_ID || '')
const REWARD_SDK_URL = 'https://sad.adsgram.ai/js/sad.min.js'
const loadingRewardSdk = ref(false)

function loadRewardSdk() {
  if ([...document.scripts].some(s => s.src === REWARD_SDK_URL)) return Promise.resolve()
  loadingRewardSdk.value = true
  return new Promise((resolve, reject) => {
    const s = document.createElement('script')
    s.src = REWARD_SDK_URL
    s.async = true
    s.onload = () => { loadingRewardSdk.value = false; resolve() }
    s.onerror = (e) => { loadingRewardSdk.value = false; reject(e) }
    document.head.appendChild(s)
  })
}

async function showRewardAd() {
  if (!rewardBlockId) throw new Error('Thiếu VITE_ADSGRAM_REWARD_BLOCK_ID')
  await loadRewardSdk()
  const ctrl = window.Adsgram?.init?.({ blockId: String(rewardBlockId) })
  if (!ctrl) throw new Error('Không khởi tạo được Adsgram Reward')
  await ctrl.show()
}

/* ============ Mining logic ============ */
function startTicker() {
  stopTicker()
  timerId = setInterval(() => {
    if (state.value.remaining > 0) state.value.remaining--
    else stopTicker()
  }, 1000)
}
function stopTicker() { if (timerId) { clearInterval(timerId); timerId = null } }

async function loadStatus() {
  loading.value = true
  msg.value = ''
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
    if (state.value.remaining > 0) startTicker()
  } catch (e) {
    console.error(e); msg.value = 'Không tải được trạng thái mining.'
  } finally { loading.value = false }
}

async function claim() {
  if (!canClaim.value || claimInProgress.value) return
  claimInProgress.value = true
  busy.value = true
  msg.value = ''

  try {
    // 1) buộc xem quảng cáo
    await showRewardAd().catch((e) => {
      throw new Error(e?.message || 'Vui lòng xem quảng cáo để claim.')
    })

    // 2) gọi API claim
    const r = await fetch('/api/mine', { method: 'POST', credentials: 'include' })
    const data = await r.json().catch(() => ({}))

    if (!r.ok || data?.ok !== true) {
      const remain = Number(data?.remaining ?? state.value.cooldown)
      state.value.remaining = remain
      startTicker()
      msg.value = data?.ok === false ? 'Chưa hết thời gian chờ.' : 'Claim thất bại.'
      return
    }

    // OK
    state.value.htw_balance = Number(data.htw_balance ?? state.value.htw_balance)
    state.value.remaining = state.value.cooldown
    msg.value = `Nhận +${state.value.reward} HTW thành công!`
    startTicker()
  } catch (e) {
    console.error(e); msg.value = e?.message || 'Claim thất bại, thử lại sau.'
  } finally {
    busy.value = false
    setTimeout(() => { claimInProgress.value = false }, 2000) // chống spam
  }
}

/* ---------------- Chest (mở rương) + Monetag ---------------- */
const chest = ref({ reward: 10, cooldown: 1800, remaining: 0 }) // 30 phút
const chestBusy = ref(false)
const chestLoading = ref(true)
const chestMsg = ref('')
const chestClaimInProgress = ref(false)
let chestTimerId = null

const canOpenChest = computed(() =>
  !chestBusy.value &&
  !chestClaimInProgress.value &&
  chest.value.remaining <= 0 &&
  !chestLoading.value
)

// Monetag: tạo hàm global show_<ZONE> từ snippet chính thức
const MONETAG_ZONE = String(import.meta.env.VITE_MONETAG_ZONE_ID || '')
const MONETAG_SRC  = String(import.meta.env.VITE_MONETAG_SDK_URL  || '')
const monetagShowFnName = MONETAG_ZONE ? `show_${MONETAG_ZONE}` : ''
const loadingMonetagSdk = ref(false)

function loadMonetagSdk() {
  if (!MONETAG_SRC || !MONETAG_ZONE) {
    return Promise.reject(new Error('Thiếu VITE_MONETAG_SRC / VITE_MONETAG_ZONE'))
  }
  if ([...document.scripts].some(s => s.src.includes('lib1t.com/sdk.js'))) {
    return Promise.resolve()
  }
  loadingMonetagSdk.value = true
  return new Promise((resolve, reject) => {
    const s = document.createElement('script')
    s.src = MONETAG_SRC
    s.async = true
    s.setAttribute('data-zone', MONETAG_ZONE)
    s.setAttribute('data-sdk', monetagShowFnName)
    s.onload  = () => { loadingMonetagSdk.value = false; resolve() }
    s.onerror = (e)  => { loadingMonetagSdk.value = false; reject(e) }
    document.head.appendChild(s)
  })
}

const MIN_REWARD_MS = Number(import.meta.env.VITE_MONETAG_MIN_VIEW_MS || 12000); // 12s

function showMonetagReward() {
  return new Promise(async (resolve, reject) => {
    try {
      await loadMonetagSdk();
      const fn = window[monetagShowFnName];
      if (typeof fn !== 'function') return reject(new Error('Monetag SDK chưa khởi tạo'));

      const started = Date.now();
      let rewarded = false;
      let closed = false;

      const ret = fn({
        onRewarded: () => {
          rewarded = true;
          resolve(true);
        },
        onClose: () => {
          closed = true;
          if (!rewarded) {
            // Nếu chỉ có onClose thì kiểm tra thời gian xem tối thiểu
            const elapsed = Date.now() - started;
            if (elapsed >= MIN_REWARD_MS) resolve(true);
            else reject(new Error('Bạn đóng quá nhanh, vui lòng xem hết quảng cáo.'));
          }
        }
      });

      // Nếu SDK KHÔNG nhận options mà chỉ trả Promise (đóng = resolve),
      // dùng ngưỡng thời gian để lọc.
      if (ret && typeof ret.then === 'function') {
        ret.then(() => {
          if (rewarded) return; // đã onRewarded
          const elapsed = Date.now() - started;
          if (elapsed >= MIN_REWARD_MS) resolve(true);
          else reject(new Error('Bạn đóng quá nhanh, vui lòng xem hết quảng cáo.'));
        }).catch(reject);
      }
    } catch (e) {
      reject(e);
    }
  });
}


/* Chest ticker */
function startChestTicker() {
  stopChestTicker()
  chestTimerId = setInterval(() => {
    if (chest.value.remaining > 0) chest.value.remaining--
    else stopChestTicker()
  }, 1000)
}
function stopChestTicker() { if (chestTimerId) { clearInterval(chestTimerId); chestTimerId = null } }

/* Lấy trạng thái rương (cooldown riêng) */
async function loadChestStatus() {
  chestLoading.value = true
  chestMsg.value = ''
  try {
    const r = await fetch('/api/chest', { credentials: 'include' })
    if (!r.ok) throw new Error(await r.text())
    const data = await r.json()
    chest.value = {
      reward: Number(data.reward ?? chest.value.reward),
      cooldown: Number(data.cooldown ?? 1800),
      remaining: Number(data.remaining ?? 0),
    }
    if (chest.value.remaining > 0) startChestTicker()
  } catch (e) {
    console.error(e); chestMsg.value = 'Không tải được trạng thái rương.'
  } finally { chestLoading.value = false }
}

/* Mở rương: chỉ gọi API khi Monetag báo onRewarded() */
async function openChest() {
  if (!canOpenChest.value || chestClaimInProgress.value) return
  chestClaimInProgress.value = true
  chestBusy.value = true
  chestMsg.value = ''
  try {
    await showMonetagReward().catch(err => { throw new Error(err?.message || 'Vui lòng xem hết quảng cáo để mở rương.') })

    // sau khi rewarded -> gọi API mở rương
    const r = await fetch('/api/chest', { method: 'POST', credentials: 'include' })
    const data = await r.json().catch(() => ({}))

    if (!r.ok || data?.ok !== true) {
      const remain = Number(data?.remaining ?? chest.value.cooldown)
      chest.value.remaining = remain; startChestTicker()
      chestMsg.value = data?.ok === false ? 'Chưa hết thời gian chờ rương.' : 'Mở rương thất bại.'
      return
    }

    // OK
    state.value.htw_balance = Number(data.htw_balance ?? state.value.htw_balance)
    chest.value.remaining = chest.value.cooldown
    chestMsg.value = `Mở rương nhận +${chest.value.reward} HTW thành công!`
    startChestTicker()
  } catch (e) {
    chestMsg.value = e?.message || 'Mở rương thất bại, thử lại sau.'
  } finally {
    chestBusy.value = false
    setTimeout(() => { chestClaimInProgress.value = false }, 2000)
  }
}

/* Mount/Unmount */
onMounted(() => { loadStatus(); loadChestStatus() })
onUnmounted(() => { stopTicker(); stopChestTicker() })

function fmtTime(sec) {
  const m = Math.floor(sec / 60).toString().padStart(2, '0')
  const s = Math.floor(sec % 60).toString().padStart(2, '0')
  return `${m}:${s}`
}
</script>

<template>
  <div class="page">
    <header class="topbar">
      <h1>Mining</h1>
      <span class="spacer"></span>
    </header>

    <main class="wrap">
      <!-- Số dư -->
      <section class="card hero">
        <div class="hero-ic"><i class="bi bi-lightning-charge"></i></div>
        <div class="hero-t">
          <div class="label">Số dư HTW</div>
          <div class="amount">{{ state.htw_balance.toLocaleString() }} <span>HTW</span></div>
        </div>
      </section>

      <!-- Mining -->
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

        <button class="btn" :disabled="!canClaim || loading || loadingRewardSdk" @click="claim">
          <i v-if="busy || loading || loadingRewardSdk" class="bi bi-arrow-repeat spin"></i>
          <i v-else class="bi bi-box-arrow-in-down"></i>
          <span>{{ state.remaining > 0 ? 'Chưa thể claim' : 'Claim +' + state.reward + ' HTW' }}</span>
        </button>

        <p v-if="!rewardBlockId" class="note warn">
          ⚠️ Thiếu <b>VITE_ADSGRAM_REWARD_BLOCK_ID</b> nên không thể hiển thị quảng cáo Reward.
        </p>
        <p v-if="msg" class="note" :class="{ success: msg.includes('thành công') }">{{ msg }}</p>
      </section>

      <!-- Chest (mở rương) -->
      <section class="card">
        <div class="row">
          <div class="box">
            <div class="box-lbl"><i class="bi bi-gift"></i> Phần thưởng</div>
            <div class="box-val">+{{ chest.reward }} HTW</div>
          </div>
          <div class="box">
            <div class="box-lbl"><i class="bi bi-clock-history"></i> Chu kỳ</div>
            <div class="box-val">30 phút</div>
          </div>
        </div>

        <div class="cooldown" v-if="chest.remaining > 0">
          <i class="bi bi-hourglass-split"></i>
          Còn lại: <b>{{ fmtTime(chest.remaining) }}</b>
        </div>

        <button class="btn" :disabled="!canOpenChest || chestLoading || loadingMonetagSdk" @click="openChest">
          <i v-if="chestBusy || chestLoading || loadingMonetagSdk" class="bi bi-arrow-repeat spin"></i>
          <i v-else class="bi bi-gift"></i>
          <span>{{ chest.remaining > 0 ? 'Chưa thể mở rương' : 'Mở rương +' + chest.reward + ' HTW' }}</span>
        </button>

        <p v-if="!MONETAG_SRC || !MONETAG_ZONE" class="note warn">
          ⚠️ Thiếu cấu hình Monetag (<code>VITE_MONETAG_SRC</code> / <code>VITE_MONETAG_ZONE</code>).
        </p>
        <p v-if="chestMsg" class="note" :class="{ success: chestMsg.includes('thành công') }">{{ chestMsg }}</p>
      </section>

      <section v-if="loading || chestLoading" class="card center">
        <i class="bi bi-hourglass-split big spin"></i>
        <div>Đang tải…</div>
      </section>
    </main>
  </div>
  <BottomNav />
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
  transition: opacity 0.2s;
}
.btn:disabled{opacity:.5; cursor: not-allowed;}
.btn:not(:disabled):active{opacity:.8}

.spin{animation:spin 1s linear infinite}
@keyframes spin{to{transform:rotate(360deg)}}

.note{
  margin-top:10px; padding:10px 12px; border-radius:10px;
  background:#0e1525; color:#cbd5e1; font-size:13px;
}
.note.warn{background:#422006; color:#fed7aa; border:1px solid #92400e}
.note.success{background:#064e3b; color:#a7f3d0; border:1px solid #065f46}

@media (max-width:360px){ .row{grid-template-columns:1fr} }
</style>
