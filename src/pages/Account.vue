<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import BottomNav from '../components/BottomNav.vue'

const router = useRouter()
const profile = ref(null)
const loading = ref(false)
const errorMsg = ref('')

// Load profile from your server API
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
    showToast('UID đã được sao chép!')
  }
}

function showToast(message) {
  const toast = document.createElement('div')
  toast.className = 'toast-notification'
  toast.textContent = message
  document.body.appendChild(toast)
  
  setTimeout(() => toast.classList.add('show'), 100)
  setTimeout(() => {
    toast.classList.remove('show')
    setTimeout(() => document.body.removeChild(toast), 300)
  }, 2000)
}

function goWithdraw() {
  router.push({ name: 'withdraw' })
}
function goSwap() {
  router.push({ name: 'swap' })
}

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
    <!-- Status Bar -->
    <div class="status-bar"></div>
    
    <!-- Content -->
    <div class="content">
      <!-- Header -->
      <div class="header">
        <div class="header-title">Tài khoản</div>
      </div>

      <!-- Loading State -->
      <div v-if="loading" class="loading-state">
        <div class="loading-spinner"></div>
        <div class="loading-text">Đang tải...</div>
      </div>

      <!-- Error State -->
      <div v-else-if="errorMsg" class="error-state">
        <i class="bi bi-exclamation-circle error-icon"></i>
        <div class="error-text">{{ errorMsg }}</div>
      </div>

      <!-- Main Content -->
      <div v-else class="main-content">
        <!-- Profile Section -->
        <div class="profile-section">
          <div class="profile-card">
            <div class="avatar-wrapper">
              <div class="avatar">{{ initials }}</div>
              <div class="online-indicator"></div>
            </div>
            <div class="profile-info">
              <h3 class="profile-name">{{ profile?.first_name }} {{ profile?.last_name }}</h3>
              <div class="uid-container">
                <span class="uid-text">UID: {{ profile?.id }}</span>
                <button class="uid-copy" @click="copyUID">
                  <i class="bi bi-copy"></i>
                </button>
              </div>
              <div v-if="profile?.username" class="username">@{{ profile.username }}</div>
            </div>
          </div>
        </div>

        <!-- Balance Display -->
        <div class="balance-wrapper">
          <div class="balance-card primary">
            <div class="balance-content">
              <div class="balance-label">
                <i class="bi bi-currency-dollar"></i>
                VND Balance
              </div>
              <div class="balance-amount">
                {{ (profile?.vnd_balance ?? 0).toLocaleString() }}
                <span class="currency">VND</span>
              </div>
            </div>
            <div class="balance-bg-pattern"></div>
          </div>
        </div>

        <!-- Features Grid -->
        <div class="features-section">
          <div class="section-header">
            <i class="bi bi-grid-3x3-gap"></i>
            Chức năng
          </div>
          
          <div class="features-grid">
            <button class="feature-card support-card" @click="openSupport">
              <div class="feature-icon">
                <i class="bi bi-headset"></i>
              </div>
              <div class="feature-content">
                <div class="feature-title">Hỗ trợ</div>
                <div class="feature-subtitle">CSKH Telegram</div>
              </div>
              <i class="bi bi-chevron-right feature-arrow"></i>
            </button>

            <button class="feature-card withdraw-card" @click="goWithdraw">
              <div class="feature-icon">
                <i class="bi bi-credit-card-2-back"></i>
              </div>
              <div class="feature-content">
                <div class="feature-title">Rút tiền</div>
                <div class="feature-subtitle">Rút VND về ngân hàng</div>
              </div>
              <i class="bi bi-chevron-right feature-arrow"></i>
            </button>

            <button class="feature-card swap-card" @click="goSwap">
              <div class="feature-icon">
                <i class="bi bi-arrow-repeat"></i>
              </div>
              <div class="feature-content">
                <div class="feature-title">Đổi token</div>
                <div class="feature-subtitle">HTW → VND</div>
              </div>
              <i class="bi bi-chevron-right feature-arrow"></i>
            </button>
          </div>
        </div>

        <!-- HTW Token Section -->
        <div class="token-section">
          <div class="token-card">
            <div class="token-header">
              <div class="token-icon">
                <i class="bi bi-gem"></i>
              </div>
              <div class="token-info">
                <div class="token-name">HTW Token</div>
                <div class="token-balance">{{ (profile?.htw_balance ?? 0).toLocaleString() }} HTW</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <BottomNav/>
  </div>
