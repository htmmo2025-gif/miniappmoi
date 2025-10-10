<!-- src/pages/Admin.vue -->
<script setup>
import { useRouter, onBeforeRouteUpdate } from 'vue-router'
import { ref, onMounted, computed } from 'vue'

const r = useRouter()

// Lấy info admin từ Telegram (nếu chạy trong webview)
const tgUser = ref(null)
onMounted(() => {
  const u = window?.Telegram?.WebApp?.initDataUnsafe?.user
  if (u) tgUser.value = u
})
onBeforeRouteUpdate(() => {
  const u = window?.Telegram?.WebApp?.initDataUnsafe?.user
  if (u) tgUser.value = u
})

const adminName = computed(() => {
  const u = tgUser.value
  if (!u) return 'Admin'
  if (u.username) return '@' + u.username
  return [u.first_name, u.last_name].filter(Boolean).join(' ') || 'Admin'
})

// điều hướng
function go(path){ r.push(path) }
</script>

<template>
  <div class="page">
    <header class="top">
      <div class="hdr">
        <div class="ttl">
          <i class="bi bi-shield-lock"></i>
          <div class="t">
            <h1>Trang quản trị</h1>
            <p>Xin chào, <b>{{ adminName }}</b>. Chọn thao tác bên dưới.</p>
          </div>
        </div>
      </div>
    </header>

    <main class="wrap">
      <div class="grid">
        <!-- Card: Duyệt rút -->
        <button class="card action" @click="go('/admin/withdraws')">
          <div class="ico ok"><i class="bi bi-cash-coin"></i></div>
          <div class="txt">
            <div class="h">Duyệt rút</div>
            <div class="s">Xem & xử lý các yêu cầu rút tiền đang chờ</div>
          </div>
          <i class="bi bi-chevron-right arr"></i>
        </button>

        <!-- Card: Tra cứu user -->
        <button class="card action" @click="go('/admin/lookup')">
          <div class="ico info"><i class="bi bi-person-search"></i></div>
          <div class="txt">
            <div class="h">Tra cứu user</div>
            <div class="s">Xem số dư, tổng HTW đã kiếm, lịch sử rút</div>
          </div>
          <i class="bi bi-chevron-right arr"></i>
        </button>

        <!-- Card: Thống kê VNĐ -->
        <button class="card action" @click="go('/admin/stats')">
          <div class="ico stat"><i class="bi bi-graph-up"></i></div>
          <div class="txt">
            <div class="h">Thống kê VNĐ</div>
            <div class="s">Tổng VNĐ đã rút và xu hướng theo ngày</div>
          </div>
          <i class="bi bi-chevron-right arr"></i>
        </button>
      </div>

      <!-- Tip: safe area -->
      <div class="safe"></div>
    </main>
  </div>
</template>

<style scoped>
@import url('https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.0/font/bootstrap-icons.css');

.page{--bg:#0b0f1a;--card:#101826;--ring:1px solid rgba(148,163,184,.14);
  --mut:#9aa3b2;--txt:#e5e7eb;--ok:#34d399;--info:#93c5fd;--stat:#fcd34d;
  color:var(--txt); background:var(--bg); min-height:100vh}

/* Header */
.top{
  position:sticky; top:0; z-index:10; padding:12px 16px;
  background:linear-gradient(180deg,rgba(11,15,26,.96),rgba(11,15,26,.7) 65%,transparent);
  backdrop-filter: blur(8px);
  border-bottom: var(--ring);
}
.hdr{display:flex; align-items:center; justify-content:space-between; gap:12px}
.ttl{display:flex; align-items:center; gap:12px}
.ttl > i{font-size:22px; color:#93c5fd}
.t h1{margin:0; font:800 20px/1 ui-sans-serif,system-ui}
.t p{margin:4px 0 0; font-size:12px; color:var(--mut)}

/* Body */
.wrap{padding:14px 16px}
.grid{
  display:grid; gap:12px;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
}

/* Card action */
.card.action{
  display:grid; grid-template-columns: auto 1fr auto; align-items:center; gap:12px;
  background:var(--card); border:var(--ring); border-radius:14px; padding:12px;
  text-align:left; cursor:pointer; transition: transform .12s ease, border-color .12s ease, background .12s ease;
}
.card.action:hover{ transform: translateY(-2px); border-color:#3b485c }
.ico{
  width:44px; height:44px; border-radius:12px; display:grid; place-items:center;
  background:#0e1726; border:var(--ring);
}
.ico.ok   { color:var(--ok);   box-shadow: 0 6px 16px rgba(52,211,153,.12) }
.ico.info { color:var(--info); box-shadow: 0 6px 16px rgba(147,197,253,.12) }
.ico.stat { color:var(--stat); box-shadow: 0 6px 16px rgba(252,211,77,.12) }
.txt .h{ font-weight:900; letter-spacing:.2px }
.txt .s{ font-size:12px; color:var(--mut); margin-top:2px }
.arr{ opacity:.7 }
.safe{ height: calc(env(safe-area-inset-bottom) + 8px) }
</style>
