<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import BottomNav from '../components/BottomNav.vue'

const router = useRouter()
const profile = ref(null)
const loading = ref(false)
const errorMsg = ref('')
const copied = ref(false) // hiệu ứng nhỏ khi copy

async function loadProfile() {
  try {
    loading.value = true
    const r = await fetch('/api/profile', { credentials: 'include' })
    if (!r.ok) throw new Error(await r.text())
    profile.value = await r.json()
  } catch (e) {
    errorMsg.value = 'Không tải được thông tin tài khoản.'
    console.error(e)
  } finally {
    loading.value = false
  }
}

const initials = computed(() => {
  const f = profile.value?.first_name?.[0] ?? ''
  const l = profile.value?.last_name?.[0] ?? ''
  const s = (f + l).trim()
  return (s || 'U').toUpperCase()
})

async function copyUID() {
  const id = profile.value?.id
  if (!id) return
  try { await navigator.clipboard?.writeText(String(id)) } catch {}
  copied.value = true
  setTimeout(() => (copied.value = false), 800)
}

function goWithdraw() { router.push({ name: 'withdraw' }) }
function goSwap()     { router.push({ name: 'swap' }) }
function openSupport() {
  const url = 'https://t.me/your_support_channel'
  if (window.Telegram?.WebApp?.openTelegramLink) {
    window.Telegram.WebApp.openTelegramLink(url)
  } else {
    window.open(url, '_blank')
  }
}

onMounted(loadProfile)
</script>

<template>
  <div class="page">
    <!-- Header -->
    <header class="top">
      <h1>Tài khoản</h1>
    </header>

    <main class="container">
      <!-- Loading -->
      <div v-if="loading" class="skeleton">
        <div class="sk-card sk-user"></div>
        <div class="sk-grid">
          <div class="sk-card"></div>
          <div class="sk-card"></div>
        </div>
        <div class="sk-list">
          <div class="sk-item"></div>
          <div class="sk-item"></div>
          <div class="sk-item"></div>
        </div>
      </div>

      <!-- Error -->
      <div v-else-if="errorMsg" class="error">
        <i class="bi bi-exclamation-triangle"></i>
        <p>{{ errorMsg }}</p>
      </div>

      <!-- Content -->
      <div v-else class="stack">
        <!-- User card -->
        <section class="card user">
          <div class="avatar-wrap">
            <span class="avatar">{{ initials }}</span>
            <span class="online"></span>
          </div>

          <div class="uinfo">
            <div class="name">{{ profile?.first_name }} {{ profile?.last_name }}</div>
            <div class="row">
              <span class="chip">UID: {{ profile?.id }}</span>
              <button class="icon-btn" title="Sao chép UID" @click="copyUID">
                <i v-if="!copied" class="bi bi-clipboard"></i>
                <i v-else class="bi bi-check2"></i>
              </button>
            </div>
            <div v-if="profile?.username" class="handle">@{{ profile.username }}</div>
          </div>
        </section>

        <!-- 2 cột số dư -->
        <section class="grid-2">
          <div class="stat htw">
            <div class="label">HTW</div>
            <div class="value">
              {{ (profile?.htw_balance ?? 0).toLocaleString() }}
              <span>HTW</span>
            </div>
          </div>

          <div class="stat vnd">
            <div class="label">VND</div>
            <div class="value">
              {{ (profile?.vnd_balance ?? 0).toLocaleString() }}
              <span>VND</span>
            </div>
          </div>
        </section>

        <!-- Danh sách chức năng -->
        <section class="list">
          <button class="item" @click="openSupport">
            <span class="ic ic-support"><i class="bi bi-headset"></i></span>
            <div class="meta">
              <div class="title">Hỗ trợ</div>
              <div class="sub">CSKH Telegram</div>
            </div>
            <i class="bi bi-chevron-right chev"></i>
          </button>

          <button class="item" @click="goWithdraw">
            <span class="ic ic-withdraw"><i class="bi bi-credit-card-2-front"></i></span>
            <div class="meta">
              <div class="title">Rút tiền</div>
              <div class="sub">Rút VND về tài khoản</div>
            </div>
            <i class="bi bi-chevron-right chev"></i>
          </button>

          <button class="item" @click="goSwap">
            <span class="ic ic-swap"><i class="bi bi-arrow-left-right"></i></span>
            <div class="meta">
              <div class="title">Đổi token</div>
              <div class="sub">HTW → VND</div>
            </div>
            <i class="bi bi-chevron-right chev"></i>
          </button>
        </section>
      </div>
    </main>

    <BottomNav />
  </div>
</template>

<style scoped>
* { box-sizing: border-box; }

/* ===== Theme ===== */
.page {
  --bg: #0b0f1a;
  --card: #101826;
  --card-2: #0d1422;
  --text: #e5e7eb;
  --muted: #9aa3b2;
  --ring: 0 0 0 1px rgba(148,163,184,.14);
  --brand: #60a5fa;
  --green: #10b981;
  --red: #ef4444;

  background: var(--bg);
  color: var(--text);
  min-height: 100dvh;            /* full màn hình, chống nhảy thanh URL */
  display: flex;
  flex-direction: column;
}