</template>

<style scoped>
.page {
  min-height: 100vh;
  background: #000000;
  color: #ffffff;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

.status-bar {
  height: 44px;
  background: linear-gradient(180deg, rgba(0,0,0,0.9) 0%, transparent 100%);
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 100;
}

.content {
  padding-top: 44px;
  padding-bottom: 100px;
  min-height: 100vh;
}

.header {
  padding: 20px 24px 0;
  position: sticky;
  top: 44px;
  z-index: 10;
  background: linear-gradient(180deg, #000000 0%, rgba(0,0,0,0.95) 100%);
  backdrop-filter: blur(20px);
}

.header-title {
  font-size: 32px;
  font-weight: 800;
  background: linear-gradient(135deg, #ff6b6b, #4ecdc4, #45b7d1);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  margin-bottom: 10px;
}

.main-content {
  padding: 24px;
  max-width: 428px;
  margin: 0 auto;
}

/* Loading & Error States */
.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 80px 24px;
  text-align: center;
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 3px solid rgba(255, 107, 107, 0.2);
  border-top: 3px solid #ff6b6b;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 16px;
}

.loading-text {
  color: #8b8b8b;
  font-size: 16px;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.error-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 80px 24px;
  text-align: center;
}

.error-icon {
  font-size: 48px;
  color: #ff6b6b;
  margin-bottom: 16px;
}

.error-text {
  color: #8b8b8b;
  font-size: 16px;
}

/* Profile Section */
.profile-section {
  margin-bottom: 32px;
}

.profile-card {
  background: linear-gradient(135deg, #1a1a1a 0%, #2a2a2a 100%);
  border-radius: 24px;
  padding: 24px;
  display: flex;
  align-items: center;
  gap: 16px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: 
    0 8px 32px rgba(0, 0, 0, 0.5),
    inset 0 1px 0 rgba(255, 255, 255, 0.1);
}

.avatar-wrapper {
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
  box-shadow: 0 8px 32px rgba(255, 107, 107, 0.3);
}

.online-indicator {
  position: absolute;
  bottom: 4px;
  right: 4px;
  width: 16px;
  height: 16px;
  background: #00ff88;
  border: 3px solid #000000;
  border-radius: 50%;
  box-shadow: 0 0 10px rgba(0, 255, 136, 0.5);
}

.profile-info {
  flex: 1;
}

.profile-name {
  font-size: 20px;
  font-weight: 700;
  margin: 0 0 8px 0;
  color: #ffffff;
}

.uid-container {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
}

.uid-text {
  font-size: 13px;
  color: #8b8b8b;
  font-family: 'SF Mono', 'Consolas', monospace;
  background: rgba(255, 255, 255, 0.05);
  padding: 4px 8px;
  border-radius: 6px;
}

.uid-copy {
  background: transparent;
  border: none;
  color: #4ecdc4;
  cursor: pointer;
  padding: 4px;
  border-radius: 4px;
  transition: all 0.2s ease;
}

.uid-copy:hover {
  background: rgba(78, 205, 196, 0.1);
  transform: scale(1.1);
}

.username {
  font-size: 14px;
  color: #4ecdc4;
}

/* Balance Section */
.balance-wrapper {
  margin-bottom: 32px;
}

.balance-card {
  position: relative;
  background: linear-gradient(135deg, #ff6b6b 0%, #ff8e8e 100%);
  border-radius: 24px;
  padding: 24px;
  overflow: hidden;
  box-shadow: 
    0 12px 40px rgba(255, 107, 107, 0.3),
    0 4px 12px rgba(0, 0, 0, 0.3);
}

.balance-content {
  position: relative;
  z-index: 2;
}

.balance-label {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.9);
  margin-bottom: 8px;
}

.balance-amount {
  font-size: 36px;
  font-weight: 900;
  color: #ffffff;
  line-height: 1;
}

.currency {
  font-size: 18px;
  font-weight: 700;
  opacity: 0.8;
  margin-left: 8px;
}

.balance-bg-pattern {
  position: absolute;
  top: 0;
  right: 0;
  width: 120px;
  height: 120px;
  background: radial-gradient(circle, rgba(255, 255, 255, 0.1) 0%, transparent 70%);
  border-radius: 50%;
  transform: translate(40px, -40px);
}

/* Features Section */
.features-section {
  margin-bottom: 32px;
}

.section-header {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 18px;
  font-weight: 700;
  color: #ffffff;
  margin-bottom: 16px;
}

.features-grid {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.feature-card {
  background: linear-gradient(135deg, #1a1a1a 0%, #2a2a2a 100%);
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: 20px;
  padding: 20px;
  display: flex;
  align-items: center;
  gap: 16px;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  text-align: left;
}

.feature-card:hover {
  background: linear-gradient(135deg, #2a2a2a 0%, #3a3a3a 100%);
  transform: translateY(-2px);
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.4);
}

.feature-icon {
  width: 48px;
  height: 48px;
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
}

.support-card .feature-icon {
  background: linear-gradient(135deg, #00ff88, #00cc70);
  color: #000000;
}

.withdraw-card .feature-icon {
  background: linear-gradient(135deg, #0088ff, #0066cc);
  color: #ffffff;
}

.swap-card .feature-icon {
  background: linear-gradient(135deg, #8844ff, #6633cc);
  color: #ffffff;
}

.feature-content {
  flex: 1;
}

.feature-title {
  font-size: 16px;
  font-weight: 700;
  color: #ffffff;
  margin-bottom: 2px;
}

.feature-subtitle {
  font-size: 13px;
  color: #8b8b8b;
}

.feature-arrow {
  font-size: 16px;
  color: #8b8b8b;
}

/* Token Section */
.token-section {
  margin-bottom: 32px;
}

.token-card {
  background: linear-gradient(135deg, #1a1a1a 0%, #2a2a2a 100%);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 20px;
  padding: 20px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
}

.token-header {
  display: flex;
  align-items: center;
  gap: 16px;
}

.token-icon {
  width: 48px;
  height: 48px;
  background: linear-gradient(135deg, #ffd700, #ffcc00);
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  color: #000000;
}

.token-info {
  flex: 1;
}

.token-name {
  font-size: 16px;
  font-weight: 700;
  color: #ffffff;
  margin-bottom: 4px;
}

.token-balance {
  font-size: 18px;
  font-weight: 600;
  color: #ffd700;
}

/* Toast Notification */
:global(.toast-notification) {
  position: fixed;
  top: 70px;
  left: 50%;
  transform: translateX(-50%) translateY(-100px);
  background: linear-gradient(135deg, #00ff88, #00cc70);
  color: #000000;
  padding: 12px 20px;
  border-radius: 12px;
  font-weight: 600;
  font-size: 14px;
  box-shadow: 0 8px 32px rgba(0, 255, 136, 0.3);
  z-index: 1000;
  opacity: 0;
  transition: all 0.3s ease;
}

:global(.toast-notification.show) {
  opacity: 1;
  transform: translateX(-50%) translateY(0);
}

/* Responsive Design */
@media (max-width: 428px) {
  .main-content {
    padding: 20px;
  }
  
  .profile-card {
    padding: 20px;
  }
  
  .avatar {
    width: 64px;
    height: 64px;
    font-size: 20px;
  }
  
  .balance-amount {
    font-size: 28px;
  }
}
</style>