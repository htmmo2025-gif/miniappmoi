<!-- src/pages/Checkin.vue -->
<script setup>
import { ref, onMounted, computed } from 'vue'
import BottomNav from '../components/BottomNav.vue'

const profile = ref(null)
const state = ref({ remaining: 0, day_index: 0, htw_balance: 0 })
const loading = ref(true)
const busy = ref(false)
const msg = ref('')
const monetagReady = ref(false)

const ZONE_ID = import.meta.env.VITE_MONETAG_ZONE_ID || '9966675'
const fnName = `show_${ZONE_ID}`

// Cấu hình phần thưởng cho mỗi ngày
const rewards = [1, 2, 3, 4, 5, 6, 7]
const maxDays = 7

// Tính toán ngày điểm danh hiện tại
const currentDay = computed(() => state.value.day_index + 1)
const isCheckedToday = computed(() => state.value.remaining > 0)
const nextReward = computed(() => {
  if (currentDay.value > maxDays) return rewards[0]
  return rewards[currentDay.value - 1]
})

// Lấy thông tin Monetag function
function getMonetagFn() {
  const fn = window?.[fnName]
  return typeof fn === 'function' ? fn : null
}

// Đợi SDK Monetag sẵn sàng
async function waitMonetagReady(maxMs = 5000) {
  const start = Date.now()
  while (Date.now() - start < maxMs) {
    const fn = getMonetagFn()
    if (fn) {
      try {
        const vmid = String(profile.value?.telegram_id || '')
        await fn({ type: 'preload', vmid }).catch(() => {})
        monetagReady.value = true
        return true
      } catch (e) {
        console.error('Preload error:', e)
      }
    }
    await new Promise(resolve => setTimeout(resolve, 100))
  }
  return false
}

// Hiển thị quảng cáo với callback
async function showRewardedAd() {
  return new Promise((resolve, reject) => {
    const fn = getMonetagFn()
    if (!fn) {
      reject(new Error('Monetag chưa sẵn sàng'))
      return
    }

    try {
      const vmid = String(profile.value?.telegram_id || '')
      
      // Gọi hàm hiển thị quảng cáo theo docs Monetag
      fn().then(() => {
        console.log('Ad showed successfully')
        resolve(true)
      }).catch((error) => {
        console.error('Ad error:', error)
        reject(error)
      })
      
    } catch (error) {
      console.error('Show ad error:', error)
      reject(error)
    }
  })
}

// Xử lý điểm danh
async function handleCheckin() {
  if (busy.value || isCheckedToday.value) return
  
  busy.value = true
  msg.value = ''

  try {
    // Hiển thị quảng cáo trước
    msg.value = '⏳ Đang tải quảng cáo...'
    
    try {
      await showRewardedAd()
    } catch (adError) {
      console.error('Ad failed:', adError)
      msg.value = '⚠️ Không thể tải quảng cáo. Thử lại sau!'
      busy.value = false
      return
    }
    
    // Sau khi xem quảng cáo, thực hiện điểm danh
    msg.value = '✨ Đang xử lý điểm danh...'
    
    // Tính toán ngày tiếp theo
    let nextDayIndex = currentDay.value
    if (nextDayIndex >= maxDays) {
      nextDayIndex = 0 // Reset về ngày 1
    }
    
    const reward = rewards[state.value.day_index]
    
    // Gọi API điểm danh (giả lập)
    await new Promise(resolve => setTimeout(resolve, 800))
    
    // Cập nhật state
    state.value.htw_balance += reward
    state.value.day_index = nextDayIndex
    state.value.remaining = 86400 // 24 giờ tính bằng giây
    
    msg.value = `🎉 Điểm danh thành công! Bạn nhận được +${reward} HTW`
    
    // Lưu vào localStorage để test
    localStorage.setItem('checkin_state', JSON.stringify(state.value))
    
    // Xóa message sau 3s
    setTimeout(() => { msg.value = '' }, 3000)
    
  } catch (error) {
    console.error('Checkin error:', error)
    msg.value = '❌ Không thể hoàn thành. Vui lòng thử lại!'
  } finally {
    busy.value = false
  }
}

