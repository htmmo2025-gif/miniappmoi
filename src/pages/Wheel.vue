<!-- src/pages/Wheel.vue -->
<script setup>
import { ref } from 'vue'
import BottomNav from '../components/BottomNav.vue'
import { LuckyWheel } from '@lucky-canvas/vue'

const wheelRef = ref(null)
const spinning = ref(false)
const msg = ref('')

// Enhanced styling cho vòng quay
const blocks = [
  { padding: '16px', background: '#1e293b', borderRadius: 50 }
]

const prizes = [
  { 
    background: 'linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)',
    fonts: [{ text: '+1 HTW', top: '20px', fontColor: '#fff', fontSize: '16px', fontWeight: 'bold' }]
  },
  { 
    background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
    fonts: [{ text: '+2 HTW', top: '20px', fontColor: '#fff', fontSize: '16px', fontWeight: 'bold' }]
  },
  { 
    background: 'linear-gradient(135deg, #64748b 0%, #475569 100%)',
    fonts: [{ text: 'Hụt 😅', top: '20px', fontColor: '#fff', fontSize: '16px', fontWeight: 'bold' }]
  },
  { 
    background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
    fonts: [{ text: '+5 HTW', top: '20px', fontColor: '#fff', fontSize: '16px', fontWeight: 'bold' }]
  },
  { 
    background: 'linear-gradient(135deg, #64748b 0%, #475569 100%)',
    fonts: [{ text: 'Hụt 😅', top: '20px', fontColor: '#fff', fontSize: '16px', fontWeight: 'bold' }]
  },
  { 
    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
    fonts: [{ text: '+10 HTW', top: '20px', fontColor: '#fff', fontSize: '16px', fontWeight: 'bold' }]
  },
]

const buttons = [
  { 
    radius: '50px', 
    background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
    pointer: true,
    fonts: [{ text: '🎯 QUAY', top: '-20px', fontColor: '#fff', fontSize: '18px', fontWeight: 'bold' }]
  }
]

async function onStart () {
  if (spinning.value) return
  spinning.value = true
  msg.value = ''

  try {
    const r = await fetch('/api/wheel/spin', { method: 'POST', credentials: 'include' })
    let idx
    if (r.ok) {
      const j = await r.json()
      idx = Number(j.index ?? 0) % prizes.length
    } else {
      idx = Math.floor(Math.random() * prizes.length)
    }

    wheelRef.value?.play?.()
    setTimeout(() => { wheelRef.value?.stop?.(idx) }, 1200)
  } catch (e) {
    spinning.value = false
    msg.value = 'Không quay được, thử lại nhé.'
  }
}

function onEnd (prize) {
  spinning.value = false
  const t = prize?.fonts?.[0]?.text || '—'
  msg.value = `${t}`
}
</script>

<template>
  <div class="page">
    <header class="topbar">
      <div class="header-content">
        <h1>🎡 Vòng Quay May Mắn</h1>
        <p class="subtitle">Thử vận may của bạn ngay!</p>
      </div>
    </header>

    <main class="wrap">
      <section class="card">
        <div class="wheel-container">
          <div class="glow-effect"></div>
          <LuckyWheel
            ref="wheelRef"
            :width="340"
            :height="340"
            :blocks="blocks"
            :prizes="prizes"
            :buttons="buttons"
            @start="onStart"
            @end="onEnd"
          />
        </div>
        
        <div class="info-section">
          <p class="hint">✨ Nhấn nút QUAY để bắt đầu</p>
          <transition name="prize">
            <div v-if="msg" class="result-card">
              <div class="result-icon">🎉</div>
              <p class="result-text">{{ msg }}</p>
            </div>
          </transition>
        </div>

        <div class="prizes-info">
          <h3>🎁 Các giải thưởng</h3>
          <div class="prizes-grid">
            <div class="prize-item">
              <span class="prize-dot" style="background: linear-gradient(135deg, #10b981 0%, #059669 100%)"></span>
              <span>+10 HTW</span>
            </div>
            <div class="prize-item">
              <span class="prize-dot" style="background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)"></span>
              <span>+5 HTW</span>
            </div>
            <div class="prize-item">
              <span class="prize-dot" style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%)"></span>
              <span>+2 HTW</span>
            </div>
            <div class="prize-item">
              <span class="prize-dot" style="background: linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)"></span>
              <span>+1 HTW</span>
            </div>
          </div>
        </div>
      </section>
    </main>

    <BottomNav/>
  </div>
