<script setup>
import { ref, onMounted } from 'vue'

const prof = ref(null)
const amount = ref('')
const channel = ref('bank')
const dest = ref('')
const bankName = ref('')
const accountName = ref('')
const msg = ref('')
const busy = ref(false)
const items = ref([])

const getStatusClass = (s) =>
  s === 'completed' ? 'st-done' : s === 'rejected' ? 'st-reject' : 'st-pending'

const getStatusText = (s) =>
  s === 'completed' ? 'Hoàn thành' : s === 'rejected' ? 'Bị từ chối' : 'Đang xử lý'

async function loadProfile () {
  const r = await fetch('/api/profile', { credentials: 'include' })
  if (r.ok) prof.value = await r.json()
}

async function loadList () {
  const r = await fetch('/api/withdraw', { credentials: 'include' })
  if (r.ok) items.value = await r.json()
}

async function submit () {
  msg.value = ''
  busy.value = true

  const n = Number(amount.value)
  if (!Number.isFinite(n) || n < 2000) {
    msg.value = 'Tối thiểu 2.000 VND'
    busy.value = false; return
  }
  if (n > (prof.value?.vnd_balance ?? 0)) { msg.value = 'Số dư không đủ'; busy.value = false; return }
  if (!dest.value.trim() || !bankName.value.trim() || !accountName.value.trim()) {
    msg.value = 'Vui lòng điền đầy đủ thông tin ngân hàng'; busy.value = false; return
  }

  try {
    const r = await fetch('/api/withdraw', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        amount_vnd: n,
        channel: channel.value,
        dest: dest.value.trim(),
        bank_name: bankName.value.trim(),
        account_name: accountName.value.trim()
      })
    })

    const data = await r.json().catch(()=> ({}))
    if (!r.ok) {
      if (data?.error === 'daily_limit')   msg.value = 'Hôm nay bạn đã tạo 1 yêu cầu rút. Thử lại vào ngày mai.'
      else if (data?.error === 'min_withdraw') msg.value = 'Tối thiểu 2.000 VND'
      else if (data?.error === 'insufficient') msg.value = 'Số dư không đủ'
      else msg.value = 'Không tạo được lệnh rút.'
      busy.value = false
      return
    }

    amount.value = ''; dest.value = ''; bankName.value = ''; accountName.value = ''
    await Promise.all([loadProfile(), loadList()])
    msg.value = 'Tạo lệnh rút thành công! Chờ xử lý...'
  } catch (e) {
    msg.value = 'Lỗi kết nối. Thử lại sau.'
  } finally {
    busy.value = false
  }
}


function formatDate (s) {
  return new Date(s).toLocaleString('vi-VN', {
    day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit'
  })
}

onMounted(() => Promise.all([loadProfile(), loadList()]))
</script>

