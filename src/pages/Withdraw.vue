<script setup>
import { ref, onMounted, computed } from 'vue'

const prof = ref(null)
const amount = ref('')
const channel = ref('bank')
const dest = ref('')
const bankName = ref('')
const accountName = ref('')
const msg = ref('')
const busy = ref(false)
const items = ref([])

const getStatusClass = (status) => {
  switch(status) {
    case 'pending': return 'status-pending'
    case 'completed': return 'status-completed'
    case 'rejected': return 'status-rejected'
    default: return 'status-pending'
  }
}

const getStatusText = (status) => {
  switch(status) {
    case 'pending': return 'Đang xử lý'
    case 'completed': return 'Hoàn thành'
    case 'rejected': return 'Bị từ chối'
    default: return status
  }
}

async function loadProfile() {
  const r = await fetch('/api/profile', { credentials: 'include' })
  if (r.ok) prof.value = await r.json()
}

async function loadList() {
  const r = await fetch('/api/withdraw', { credentials: 'include' })
  if (r.ok) items.value = await r.json()
}

async function submit() {
  msg.value = ''
  busy.value = true
  
  const n = Number(amount.value)
  if (!Number.isFinite(n) || n <= 0) {
    msg.value = 'Số tiền không hợp lệ'
    busy.value = false
    return
  }
  
  if (n > (prof.value?.vnd_balance ?? 0)) {
    msg.value = 'Số dư không đủ'
    busy.value = false
    return
  }
  
  if (!dest.value.trim() || !bankName.value.trim() || !accountName.value.trim()) {
    msg.value = 'Vui lòng điền đầy đủ thông tin ngân hàng'
    busy.value = false
    return
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
    
    if (!r.ok) {
      throw new Error(await r.text())
    }
    
    amount.value = ''
    dest.value = ''
    bankName.value = ''
    accountName.value = ''
    await Promise.all([loadProfile(), loadList()])
    msg.value = 'Tạo lệnh rút thành công! Chờ xử lý...'
    
  } catch (e) {
    msg.value = 'Lỗi: ' + e.message
  } finally {
    busy.value = false
  }
}

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleString('vi-VN', {
    day: '2-digit',
    month: '2-digit', 
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

onMounted(async () => {
  await Promise.all([loadProfile(), loadList()])
})
</script>

<template>
  <div class="withdraw-page">
    <!-- Header -->
    <div class="header">
      <button class="back-btn" @click="$router.go(-1)">
        <i class="bi bi-arrow-left"></i>
      </button>
      <h1 class="title">
        <i class="bi bi-cash-coin"></i>
        Rút tiền
      </h1>
      <div class="header-spacer"></div>
    </div>

    <div class="content">
      <!-- Balance Card -->
      <div class="balance-card" v-if="prof">
        <div class="balance-header">
          <div class="balance-icon">
            <i class="bi bi-wallet2"></i>
          </div>
          <div class="balance-info">
            <div class="balance-label">Số dư khả dụng</div>
            <div class="balance-amount">
              {{ (prof.vnd_balance ?? 0).toLocaleString() }}
              <span class="currency">VND</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Withdraw Form -->
      <div class="form-card">
        <div class="form-header">
          <i class="bi bi-send"></i>
          Tạo lệnh rút tiền
        </div>

        <div class="form-body">
          <!-- Amount Input -->
          <div class="input-group">
            <label class="input-label">
              <i class="bi bi-currency-dollar"></i>
              Số tiền muốn rút
            </label>
            <div class="amount-input-wrapper">
              <input 
                class="amount-input"
                v-model="amount" 
                type="number" 
                min="1" 
                step="1000"
                placeholder="0"
              />
              <span class="input-currency">VND</span>
            </div>
            <div class="quick-amounts">
              <button 
                class="quick-amount-btn"
                v-for="amt in [50000, 100000, 200000, 500000]"
                :key="amt"
                @click="amount = amt.toString()"
                type="button"
              >
                {{ (amt / 1000) }}K
              </button>
            </div>
          </div>

          <!-- Bank Information -->
          <div class="bank-info-section">
            <div class="section-title">
              <i class="bi bi-bank"></i>
              Thông tin ngân hàng
            </div>
            
            <!-- Bank Name -->
            <div class="input-group">
              <label class="input-label">
                <i class="bi bi-building"></i>
                Tên ngân hàng
              </label>
              <input 
                class="text-input"
                v-model="bankName" 
                placeholder="VD: Vietcombank, BIDV, Techcombank..."
              />
            </div>

            <!-- Account Number -->
            <div class="input-group">
              <label class="input-label">
                <i class="bi bi-credit-card-2-front"></i>
                Số tài khoản
              </label>
              <input 
                class="text-input"
                v-model="dest" 
                placeholder="1234567890"
                type="number"
              />
            </div>

            <!-- Account Name -->
            <div class="input-group">
              <label class="input-label">
                <i class="bi bi-person"></i>
                Tên chủ tài khoản
              </label>
              <input 
                class="text-input"
                v-model="accountName" 
                placeholder="NGUYEN VAN A"
                style="text-transform: uppercase;"
              />
            </div>
          </div>

          <!-- Submit Button -->
          <button 
            class="submit-btn"
            :disabled="busy || !amount || !dest || !bankName || !accountName"
            @click="submit"
          >
            <div class="btn-content">
              <div v-if="busy" class="btn-spinner"></div>
              <i v-else class="bi bi-arrow-right-circle"></i>
              <span>{{ busy ? 'Đang xử lý...' : 'Tạo lệnh rút' }}</span>
            </div>
          </button>

          <!-- Message -->
          <div v-if="msg" :class="['message', msg.includes('thành công') ? 'success' : 'error']">
            <i :class="msg.includes('thành công') ? 'bi bi-check-circle' : 'bi bi-exclamation-circle'"></i>
            {{ msg }}
          </div>
        </div>
      </div>

      <!-- Transaction History -->
      <div class="history-card">
        <div class="history-header">
          <i class="bi bi-clock-history"></i>
          Lịch sử rút tiền
        </div>

        <div class="history-body">
          <div v-if="!items.length" class="empty-state">
            <i class="bi bi-inbox"></i>
            <p>Chưa có giao dịch nào</p>
          </div>
          
          <div v-else class="transaction-list">
            <div 
              v-for="item in items" 
              :key="item.id"
              class="transaction-item"
            >
              <div class="transaction-left">
                <div class="transaction-icon">
                  <i class="bi bi-bank"></i>
                </div>
                <div class="transaction-info">
                  <div class="transaction-amount">
                    -{{ Number(item.amount_vnd).toLocaleString() }} VND
                  </div>
                  <div class="transaction-details">
                    {{ item.bank_name || 'Ngân hàng' }} - {{ item.dest }}
                  </div>
                  <div class="transaction-account">
                    {{ item.account_name || 'Tên tài khoản' }}
                  </div>
                  <div class="transaction-date">
                    {{ formatDate(item.created_at) }}
                  </div>
                </div>
              </div>
              <div class="transaction-right">
                <div :class="['transaction-status', getStatusClass(item.status)]">
                  {{ getStatusText(item.status) }}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.withdraw-page {
  min-height: 100vh;
  background: #000000;
  color: #ffffff;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

.header {
  padding: 20px 24px;
  display: flex;
  align-items: center;
  gap: 16px;
  position: sticky;
  top: 0;
  background: linear-gradient(180deg, #000000 0%, rgba(0,0,0,0.95) 100%);
  backdrop-filter: blur(20px);
  z-index: 10;
}

.back-btn {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.1);
  border: none;
  color: #ffffff;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s ease;
}

.back-btn:hover {
  background: rgba(255, 255, 255, 0.2);
  transform: scale(1.1);
}

.title {
  font-size: 24px;
  font-weight: 800;
  margin: 0;
  display: flex;
  align-items: center;
  gap: 8px;
  background: linear-gradient(135deg, #ff6b6b, #4ecdc4);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.header-spacer {
  flex: 1;
}

.content {
  padding: 0 24px 24px;
  max-width: 428px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

/* Balance Card */
.balance-card {
  background: linear-gradient(135deg, #1a1a1a 0%, #2a2a2a 100%);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 20px;
  padding: 24px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
}

.balance-header {
  display: flex;
  align-items: center;
  gap: 16px;
}

.balance-icon {
  width: 48px;
  height: 48px;
  background: linear-gradient(135deg, #4ecdc4, #44b7d1);
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  color: #ffffff;
}

.balance-info {
  flex: 1;
}

.balance-label {
  font-size: 14px;
  color: #8b8b8b;
  margin-bottom: 4px;
}

.balance-amount {
  font-size: 28px;
  font-weight: 900;
  color: #ffffff;
}

.currency {
  font-size: 16px;
  color: #8b8b8b;
  font-weight: 600;
  margin-left: 8px;
}

/* Form Card */
.form-card {
  background: linear-gradient(135deg, #1a1a1a 0%, #2a2a2a 100%);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 20px;
  overflow: hidden;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
}

.form-header {
  padding: 20px 24px;
  background: linear-gradient(135deg, rgba(255, 107, 107, 0.1), rgba(78, 205, 196, 0.1));
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  font-size: 18px;
  font-weight: 700;
  display: flex;
  align-items: center;
  gap: 8px;
}

.form-body {
  padding: 24px;
}

.input-group {
  margin-bottom: 24px;
}

.input-label {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  font-weight: 600;
  color: #ffffff;
  margin-bottom: 12px;
}

/* Amount Input */
.amount-input-wrapper {
  position: relative;
  display: flex;
  align-items: center;
}

.amount-input {
  width: 100%;
  background: rgba(255, 255, 255, 0.05);
  border: 2px solid rgba(255, 255, 255, 0.1);
  border-radius: 16px;
  padding: 16px 80px 16px 16px;
  color: #ffffff;
  font-size: 18px;
  font-weight: 600;
  outline: none;
  transition: all 0.2s ease;
}

.amount-input:focus {
  border-color: #4ecdc4;
  background: rgba(78, 205, 196, 0.1);
}

.input-currency {
  position: absolute;
  right: 16px;
  color: #8b8b8b;
  font-size: 14px;
  font-weight: 600;
}

.quick-amounts {
  display: flex;
  gap: 8px;
  margin-top: 12px;
}

.quick-amount-btn {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  padding: 8px 16px;
  color: #8b8b8b;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.quick-amount-btn:hover {
  background: rgba(78, 205, 196, 0.1);
  border-color: #4ecdc4;
  color: #4ecdc4;
}

/* Bank Info Section */
.bank-info-section {
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: 16px;
  padding: 20px;
  margin-bottom: 24px;
}

.section-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 16px;
  font-weight: 700;
  color: #ffffff;
  margin-bottom: 20px;
  padding-bottom: 12px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
}

/* Text Input */
.text-input {
  width: 100%;
  background: rgba(255, 255, 255, 0.05);
  border: 2px solid rgba(255, 255, 255, 0.1);
  border-radius: 16px;
  padding: 16px;
  color: #ffffff;
  font-size: 16px;
  outline: none;
  transition: all 0.2s ease;
}

.text-input:focus {
  border-color: #4ecdc4;
  background: rgba(78, 205, 196, 0.1);
}

/* Submit Button */
.submit-btn {
  width: 100%;
  background: linear-gradient(135deg, #ff6b6b, #4ecdc4);
  border: none;
  border-radius: 16px;
  padding: 16px;
  color: #ffffff;
  font-size: 16px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 8px 32px rgba(255, 107, 107, 0.3);
}

.submit-btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 12px 40px rgba(255, 107, 107, 0.4);
}

.submit-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-content {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.btn-spinner {
  width: 16px;
  height: 16px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top: 2px solid #ffffff;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

/* Message */
.message {
  margin-top: 16px;
  padding: 12px 16px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  font-weight: 600;
}

.message.success {
  background: rgba(34, 197, 94, 0.1);
  border: 1px solid rgba(34, 197, 94, 0.3);
  color: #22c55e;
}

.message.error {
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.3);
  color: #ef4444;
}

/* History Card */
.history-card {
  background: linear-gradient(135deg, #1a1a1a 0%, #2a2a2a 100%);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 20px;
  overflow: hidden;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
}

.history-header {
  padding: 20px 24px;
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.05), rgba(255, 255, 255, 0.02));
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  font-size: 18px;
  font-weight: 700;
  display: flex;
  align-items: center;
  gap: 8px;
}

.history-body {
  padding: 24px;
}

.empty-state {
  text-align: center;
  padding: 40px 20px;
  color: #8b8b8b;
}

.empty-state i {
  font-size: 48px;
  margin-bottom: 16px;
  opacity: 0.5;
}

.transaction-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.transaction-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: 16px;
}

.transaction-left {
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 1;
}

.transaction-icon {
  width: 40px;
  height: 40px;
  background: linear-gradient(135deg, #0369a1, #0284c7);
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  color: #ffffff;
}

.transaction-info {
  flex: 1;
}

.transaction-amount {
  font-size: 16px;
  font-weight: 700;
  color: #ffffff;
  margin-bottom: 4px;
}

.transaction-details {
  font-size: 13px;
  color: #8b8b8b;
  margin-bottom: 2px;
}

.transaction-account {
  font-size: 12px;
  color: #6b6b6b;
  margin-bottom: 2px;
  font-weight: 600;
}

.transaction-date {
  font-size: 12px;
  color: #6b6b6b;
}

.transaction-status {
  padding: 6px 12px;
  border-radius: 8px;
  font-size: 12px;
  font-weight: 600;
  text-align: center;
}

.status-pending {
  background: rgba(249, 115, 22, 0.1);
  color: #f97316;
  border: 1px solid rgba(249, 115, 22, 0.3);
}

.status-completed {
  background: rgba(34, 197, 94, 0.1);
  color: #22c55e;
  border: 1px solid rgba(34, 197, 94, 0.3);
}

.status-rejected {
  background: rgba(239, 68, 68, 0.1);
  color: #ef4444;
  border: 1px solid rgba(239, 68, 68, 0.3);
}

/* Responsive */
@media (max-width: 428px) {
  .content {
    padding: 0 20px 20px;
  }
  
  .header {
    padding: 20px;
  }
  
  .quick-amounts {
    flex-wrap: wrap;
  }
  
  .bank-info-section {
    padding: 16px;
  }
}
</style>