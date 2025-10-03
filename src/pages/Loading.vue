<script setup>
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const tg = window.Telegram?.WebApp

const loadingText = ref('Đang khởi tạo...')
const progress = ref(0)

// các bước hiển thị progress
const loadingSteps = [
  { text: 'Đang khởi tạo...', duration: 800 },
  { text: 'Kết nối Telegram...', duration: 1000 },
  { text: 'Xác thực người dùng...', duration: 1200 },
  { text: 'Hoàn tất...', duration: 500 }
]

async function simulateLoading() {
  let currentProgress = 0
  for (let i = 0; i < loadingSteps.length; i++) {
    const step = loadingSteps[i]
    loadingText.value = step.text
    const target = ((i + 1) / loadingSteps.length) * 100
    const stepDur = step.duration
    const delta = (target - currentProgress) / (stepDur / 50)
    while (currentProgress < target) {
      await new Promise(r => setTimeout(r, 50))
      currentProgress = Math.min(currentProgress + delta, target)
      progress.value = currentProgress
    }
  }
}

async function verifyTelegram() {
  // initData dùng cho /api/tg/verify
  const qs = new URLSearchParams(tg?.initData || '')
  try {
    const ok = await fetch('/api/tg/verify?' + qs.toString(),{
  credentials: 'include'   // <<< bắt buộc để nhận Set-Cookie từ server
}).then(r => r.ok)
    return ok
  } catch {
    return false
  }
}

async function checkIsAdmin(tid) {
  try {
    const r = await fetch('/api/admin/whoami?tid=' + encodeURIComponent(tid),{ credentials: 'include' })
    if (!r.ok) return false
    const j = await r.json()
    return !!j.is_admin
  } catch {
    return false
  }
}

onMounted(async () => {
  tg?.ready()

  // chạy progress song song với verify
  simulateLoading()

  const MIN_LOAD_MS = 3500
  const t0 = Date.now()

  // 1) verify telegram signature
  const ok = await verifyTelegram()

  // 2) nếu ok -> hỏi server xem có phải admin không
  let isAdmin = false
  if (ok) {
    const tid =
      tg?.initDataUnsafe?.user?.id ||
      new URLSearchParams(tg?.initData || '').get('user') ||
      ''
    isAdmin = await checkIsAdmin(String(tid))
  }

  // đảm bảo tối thiểu MIN_LOAD_MS cho mượt
  const elapsed = Date.now() - t0
  if (elapsed < MIN_LOAD_MS) {
    await new Promise(r => setTimeout(r, MIN_LOAD_MS - elapsed))
  }

  // đẩy progress về 100% để mượt
  progress.value = 100
  loadingText.value = 'Hoàn tất...'

  // điều hướng
  router.replace(ok ? (isAdmin ? '/admin' : '/mining') : '/error')
})
</script>


<template>
  <div class="loading-container">
    <!-- Background with animated gradient -->
    <div class="gradient-bg">
      <div class="gradient-orb orb-1"></div>
      <div class="gradient-orb orb-2"></div>
      <div class="gradient-orb orb-3"></div>
    </div>
    
    <!-- Main loading content -->
    <div class="loading-content">
      <!-- Logo/Icon Section -->
      <div class="logo-section">
        <div class="logo-container">
          <div class="logo-ring ring-1"></div>
          <div class="logo-ring ring-2"></div>
          <div class="logo-ring ring-3"></div>
          <div class="logo-center">
            <i class="bi bi-lightning-charge-fill"></i>
          </div>
        </div>
      </div>
      
      <!-- Loading Text -->
      <div class="loading-text">
        <h1 class="app-title">HTW Mining</h1>
        <p class="loading-message">{{ loadingText }}</p>
      </div>
      
      <!-- Progress Bar -->
      <div class="progress-section">
        <div class="progress-bar">
          <div class="progress-fill" :style="{ width: progress + '%' }"></div>
          <div class="progress-glow" :style="{ left: progress + '%' }"></div>
        </div>
        <div class="progress-text">{{ Math.round(progress) }}%</div>
      </div>
      
      <!-- Loading Dots -->
      <div class="loading-dots">
        <div class="dot dot-1"></div>
        <div class="dot dot-2"></div>
        <div class="dot dot-3"></div>
      </div>
      
      <!-- Status Cards -->
      <div class="status-cards">
        <div class="status-card" :class="{ active: progress >= 25 }">
          <i class="bi bi-shield-check"></i>
          <span>Bảo mật</span>
        </div>
        <div class="status-card" :class="{ active: progress >= 50 }">
          <i class="bi bi-wifi"></i>
          <span>Kết nối</span>
        </div>
        <div class="status-card" :class="{ active: progress >= 75 }">
          <i class="bi bi-person-check"></i>
          <span>Xác thực</span>
        </div>
        <div class="status-card" :class="{ active: progress >= 100 }">
          <i class="bi bi-check-circle"></i>
          <span>Hoàn tất</span>
        </div>
      </div>
    </div>
    
    <!-- Floating particles -->
    <div class="particles">
      <div class="particle" v-for="i in 12" :key="i" :class="`particle-${i}`"></div>
    </div>
  </div>