// Load dữ liệu ban đầu
onMounted(async () => {
  loading.value = true
  
  try {
    // Load profile (giả lập)
    profile.value = { telegram_id: '123456789' }
    
    // Load trạng thái điểm danh từ localStorage (để test)
    const saved = localStorage.getItem('checkin_state')
    if (saved) {
      state.value = JSON.parse(saved)
    }
    
    // Đợi Monetag SDK
    await waitMonetagReady()
    
  } catch (error) {
    console.error('Load error:', error)
    msg.value = '❌ Không thể tải dữ liệu'
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <div class="checkin-container">
    <!-- Header với hiệu ứng -->
    <div class="header-section">
      <div class="header-glow"></div>
      <h1 class="header-title">
        <i class="bi bi-gift-fill title-icon"></i>
        Điểm Danh Hàng Ngày
      </h1>
      <p class="header-subtitle">
        <i class="bi bi-calendar-check"></i>
        Điểm danh liên tục 7 ngày để nhận thưởng lớn
      </p>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="loading-container">
      <div class="loading-spinner"></div>
      <p class="loading-text">
        <i class="bi bi-hourglass-split"></i>
        Đang tải...
      </p>
    </div>

    <!-- Content -->
    <div v-else class="content-section">
      <!-- Balance Card -->
      <div class="balance-card">
        <div class="balance-icon">
          <i class="bi bi-wallet2"></i>
        </div>
        <div class="balance-info">
          <p class="balance-label">
            <i class="bi bi-coin"></i>
            Số dư HTW
          </p>
          <p class="balance-amount">{{ state.htw_balance.toLocaleString() }}</p>
        </div>
        <div class="balance-trend">
          <i class="bi bi-graph-up-arrow"></i>
        </div>
      </div>

      <!-- Checkin Progress -->
      <div class="progress-section">
        <div class="progress-header">
          <span class="progress-title">
            <i class="bi bi-trophy"></i>
            Tiến trình: Ngày {{ currentDay }}/7
          </span>
          <span class="progress-badge">
            <i class="bi bi-percent"></i>
            {{ Math.floor((currentDay / 7) * 100) }}
          </span>
        </div>
        <div class="progress-bar">
          <div class="progress-fill" :style="{ width: `${(currentDay / 7) * 100}%` }">
            <i class="bi bi-star-fill progress-star"></i>
          </div>
        </div>
      </div>

      <!-- Checkin Grid -->
      <div class="checkin-grid">
        <div 
          v-for="day in 7" 
          :key="day"
          :class="[
            'day-card',
            {
              'day-completed': day < currentDay || (day === currentDay && isCheckedToday),
              'day-current': day === currentDay && !isCheckedToday,
              'day-locked': day > currentDay
            }
          ]"
        >
          <div class="day-header">
            <i class="bi bi-calendar-day"></i>
            <span class="day-number">{{ day }}</span>
          </div>
          <div class="day-reward">
            <i class="bi bi-gem"></i>
            <span class="reward-amount">{{ rewards[day - 1] }}</span>
          </div>
          <div class="day-status">
            <i v-if="day < currentDay || (day === currentDay && isCheckedToday)" 
               class="bi bi-check-circle-fill status-icon"></i>
            <i v-else-if="day === currentDay" 
               class="bi bi-hand-index-thumb-fill status-icon pulse"></i>
            <i v-else class="bi bi-lock-fill status-icon"></i>
          </div>
        </div>
      </div>

      <!-- Status Message -->
      <transition name="fade">
        <div v-if="msg" class="status-message" :class="{ 'status-success': msg.includes('thành công') }">
          <i :class="msg.includes('thành công') ? 'bi bi-check-circle-fill' : 'bi bi-exclamation-circle-fill'"></i>
          {{ msg }}
        </div>
      </transition>

      <!-- Checkin Button -->
      <button
        @click="handleCheckin"
        :disabled="busy || isCheckedToday || !monetagReady"
        class="checkin-button"
        :class="{
          'button-disabled': busy || isCheckedToday || !monetagReady,
          'button-active': !busy && !isCheckedToday && monetagReady
        }"
      >
        <span v-if="busy" class="button-content">
          <span class="button-spinner"></span>
          <i class="bi bi-hourglass-split"></i>
          Đang xử lý...
        </span>
        <span v-else-if="!monetagReady" class="button-content">
          <span class="button-spinner"></span>
          <i class="bi bi-cloud-download"></i>
          Đang tải SDK...
        </span>
        <span v-else-if="isCheckedToday" class="button-content">
          <i class="bi bi-check-circle-fill"></i>
          Đã điểm danh hôm nay
        </span>
        <span v-else class="button-content">
          <i class="bi bi-gift-fill button-icon"></i>
          Điểm danh nhận {{ nextReward }} HTW
          <i class="bi bi-arrow-right-circle-fill"></i>
        </span>
      </button>

      <!-- Info Card -->
      <div class="info-card">
        <h3 class="info-title">
          <i class="bi bi-info-circle-fill info-icon"></i>
          Quy tắc điểm danh
        </h3>
        <ul class="info-list">
          <li class="info-item">
            <i class="bi bi-check2-circle item-bullet"></i>
            <span>Điểm danh mỗi ngày để nhận phần thưởng HTW</span>
          </li>
          <li class="info-item">
            <i class="bi bi-arrow-up-circle item-bullet"></i>
            <span>Phần thưởng tăng dần từ 1-7 HTW theo ngày</span>
          </li>
          <li class="info-item">
            <i class="bi bi-x-circle item-bullet"></i>
            <span>Bỏ lỡ 1 ngày sẽ phải bắt đầu lại từ đầu</span>
          </li>
          <li class="info-item">
            <i class="bi bi-play-circle item-bullet"></i>
            <span>Xem quảng cáo để hoàn thành điểm danh</span>
          </li>
        </ul>
      </div>

      <!-- Rewards Preview -->
      <div class="rewards-preview">
        <h3 class="rewards-title">
          <i class="bi bi-stars"></i>
          Phần thưởng theo ngày
        </h3>
        <div class="rewards-grid">
          <div v-for="(reward, idx) in rewards" :key="idx" class="reward-item">
            <div class="reward-day">
              <i class="bi bi-calendar-event"></i>
              Ngày {{ idx + 1 }}
            </div>
            <div class="reward-value">
              <i class="bi bi-coin"></i>
              +{{ reward }} HTW
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Bottom Navigation -->
    <BottomNav />
  </div>
</template>

<style scoped>
/* Import Bootstrap Icons */
@import url('https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.min.css');

.checkin-container {
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%);
  padding-bottom: 80px;
  position: relative;
  overflow-x: hidden;
}

