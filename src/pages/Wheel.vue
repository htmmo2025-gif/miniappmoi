<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { LuckyWheel } from 'vue3-luck-draw'

type Prize = { text: string; add: number }

// Tham chiếu tới comp để gọi play()/stop()
const wheel = ref<InstanceType<typeof LuckyWheel> | null>(null)

// Trạng thái UI
const spinning = ref(false)
const msg = ref('')
const remaining = ref(0)          // cooldown giây (server trả)
const balance = ref<number | null>(null)

// Cấu hình vòng ngoài / ô / nút theo API của vue3-luck-draw
// Tham khảo: docs gốc – có thể đổi màu cho đẹp theo brand
const blocks = [{ padding: '12px', background: '#0b1220', borderRadius: 10 }]
const buttons = [
  { radius: '40%', background: '#f59e0b', pointer: true, fonts: [{ text: 'QUAY', fontColor:'#0b0f1a', fontWeight:'900', top: '-2px' }] },
  { radius: '35%', background: '#fde68a' }
]

// Danh sách giải hiển thị (client) – index phải khớp với server
// add: số HTW cộng; 0 = trượt
const prizeList = ref([
  { text: '+1 HTW',  add: 1  },
  { text: 'Xịt',     add: 0  },
  { text: '+3 HTW',  add: 3  },
  { text: '+5 HTW',  add: 5  },
  { text: 'Xịt',     add: 0  },
  { text: '+10 HTW', add: 10 },
])

// Map sang format của vue3-luck-draw
const prizes = ref(
  prizeList.value.map((p, i) => ({
    fonts: [{ text: p.text, fontColor: '#e5e7eb', top: '10%' }],
    background: i % 2 ? '#111827' : '#0f172a',
  }))
)

// Gọi API lấy trạng thái ban đầu (cooldown, số dư, vv.)
async function bootstrap() {
  try {
    const r = await fetch('/api/wheel/status', { credentials: 'include' })
    if (!r.ok) throw new Error(await r.text())
    const j = await r.json()
    remaining.value = Number(j?.remaining || 0)
    balance.value   = typeof j?.htw_balance === 'number' ? j.htw_balance : null
  } catch (e:any) {
    console.error(e)
    msg.value = 'Không tải được trạng thái vòng quay.'
  }
}

let cdTimer: any = null
function startCountdown(sec: number) {
  clearInterval(cdTimer)
  remaining.value = Math.max(0, Number(sec) || 0)
  if (!remaining.value) return
  cdTimer = setInterval(() => {
    remaining.value = Math.max(0, remaining.value - 1)
    if (!remaining.value) clearInterval(cdTimer)
  }, 1000)
}

// Bắt đầu quay: gọi server để nhận chỉ mục dừng + phần thưởng
async function onClickStart() {
  if (spinning.value) return
  if (remaining.value > 0) {
    msg.value = `Chờ ${remaining.value}s nữa nhé.`
    return
  }
  msg.value = ''
  spinning.value = true

  try {
    // 1) Cho quay (hiệu ứng)
    wheel.value?.play()

    // 2) Gọi server xác định giải (fair)
    const r = await fetch('/api/wheel/roll', { method:'POST', credentials:'include' })
    // Nếu muốn pass CSRF hoặc body: thêm headers/body JSON

    if (!r.ok) {
      // Server có thể trả 429 khi đang cooldown
      if (r.status === 429) {
        try {
          const j = await r.json()
          startCountdown(Number(j?.remaining || j?.wait || 30))
          msg.value = 'Bạn vừa quay rồi, đợi thêm chút nha.'
        } catch {}
      } else {
        msg.value = 'Lỗi máy chủ, vui lòng thử lại.'
      }
      // stop ở ô gần nhất (để không treo animation)
      setTimeout(() => wheel.value?.stop(0), 600)
      return
    }

    const j = await r.json() as { index: number; add: number; remaining?: number; balance?: number }
    const stopIndex = Number(j.index ?? 0)
    // 3) Dừng đúng ô server trả
    setTimeout(() => wheel.value?.stop(stopIndex), 600)

    // 4) Cập nhật cooldown/balance nếu server trả
    if (typeof j.remaining === 'number') startCountdown(j.remaining)
    if (typeof j.balance   === 'number') balance.value = j.balance
  } catch (e:any) {
    console.error(e)
    msg.value = 'Không kết nối được máy chủ.'
    setTimeout(() => wheel.value?.stop(0), 600)
  }
}