</template>

<style scoped>
@import url('https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.0/font/bootstrap-icons.css');

.loading-container {
  height: 100vh;
  width: 100vw;
  position: relative;
  overflow: hidden;
  background: linear-gradient(135deg, #0f0f23 0%, #1a1a3e 50%, #2d1b69 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
}

/* Animated Background */
.gradient-bg {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  overflow: hidden;
}

.gradient-orb {
  position: absolute;
  border-radius: 50%;
  filter: blur(100px);
  opacity: 0.3;
  animation: float 8s ease-in-out infinite;
}

.orb-1 {
  width: 300px;
  height: 300px;
  background: linear-gradient(45deg, #ff6b6b, #4ecdc4);
  top: 10%;
  left: 10%;
  animation-delay: 0s;
}

.orb-2 {
  width: 200px;
  height: 200px;
  background: linear-gradient(45deg, #4ecdc4, #45b7d1);
  top: 60%;
  right: 10%;
  animation-delay: -2s;
}

.orb-3 {
  width: 250px;
  height: 250px;
  background: linear-gradient(45deg, #96ceb4, #ffeaa7);
  bottom: 10%;
  left: 50%;
  animation-delay: -4s;
}

/* Main Content */
.loading-content {
  text-align: center;
  z-index: 10;
  max-width: 400px;
  padding: 20px;
}

/* Logo Section */
.logo-section {
  margin-bottom: 40px;
}

.logo-container {
  position: relative;
  width: 120px;
  height: 120px;
  margin: 0 auto;
}

.logo-ring {
  position: absolute;
  border-radius: 50%;
  border: 2px solid;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
}

.ring-1 {
  width: 100%;
  height: 100%;
  border-color: rgba(78, 205, 196, 0.3);
  animation: rotate 3s linear infinite;
}

.ring-2 {
  width: 80%;
  height: 80%;
  border-color: rgba(255, 107, 107, 0.4);
  animation: rotate 2s linear infinite reverse;
}

.ring-3 {
  width: 60%;
  height: 60%;
  border-color: rgba(69, 183, 209, 0.5);
  animation: rotate 4s linear infinite;
}

.logo-center {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 40px;
  height: 40px;
  background: linear-gradient(135deg, #4ecdc4, #44a08d);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 0 30px rgba(78, 205, 196, 0.5);
  animation: pulse 2s ease-in-out infinite;
}

.logo-center i {
  font-size: 20px;
  color: white;
}

/* Loading Text */
.loading-text {
  margin-bottom: 40px;
}

.app-title {
  font-size: 32px;
  font-weight: 700;
  margin: 0 0 16px 0;
  background: linear-gradient(135deg, #4ecdc4, #44a08d);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.loading-message {
  font-size: 16px;
  margin: 0;
  opacity: 0.8;
  font-weight: 500;
  animation: fadeInOut 2s ease-in-out infinite;
}

/* Progress Bar */
.progress-section {
  margin-bottom: 30px;
}

.progress-bar {
  width: 100%;
  height: 4px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 2px;
  position: relative;
  overflow: hidden;
  margin-bottom: 8px;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #4ecdc4, #44a08d, #4ecdc4);
  border-radius: 2px;
  transition: width 0.3s ease;
  position: relative;
}

.progress-fill::after {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.4), transparent);
  animation: shimmer 2s infinite;
}

.progress-glow {
  position: absolute;
  top: -2px;
  width: 8px;
  height: 8px;
  background: #4ecdc4;
  border-radius: 50%;
  box-shadow: 0 0 10px #4ecdc4;
  transform: translateX(-50%);
  transition: left 0.3s ease;
}

.progress-text {
  font-size: 14px;
  opacity: 0.7;
  font-weight: 600;
}

/* Loading Dots */
.loading-dots {
  display: flex;
  justify-content: center;
  gap: 8px;
  margin-bottom: 40px;
}

.dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #4ecdc4;
  animation: dotPulse 1.5s ease-in-out infinite;
}

.dot-2 {
  animation-delay: 0.2s;
}

.dot-3 {
  animation-delay: 0.4s;
}

/* Status Cards */
.status-cards {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
  max-width: 280px;
  margin: 0 auto;
}

.status-card {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  padding: 16px 12px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  transition: all 0.3s ease;
  backdrop-filter: blur(10px);
}

.status-card.active {
  background: rgba(78, 205, 196, 0.1);
  border-color: rgba(78, 205, 196, 0.3);
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(78, 205, 196, 0.2);
}

.status-card i {
  font-size: 18px;
  opacity: 0.5;
  transition: all 0.3s ease;
}

.status-card.active i {
  opacity: 1;
  color: #4ecdc4;
}

.status-card span {
  font-size: 12px;
  font-weight: 500;
  opacity: 0.7;
}

.status-card.active span {
  opacity: 1;
}

/* Floating Particles */
.particles {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
}

.particle {
  position: absolute;
  width: 4px;
  height: 4px;
  background: rgba(78, 205, 196, 0.6);
  border-radius: 50%;
  animation: particleFloat 8s linear infinite;
}

.particle-1 { top: 10%; left: 10%; animation-delay: 0s; }
.particle-2 { top: 20%; left: 80%; animation-delay: 1s; }
.particle-3 { top: 80%; left: 20%; animation-delay: 2s; }
.particle-4 { top: 60%; left: 90%; animation-delay: 3s; }
.particle-5 { top: 30%; left: 30%; animation-delay: 4s; }
.particle-6 { top: 70%; left: 70%; animation-delay: 5s; }
.particle-7 { top: 15%; left: 60%; animation-delay: 6s; }
.particle-8 { top: 85%; left: 40%; animation-delay: 7s; }
.particle-9 { top: 45%; left: 15%; animation-delay: 1.5s; }
.particle-10 { top: 25%; left: 85%; animation-delay: 2.5s; }
.particle-11 { top: 65%; left: 50%; animation-delay: 3.5s; }
.particle-12 { top: 90%; left: 10%; animation-delay: 4.5s; }

/* Animations */
@keyframes float {
  0%, 100% { transform: translateY(0px) rotate(0deg); }
  50% { transform: translateY(-20px) rotate(180deg); }
}

@keyframes rotate {
  from { transform: translate(-50%, -50%) rotate(0deg); }
  to { transform: translate(-50%, -50%) rotate(360deg); }
}

@keyframes pulse {
  0%, 100% { 
    transform: translate(-50%, -50%) scale(1);
    box-shadow: 0 0 30px rgba(78, 205, 196, 0.5);
  }
  50% { 
    transform: translate(-50%, -50%) scale(1.1);
    box-shadow: 0 0 40px rgba(78, 205, 196, 0.8);
  }
}

@keyframes fadeInOut {
  0%, 100% { opacity: 0.8; }
  50% { opacity: 1; }
}

@keyframes shimmer {
  0% { left: -100%; }
  100% { left: 100%; }
}

@keyframes dotPulse {
  0%, 100% {
    transform: scale(1);
    opacity: 0.5;
  }
  50% {
    transform: scale(1.2);
    opacity: 1;
  }
}

@keyframes particleFloat {
  0% {
    transform: translateY(0px) rotate(0deg);
    opacity: 0;
  }
  10% {
    opacity: 0.6;
  }
  90% {
    opacity: 0.6;
  }
  100% {
    transform: translateY(-100vh) rotate(360deg);
    opacity: 0;
  }
}

/* Responsive */
@media (max-width: 480px) {
  .loading-content {
    padding: 16px;
    max-width: 320px;
  }
  
  .logo-container {
    width: 100px;
    height: 100px;
  }
  
  .app-title {
    font-size: 28px;
  }
  
  .status-cards {
    grid-template-columns: repeat(4, 1fr);
    gap: 8px;
  }
  
  .status-card {
    padding: 12px 8px;
  }
  
  .status-card i {
    font-size: 16px;
  }
  
  .status-card span {
    font-size: 10px;
  }
}
</style>