/* Header Section */
.header-section {
  position: relative;
  padding: 40px 20px 30px;
  text-align: center;
}

.header-glow {
  position: absolute;
  top: -50%;
  left: 50%;
  transform: translateX(-50%);
  width: 300px;
  height: 300px;
  background: radial-gradient(circle, rgba(255, 255, 255, 0.3) 0%, transparent 70%);
  border-radius: 50%;
  pointer-events: none;
}

.header-title {
  font-size: 32px;
  font-weight: 800;
  color: white;
  margin: 0 0 10px;
  text-shadow: 0 2px 20px rgba(0, 0, 0, 0.3);
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
}

.title-icon {
  font-size: 36px;
  animation: bounce 2s ease-in-out infinite;
}

.header-subtitle {
  font-size: 15px;
  color: rgba(255, 255, 255, 0.9);
  margin: 0;
  text-shadow: 0 1px 10px rgba(0, 0, 0, 0.2);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

/* Loading */
.loading-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 400px;
}

.loading-spinner {
  width: 60px;
  height: 60px;
  border: 4px solid rgba(255, 255, 255, 0.3);
  border-top-color: white;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

.loading-text {
  color: white;
  margin-top: 20px;
  font-size: 16px;
  display: flex;
  align-items: center;
  gap: 8px;
}

/* Content Section */
.content-section {
  padding: 0 16px;
}

/* Balance Card */
.balance-card {
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.25) 0%, rgba(255, 255, 255, 0.15) 100%);
  backdrop-filter: blur(10px);
  border-radius: 20px;
  padding: 24px;
  margin-bottom: 24px;
  display: flex;
  align-items: center;
  gap: 20px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.15);
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.balance-icon {
  font-size: 48px;
  color: #fbbf24;
  animation: float 3s ease-in-out infinite;
}

.balance-info {
  flex: 1;
}

.balance-label {
  font-size: 14px;
  color: rgba(255, 255, 255, 0.8);
  margin: 0 0 4px;
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 6px;
}

.balance-amount {
  font-size: 36px;
  font-weight: 800;
  color: white;
  margin: 0;
  text-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
}

.balance-trend {
  font-size: 32px;
  color: #4ade80;
  animation: pulse-icon 2s ease-in-out infinite;
}