</template>

<style scoped>
.page {
  background: linear-gradient(180deg, #0b0f1a 0%, #1a1f35 100%);
  color: #e5e7eb;
  min-height: 100dvh;
  position: relative;
}

.page::before {
  content: '';
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: radial-gradient(circle at 20% 30%, rgba(14, 165, 233, 0.08) 0%, transparent 50%),
              radial-gradient(circle at 80% 70%, rgba(245, 158, 11, 0.08) 0%, transparent 50%);
  pointer-events: none;
}

.topbar {
  position: sticky;
  top: 0;
  z-index: 10;
  padding: 20px 16px;
  background: linear-gradient(180deg, rgba(11, 15, 26, 0.98), rgba(11, 15, 26, 0.85) 65%, transparent);
  backdrop-filter: blur(12px);
  border-bottom: 1px solid rgba(148, 163, 184, 0.1);
}

.header-content {
  text-align: center;
}

.topbar h1 {
  margin: 0;
  font-size: 26px;
  font-weight: 900;
  background: linear-gradient(135deg, #f59e0b 0%, #ef4444 50%, #8b5cf6 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  letter-spacing: -0.5px;
}

.subtitle {
  margin: 4px 0 0;
  font-size: 13px;
  color: #94a3b8;
  font-weight: 500;
}

.wrap {
  padding: 24px 16px calc(84px + env(safe-area-inset-bottom));
  position: relative;
  z-index: 1;
}

.card {
  background: linear-gradient(145deg, rgba(30, 41, 59, 0.6), rgba(15, 23, 42, 0.6));
  border: 1px solid rgba(148, 163, 184, 0.18);
  border-radius: 24px;
  padding: 32px 20px;
  backdrop-filter: blur(10px);
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.4);
}

.wheel-container {
  position: relative;
  display: grid;
  place-items: center;
  margin-bottom: 28px;
}

.glow-effect {
  position: absolute;
  width: 360px;
  height: 360px;
  background: radial-gradient(circle, rgba(245, 158, 11, 0.15) 0%, transparent 70%);
  border-radius: 50%;
  animation: pulse 3s ease-in-out infinite;
  pointer-events: none;
}

@keyframes pulse {
  0%, 100% { transform: scale(1); opacity: 0.6; }
  50% { transform: scale(1.1); opacity: 0.8; }
}

.info-section {
  text-align: center;
  min-height: 100px;
}

.hint {
  margin: 0 0 16px;
  color: #94a3b8;
  font-size: 14px;
  font-weight: 500;
}

.result-card {
  background: linear-gradient(135deg, rgba(245, 158, 11, 0.15), rgba(239, 68, 68, 0.15));
  border: 2px solid rgba(245, 158, 11, 0.3);
  border-radius: 16px;
  padding: 20px;
  margin-top: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  box-shadow: 0 8px 24px rgba(245, 158, 11, 0.2);
}

.result-icon {
  font-size: 32px;
  animation: bounce 0.6s ease-in-out;
}

@keyframes bounce {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-10px); }
}

.result-text {
  margin: 0;
  font-size: 20px;
  font-weight: 800;
  background: linear-gradient(135deg, #fbbf24, #f59e0b);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.prizes-info {
  margin-top: 32px;
  padding-top: 24px;
  border-top: 1px solid rgba(148, 163, 184, 0.18);
}

.prizes-info h3 {
  margin: 0 0 16px;
  font-size: 16px;
  font-weight: 700;
  text-align: center;
  color: #f1f5f9;
}

.prizes-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}

.prize-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 16px;
  background: rgba(30, 41, 59, 0.5);
  border: 1px solid rgba(148, 163, 184, 0.12);
  border-radius: 12px;
  font-size: 14px;
  font-weight: 600;
  transition: all 0.3s ease;
}

.prize-item:hover {
  background: rgba(30, 41, 59, 0.7);
  border-color: rgba(148, 163, 184, 0.25);
  transform: translateY(-2px);
}

.prize-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  flex-shrink: 0;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
}

.prize-enter-active, .prize-leave-active {
  transition: all 0.4s ease;
}

.prize-enter-from {
  opacity: 0;
  transform: scale(0.8) translateY(20px);
}

.prize-leave-to {
  opacity: 0;
  transform: scale(0.8) translateY(-20px);
}
</style>