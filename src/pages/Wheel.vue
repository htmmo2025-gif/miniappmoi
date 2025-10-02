<!-- <script setup>
import { ref } from 'vue'
import { LuckyWheel } from '@lucky-canvas/vue'

const wheelRef = ref(null)
const spinning = ref(false)
const msg = ref('')

/** UI */
const blocks = [
  { padding: '14px', background: '#0f172a' },
  { padding: '10px', background: '#111827' }
]
const prizes = [
  { background: '#1f2937', fonts: [{ text: '10 HTW', top: '10%' }] },
  { background: '#0b1220', fonts: [{ text: 'Mất lượt', top: '10%' }] },
  { background: '#1f2937', fonts: [{ text: '5 HTW',  top: '10%' }] },
  { background: '#0b1220', fonts: [{ text: '1 HTW',  top: '10%' }] },
  { background: '#1f2937', fonts: [{ text: '20 HTW', top: '10%' }] },
  { background: '#0b1220', fonts: [{ text: '2 HTW',  top: '10%' }] },
]
const buttons = [
  { radius: '45%', background: '#f59e0b', fonts: [{ text: 'QUAY', fontColor: '#0b0f1a', fontSize: '16px' }] },
  { radius: '40%', background: '#fde68a' },
  { radius: '35%', background: '#f59e0b' },
]

/** Toast nhỏ */
function toast(t) {
  const el = Object.assign(document.createElement('div'), { className:'toast', textContent: t })
  document.body.appendChild(el)
  requestAnimationFrame(() => el.classList.add('show'))
  setTimeout(() => { el.classList.remove('show'); setTimeout(() => el.remove(), 250) }, 1600)
}

/** Bắt đầu quay (LuckyWheel sẽ tự bắn @start khi click nút) */
async function onStart () {
  if (spinning.value) return
  spinning.value = true
  msg.value = ''
  try {
    // 1) Cho quay ngay để có cảm giác realtime
    wheelRef.value.play()

    // 2) Hỏi server kết quả đảm bảo công bằng
    const r = await fetch('/api/wheel/spin', { method: 'POST', credentials: 'include' })
    const j = await r.json()

    if (!r.ok || !j?.ok) {
      // Server báo cooldown: dừng quay sớm một nhịp, hiện thông báo
      wheelRef.value.stop(0)  // dừng vào ô 0 cho nhanh (tuỳ bạn)
      const wait = Number(j?.wait ?? 0)
      msg.value = wait ? `Hãy đợi ${wait}s nữa nhé` : (j?.error || 'Không quay được')
      return
    }

    // 3) Có index (0..N-1) từ server → dừng trúng ô đó
    const index = Number(j.index ?? 0)
    wheelRef.value.stop(index)

    // 4) Khi kết thúc quay, LuckyWheel sẽ bắn @end; nhưng
    //    ta vẫn có thể show thưởng ngay sau stop nếu muốn:
    //    toast(j.add > 0 ? `+${j.add} HTW` : 'Chúc may mắn lần sau!')
  } catch (e) {
    console.error(e)
    msg.value = 'Lỗi mạng, thử lại sau.'
    try { wheelRef.value.stop(0) } catch {}
  } finally {
    // mở khoá sau một nhịp (tránh spam)
    setTimeout(() => { spinning.value = false }, 1200)
  }
}

/** Kết thúc quay – prize là object từ mảng prizes (client-side) */
function onEnd (prize) {
  const txt = prize?.fonts?.[0]?.text || '???'
  if (!/mất lượt/i.test(txt)) toast(`Bạn trúng: ${txt}`)
}
</script>

<template>
  <div class="page">
    <header class="top"><h1>Vòng quay may mắn</h1></header>

    <main class="wrap">
      <div class="wheel">
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
      </div>
      <p v-if="msg" class="note"><i class="bi bi-clock"></i> {{ msg }}</p>
      <p class="hint">Mỗi ngày 1 lượt miễn phí • Thưởng cộng vào số dư HTW</p>
    </main>
  </div>
</template>

<style scoped>
.page{ --bg:#0b0f1a; --card:#101826; color:#e5e7eb; min-height:100dvh; background:var(--bg) }
.top{ position:sticky; top:0; padding:calc(10px + env(safe-area-inset-top)) 16px 8px;
  background:linear-gradient(180deg,rgba(11,15,26,.96),rgba(11,15,26,.7) 70%,transparent); backdrop-filter:blur(8px) }
.top h1{ margin:0; text-align:center; font:800 20px/1 ui-sans-serif,system-ui }
.wrap{ display:grid; place-items:center; padding:16px }
.wheel{ background:var(--card); border:1px solid rgba(148,163,184,.14);
  padding:18px; border-radius:16px; box-shadow:0 10px 30px rgba(2,8,23,.35) }
.hint{ opacity:.7; margin-top:12px; font-size:12px }
.note{ margin:12px 0 0; font-size:12px; opacity:.85 }
:global(.toast){
  position: fixed; top: calc(64px + env(safe-area-inset-top)); left: 50%;
  transform: translateX(-50%) translateY(-10px);
  background: linear-gradient(135deg,#22c55e,#10b981); color:#0b0f1a;
  padding: 10px 14px; border-radius: 12px; font-weight: 800; font-size: 13px;
  box-shadow: 0 10px 30px rgba(16,185,129,.35); opacity: 0; z-index: 1000; transition: transform .2s, opacity .2s
}
:global(.toast.show){ opacity:1; transform: translateX(-50%) translateY(0) }
</style> -->