/* Progress Section */
.progress-section {
  background: rgba(255, 255, 255, 0.15);
  backdrop-filter: blur(10px);
  border-radius: 16px;
  padding: 16px;
  margin-bottom: 24px;
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.progress-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.progress-title {
  font-size: 14px;
  font-weight: 600;
  color: white;
  display: flex;
  align-items: center;
  gap: 6px;
}

.progress-badge {
  background: rgba(255, 255, 255, 0.3);
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 700;
  color: white;
  display: flex;
  align-items: center;
  gap: 4px;
}

.progress-bar {
  height: 12px;
  background: rgba(0, 0, 0, 0.2);
  border-radius: 10px;
  overflow: hidden;
  position: relative;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #ffd700, #ffed4e);
  border-radius: 10px;
  transition: width 0.5s ease;
  box-shadow: 0 0 10px rgba(255, 215, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: flex-end;
  padding-right: 6px;
}

.progress-star {
  color: white;
  font-size: 10px;
  animation: twinkle 1.5s ease-in-out infinite;
}

/* Checkin Grid */
.checkin-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 8px;
  margin-bottom: 24px;
}

.day-card {
  aspect-ratio: 1;
  border-radius: 16px;
  padding: 8px 4px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: space-between;
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;
}

.day-completed {
  background: linear-gradient(135deg, #4ade80, #22c55e);
  box-shadow: 0 4px 15px rgba(34, 197, 94, 0.4);
}

.day-current {
  background: linear-gradient(135deg, #fbbf24, #f59e0b);
  box-shadow: 0 4px 20px rgba(251, 191, 36, 0.6);
  animation: pulse-card 2s ease-in-out infinite;
}

.day-locked {
  background: rgba(255, 255, 255, 0.1);
  border: 2px dashed rgba(255, 255, 255, 0.3);
}

.day-header {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
}

.day-header i {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.8);
}

.day-number {
  font-size: 10px;
  font-weight: 700;
  color: white;
}

.day-reward {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
}

.day-reward i {
  font-size: 16px;
  color: white;
}

.reward-amount {
  font-size: 14px;
  font-weight: 800;
  color: white;
}

.day-status {
  font-size: 16px;
}

.status-icon.pulse {
  animation: pulse-icon 1s ease-in-out infinite;
}

/* Status Message */
.status-message {
  background: rgba(255, 255, 255, 0.2);
  backdrop-filter: blur(10px);
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 20px;
  text-align: center;
  color: white;
  font-weight: 600;
  border: 1px solid rgba(255, 255, 255, 0.3);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.status-success {
  background: rgba(34, 197, 94, 0.3);
  border-color: rgba(34, 197, 94, 0.5);
}

.fade-enter-active, .fade-leave-active {
  transition: opacity 0.3s, transform 0.3s;
}

.fade-enter-from, .fade-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}

/* Checkin Button */
.checkin-button {
  width: 100%;
  padding: 18px;
  border-radius: 16px;
  border: none;
  font-size: 18px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.3s ease;
  margin-bottom: 24px;
  position: relative;
  overflow: hidden;
}

.button-active {
  background: linear-gradient(135deg, #fbbf24, #f59e0b);
  color: white;
  box-shadow: 0 8px 25px rgba(251, 191, 36, 0.4);
}

.button-active:hover {
  transform: translateY(-2px);
  box-shadow: 0 12px 30px rgba(251, 191, 36, 0.5);
}

.button-active:active {
  transform: translateY(0);
}

.button-disabled {
  background: rgba(0, 0, 0, 0.3);
  color: rgba(255, 255, 255, 0.5);
  cursor: not-allowed;
}

.button-content {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
}

.button-icon {
  font-size: 24px;
  animation: bounce 2s ease-in-out infinite;
}

.button-spinner {
  width: 20px;
  height: 20px;
  border: 3px solid rgba(255, 255, 255, 0.3);
  border-top-color: white;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  display: inline-block;
}

/* Info Card */
.info-card {
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  border-radius: 16px;
  padding: 20px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  margin-bottom: 20px;
}

.info-title {
  font-size: 16px;
  font-weight: 700;
  color: white;
  margin: 0 0 16px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.info-icon {
  font-size: 20px;
  color: #fbbf24;
}

.info-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.info-item {
  display: flex;
  align-items: center;
  gap: 12px;
  color: rgba(255, 255, 255, 0.9);
  font-size: 14px;
  line-height: 1.6;
  margin-bottom: 12px;
}

.info-item:last-child {
  margin-bottom: 0;
}

.item-bullet {
  color: #4ade80;
  font-size: 18px;
  flex-shrink: 0;
}

/* Rewards Preview */
.rewards-preview {
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  border-radius: 16px;
  padding: 20px;
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.rewards-title {
  font-size: 16px;
  font-weight: 700;
  color: white;
  margin: 0 0 16px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.rewards-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}

.reward-item {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  padding: 12px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.reward-day {
  font-size: 13px;
  color: rgba(255, 255, 255, 0.8);
  display: flex;
  align-items: center;
  gap: 6px;
}

.reward-value {
  font-size: 14px;
  font-weight: 700;
  color: #fbbf24;
  display: flex;
  align-items: center;
  gap: 4px;
}

/* Animations */
@keyframes spin {
  to { transform: rotate(360deg); }
}

@keyframes bounce {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-10px); }
}

@keyframes float {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-8px); }
}

@keyframes pulse-card {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.05); }
}

@keyframes pulse-icon {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.6; transform: scale(1.2); }
}

@keyframes twinkle {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}
</style>