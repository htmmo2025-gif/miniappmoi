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
  if (id) {
    navigator.clipboard?.writeText(String(id))
    // Show toast notification
    showToast('UID đã được sao chép!')
  }
}

function showToast(message) {
  // Simple toast implementation
  const toast = document.createElement('div')
  toast.className = 'toast-notification'
  toast.textContent = message
  document.body.appendChild(toast)
  
  setTimeout(() => {
    toast.classList.add('show')
  }, 100)
  
  setTimeout(() => {
    toast.classList.remove('show')
    setTimeout(() => document.body.removeChild(toast), 300)
  }, 2000)
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
  <div class="account-page">
    <!-- Header -->
    <div class="header">
      <h1 class="title">
        <i class="bi bi-person-circle"></i>
        Tài khoản
      </h1>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="loading-container">
      <div class="loading-spinner">
        <i class="bi bi-arrow-clockwise spin"></i>
      </div>
      <p>Đang tải thông tin...</p>
    </div>

    <!-- Error State -->
    <div v-else-if="errorMsg" class="error-container">
      <div class="error-icon">
        <i class="bi bi-exclamation-triangle"></i>
      </div>
      <p>{{ errorMsg }}</p>
    </div>

    <!-- Main Content -->
    <div v-else class="content">
      <!-- User Profile Card -->
      <div class="profile-card">
        <div class="profile-header">
          <div class="avatar-container">
            <div class="avatar">{{ initials }}</div>
            <div class="status-dot"></div>
          </div>
          <div class="user-info">
            <h2 class="username">
              {{ profile?.first_name }} {{ profile?.last_name }}
            </h2>
            <div class="uid-section">
              <span class="uid-label">UID:</span>
              <span class="uid-value">{{ profile?.id }}</span>
              <button class="copy-btn" @click="copyUID">
                <i class="bi bi-clipboard"></i>
              </button>
            </div>
            <div v-if="profile?.username" class="handle">
              <i class="bi bi-at"></i>
              {{ profile.username }}
            </div>
          </div>
        </div>
      </div>

      <!-- Balance Cards -->
      <div class="balance-section">
        <div class="section-title">
          <i class="bi bi-wallet2"></i>
          Số dư tài khoản
        </div>
        
        <div class="balance-grid">
          <div class="balance-card htw">
            <div class="balance-header">
              <div class="balance-icon">
                <i class="bi bi-gem"></i>
              </div>
              <span class="balance-label">HTW Token</span>
            </div>
            <div class="balance-value">
              {{ (profile?.htw_balance ?? 0).toLocaleString() }}
              <span class="currency">HTW</span>
            </div>
          </div>

          <div class="balance-card vnd">
            <div class="balance-header">
              <div class="balance-icon">
                <i class="bi bi-cash-coin"></i>
              </div>
              <span class="balance-label">Tiền Việt</span>
            </div>
            <div class="balance-value">
              {{ (profile?.vnd_balance ?? 0).toLocaleString() }}
              <span class="currency">VND</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Action Menu -->
      <div class="menu-section">
        <div class="section-title">
          <i class="bi bi-grid-3x3-gap"></i>
          Chức năng
        </div>

        <div class="menu-grid">
          <button class="menu-item support" @click="openSupport">
            <div class="menu-icon">
              <i class="bi bi-headset"></i>
            </div>
            <div class="menu-text">
              <span class="menu-title">Hỗ trợ</span>
              <span class="menu-desc">CSKH Telegram</span>
            </div>
            <div class="menu-arrow">
              <i class="bi bi-chevron-right"></i>
            </div>
          </button>

          <button class="menu-item withdraw" @click="goWithdraw">
            <div class="menu-icon">
              <i class="bi bi-credit-card"></i>
            </div>
            <div class="menu-text">
              <span class="menu-title">Rút tiền</span>
              <span class="menu-desc">Rút VND về ngân hàng</span>
            </div>
            <div class="menu-arrow">
              <i class="bi bi-chevron-right"></i>
            </div>
          </button>

          <button class="menu-item swap" @click="goSwap">
            <div class="menu-icon">
              <i class="bi bi-arrow-left-right"></i>
            </div>
            <div class="menu-text">
              <span class="menu-title">Đổi token</span>
              <span class="menu-desc">HTW → VND</span>
            </div>
            <div class="menu-arrow">
              <i class="bi bi-chevron-right"></i>
            </div>
          </button>
        </div>
      </div>
    </div>

    <BottomNav/>
  </div>
</template>

<style scoped>
.account-page {
  min-height: 100vh;
  background: linear-gradient(180deg, #0a0a0b 0%, #1a1a1d 100%);
  color: #ffffff;
  padding-bottom: 80px;
}

.header {
  padding: 20px 20px 0;
  position: sticky;
  top: 0;
  z-index: 10;
  background: linear-gradient(180deg, #0a0a0b 0%, rgba(10, 10, 11, 0.9) 100%);
  backdrop-filter: blur(20px);
}

.title {
  font-size: 28px;
  font-weight: 800;
  margin: 0;
  display: flex;
  align-items: center;
  gap: 12px;
  background: linear-gradient(45deg, #ff6b6b, #4ecdc4);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.content {
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 24px;
  max-width: 500px;
  margin: 0 auto;
}

/* Loading & Error States */
.loading-container, .error-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  text-align: center;
}

.loading-spinner {
  font-size: 48px;
  color: #ff6b6b;
  margin-bottom: 16px;
}

.spin {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.error-icon {
  font-size: 48px;
  color: #ff6b6b;
  margin-bottom: 16px;
}

/* Profile Card */
.profile-card {
  background: linear-gradient(135deg, #1a1a1d 0%, #2d2d34 100%);
  border: 1px solid #3d3d44;
  border-radius: 20px;
  padding: 24px;
  box-shadow: 
    0 8px 32px rgba(0, 0, 0, 0.4),
    inset 0 1px 0 rgba(255, 255, 255, 0.1);
}

.profile-header {
  display: flex;
  align-items: center;
  gap: 16px;
}

.avatar-container {
  position: relative;
}

.avatar {
  width: 72px;
  height: 72px;
  border-radius: 50%;
  background: linear-gradient(135deg, #ff6b6b, #4ecdc4);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  font-weight: 900;
  color: #ffffff;
  box-shadow: 0 4px 20px rgba(255, 107, 107, 0.3);
}

.status-dot {
  position: absolute;
  bottom: 2px;
  right: 2px;
  width: 20px;
  height: 20px;
  background: #4ade80;
  border: 3px solid #1a1a1d;
  border-radius: 50%;
  box-shadow: 0 0 10px rgba(74, 222, 128, 0.5);
}

.user-info {
  flex: 1;
}

.username {
  font-size: 20px;
  font-weight: 700;
  margin: 0 0 8px 0;
  color: #ffffff;
}

.uid-section {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
}

.uid-label {
  font-size: 13px;
  color: #9ca3af;
  font-weight: 600;
}

.uid-value {
  font-size: 13px;
  color: #ffffff;
  font-family: 'SF Mono', 'Consolas', monospace;
  background: rgba(255, 255, 255, 0.1);
  padding: 2px 8px;
  border-radius: 6px;
}

.copy-btn {
  background: transparent;
  border: none;
  color: #4ecdc4;
  cursor: pointer;
  padding: 4px;
  border-radius: 6px;
  transition: all 0.2s ease;
}

.copy-btn:hover {
  background: rgba(78, 205, 196, 0.2);
  transform: scale(1.1);
}

.handle {
  font-size: 14px;
  color: #4ecdc4;
  display: flex;
  align-items: center;
  gap: 4px;
}

/* Section Titles */
.section-title {
  font-size: 18px;
  font-weight: 700;
  color: #ffffff;
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 16px;
}

/* Balance Section */
.balance-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.balance-card {
  background: linear-gradient(135deg, #1a1a1d 0%, #2d2d34 100%);
  border: 1px solid #3d3d44;
  border-radius: 16px;
  padding: 20px;
  transition: all 0.3s ease;
}

.balance-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.3);
}

.balance-card.htw {
  border-left: 3px solid #ff6b6b;
}

.balance-card.vnd {
  border-left: 3px solid #4ecdc4;
}

.balance-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
}

.balance-icon {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
}

.htw .balance-icon {
  background: rgba(255, 107, 107, 0.2);
  color: #ff6b6b;
}

.vnd .balance-icon {
  background: rgba(78, 205, 196, 0.2);
  color: #4ecdc4;
}

.balance-label {
  font-size: 13px;
  color: #9ca3af;
  font-weight: 600;
}

.balance-value {
  font-size: 24px;
  font-weight: 800;
  color: #ffffff;
}

.currency {
  font-size: 14px;
  color: #9ca3af;
  font-weight: 600;
}

/* Menu Section */
.menu-grid {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.menu-item {
  background: linear-gradient(135deg, #1a1a1d 0%, #2d2d34 100%);
  border: 1px solid #3d3d44;
  border-radius: 16px;
  padding: 20px;
  display: flex;
  align-items: center;
  gap: 16px;
  cursor: pointer;
  transition: all 0.3s ease;
  text-align: left;
}

.menu-item:hover {
  background: linear-gradient(135deg, #2d2d34 0%, #3d3d44 100%);
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.3);
}

.menu-icon {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
}

.support .menu-icon {
  background: rgba(74, 222, 128, 0.2);
  color: #4ade80;
}

.withdraw .menu-icon {
  background: rgba(59, 130, 246, 0.2);
  color: #3b82f6;
}

.swap .menu-icon {
  background: rgba(168, 85, 247, 0.2);
  color: #a855f7;
}

.menu-text {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.menu-title {
  font-size: 16px;
  font-weight: 600;
  color: #ffffff;
}

.menu-desc {
  font-size: 13px;
  color: #9ca3af;
}

.menu-arrow {
  color: #6b7280;
  font-size: 18px;
}

/* Toast Notification */
:global(.toast-notification) {
  position: fixed;
  top: 20px;
  left: 50%;
  transform: translateX(-50%) translateY(-100px);
  background: linear-gradient(135deg, #4ade80, #22c55e);
  color: #ffffff;
  padding: 12px 20px;
  border-radius: 12px;
  font-weight: 600;
  box-shadow: 0 8px 25px rgba(74, 222, 128, 0.3);
  z-index: 1000;
  opacity: 0;
  transition: all 0.3s ease;
}

:global(.toast-notification.show) {
  opacity: 1;
  transform: translateX(-50%) translateY(0);
}

/* Responsive */
@media (max-width: 480px) {
  .content {
    padding: 16px;
  }
  
  .balance-grid {
    grid-template-columns: 1fr;
  }
  
  .profile-header {
    flex-direction: column;
    text-align: center;
  }
  
  .avatar {
    width: 80px;
    height: 80px;
    font-size: 28px;
  }
}
</style>