/* ===== Header ===== */
.top {
  position: sticky; top: 0; z-index: 10;
  padding: calc(10px + env(safe-area-inset-top)) 16px 8px;
  background: linear-gradient(180deg, rgba(11,15,26,.96), rgba(11,15,26,.7) 70%, transparent);
  backdrop-filter: blur(8px);
}
.top h1 {
  font-size: 20px; font-weight: 800; letter-spacing: .2px;
  text-align: center; margin: 0;
}

/* ===== Main container ===== */
.container {
  flex: 1;
  width: 100%;
  padding: 12px 16px calc(96px + env(safe-area-inset-bottom));
}

/* ===== Common ===== */
.stack { display: grid; gap: 14px; }
.card {
  background: var(--card);
  border-radius: 16px;
  padding: 14px;
  box-shadow: var(--ring);
}

/* ===== User card ===== */
.user {
  display: grid; grid-template-columns: 72px 1fr; gap: 12px; align-items: center;
}
.avatar-wrap { position: relative; width:72px; height:72px; }
.avatar {
  width: 72px; height: 72px; border-radius: 50%;
  display: grid; place-items: center;
  background: linear-gradient(145deg, #1f2937, #0b1220);
  border: 1px solid rgba(148,163,184,.18);
  font: 800 22px/1 ui-sans-serif, system-ui;
}
.online {
  position: absolute; right: 4px; bottom: 4px;
  width: 14px; height: 14px; border-radius: 50%;
  background: var(--green); border: 2px solid var(--card);
  box-shadow: 0 0 0 2px rgba(16,185,129,.25);
}
.uinfo .name { font-weight:700; font-size:16px; margin-bottom:4px; }
.row { display:flex; align-items:center; gap:8px; }
.chip {
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size:12px; color: var(--muted);
  background: var(--card-2);
  padding: 4px 8px; border-radius: 8px; border: 1px solid rgba(148,163,184,.12);
}
.icon-btn {
  border: 1px solid rgba(148,163,184,.14);
  background: transparent; color: var(--text);
  width: 30px; height: 30px; border-radius: 10px; display: grid; place-items: center;
}
.icon-btn:hover { background: rgba(148,163,184,.08); }
.handle { color: var(--brand); font-size: 13px; margin-top: 4px; }

/* ===== 2 columns balance ===== */
.grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.stat {
  border-radius: 16px; padding: 14px;
  position: relative; overflow: hidden;
  border: 1px solid rgba(148,163,184,.12);
}
.stat::after {
  content:""; position:absolute; inset:-30% -20% auto auto; width:120px; height:120px;
  background: radial-gradient(closest-side, rgba(255,255,255,.08), transparent 70%);
  transform: translate(16px,-16px); border-radius: 50%;
}
.stat .label { font-size: 12px; color: var(--muted); margin-bottom: 6px; }
.stat .value { font: 800 20px/1.1 ui-sans-serif, system-ui; }
.stat .value span { font: 700 12px/1.2 ui-sans-serif; opacity: .8; margin-left: 6px; }

.stat.htw { background: linear-gradient(180deg, #1b1530 0%, #151222 100%); }
.stat.vnd { background: linear-gradient(180deg, #0c2437 0%, #0b1b2b 100%); }

/* ===== Feature list ===== */
.list { display: grid; gap: 10px; }
.item {
  display: grid; grid-template-columns: 44px 1fr 18px; align-items: center;
  gap: 12px; padding: 12px; border-radius: 14px;
  background: var(--card); border: 1px solid rgba(148,163,184,.12);
  text-align: left;
}
.item:hover { background: #0f1a2a; }
.ic {
  width: 44px; height: 44px; border-radius: 12px; display:grid; place-items:center;
  color: #fff; font-size: 18px;
}
.ic-support  { background: linear-gradient(145deg, #0ea5e9, #2563eb); }
.ic-withdraw { background: linear-gradient(145deg, #059669, #10b981); }
.ic-swap     { background: linear-gradient(145deg, #7c3aed, #8b5cf6); }
.meta .title { font-weight: 700; font-size: 14px; }
.meta .sub   { font-size: 12px; color: var(--muted); margin-top: 2px; }
.chev { color: var(--muted); }

/* ===== Error ===== */
.error {
  display: grid; place-items: center; text-align: center;
  gap: 8px; padding: 56px 12px; color: var(--muted);
}
.error i { font-size: 28px; color: var(--red); }

/* ===== Skeleton ===== */
.skeleton { display: grid; gap: 14px; }
.sk-card, .sk-item {
  background: linear-gradient(90deg, rgba(255,255,255,.06), rgba(255,255,255,.12), rgba(255,255,255,.06));
  background-size: 200% 100%;
  animation: shimmer 1.3s infinite;
  border-radius: 14px; height: 64px;
}
.sk-user { height: 90px; }
.sk-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.sk-list { display: grid; gap: 10px; }
@keyframes shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

/* ===== Responsive ===== */
@media (max-width: 360px) {
  .grid-2 { grid-template-columns: 1fr; }
}
</style>
