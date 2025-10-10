<!-- src/pages/AdminWithdraws.vue -->
<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
const route = useRoute()
const r = useRouter()
const is = (p) => route.path.startsWith(p)
const go = (p) => { if (!is(p)) r.replace(p) }

const items   = ref([])
const filter  = ref('pending')  // pending | completed | rejected | all
const loading = ref(false)
const msg     = ref('')

// Reject modal state
const showRejectModal = ref(false)
const rejectReason    = ref('')
const pendingRejectId = ref(null)

const view = computed(() =>
  filter.value === 'all' ? items.value : items.value.filter(x => x.status === filter.value)
)

function fmtMoney(n){ return Number(n||0).toLocaleString('vi-VN') }
function fmtDate(s){ try{ return new Date(s).toLocaleString('vi-VN') } catch { return s } }
function nameOf(u){
  if (!u) return '—'
  return u.username ? '@'+u.username : [u.first_name,u.last_name].filter(Boolean).join(' ') || u.telegram_id
}

async function loadList(){
  loading.value = true; msg.value=''
  try{
    const tid = window?.Telegram?.WebApp?.initDataUnsafe?.user?.id ?? ''
    const qs  = filter.value==='all' ? '' : `?status=${encodeURIComponent(filter.value)}`
    const r   = await fetch(`/api/admin/withdraws${qs}${qs ? '&' : '?'}tid=${tid}`, { credentials:'include' })
    if (r.status === 403){ msg.value='Bạn không có quyền admin.'; items.value=[]; return }
    if (!r.ok) throw new Error(await r.text())
    items.value = await r.json()
  }catch(e){
    console.error(e); msg.value = 'Không tải được danh sách.'
  }finally{
    loading.value = false
  }
}

/* ===== Pretty confirms ===== */

// Confirm bằng Telegram popup (đẹp trong webview Telegram)
function tgConfirm(message, okText='OK', cancelText='Cancel'){
  const tg = window.Telegram?.WebApp
  return new Promise(resolve => {
    if (tg?.showPopup){
      tg.showPopup({
        title: 'Xác nhận',
        message,
        buttons: [
          { id:'cancel', type:'cancel',  text: cancelText },
          { id:'ok',     type:'default', text: okText }
        ]
      }, (id) => resolve(id === 'ok'))
    } else {
      // Fallback ngoài Telegram
      resolve(window.confirm(message))
    }
  })
}

// Haptic nhẹ cho cảm giác “bấm nút”
function haptic(t='light'){
  try{ window.Telegram?.WebApp?.HapticFeedback?.impactOccurred(t) }catch{}
}

// Gọi API thực sự
async function doAction(id, action, reason=''){
  const tid = window?.Telegram?.WebApp?.initDataUnsafe?.user?.id ?? ''
  const r = await fetch(`/api/admin/withdraw_action?tid=${tid}`, {
    method:'POST',
    headers:{ 'Content-Type':'application/json' },
    body: JSON.stringify({ id, action, reason })
  })
  const j = await r.json().catch(()=> ({}))
  if (!r.ok || !j.ok) throw new Error(j.error || 'error')
}

async function approve(id){
  haptic('medium')
  const ok = await tgConfirm('Xác nhận DUYỆT lệnh này?', 'Duyệt', 'Huỷ')
  if (!ok) return
  try{
    await doAction(id, 'complete')
    await loadList()
    msg.value = '✅ Đã duyệt.'
  }catch(e){
    console.error(e); msg.value = 'Xử lý thất bại.'
  }finally{
    setTimeout(()=> msg.value='', 1500)
  }
}

function openReject(id){
  haptic('light')
  pendingRejectId.value = id
  rejectReason.value = ''
  showRejectModal.value = true
}

async function submitReject(){
  const id = pendingRejectId.value
  if (!id) { showRejectModal.value=false; return }
  try{
    await doAction(id, 'reject', rejectReason.value || '')
    await loadList()
    msg.value = '⛔ Đã từ chối & hoàn tiền.'
  }catch(e){
    console.error(e); msg.value = 'Xử lý thất bại.'
  }finally{
    showRejectModal.value = false
    setTimeout(()=> msg.value='', 1500)
  }
}

onMounted(loadList)
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
      <h1>Admin rút tiền</h1>
      <div class="tabs">
        <button :class="{on:filter==='pending'}"   @click="filter='pending';   loadList()">Chờ duyệt</button>
        <button :class="{on:filter==='completed'}" @click="filter='completed'; loadList()">Đã duyệt</button>
        <button :class="{on:filter==='rejected'}"  @click="filter='rejected';  loadList()">Từ chối</button>
        <button :class="{on:filter==='all'}"       @click="filter='all';       loadList()">Tất cả</button>
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
              <button class="ok" @click="approve(w.id)">
                <i class="bi bi-check2-circle"></i> Duyệt
              </button>
              <button class="no" @click="openReject(w.id)">
                <i class="bi bi-x-circle"></i> Từ chối
              </button>
            </div>
          </div>
        </div>
      </div>
    </main>

    <!-- Reject Modal -->
    <div v-if="showRejectModal" class="modal">
      <div class="modal-box">
        <div class="modal-title">
          <i class="bi bi-x-octagon"></i> Từ chối lệnh rút
        </div>
        <label class="modal-label">Lý do (tuỳ chọn)</label>
        <textarea
          class="modal-textarea"
          v-model="rejectReason"
          rows="3"
          placeholder="Nhập lý do từ chối…"
        ></textarea>
        <div class="modal-actions">
          <button class="btn ghost" @click="showRejectModal=false">Huỷ</button>
          <button class="btn danger" @click="submitReject">Xác nhận</button>
        </div>
      </div>
    </div>
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

/* ===== Modal ===== */
.modal{
  position: fixed; inset: 0; z-index: 50;
  background: rgba(0,0,0,.5);
  display:grid; place-items:center; padding:18px;
  backdrop-filter: blur(2px);
}
.modal-box{
  width:100%; max-width:460px;
  background:#0f172a; border:var(--ring); border-radius:14px;
  padding:16px; box-shadow:0 10px 30px rgba(2,8,23,.45);
}
.modal-title{
  display:flex; align-items:center; gap:8px;
  font-weight:800; margin-bottom:10px;
}
.modal-label{font-size:12px; color:#94a3b8}
.modal-textarea{
  width:100%; margin-top:6px; border-radius:10px; padding:10px 12px;
  border:var(--ring); background:#0b1222; color:#e5e7eb; resize: none;
}
.modal-actions{
  display:flex; justify-content:flex-end; gap:10px; margin-top:12px;
}
.btn{
  padding:8px 12px; border-radius:10px; font-weight:800; border:1px solid transparent;
}
.btn.ghost{background:#0e1726; color:#cbd5e1; border:var(--ring)}
.btn.danger{background:#ef4444; color:#0b0f1a; border-color:#ef4444}
</style>
