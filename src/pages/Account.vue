<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import BottomNav from '../components/BottomNav.vue'

const router = useRouter()
const profile = ref(null)
const loading = ref(false)
const errorMsg = ref('')

// Load profile from your server API (reads Supabase via service role)
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
  return (f + l || 'U').toUpperCase()
})

function copyUID() {
  const id = profile.value?.id
  if (id) navigator.clipboard?.writeText(String(id))
}

function goWithdraw() {
  router.push({ name: 'withdraw' }) // -> /withdraw
}
function goSwap() {
  router.push({ name: 'swap' }) // -> /swap
}

// Optional: open support chat
function openSupport() {
  // đổi link theo kênh CSKH của bạn
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
  <div class="wrap">
    <h2>Tài khoản</h2>

    <div v-if="loading" class="card">Đang tải…</div>
    <div v-else-if="errorMsg" class="card err">{{ errorMsg }}</div>

    <div v-else class="stack">
      <!-- User card -->
      <div class="card user">
        <div class="avatar">{{ initials }}</div>
        <div class="uinfo">
          <div class="uname">
            {{ profile?.first_name }} {{ profile?.last_name }}
          </div>
          <div class="uid">
            UID: <span>{{ profile?.id }}</span>
            <button class="copy" title="Sao chép UID" @click="copyUID">📋</button>
          </div>
          <div v-if="profile?.username" class="handle">@{{ profile.username }}</div>
        </div>
      </div>

      <!-- Balances -->
      <div class="card bal">
        <div class="label">Số dư</div>
        <div class="value">
          <b>{{ (profile?.htw_balance ?? 0).toLocaleString() }}</b>&nbsp;HTW
        </div>
      </div>

      <div class="card bal">
        <div class="label">VND</div>
        <div class="value">
          <b>{{ (profile?.vnd_balance ?? 0).toLocaleString() }}</b>&nbsp;VND
        </div>
      </div>

      <!-- Menu items -->
      <div class="card item" @click="openSupport">
        <div class="left">
          <span class="ic">💬</span>
          <span class="text">CSKH Telegram</span>
        </div>
        <div class="chev">›</div>
      </div>

      <div class="card item" @click="goWithdraw">
        <div class="left">
          <span class="ic">💳</span>
          <span class="text">Rút VND</span>
        </div>
        <div class="chev">›</div>
      </div>

      <div class="card item" @click="goSwap">
        <div class="left">
          <span class="ic">🔄</span>
          <span class="text">HTW → VND</span>
        </div>
        <div class="chev">›</div>
      </div>
    </div>
  </div>
  <BottomNav/>
</template>

<style scoped>
.wrap { max-width: 720px; margin: 0 auto; padding: 16px; }
h2 { color: #fff; margin: 0 0 12px; }

.stack { display: flex; flex-direction: column; gap: 12px; }

.card {
  background: #0f172a;
  color: #fff;
  border: 1px solid #1f2a37;
  border-radius: 16px;
  padding: 16px;
}

.card.err { color: #fecaca; border-color: #7f1d1d; background: #1b0f12; }

.user { display: flex; align-items: center; gap: 12px; }
.avatar {
  width: 56px; height: 56px;
  border-radius: 50%;
  display: grid; place-items: center;
  background: #1f2a37; color: #fff; font-weight: 800;
}
.uinfo { display: flex; flex-direction: column; gap: 4px; }
.uname { font-weight: 700; font-size: 16px; }
.uid, .handle { opacity: .85; font-size: 13px; }
.copy {
  margin-left: 6px; font-size: 12px; line-height: 1;
  background: transparent; border: 0; color: #cbd5e1; cursor: pointer;
}

.bal { display: flex; justify-content: space-between; align-items: center; }
.bal .label { opacity: .9; }
.bal .value { font-size: 18px; }

.item {
  display: flex; align-items: center; justify-content: space-between;
  cursor: pointer; transition: background .15s ease;
}
.item:hover { background: #111a2f; }
.left { display: flex; align-items: center; gap: 10px; }
.ic { width: 22px; text-align: center; opacity: .9; }
.text { font-weight: 600; }
.chev { opacity: .6; font-size: 22px; line-height: 1; }
</style>
