<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
const route = useRoute()
const r = useRouter()
const is = (p) => route.path.startsWith(p)
const go = (p) => { if (!is(p)) r.replace(p) }

const loading = ref(false)
const totalVnd = ref(0)
const byDay = ref([])

// Lấy Telegram ID từ WebApp
const getTelegramId = () => {
  try {
    const tg = window.Telegram?.WebApp
    if (tg?.initDataUnsafe?.user?.id) return tg.initDataUnsafe.user.id
  } catch {}
  return null
}

async function load(){
  loading.value = true
  try{
    const tid = getTelegramId()
    const url = tid ? `/api/admin/summary?tid=${tid}` : '/api/admin/summary'
    const r = await fetch(url, { credentials:'include' })
    const j = await r.json().catch(()=> ({}))
    totalVnd.value = j.total_vnd_done || 0
    byDay.value    = j.by_day || []
  } finally { loading.value = false }
}
onMounted(load)

const countDone = computed(() => byDay.value.length)
const fmt = (n)=> Number(n||0).toLocaleString('vi-VN')
</script>

<template>
  <!-- Admin tabs -->
<nav class="admin-tabs">
  <button :class="{on: is('/admin/withdraws')}" @click="go('/admin/withdraws')">
    <i class="bi bi-cash-coin"></i> Duyệt rút
  </button>
  <button :class="{on: is('/admin/lookup')}" @click="go('/admin/lookup')">
    <i class="bi bi-person-search"></i> Tra cứu user
  </button>
  <button :class="{on: is('/admin/stats')}" @click="go('/admin/stats')">
    <i class="bi bi-graph-up"></i> Thống kê VNĐ
  </button>
</nav>

  <div class="page">
    <header class="top">
      <h1>Thống kê rút VNĐ</h1>
    </header>

    <main class="wrap">
      <div v-if="loading" class="loading">Đang tải…</div>

      <template v-else>
        <!-- KPI chính -->
        <div class="card kpi-main">
          <div class="card-h"><i class="bi bi-cash-stack"></i> Tổng tiền đã duyệt rút</div>
          <div class="card-b">
            <div class="amount">{{ fmt(totalVnd) }} <span class="unit">VND</span></div>
            <div class="meta">
              <div class="meta-item">
                <i class="bi bi-calendar-check"></i>
                <span>{{ countDone }} ngày có rút tiền</span>
              </div>
            </div>
          </div>
        </div>

        <p class="note mut">
          <i class="bi bi-info-circle"></i>
          Thống kê tính từ tất cả các giao dịch rút tiền có trạng thái <strong>done</strong>.
        </p>
      </template>
    </main>
  </div>
</template>

<style scoped>

.admin-tabs{
  position: sticky; top: 0; z-index: 15;
  display:flex; gap:8px; flex-wrap:wrap;
  padding:10px 12px; margin: -6px -12px 10px;
  background: linear-gradient(180deg, rgba(11,15,26,.96), rgba(11,15,26,.7) 65%, transparent);
  backdrop-filter: blur(8px);
}
.admin-tabs button{
  padding:8px 10px; border-radius:999px; border:1px solid rgba(148,163,184,.14);
  background:#0e1726; color:#cbd5e1; font-weight:800; display:inline-flex; gap:6px; align-items:center;
}
.admin-tabs button.on{
  background:#0b213a; color:#93c5fd; border-color:#2563eb88;
}

@import url('https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.0/font/bootstrap-icons.css');

.page{--bg:#0b0f1a;--card:#101826;--ring:1px solid rgba(148,163,184,.14);--mut:#9aa3b2;--txt:#e5e7eb;
  color:var(--txt);background:var(--bg);min-height:100vh}
.top{position:sticky;top:0;z-index:10;padding:12px 16px;background:linear-gradient(180deg,rgba(11,15,26,.96),rgba(11,15,26,.7) 65%,transparent);backdrop-filter:blur(8px)}
.top h1{margin:0 0 8px;font:800 20px/1 ui-sans-serif,system-ui}
.wrap{padding:12px 16px calc(88px + env(safe-area-inset-bottom))}
.loading,.empty{text-align:center;color:var(--mut);padding:24px 8px}

.card{background:var(--card);border:var(--ring);border-radius:14px;overflow:hidden}
.card-h{padding:10px 12px;border-bottom:var(--ring);display:flex;align-items:center;gap:8px;font-weight:800}
.card-b{padding:12px}

.kpi-main .card-b{padding:20px}
.kpi-main .amount{font-size:32px;font-weight:900;color:#60a5fa;margin-bottom:16px}
.unit{font-size:14px;opacity:.85;margin-left:6px}
.mut{color:var(--mut)}
.kpi-main .meta{display:flex;gap:16px;flex-wrap:wrap}
.kpi-main .meta-item{display:flex;align-items:center;gap:6px;color:var(--mut);font-size:13px}
.note{text-align:center;padding:16px;margin-top:16px;line-height:1.6}
</style>