<template>
  <div class="page">
    <!-- Header -->
    <header class="topbar">
      <button class="back" @click="$router.go(-1)"><i class="bi bi-arrow-left"></i></button>
      <h1>Rút tiền</h1>
      <span class="spacer"></span>
    </header>

    <main class="wrap">
      <!-- Số dư -->
      <section v-if="prof" class="card hero">
        <div class="hero-ic"><i class="bi bi-wallet2"></i></div>
        <div class="hero-text">
          <div class="label">Số dư khả dụng</div>
          <div class="amount">
            {{ (prof.vnd_balance ?? 0).toLocaleString() }}
            <span>VND</span>
          </div>
        </div>
      </section>

      <!-- Form -->
      <section class="card">
        <div class="group">
          <label class="lbl"><i class="bi bi-currency-dollar"></i> Số tiền muốn rút</label>
          <div class="amt-row">
            <input
              class="amt"
              v-model="amount"
              type="number"
              inputmode="numeric"
              pattern="[0-9]*"
              min="1" step="1000" placeholder="0"
            />
            <span class="cur">VND</span>
          </div>

          <div class="chip-grid">
            <button
              v-for="a in [2000,10000,20000,50000]"
              :key="a"
              class="chip"
              type="button"
              @click="amount = a.toString()"
            >{{ a/1000 }}K</button>
          </div>
        </div>

        <div class="group box">
          <label class="lbl"><i class="bi bi-building"></i> Tên ngân hàng</label>
          <input class="txt" v-model="bankName" placeholder="VD: Vietcombank, BIDV, Techcombank..." />

          <label class="lbl"><i class="bi bi-credit-card-2-front"></i> Số tài khoản</label>
          <input class="txt" v-model="dest" type="number" inputmode="numeric" placeholder="1234567890" />

          <label class="lbl"><i class="bi bi-person"></i> Tên chủ tài khoản</label>
          <input class="txt up" v-model="accountName" placeholder="NGUYEN VAN A" />
        </div>

        <button class="btn" :disabled="busy || !amount || !dest || !bankName || !accountName" @click="submit">
          <div v-if="busy" class="spin"></div>
          <i v-else class="bi bi-arrow-right-circle"></i>
          <span>{{ busy ? 'Đang xử lý...' : 'Tạo lệnh rút' }}</span>
        </button>

        <p v-if="msg" :class="['note', msg.includes('thành công') ? 'ok' : 'err']">
          <i :class="msg.includes('thành công') ? 'bi bi-check-circle' : 'bi bi-exclamation-circle'"></i>
          {{ msg }}
        </p>
      </section>

      <!-- Lịch sử -->
      <section class="card">
        <div class="section-title"><i class="bi bi-clock-history"></i> Lịch sử rút tiền</div>

        <div v-if="!items.length" class="empty">
          <i class="bi bi-inbox"></i>
          <p>Chưa có giao dịch nào</p>
        </div>

        <div v-else class="list">
          <div v-for="it in items" :key="it.id" class="row">
            <div class="row-l">
              <div class="row-ic"><i class="bi bi-bank"></i></div>
              <div class="row-t">
                <div class="row-amt">-{{ Number(it.amount_vnd).toLocaleString() }} VND</div>
                <div class="row-sub">{{ it.bank_name || 'Ngân hàng' }} — {{ it.dest }}</div>
                <div class="row-sub name">{{ it.account_name || 'Tên tài khoản' }}</div>
                <div class="row-date">{{ formatDate(it.created_at) }}</div>
              </div>
            </div>
            <div class="row-r">
              <span :class="['st', getStatusClass(it.status)]">{{ getStatusText(it.status) }}</span>
            </div>
          </div>
        </div>
      </section>
    </main>
  </div>
</template>

<style scoped>
/* ========== layout chung (full-bleed, không max-width) ========== */
.page{
  --bg:#0b0f1a; --card:#101826; --mut:#9aa3b2; --ring:1px solid rgba(148,163,184,.14);
  background:var(--bg); color:#e5e7eb; width:100dvw; min-height:100dvh;
}
.topbar{
  position: sticky; top: 0; z-index: 10;
  padding-block: calc(10px + env(safe-area-inset-top)) 10px;
  /* đệm 2 bên cân, tôn trọng safe-area nếu có notch */
  padding-left: max(16px, env(safe-area-inset-left));
  padding-right: max(16px, env(safe-area-inset-right));
  display: flex; align-items: center; gap: 10px;
  background: linear-gradient(180deg, rgba(11,15,26,.96), rgba(11,15,26,.7) 65%, transparent);
  backdrop-filter: blur(8px);
}

.topbar h1{margin:0; font:800 20px/1 ui-sans-serif,system-ui}
.back{
  width:36px;height:36px;border-radius:50%;border:var(--ring);background:#0e1726;
  display:grid;place-items:center;color:#cbd5e1;
}
.spacer{flex:1}
.wrap{
  width: 100%;
  /* KHÔNG dùng max-width; chỉ padding 2 bên cân */
  padding-top: 12px;
  padding-bottom: calc(20px + env(safe-area-inset-bottom));
  padding-left: max(16px, env(safe-area-inset-left));
  padding-right: max(16px, env(safe-area-inset-right));
  display: grid; gap: 14px;
}

/* ========== card dùng chung ========== */
.card{ width: 100%; margin-inline: 0; overflow: hidden }
.section-title{display:flex; align-items:center; gap:8px; font-weight:800; margin-bottom:10px}

