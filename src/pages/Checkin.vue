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

// Hiển thị quảng cáo
async function showRewardedAd() {
  return new Promise((resolve, reject) => {
    const fn = getMonetagFn()
    if (!fn) {
      reject(new Error('Monetag chưa sẵn sàng'))
      return
    }

    try {
      const vmid = String(profile.value?.telegram_id || '')
      fn({ 
        type: 'rewarded',
        vmid
      }).then(() => {
        // Quảng cáo hiển thị thành công
        resolve(true)
      }).catch((error) => {
        reject(error)
      })
    } catch (error) {
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
    msg.value = 'Đang tải quảng cáo...'
    await showRewardedAd()
    
    // Sau khi xem quảng cáo, thực hiện điểm danh
    msg.value = 'Đang xử lý điểm danh...'
    
    // Tính toán ngày tiếp theo
    let nextDayIndex = currentDay.value
    if (nextDayIndex >= maxDays) {
      nextDayIndex = 0 // Reset về ngày 1
    }
    
    const reward = rewards[state.value.day_index]
    
    // Gọi API điểm danh (giả lập)
    await new Promise(resolve => setTimeout(resolve, 500))
    
    // Cập nhật state
    state.value.htw_balance += reward
    state.value.day_index = nextDayIndex
    state.value.remaining = 86400 // 24 giờ tính bằng giây
    
    msg.value = `✅ Điểm danh thành công! Bạn nhận được ${reward} HTW`
    
    // Lưu vào localStorage để test
    localStorage.setItem('checkin_state', JSON.stringify(state.value))
    
  } catch (error) {
    console.error('Checkin error:', error)
    msg.value = '❌ Không thể hoàn thành điểm danh. Vui lòng thử lại!'
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
    msg.value = 'Không thể tải dữ liệu'
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <div class="min-h-screen bg-gradient-to-b from-purple-900 via-purple-800 to-indigo-900 text-white pb-20">
    <!-- Header -->
    <div class="p-6">
      <h1 class="text-3xl font-bold text-center mb-2">Điểm Danh Hàng Ngày</h1>
      <p class="text-center text-purple-200">Điểm danh 7 ngày liên tiếp để nhận thưởng</p>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="flex justify-center items-center h-64">
      <div class="animate-spin rounded-full h-12 w-12 border-4 border-white border-t-transparent"></div>
    </div>

    <!-- Content -->
    <div v-else class="px-4">
      <!-- Balance -->
      <div class="bg-white/10 backdrop-blur-sm rounded-2xl p-6 mb-6">
        <div class="text-center">
          <p class="text-sm text-purple-200 mb-1">Số dư HTW của bạn</p>
          <p class="text-4xl font-bold">{{ state.htw_balance }}</p>
        </div>
      </div>

      <!-- Checkin Grid -->
      <div class="grid grid-cols-7 gap-2 mb-6">
        <div 
          v-for="day in 7" 
          :key="day"
          :class="[
            'aspect-square rounded-xl flex flex-col items-center justify-center p-2 transition-all',
            day <= currentDay && state.remaining > 0
              ? 'bg-green-500 shadow-lg shadow-green-500/50'
              : day === currentDay && state.remaining === 0
              ? 'bg-yellow-500 shadow-lg shadow-yellow-500/50 scale-110'
              : day < currentDay
              ? 'bg-gray-600'
              : 'bg-white/10 border-2 border-dashed border-white/30'
          ]"
        >
          <div class="text-xs mb-1">Ngày {{ day }}</div>
          <div class="text-lg font-bold">+{{ rewards[day - 1] }}</div>
          <div v-if="day <= currentDay && state.remaining > 0" class="text-xs">✓</div>
        </div>
      </div>

      <!-- Status Message -->
      <div v-if="msg" class="bg-white/10 backdrop-blur-sm rounded-xl p-4 mb-6 text-center">
        {{ msg }}
      </div>

      <!-- Checkin Button -->
      <button
        @click="handleCheckin"
        :disabled="busy || isCheckedToday || !monetagReady"
        :class="[
          'w-full py-4 rounded-xl font-bold text-lg transition-all',
          busy || isCheckedToday || !monetagReady
            ? 'bg-gray-500 cursor-not-allowed'
            : 'bg-gradient-to-r from-yellow-400 to-orange-500 hover:from-yellow-500 hover:to-orange-600 shadow-lg hover:shadow-xl'
        ]"
      >
        <span v-if="busy">⏳ Đang xử lý...</span>
        <span v-else-if="!monetagReady">⏳ Đang tải...</span>
        <span v-else-if="isCheckedToday">✅ Đã điểm danh hôm nay</span>
        <span v-else>🎁 Điểm danh nhận {{ nextReward }} HTW</span>
      </button>

      <!-- Info -->
      <div class="mt-6 bg-white/5 backdrop-blur-sm rounded-xl p-4">
        <h3 class="font-bold mb-2 flex items-center">
          <span class="mr-2">ℹ️</span>
          Hướng dẫn
        </h3>
        <ul class="text-sm text-purple-200 space-y-1">
          <li>• Điểm danh mỗi ngày để nhận HTW</li>
          <li>• Phần thưởng tăng dần từ ngày 1 đến ngày 7</li>
          <li>• Bỏ lỡ 1 ngày sẽ phải bắt đầu lại từ ngày 1</li>
          <li>• Xem quảng cáo để hoàn thành điểm danh</li>
        </ul>
      </div>

      <!-- Debug Info (Xóa khi deploy) -->
      <div class="mt-4 bg-black/20 rounded-xl p-4 text-xs">
        <p>Debug Info:</p>
        <p>Day Index: {{ state.day_index }}</p>
        <p>Remaining: {{ state.remaining }}s</p>
        <p>Monetag Ready: {{ monetagReady }}</p>
      </div>
    </div>

    <!-- Bottom Navigation -->
    <BottomNav />
  </div>
</template>

<style scoped>
@keyframes pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}

.animate-spin {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}
</style>