// Sự kiện END: vòng quay đã dừng – hiển thị kết quả đẹp
function onEnd(prize: any) {
  // prize là object prize hiển thị – ta map text sang add
  const p = prize?.fonts?.[0]?.text as string
  const found = prizeList.value.find(x => x.text === p)
  const add = found?.add ?? 0
  if (add > 0) {
    toast(`+${add} HTW 🎉`)
  } else {
    toast('Chúc may mắn lần sau!')
  }
  spinning.value = false
}

// Toast nhỏ
function toast(t: string) {
  const el = document.createElement('div')
  el.className = 'toast'
  el.textContent = t
  document.body.appendChild(el)
  requestAnimationFrame(() => el.classList.add('show'))
  setTimeout(() => { el.classList.remove('show'); setTimeout(() => el.remove(), 250) }, 1600)
}

onMounted(() => {
  bootstrap()
})
</script>

<template>
  <div class="page">
    <header class="top"><h1>Vòng quay may mắn</h1></header>

    <main class="wrap">
      <section class="card">
        <div class="row">
          <div class="col">
            <div class="label">Số dư</div>
            <div class="val">{{ balance ?? '—' }} <span>HTW</span></div>
          </div>
          <div class="col right" v-if="remaining>0">
            <div class="cd">Đợi {{ remaining }}s</div>
          </div>
        </div>

        <div class="wheel-box">
          <LuckyWheel
            ref="wheel"
            :blocks="blocks"
            :prizes="prizes"
            :buttons="buttons"
            @end="onEnd"
          />
          <!-- Nút overlay để chạm to hơn -->
          <button class="start" :disabled="spinning || remaining>0" @click="onClickStart">
            {{ spinning ? 'Đang quay…' : (remaining>0 ? `Chờ ${remaining}s` : 'Quay') }}
          </button>
        </div>

        <p v-if="msg" class="note"><i class="bi bi-info-circle"></i> {{ msg }}</p>
        <ul class="hint">
          <li>Server sẽ xác định ô dừng để đảm bảo công bằng.</li>
          <li>Vui lòng không rời trang khi vòng quay đang quay.</li>
        </ul>
      </section>
    </main>
  </div>
</template>

<style scoped>
.page{--bg:#0b0f1a;--card:#0f172a;--mut:#9aa3b2;--ring:1px solid rgba(148,163,184,.14);
  background:var(--bg);color:#e5e7eb;min-height:100dvh}
.top{position:sticky;top:0;z-index:10;padding:calc(10px + env(safe-area-inset-top)) 16px 8px;
  background:linear-gradient(180deg,rgba(11,15,26,.96),rgba(11,15,26,.7) 70%,transparent);
  backdrop-filter:blur(8px)}
.top h1{margin:0;text-align:center;font:800 20px/1 ui-sans-serif,system-ui}
.wrap{padding:16px}
.card{background:var(--card);border-radius:16px;padding:14px;border:var(--ring);box-shadow:0 10px 30px rgba(2,8,23,.35)}
.row{display:flex;align-items:center;justify-content:space-between;margin-bottom:10px}
.label{color:var(--mut);font-size:12px}
.val{font:800 20px/1.1 ui-sans-serif}.val span{font:700 12px;opacity:.85;margin-left:6px}
.cd{font-weight:700;color:#fbbf24}
.wheel-box{position:relative;display:grid;place-items:center;padding:12px}
.start{
  position:absolute;inset:auto auto 16px auto;transform:translateY(0);
  padding:10px 16px;border:none;border-radius:999px;font-weight:900;
  background:#f59e0b;color:#0b0f1a;box-shadow:0 10px 30px rgba(245,158,11,.35);
}
.start:disabled{opacity:.6;filter:grayscale(.2)}
.note{margin-top:10px;color:#fca5a5;background:#450a0a;padding:10px;border-radius:10px;font-size:12px}
.hint{margin:10px 0 0 16px;color:var(--mut);font-size:12px}
:global(.toast){
  position:fixed;top:calc(72px + env(safe-area-inset-top));left:50%;
  transform:translateX(-50%) translateY(-10px);background:linear-gradient(135deg,#22c55e,#10b981);
  color:#0b0f1a;padding:10px 14px;border-radius:12px;font-weight:800;font-size:13px;
  box-shadow:0 10px 30px rgba(16,185,129,.35);opacity:0;z-index:1000;transition:.2s}
:global(.toast.show){opacity:1;transform:translateX(-50%) translateY(0)}
</style>
