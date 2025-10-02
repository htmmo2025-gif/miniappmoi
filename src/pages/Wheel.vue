<!-- src/pages/Wheel.vue -->
<script setup>
import { ref } from 'vue'
import BottomNav from '../components/BottomNav.vue'
import { LuckyWheel } from '@lucky-canvas/vue'

const wheelRef = ref(null)
const spinning = ref(false)
const msg = ref('')

// UI cơ bản
const blocks = [
  { padding: '12px', background: '#0f172a' }
]
const prizes = [
  { background: '#0ea5e9',  fonts: [{ text: '+1 HTW',  top: '18px' }] },
  { background: '#f59e0b',  fonts: [{ text: '+2 HTW',  top: '18px' }] },
  { background: '#10b981',  fonts: [{ text: 'Hụt 😅',  top: '18px' }] },
  { background: '#8b5cf6',  fonts: [{ text: '+5 HTW',  top: '18px' }] },
  { background: '#ef4444',  fonts: [{ text: 'Hụt 😅',  top: '18px' }] },
  { background: '#22c55e',  fonts: [{ text: '+10 HTW', top: '18px' }] },
]
const buttons = [
  { radius: '40px', background: '#2563eb', pointer: true, fonts: [{ text: 'SPIN', top: '-18px' }] }
]

async function onStart () {
  if (spinning.value) return
  spinning.value = true
  msg.value = ''

  try {
    // (Khuyến nghị) gọi server để lấy kết quả:
    const r = await fetch('/api/wheel/spin', { method: 'POST', credentials: 'include' })
    let idx
    if (r.ok) {
      const j = await r.json()
      idx = Number(j.index ?? 0) % prizes.length
    } else {
      // fallback random nếu backend chưa làm
      idx = Math.floor(Math.random() * prizes.length)
    }

    // Bắt đầu quay rồi dừng vào ô đích
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
  msg.value = `Kết quả: ${t}`
}
</script>

<template>
  <div class="page">
    <header class="topbar"><h1>Vòng quay may mắn</h1></header>

    <main class="wrap">
      <section class="card">
        <LuckyWheel
          ref="wheelRef"
          :width="320"
          :height="320"
          :blocks="blocks"
          :prizes="prizes"
          :buttons="buttons"
          @start="onStart"
          @end="onEnd"
        />
        <p class="hint">Nhấn SPIN để quay</p>
        <p v-if="msg" class="msg">{{ msg }}</p>
      </section>
    </main>

    <BottomNav/>
  </div>
</template>

<style scoped>
.page{
  --bg:#0b0f1a; --card:#101826; --mut:#9aa3b2;
  background:var(--bg); color:#e5e7eb; min-height:100dvh;
}
.topbar{position:sticky;top:0;z-index:10;padding:14px 16px;
  background:linear-gradient(180deg,rgba(11,15,26,.96),rgba(11,15,26,.7) 65%,transparent);
  backdrop-filter:blur(8px)}
.topbar h1{margin:0;font:800 20px/1 ui-sans-serif,system-ui}
.wrap{padding:16px 16px calc(84px + env(safe-area-inset-bottom))}
.card{background:var(--card);border:1px solid rgba(148,163,184,.14);
  border-radius:16px;padding:18px;display:grid;place-items:center;gap:10px}
.hint{margin:6px 0 0;color:var(--mut);font-size:12px}
.msg{margin:4px 0 0;font-weight:700}
</style>
