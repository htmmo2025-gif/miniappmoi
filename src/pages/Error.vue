<script setup>
import { onMounted, ref } from 'vue'
// import { supabase } from './lib/supabase'

const tg = window.Telegram?.WebApp
const user = ref(null)
const verified = ref(null)
const mining = ref({ balance: 0, timeLeft: 0, canMine: false })
const loading = ref(false)

onMounted(async () => {
  tg?.ready()
  user.value = tg?.initDataUnsafe?.user ?? null

  // Gửi initData lên server để xác thực Telegram
  const qs = new URLSearchParams(tg?.initData || '')
  const ok = await fetch('/api/tg/verify?' + qs.toString()).then(r => r.ok)
  verified.value = ok
})

async function mine() {
  if (!verified.value || loading.value) return
  loading.value = true
  const res = await fetch('/api/mine', { method: 'POST' })
  const j = await res.json()
  mining.value = j
  loading.value = false
}
</script>

<template>
  <main class="wrap">
    <div class="card">
      <img src="/images/error.png" alt="ERROR" class="hero" />
      <p class="msg">đã xảy ra lỗi, thử lại sau</p>

      <a class="btn" href="https://t.me/HTW_Announcements" target="_blank">Báo Lỗi Cho Admin</a>
      <a class="btn" href="https://t.me/HTW_Announcements" target="_blank">Tham Gia Kênh Thông Báo<br/>HTW COIN</a>
      <a class="btn" href="https://t.me/HTW_Announcements" target="_blank">Tham Gia Nhóm Chat HTW COIN</a>
      <hr style="opacity:.2; margin:16px 0" />
    </div>
  </main>
</template>

<style scoped>
.wrap{
  min-height:100vh; display:grid; place-items:center; padding:24px;
  background: linear-gradient(160deg,#ffb300,#ff6b6b 50%, #76d66b);
}
.card{
  width: 335px; max-width: 92vw; padding: 24px 18px 28px;
  background: rgba(255,255,255,.12); border-radius: 20px; text-align:center;
  backdrop-filter: blur(2px); border: 1px dashed rgba(0,0,0,.15);
}
.hero{ width: 70%; margin: 8px auto 6px; display:block; }
.msg{ color:#fff; font-weight:700; margin: 10px 0 14px; }
.btn{
  display:block; margin: 10px auto; padding: 12px 14px; width: 92%;
  color:#fff; font-weight:700; background:#ff7aa2; border-radius:12px;
  border:none; text-decoration:none; cursor:pointer;
}
.btn:disabled{ opacity:.6; cursor: not-allowed; }
</style>
