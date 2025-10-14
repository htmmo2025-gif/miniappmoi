<script setup>
import { ref, onMounted, onUnmounted, computed } from 'vue'
import BottomNav from '../components/BottomNav.vue'

/* ---------------- Mining (hiện có) ---------------- */
const state = ref({
  reward: 5,        // HTW/ lần đào
  cooldown: 1200,   // 20 phút
  remaining: 0,
  htw_balance: 0,
  today: 0,         // NEW: hôm nay đã claim
  limit: 50,        // NEW: giới hạn/ngày
})

const busy = ref(false)
const loading = ref(true)
const msg = ref('')
const claimInProgress = ref(false)

let timerId = null
const canClaim = computed(() =>
  !busy.value &&
  !claimInProgress.value &&
  state.value.remaining <= 0 &&
  !loading.value &&
  state.value.today < state.value.limit // NEW: chặn khi đạt limit
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
      reward: Number(data.reward ?? state.value.reward),
      cooldown: Number(data.cooldown ?? state.value.cooldown),
      remaining: Number(data.remaining ?? 0),
      htw_balance: Number(data.htw_balance ?? 0),
      today: Number(data.today ?? 0),                // NEW
      limit: Number(data.daily_limit ?? 50),         // NEW
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
    // buộc xem quảng cáo (Adsgram)
    await showRewardAd().catch((e) => { throw new Error(e?.message || 'Vui lòng xem quảng cáo để claim.') })

    // gọi API claim mining
    const r = await fetch('/api/mine', { method: 'POST', credentials: 'include' })
    const data = await r.json().catch(() => ({}))

    if (!r.ok || data?.ok !== true) {
      const remain = Number(data?.remaining ?? state.value.cooldown)
      state.value.remaining = remain
      state.value.today = Number(data?.today_count ?? state.value.today) // NEW: cập nhật đếm ngày khi fail
      startTicker()
      msg.value = data?.ok === false
        ? (state.value.today >= state.value.limit ? 'Hôm nay đã đủ 50 lần.' : 'Chưa hết thời gian chờ.')
        : 'Claim thất bại.'
      return
    }

    // OK
    state.value.htw_balance = Number(data.htw_balance ?? state.value.htw_balance)
    state.value.remaining = state.value.cooldown
    state.value.today = Math.min(state.value.today + 1, state.value.limit) // NEW: tăng đếm ngày
    msg.value = `Nhận +${state.value.reward} HTW thành công!`
    startTicker()
  } catch (e) {
    console.error(e); msg.value = e?.message || 'Claim thất bại, thử lại sau.'
  } finally {
    busy.value = false
    setTimeout(() => { claimInProgress.value = false }, 2000)
  }
}

/* ---------------- Chest (mở rương) + Monetag ---------------- */
const chest = ref({ reward: 5, cooldown: 1200, remaining: 0, today: 0, limit: 50 }) // NEW: today/limit
const chestBusy = ref(false)
const chestLoading = ref(true)
const chestMsg = ref('')
const chestClaimInProgress = ref(false)
let chestTimerId = null

const canOpenChest = computed(() =>
  !chestBusy.value &&
  !chestClaimInProgress.value &&
  chest.value.remaining <= 0 &&
  !chestLoading.value &&
  chest.value.today < chest.value.limit // NEW
)

const MONETAG_ZONE = String(import.meta.env.VITE_MONETAG_ZONE_ID || '')
const MONETAG_SRC  = String(import.meta.env.VITE_MONETAG_SDK_URL  || '')
const monetagShowFnName = MONETAG_ZONE ? `show_${MONETAG_ZONE}` : ''
const loadingMonetagSdk = ref(false)