/* Hero balance */
.hero{display:flex; gap:12px; align-items:center; padding:16px}
.hero-ic{width:44px;height:44px;border-radius:12px;display:grid;place-items:center;
  background:linear-gradient(145deg,#06b6d4,#2563eb); color:#fff}
.hero-text .label{font-size:12px;color:var(--mut)}
.hero-text .amount{font:800 22px/1.1 ui-sans-serif,system-ui}
.hero-text .amount span{font:700 12px; opacity:.85; margin-left:6px}

/* Groups & inputs */
.group{display:grid; gap:12px; margin-bottom:10px}
.lbl{display:flex; align-items:center; gap:8px; font-weight:700}
.amt-row{position:relative}
.amt{
  width:100%; padding:14px 74px 14px 14px; border-radius:14px; border:var(--ring);
  background:#0f172a; color:#fff; font:700 18px/1.2 ui-sans-serif,system-ui; outline:none;
}
.amt:focus{box-shadow:0 0 0 2px #22d3ee55 inset}
.cur{position:absolute; right:12px; top:50%; transform:translateY(-50%); color:var(--mut); font-weight:700}
.chip-grid{ display: grid; grid-template-columns: repeat(4, minmax(0,1fr)); gap: 8px }
.chip{
  padding:10px 0; border-radius:12px; background:#0e1726; border:var(--ring);
  color:#a3b2c7; font-weight:700;
}
.box{background:#0c1424; border-radius:14px; padding:12px; border:var(--ring)}
.txt{
  width:100%; padding:12px 14px; border-radius:12px; border:var(--ring); background:#0f172a; color:#fff;
}
.txt:focus{box-shadow:0 0 0 2px #22d3ee55 inset}
.up{text-transform:uppercase}

/* Button */
.btn{
  width:100%; padding:14px; border-radius:14px; border:none; color:#fff; font-weight:800;
  background:linear-gradient(145deg,#ef4444,#22d3ee);
  display:flex;align-items:center;justify-content:center; gap:8px;
}
.btn:disabled{opacity:.5}
.spin{width:16px;height:16px;border-radius:50%;border:2px solid #ffffff55;border-top-color:#fff;animation:spin 1s linear infinite}
@keyframes spin{to{transform:rotate(360deg)}}

/* Message */
.note{margin-top:10px; padding:10px 12px; border-radius:10px; display:flex; gap:8px; align-items:center}
.ok{background:#16a34a1a; border:1px solid #16a34a50; color:#22c55e}
.err{background:#ef44441a; border:1px solid #ef444450; color:#ef4444}

/* History list */
.empty{padding:28px 8px; text-align:center; color:var(--mut)}
.empty i{font-size:40px; opacity:.5}
.list{display:grid; gap:10px}
.row{display:grid; grid-template-columns:1fr auto; gap:10px; padding:12px; border-radius:14px; background:#0e1525; border:var(--ring)}
.row-l{display:flex; gap:10px}
.row-ic{width:36px;height:36px;border-radius:10px;background:linear-gradient(145deg,#0369a1,#0284c7);display:grid;place-items:center}
.row-t{display:grid; gap:2px}
.row-amt{font-weight:800}
.row-sub{color:var(--mut); font-size:12px}
.row-sub.name{opacity:.9; font-weight:700}
.row-date{color:#7c8aa1; font-size:12px}
.row-r{display:grid; place-items:center}
.st{padding:6px 10px; border-radius:999px; font-size:12px; font-weight:800; white-space:nowrap}
.st-pending{background:#f59e0b1a; color:#f59e0b; border:1px solid #f59e0b55}
.st-done{background:#10b9811a; color:#10b981; border:1px solid #10b98155}
.st-reject{background:#ef44441a; color:#ef4444; border:1px solid #ef444455}
:global(*), :global(*::before), :global(*::after){ box-sizing: border-box }
:global(html, body, #app){ margin: 0; overflow-x: hidden }
/* Responsive tweaks */
@media (max-width:360px){ .chip-grid{grid-template-columns:repeat(2,1fr)} }
</style>
