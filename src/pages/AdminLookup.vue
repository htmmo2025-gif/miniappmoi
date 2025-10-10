<script setup>
import { ref, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
const route = useRoute()
const r = useRouter()
const is = (p) => route.path.startsWith(p)
const go = (p) => { if (!is(p)) r.replace(p) }

const tg = ref('')          // Telegram ID cần tra
const loading = ref(false)
const data = ref(null)
const msg = ref('')

const fmt = (n) => Number(n||0).toLocaleString('vi-VN')
const nameOf = (u) => {
  if (!u) return '—'
  return u.username ? '@'+u.username : [u.first_name,u.last_name].filter(Boolean).join(' ') || u.telegram_id || '—'
}

// Lấy Telegram ID từ WebApp
const getTelegramId = () => {
  try {
    const tg = window.Telegram?.WebApp
    if (tg?.initDataUnsafe?.user?.id) return tg.initDataUnsafe.user.id
  } catch {}
  return null
}

async function fetchStats () {
  msg.value = ''; data.value = null; loading.value = true
  try {
    const url = new URL('/api/admin/user-stats', location.origin)
    url.searchParams.set('tg_id', tg.value.trim())
    
    // Thêm tid để verify admin
    const tid = getTelegramId()
    if (tid) url.searchParams.set('tid', tid)
    
    const r = await fetch(url, { credentials: 'include' })
    const j = await r.json().catch(()=> ({}))
    if (!r.ok || j.error) { msg.value = j?.error || 'Không tìm thấy'; return }
    data.value = j
  } catch (e) {
    console.error(e); msg.value = 'Lỗi tải dữ liệu'
  } finally { loading.value = false }
}

const user = computed(() => data.value?.user || {})
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
      <h1>Tra cứu người dùng</h1>
      <div class="searchbar">
        <div class="inputwrap">
          <i class="bi bi-person"></i>
          <input class="input" v-model="tg" placeholder="Nhập Telegram ID…" @keyup.enter="fetchStats"/>
        </div>
        <button class="btn primary" @click="fetchStats">
          <i class="bi bi-search"></i> Tra cứu
        </button>
      </div>
    </header>

    <main class="wrap">
      <p v-if="msg" class="msg warn">{{ msg }}</p>
      <div v-if="loading" class="loading">Đang tải…</div>

      <div v-else-if="data" class="grid">
        <!-- Card: User info -->
        <div class="card">
          <div class="card-h">
            <i class="bi bi-person-badge"></i> Thông tin người dùng
          </div>
          <div class="card-b">
            <div class="kv"><span>Họ tên / Username</span><b>{{ nameOf(user) }}</b></div>
            <div class="kv"><span>Telegram ID</span><b class="mono">{{ user.telegram_id }}</b></div>
            <div class="kv"><span>User ID</span><b class="mono">{{ user.id }}</b></div>
            <div class="kv"><span>HTW balance</span><b>{{ fmt(user.htw_balance) }}</b></div>
            <div class="kv"><span>VNĐ balance</span><b>{{ fmt(user.vnd_balance) }}</b></div>
          </div>
        </div>

        <!-- Card: Earn/ref -->
        <div class="card">
          <div class="card-h">
            <i class="bi bi-coin"></i> Tổng kiếm được
          </div>
          <div class="card-b">
            <div class="big">{{ fmt(data.earned_htw_total) }} <span class="unit">HTW</span></div>
            <div class="mut">Từ mining • chest • task • wheel • ref</div>
            <div class="kv mt"><span>Ref mời được</span><b>{{ data.ref_count }}</b></div>
          </div>
        </div>

        <!-- Card: Last withdraw -->
        <div class="card">
          <div class="card-h">
            <i class="bi bi-bank2"></i> Rút tiền
          </div>
          <div class="card-b">
            <div class="kv"><span>Đã rút thành công</span><b>{{ fmt(data.withdrawn_vnd) }} VND</b></div>
            <div class="kv"><span>Trạng thái gần nhất</span>
              <b>
                <span v-if="data.last_withdraw" class="st" :class="data.last_withdraw.status">{{ data.last_withdraw.status }}</span>
                <span v-else>—</span>
              </b>
            </div>
            <div class="kv"><span>Thời gian</span>
              <b>{{ data.last_withdraw?.created_at ? new Date(data.last_withdraw.created_at).toLocaleString('vi-VN') : '—' }}</b>
            </div>
            <div class="kv"><span>Ngân hàng</span><b>{{ data.last_withdraw?.bank_name || '—' }}</b></div>
            <div class="kv"><span>STK / Ví</span><b class="mono">{{ data.last_withdraw?.dest || '—' }}</b></div>
            <div class="kv"><span>Tên nhận</span><b>{{ data.last_withdraw?.account_name || '—' }}</b></div>
          </div>
        </div>
      </div>

      <!-- Recent withdraws -->
      <div v-if="data?.recent_withdraws?.length" class="card listcard">
        <div class="card-h">
          <i class="bi bi-clock-history"></i> Lịch sử rút gần đây
        </div>
        <div class="card-b">
          <div class="list">
            <div class="row" v-for="w in data.recent_withdraws" :key="w.id">
              <div class="l">
                <div class="amt">-{{ fmt(w.amount_vnd) }} <span>VND</span></div>
                <div class="sub mono">{{ w.dest }}</div>
                <div class="sub">
                  <i class="bi bi-clock"></i> {{ new Date(w.created_at).toLocaleString('vi-VN') }}
                  <span class="sep">•</span> {{ w.channel }}
                </div>
              </div>
              <div class="r">
                <span class="st" :class="w.status">{{ w.status }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <p v-if="!loading && !data" class="empty">Nhập Telegram ID để tra cứu.</p>
    </main>
  </div>
</template>

<style scoped>


.admin-tabs{
  position: sticky; top: 0; z-index: 15;
  display:flex; gap:8px; flex-wrap:wrap;
  padding:10px 12px; margin: -6px -12px 10px; /* khớp layout hiện có */
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
.top h1{margin:0 0 10px;font:800 20px/1 ui-sans-serif,system-ui}
.searchbar{display:grid;grid-template-columns:1fr auto;gap:10px}
.inputwrap{position:relative}
.inputwrap i{position:absolute;left:10px;top:50%;transform:translateY(-50%);opacity:.85}
.input{width:100%;padding:10px 12px 10px 36px;border-radius:10px;border:var(--ring);background:#0e1726;color:var(--txt)}
.btn{height:40px;padding:0 12px;border-radius:10px;border:var(--ring);background:#0e1726;color:#cbd5e1;font-weight:800;cursor:pointer}
.btn.primary{background:#1e293b;color:#e2e8f0;border-color:#334155}
.wrap{padding:12px 16px calc(88px + env(safe-area-inset-bottom))}
.msg.warn{background:#3a2203;border:1px solid #f59e0b66;color:#f8d38a;padding:8px 10px;border-radius:10px;margin-bottom:10px}
.loading,.empty{padding:24px 8px;text-align:center;color:var(--mut)}

.grid{display:grid;gap:10px;grid-template-columns:repeat(auto-fit,minmax(260px,1fr))}
.card{background:var(--card);border:var(--ring);border-radius:14px;overflow:hidden}
.card-h{padding:10px 12px;border-bottom:var(--ring);display:flex;align-items:center;gap:8px;font-weight:800}
.card-b{padding:10px 12px}
.kv{display:flex;justify-content:space-between;gap:12px;padding:6px 0;border-bottom:1px dashed rgba(148,163,184,.14)}
.kv:last-child{border-bottom:none}
.mono{font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;word-break:break-all}
.big{font-weight:900;font-size:22px}
.unit{font-size:12px;opacity:.85;margin-left:6px}
.mt{margin-top:8px}
.mut{color:var(--mut)}

.st{padding:4px 10px;border-radius:999px;font-size:12px;font-weight:800;text-transform:uppercase}
.st.pending{background:#f59e0b1a;color:#f59e0b;border:1px solid #f59e0b55}
.st.done,.st.completed{background:#10b9811a;color:#10b981;border:1px solid #10b98155}
.st.rejected{background:#ef44441a;color:#ef4444;border:1px solid #ef444455}

.listcard .list{display:grid;gap:10px}
.row{display:grid;grid-template-columns:1fr auto;gap:10px;background:#0e1726;border:var(--ring);border-radius:10px;padding:10px}
.amt{font-weight:800}
.amt span{font-size:11px;opacity:.8;margin-left:4px}
.sub{font-size:12px;color:var(--mut);margin-top:2px}
.sep{opacity:.6;margin:0 6px}
</style>