function loadMonetagSdk() {
  if (!MONETAG_SRC || !MONETAG_ZONE) return Promise.reject(new Error('Thiếu VITE_MONETAG_SRC / VITE_MONETAG_ZONE'))
  if ([...document.scripts].some(s => s.src === MONETAG_SRC)) return Promise.resolve()
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

const MIN_REWARD_MS = Number(import.meta.env.VITE_MONETAG_MIN_VIEW_MS || 12000) // 12s
function showMonetagReward() {
  return new Promise(async (resolve, reject) => {
    try {
      await loadMonetagSdk()
      const fn = window[monetagShowFnName]
      if (typeof fn !== 'function') return reject(new Error('Monetag SDK chưa khởi tạo'))

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

/* Chest ticker */
function startChestTicker() {
  stopChestTicker()
  chestTimerId = setInterval(() => {
    if (chest.value.remaining > 0) chest.value.remaining--
    else stopChestTicker()
  }, 1000)
}
function stopChestTicker() { if (chestTimerId) { clearInterval(chestTimerId); chestTimerId = null } }

async function loadChestStatus() {
  chestLoading.value = true
  chestMsg.value = ''
  try {
    const r = await fetch('/api/chest', { credentials: 'include' })
    if (!r.ok) throw new Error(await r.text())
    const data = await r.json()
    chest.value = {
      reward: Number(data.reward ?? chest.value.reward),
      cooldown: Number(data.cooldown ?? 1200),
      remaining: Number(data.remaining ?? 0),
      today: Number(data.today ?? 0),                 // NEW
      limit: Number(data.daily_limit ?? chest.value.limit), // NEW
    }
    if (chest.value.remaining > 0) startChestTicker()
  } catch (e) {
    console.error(e); chestMsg.value = 'Không tải được trạng thái rương.'
  } finally { chestLoading.value = false }
}

async function openChest() {
  if (!canOpenChest.value || chestClaimInProgress.value) return
  chestClaimInProgress.value = true
  chestBusy.value = true
  chestMsg.value = ''
  try {
    await showMonetagReward().catch(err => { throw new Error(err?.message || 'Vui lòng xem hết quảng cáo để mở rương.') })

    const r = await fetch('/api/chest', { method: 'POST', credentials: 'include' })
    const data = await r.json().catch(() => ({}))

    if (!r.ok || data?.ok !== true) {
      const remain = Number(data?.remaining ?? chest.value.cooldown)
      chest.value.remaining = remain; startChestTicker()
      chest.value.today = Number(data?.today_count ?? chest.value.today) // NEW
      chestMsg.value = data?.ok === false
        ? (chest.value.today >= chest.value.limit ? 'Hôm nay đã đủ 50 lần.' : 'Chưa hết thời gian chờ rương.')
        : 'Mở rương thất bại.'
      return
    }

    state.value.htw_balance = Number(data.htw_balance ?? state.value.htw_balance)
    chest.value.remaining = chest.value.cooldown
    chest.value.today = Math.min(chest.value.today + 1, chest.value.limit) // NEW
    chestMsg.value = `Mở rương nhận +${chest.value.reward} HTW thành công!`
    startChestTicker()
  } catch (e) {
    chestMsg.value = e?.message || 'Mở rương thất bại, thử lại sau.'
  } finally {
    chestBusy.value = false
    setTimeout(() => { chestClaimInProgress.value = false }, 2000)
  }
}

/* ---------------- NEW: Adsgram task (2 HTW, 10p, 10 lần/ngày) ---------------- */
const ads = ref({ reward: 1, cooldown: 600, remaining: 0, today: 0, limit: 10 })
const adsBusy = ref(false)
const adsMsg = ref('')
let adsTimer = null
const canAds = computed(() => !adsBusy.value && ads.value.remaining <= 0 && ads.value.today < ads.value.limit)

function startAdsTicker(){ stopAdsTicker(); adsTimer=setInterval(()=>{ if(ads.value.remaining>0) ads.value.remaining--; else stopAdsTicker() },1000) }
function stopAdsTicker(){ if(adsTimer){ clearInterval(adsTimer); adsTimer=null } }

async function loadAdsStatus(){
  try{
    const r = await fetch('/api/watchadsgram', { credentials:'include' })
    if (r.ok){
      const j = await r.json()
      ads.value.reward    = Number(j?.reward ?? ads.value.reward)
      ads.value.cooldown  = Number(j?.cooldown ?? ads.value.cooldown)
      ads.value.remaining = Number(j?.remaining ?? 0)
      ads.value.today     = Number(j?.today ?? 0)
      ads.value.limit     = Number(j?.daily_limit ?? j?.limit ?? 10)
      if (ads.value.remaining>0) startAdsTicker()
    }
  }catch{}
}
async function claimAds(){
  if (!canAds.value) return
  adsBusy.value = true; adsMsg.value=''
  try{
    await showRewardAd().catch(err => { throw new Error(err?.message || 'Vui lòng xem hết quảng cáo để nhận thưởng.') })
    const r = await fetch('/api/watchadsgram', { method:'POST', credentials:'include', headers:{'content-type':'application/json'} })
    const j = await r.json().catch(()=> ({}))
    if (!r.ok || j?.ok!==true){
      ads.value.remaining = Number(j?.remaining ?? ads.value.cooldown)
      ads.value.today     = Number(j?.today_count ?? ads.value.today)
      startAdsTicker()
      adsMsg.value = ads.value.today >= ads.value.limit ? 'Hôm nay đã đủ 10 lần.' : 'Hãy đợi đủ thời gian nhé.'
      return
    }
    ads.value.remaining = ads.value.cooldown
    ads.value.today = Math.min(ads.value.today + 1, ads.value.limit)
    state.value.htw_balance = Number(j?.new_balance ?? state.value.htw_balance)
    startAdsTicker()
    adsMsg.value = `+${ads.value.reward} HTW`
  }catch(e){
    adsMsg.value = e?.message || 'Không thể nhận thưởng.'
  }finally{
    adsBusy.value = false
  }
}

/* ---------------- NEW: Montag task (2 HTW, 10p, 10 lần/ngày) ---------------- */
const mtg = ref({ reward: 1, cooldown: 600, remaining: 0, today: 0, limit: 10 })
const mtgBusy = ref(false)
const mtgMsg = ref('')
let mtgTimer = null
const canMtg = computed(() => !mtgBusy.value && mtg.value.remaining <= 0 && mtg.value.today < mtg.value.limit)

function startMtgTicker(){ stopMtgTicker(); mtgTimer=setInterval(()=>{ if(mtg.value.remaining>0) mtg.value.remaining--; else stopMtgTicker() },1000) }
function stopMtgTicker(){ if(mtgTimer){ clearInterval(mtgTimer); mtgTimer=null } }

async function loadMtgStatus(){
  try{
    const r = await fetch('/api/watchadsmontag', { credentials:'include' })
    if (r.ok){
      const j = await r.json()
      mtg.value.reward    = Number(j?.reward ?? mtg.value.reward)
      mtg.value.cooldown  = Number(j?.cooldown ?? mtg.value.cooldown)
      mtg.value.remaining = Number(j?.remaining ?? 0)
      mtg.value.today     = Number(j?.today ?? 0)
      mtg.value.limit     = Number(j?.daily_limit ?? j?.limit ?? 10)
      if (mtg.value.remaining>0) startMtgTicker()
    }
  }catch{}
}
async function claimMtg(){
  if (!canMtg.value) return
  mtgBusy.value = true; mtgMsg.value=''
  try{
    await showMonetagReward().catch(err => { throw new Error(err?.message || 'Vui lòng xem hết quảng cáo để nhận thưởng.') })
    const r = await fetch('/api/watchadsmontag', { method:'POST', credentials:'include', headers:{'content-type':'application/json'} })
    const j = await r.json().catch(()=> ({}))
    if (!r.ok || j?.ok!==true){
      mtg.value.remaining = Number(j?.remaining ?? mtg.value.cooldown)
      mtg.value.today     = Number(j?.today_count ?? mtg.value.today)
      startMtgTicker()
      mtgMsg.value = mtg.value.today >= mtg.value.limit ? 'Hôm nay đã đủ 10 lần.' : 'Hãy đợi đủ thời gian nhé.'
      return
    }
    mtg.value.remaining = mtg.value.cooldown
    mtg.value.today = Math.min(mtg.value.today + 1, mtg.value.limit)
    state.value.htw_balance = Number(j?.new_balance ?? state.value.htw_balance)
    startMtgTicker()
    mtgMsg.value = `+${mtg.value.reward} HTW`
  }catch(e){
    mtgMsg.value = e?.message || 'Không thể nhận thưởng.'
  }finally{
    mtgBusy.value = false
  }
}

/* Mount/Unmount */
onMounted(() => {
  loadStatus()
  loadChestStatus()
  loadAdsStatus()
  loadMtgStatus()
})
onUnmounted(() => { stopTicker(); stopChestTicker(); stopAdsTicker(); stopMtgTicker() })

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
            <div class="box-val">20 phút</div>
          </div>
        </div>

        <div class="cooldown">
          <template v-if="state.remaining > 0">
            <i class="bi bi-hourglass-split"></i>
            Còn lại: <b>{{ fmtTime(state.remaining) }}</b>
            <span class="mut"> • Hôm nay: {{ state.today }}/{{ state.limit }}</span>
          </template>
          <template v-else>
            <span class="mut">Hôm nay: {{ state.today }}/{{ state.limit }}</span>
          </template>
        </div>

        <button class="btn" :disabled="!canClaim || loading || loadingRewardSdk" @click="claim">
          <i v-if="busy || loading || loadingRewardSdk" class="bi bi-arrow-repeat spin"></i>
          <i v-else class="bi bi-box-arrow-in-down"></i>
          <span>
            {{ state.today>=state.limit ? 'Đã đạt ' + state.limit + ' lần' : (state.remaining > 0 ? 'Chưa thể claim' : 'Claim +' + state.reward + ' HTW') }}
          </span>
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
            <div class="box-val">20 phút</div>
          </div>
        </div>

        <div class="cooldown">
          <template v-if="chest.remaining > 0">
            <i class="bi bi-hourglass-split"></i>
            Còn lại: <b>{{ fmtTime(chest.remaining) }}</b>
            <span class="mut"> • Hôm nay: {{ chest.today }}/{{ chest.limit }}</span>
          </template>
          <template v-else>
            <span class="mut">Hôm nay: {{ chest.today }}/{{ chest.limit }}</span>
          </template>
        </div>

        <button class="btn" :disabled="!canOpenChest || chestLoading || loadingMonetagSdk" @click="openChest">
          <i v-if="chestBusy || chestLoading || loadingMonetagSdk" class="bi bi-arrow-repeat spin"></i>
          <i v-else class="bi bi-gift"></i>
          <span>
            {{ chest.today>=chest.limit ? 'Đã đạt ' + chest.limit + ' lần' : (chest.remaining > 0 ? 'Chưa thể mở rương' : 'Mở rương +' + chest.reward + ' HTW') }}
          </span>
        </button>

        <p v-if="!MONETAG_SRC || !MONETAG_ZONE" class="note warn">
          ⚠️ Thiếu cấu hình Monetag (<code>VITE_MONETAG_SRC</code> / <code>VITE_MONETAG_ZONE</code>).
        </p>
        <p v-if="chestMsg" class="note" :class="{ success: chestMsg.includes('thành công') }">{{ chestMsg }}</p>
      </section>

      <!-- NEW: Adsgram (2 HTW • 10p • 10 lần/ngày) -->
      <section class="card">
        <div class="row">
          <div class="box">
            <div class="box-lbl"><i class="bi bi-badge-ad"></i> Quảng cáo</div>
            <div class="box-val">+{{ ads.reward }} HTW</div>
          </div>
          <div class="box">
            <div class="box-lbl"><i class="bi bi-clock-history"></i> Chu kỳ</div>
            <div class="box-val">10 phút</div>
          </div>
        </div>

        <div class="cooldown" v-if="ads.remaining > 0">
          <i class="bi bi-hourglass-split"></i>
          Còn lại: <b>{{ fmtTime(ads.remaining) }}</b>
          <span class="mut"> • Hôm nay: {{ ads.today }}/{{ ads.limit }}</span>
        </div>
        <div class="cooldown" v-else>
          <span class="mut">Hôm nay: {{ ads.today }}/{{ ads.limit }}</span>
        </div>

        <button class="btn" :disabled="!canAds" @click="claimAds">
          <i v-if="adsBusy" class="bi bi-arrow-repeat spin"></i>
          <i v-else class="bi bi-play-circle"></i>
          <span>{{ ads.today>=ads.limit ? 'Đã đạt 10 lần' : (ads.remaining>0 ? 'Chưa thể nhận' : 'Xem + nhận ' + ads.reward + ' HTW') }}</span>
        </button>

        <p v-if="adsMsg" class="note" :class="{ success: adsMsg.startsWith('+') }">{{ adsMsg }}</p>
      </section>

      <!-- NEW: Montag (2 HTW • 10p • 10 lần/ngày) -->
      <section class="card">
        <div class="row">
          <div class="box">
            <div class="box-lbl"><i class="bi bi-badge-ad"></i> Quảng cáo</div>
            <div class="box-val">+{{ mtg.reward }} HTW</div>
          </div>
          <div class="box">
            <div class="box-lbl"><i class="bi bi-clock-history"></i> Chu kỳ</div>
            <div class="box-val">10 phút</div>
          </div>
        </div>

        <div class="cooldown" v-if="mtg.remaining > 0">
          <i class="bi bi-hourglass-split"></i>
          Còn lại: <b>{{ fmtTime(mtg.remaining) }}</b>
          <span class="mut"> • Hôm nay: {{ mtg.today }}/{{ mtg.limit }}</span>
        </div>
        <div class="cooldown" v-else>
          <span class="mut">Hôm nay: {{ mtg.today }}/{{ mtg.limit }}</span>
        </div>

        <button class="btn" :disabled="!canMtg" @click="claimMtg">
          <i v-if="mtgBusy" class="bi bi-arrow-repeat spin"></i>
          <i v-else class="bi bi-play-circle"></i>
          <span>{{ mtg.today>=mtg.limit ? 'Đã đạt 10 lần' : (mtg.remaining>0 ? 'Chưa thể nhận' : 'Xem + nhận ' + mtg.reward + ' HTW') }}</span>
        </button>

        <p v-if="mtgMsg" class="note" :class="{ success: mtgMsg.startsWith('+') }">{{ mtgMsg }}</p>
      </section>

      <section v-if="loading || chestLoading" class="card center">
        <i class="bi bi-hourglass-split big spin"></i>
        <div>Đang tải…</div>
      </section>
    </main>

    <BottomNav/>
  </div>
</template>

<style scoped>
.page{
  --bg:#0b0f1a; --card:#101826; --mut:#9aa3b2; --ring:1px solid rgba(148,163,184,.14);
  background:var(--bg); color:#e5e7eb;
  width:100%;
  min-height:100vh;
  overflow-y:auto;
  -webkit-overflow-scrolling: touch;
}
.topbar{ position:sticky; top:0; z-index:10; padding-block:calc(10px + env(safe-area-inset-top)) 10px;
  padding-left:max(16px, env(safe-area-inset-left)); padding-right:max(16px, env(safe-area-inset-right));
  display:flex; align-items:center; gap:10px;
  background:linear-gradient(180deg, rgba(11,15,26,.96), rgba(11,15,26,.7) 65%, transparent);
  backdrop-filter:blur(8px) }
.topbar h1{ margin:0; font:800 20px/1 ui-sans-serif,system-ui }
.spacer{ flex:1 }

.wrap{ width:100%; padding-top:12px;
  padding-bottom:calc(88px + env(safe-area-inset-bottom));
  padding-left:max(16px, env(safe-area-inset-left)); padding-right:max(16px, env(safe-area-inset-right));
  display:grid; gap:14px }

.card{ width:100%; margin-inline:0; overflow:hidden; background:#0f172a; border:var(--ring);
  border-radius:14px; padding:16px; box-shadow:0 10px 30px rgba(2,8,23,.35) }
.card.center{ display:grid; place-items:center; gap:10px; padding:28px }
.big{ font-size:38px }

.hero{ display:flex; gap:12px; align-items:center }
.hero-ic{ width:44px; height:44px; border-radius:12px; background:linear-gradient(145deg,#06b6d4,#2563eb); display:grid; place-items:center }
.hero-t .label{ font-size:12px; color:var(--mut) }
.hero-t .amount{ font:800 22px/1.1 ui-sans-serif,system-ui }
.hero-t .amount span{ font:700 12px; opacity:.85; margin-left:6px }

.row{ display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-bottom:8px }
.box{ background:#0e1525; border:var(--ring); border-radius:12px; padding:12px }
.box-lbl{ display:flex; align-items:center; gap:8px; color:#9aa3b2; font-size:12px }
.box-val{ font:800 18px/1.1 ui-sans-serif,system-ui }

.cooldown{ display:flex; align-items:center; gap:8px; color:#9fb2d0; margin:10px 0; flex-wrap:wrap }
.mut{ color:var(--mut) }

.btn{ width:100%; padding:14px; border-radius:14px; border:none; color:#0b0f1a; font-weight:900;
  background:linear-gradient(145deg,#fde68a,#60a5fa); display:flex; align-items:center; justify-content:center; gap:8px; transition:opacity .2s }
.btn:disabled{ opacity:.5; cursor:not-allowed }
.btn:not(:disabled):active{ opacity:.8 }

.spin{ animation:spin 1s linear infinite }
@keyframes spin{ to{ transform:rotate(360deg) } }

.note{ margin-top:10px; padding:10px 12px; border-radius:10px; background:#0e1525; color:#cbd5e1; font-size:13px }
.note.warn{ background:#422006; color:#fed7aa; border:1px solid #92400e }
.note.success{ background:#064e3b; color:#a7f3d0; border:1px solid #065f46 }

@media (max-width:360px){ .row{ grid-template-columns:1fr } }
</style>
