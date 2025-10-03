<!-- src/pages/AdminWithdraws.vue -->
<script setup>
import { ref, onMounted, computed } from 'vue'


const items = ref([])
const filter = ref('pending')  // pending | completed | rejected | all
const loading = ref(false)
const msg = ref('')

const view = computed(() =>
  filter.value === 'all' ? items.value : items.value.filter(x => x.status === filter.value)
)

function fmtMoney(n){ return Number(n||0).toLocaleString('vi-VN') }
function fmtDate(s){
  try{ return new Date(s).toLocaleString('vi-VN') } catch { return s }
}
function nameOf(u){
  if (!u) return '—'
  return u.username ? '@'+u.username : [u.first_name,u.last_name].filter(Boolean).join(' ') || u.telegram_id
}

async function loadList(){
  loading.value = true; msg.value=''
  try{
    const tid = window?.Telegram?.WebApp?.initDataUnsafe?.user?.id ?? ''
    const qs = filter.value==='all' ? '' : `?status=${encodeURIComponent(filter.value)}`
    const r = await fetch(`/api/admin/withdraws${qs}${qs ? '&' : '?'}tid=${tid}`, { credentials:'include' })
    if (r.status === 403) { msg.value = 'Bạn không có quyền admin.'; items.value=[]; return }
    if (!r.ok) throw new Error(await r.text())
    items.value = await r.json()
  }catch(e){
    console.error(e); msg.value = 'Không tải được danh sách.'
  }finally{
    loading.value = false
  }
}

async function act(id, action){
  const tid = window?.Telegram?.WebApp?.initDataUnsafe?.user?.id ?? ''
  let reason = null
  if (action==='reject'){
    reason = prompt('Lý do từ chối (tuỳ chọn):') || ''
  }
  const ok = confirm(action==='complete' ? 'Xác nhận DUYỆT lệnh này?' : 'Xác nhận TỪ CHỐI lệnh này?')
  if (!ok) return

  try{
    const r = await fetch(`/api/admin/withdraw_action?tid=${tid}`, {
      method:'POST',
      headers:{ 'Content-Type':'application/json' },
      body: JSON.stringify({ id, action, reason })
    })
    const j = await r.json().catch(()=> ({}))
    if (!r.ok || !j.ok) throw new Error(j.error || 'error')
    await loadList()
    msg.value = action==='complete' ? 'Đã duyệt.' : 'Đã từ chối & hoàn tiền.'
    setTimeout(()=> msg.value='', 1500)
  }catch(e){
    console.error(e)
    msg.value = 'Xử lý thất bại.'
    setTimeout(()=> msg.value='', 2000)
  }
}

onMounted(loadList)
</script>

<template>
  <div class="page">
    <header class="top">
      <h1>Admin rút tiền</h1>
      <div class="tabs">
        <button :class="{on:filter==='pending'}" @click="filter='pending'; loadList()">Chờ duyệt</button>
        <button :class="{on:filter==='completed'}" @click="filter='completed'; loadList()">Đã duyệt</button>
        <button :class="{on:filter==='rejected'}" @click="filter='rejected'; loadList()">Từ chối</button>
        <button :class="{on:filter==='all'}" @click="filter='all'; loadList()">Tất cả</button>
      </div>
    </header>

    <main class="wrap">
      <p v-if="msg" class="msg">{{ msg }}</p>

      <div v-if="loading" class="loading">Đang tải…</div>

      <div v-else-if="!view.length" class="empty">
        <i class="bi bi-inbox"></i>
        <p>Không có dữ liệu</p>
      </div>

      <div v-else class="list">
        <div v-for="w in view" :key="w.id" class="row">
          <div class="l">
            <div class="amt">-{{ fmtMoney(w.amount_vnd) }} <span>VND</span></div>
            <div class="sub">
              <b>{{ w.bank_name }}</b> — {{ w.dest }} • {{ w.account_name }}
            </div>
            <div class="sub user">
              <i class="bi bi-person"></i>
              {{ nameOf(w.user) }} (uid: {{ w.user_id }})
            </div>
            <div class="sub time"><i class="bi bi-clock"></i> {{ fmtDate(w.created_at) }}</div>
            <div v-if="w.processed_at" class="sub time">
              <i class="bi bi-shield-check"></i> {{ w.status }} • {{ fmtDate(w.processed_at) }} • {{ w.processed_by || '' }}
            </div>
            <div v-if="w.note" class="sub note"><i class="bi bi-chat-left-text"></i> {{ w.note }}</div>
          </div>

          <div class="r">
            <span :class="['st', w.status]">{{ w.status }}</span>
            <div v-if="w.status==='pending'" class="actions">
              <button class="ok" @click="act(w.id,'complete')"><i class="bi bi-check2-circle"></i> Duyệt</button>
              <button class="no" @click="act(w.id,'reject')"><i class="bi bi-x-circle"></i> Từ chối</button>
            </div>
          </div>
        </div>
      </div>
    </main>
  </div>
</template>

<style scoped>
.page{--bg:#0b0f1a;--card:#101826;--ring:1px solid rgba(148,163,184,.14);--mut:#9aa3b2;color:#e5e7eb;background:var(--bg);min-height:100vh}
.top{position:sticky;top:0;z-index:10;padding:12px 16px;background:linear-gradient(180deg,rgba(11,15,26,.96),rgba(11,15,26,.7) 65%,transparent);backdrop-filter:blur(8px)}
.top h1{margin:0 0 8px;font:800 20px/1 ui-sans-serif,system-ui}
.tabs{display:flex;gap:8px;flex-wrap:wrap}
.tabs button{padding:8px 10px;border-radius:999px;border:var(--ring);background:#0e1726;color:#cbd5e1}
.tabs button.on{background:#0b213a;color:#93c5fd;border-color:#2563eb88}
.wrap{padding:12px 16px calc(92px + env(safe-area-inset-bottom))}
.msg{background:#064e3b;border:1px solid #065f46;padding:8px 10px;border-radius:10px;margin-bottom:10px;color:#a7f3d0}
.loading,.empty{padding:24px 8px;text-align:center;color:var(--mut)}
.empty i{font-size:40px;opacity:.5}
.list{display:grid;gap:10px}
.row{display:grid;grid-template-columns:1fr auto;gap:10px;background:var(--card);border:var(--ring);border-radius:14px;padding:12px}
.amt{font-weight:800;font-size:16px}
.amt span{font-size:11px;opacity:.85;margin-left:4px}
.sub{font-size:12px;color:var(--mut);margin-top:2px}
.sub.user i,.sub.time i,.sub.note i{margin-right:4px}
.r{display:grid;place-items:center;gap:8px}
.st{padding:4px 10px;border-radius:999px;font-size:12px;font-weight:800;text-transform:uppercase}
.st.pending{background:#f59e0b1a;color:#f59e0b;border:1px solid #f59e0b55}
.st.completed{background:#10b9811a;color:#10b981;border:1px solid #10b98155}
.st.rejected{background:#ef44441a;color:#ef4444;border:1px solid #ef444455}
.actions{display:flex;gap:8px}
.actions .ok{background:#065f46;border:1px solid #10b98155;color:#a7f3d0;padding:6px 10px;border-radius:10px}
.actions .no{background:#3a0d14;border:1px solid #ef444455;color:#fecaca;padding:6px 10px;border-radius:10px}
</style>
