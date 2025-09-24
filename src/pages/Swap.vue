<script setup>
import { ref, onMounted, computed } from 'vue'

const RATE = 36
const prof = ref(null)
const amount = ref('')
const msg = ref('')
const busy = ref(false)

async function loadProfile() {
  const r = await fetch('/api/profile', { credentials: 'include' })
  if (r.ok) prof.value = await r.json()
}

const vnd = computed(() => {
  const n = Number(amount.value || 0)
  return Number.isFinite(n) ? n * RATE : 0
})

async function submit() {
  msg.value = ''; busy.value = true
  const n = Number(amount.value)
  if (!Number.isFinite(n) || n <= 0) { 
    msg.value = 'Số HTW không hợp lệ'; 
    busy.value = false; 
    return 
  }
  const r = await fetch('/api/swap', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ amount_htw: n, rate: RATE })
  })
  busy.value = false
  if (!r.ok) { 
    msg.value = 'Đổi thất bại: ' + await r.text(); 
    return 
  }
  await loadProfile()
  amount.value = ''
  msg.value = 'Đổi thành công!'
}

onMounted(loadProfile)
</script>

<template>
  <div class="wrap">
    <!-- Header with gradient and icon -->
    <div class="header">
      <div class="header-icon">
        <i class="bi bi-arrow-left-right"></i>
      </div>
      <h1 class="title">Currency Swap</h1>
      <p class="subtitle">HTW → VND Exchange</p>
    </div>

    <div class="main-card" v-if="prof">
      <!-- Balance Display -->
      <div class="balance-section">
        <h3 class="section-title">
          <i class="bi bi-wallet2"></i>
          Số dư ví
        </h3>
        <div class="balance-grid">
          <div class="balance-item htw-balance">
            <div class="balance-header">
              <i class="bi bi-coin"></i>
              <span>HTW</span>
            </div>
            <div class="balance-value">{{ (prof.htw_balance ?? 0).toLocaleString() }}</div>
          </div>
          <div class="balance-item vnd-balance">
            <div class="balance-header">
              <i class="bi bi-currency-dollar"></i>
              <span>VND</span>
            </div>
            <div class="balance-value">{{ (prof.vnd_balance ?? 0).toLocaleString() }}</div>
          </div>
        </div>
      </div>

      <!-- Swap Section -->
      <div class="swap-section">
        <h3 class="section-title">
          <i class="bi bi-arrow-repeat"></i>
          Giao dịch
        </h3>

        <!-- Input Section -->
        <div class="input-group">
          <label class="input-label">
            <i class="bi bi-input-cursor"></i>
            Số HTW muốn đổi
          </label>
          <div class="input-wrapper">
            <input 
              class="amount-input" 
              v-model="amount" 
              type="number" 
              min="0" 
              step="0.001" 
              placeholder="Nhập số HTW..." 
            />
            <span class="input-suffix">HTW</span>
          </div>
        </div>

        <!-- Exchange Rate Display -->
        <div class="rate-info">
          <div class="rate-card">
            <i class="bi bi-graph-up-arrow"></i>
            <div class="rate-details">
              <div class="rate-label">Tỷ giá hiện tại</div>
              <div class="rate-value">1 HTW = {{ RATE }} VND</div>
            </div>
          </div>
        </div>

        <!-- Preview Section -->
        <div class="preview-section" v-if="amount && vnd > 0">
          <div class="preview-card">
            <div class="preview-header">
              <i class="bi bi-eye"></i>
              <span>Xem trước giao dịch</span>
            </div>
            <div class="preview-content">
              <div class="preview-row">
                <span>Số HTW đổi:</span>
                <strong>{{ Number(amount).toLocaleString() }} HTW</strong>
              </div>
              <div class="preview-arrow">
                <i class="bi bi-arrow-down"></i>
              </div>
              <div class="preview-row receive">
                <span>Sẽ nhận được:</span>
                <strong>{{ vnd.toLocaleString() }} VND</strong>
              </div>
            </div>
          </div>
        </div>

        <!-- Submit Button -->
        <button class="swap-btn" :disabled="busy || !amount || vnd <= 0" @click="submit">
          <template v-if="busy">
            <i class="bi bi-hourglass-split spinning"></i>
            <span>Đang xử lý...</span>
          </template>
          <template v-else>
            <i class="bi bi-arrow-repeat"></i>
            <span>Thực hiện đổi</span>
          </template>
        </button>

        <!-- Message Display -->
        <div class="message" v-if="msg" :class="{ success: msg.includes('thành công'), error: !msg.includes('thành công') }">
          <i :class="msg.includes('thành công') ? 'bi bi-check-circle-fill' : 'bi bi-exclamation-triangle-fill'"></i>
          <span>{{ msg }}</span>
        </div>
      </div>
    </div>

    <!-- Loading State -->
    <div v-else class="loading-card">
      <i class="bi bi-hourglass-split spinning"></i>
      <p>Đang tải thông tin...</p>
    </div>
  </div>
</template>

<style scoped>
/* Import Bootstrap Icons */
@import url('https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.0/font/bootstrap-icons.css');

.wrap {
  max-width: 480px;
  margin: 0 auto;
  padding: 20px;
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

/* Header Styles */
.header {
  text-align: center;
  margin-bottom: 32px;
  color: white;
}

.header-icon {
  width: 80px;
  height: 80px;
  margin: 0 auto 20px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.header-icon i {
  font-size: 36px;
  color: white;
}

.title {
  font-size: 28px;
  font-weight: 700;
  margin: 0 0 8px 0;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
}

.subtitle {
  font-size: 16px;
  opacity: 0.9;
  margin: 0;
  font-weight: 500;
}

/* Main Card */
.main-card {
  background: rgba(255, 255, 255, 0.95);
  border-radius: 24px;
  padding: 24px;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.2);
}

/* Section Titles */
.section-title {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 18px;
  font-weight: 600;
  color: #1f2937;
  margin: 0 0 20px 0;
}

.section-title i {
  font-size: 20px;
  color: #6366f1;
}

/* Balance Section */
.balance-section {
  margin-bottom: 32px;
}

.balance-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.balance-item {
  background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
  border-radius: 16px;
  padding: 20px;
  text-align: center;
  border: 1px solid #e2e8f0;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.balance-item:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.1);
}

.htw-balance {
  background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
}

.vnd-balance {
  background: linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%);
}

.balance-header {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  font-weight: 500;
  color: #374151;
  margin-bottom: 8px;
}

.balance-header i {
  font-size: 18px;
}

.balance-value {
  font-size: 20px;
  font-weight: 700;
  color: #111827;
}


/* Input Group */
.input-group {
  margin-bottom: 24px;
}

.input-label {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 500;
  color: #374151;
  margin-bottom: 12px;
  font-size: 14px;
}

.input-wrapper {
  position: relative;
  display: flex;
  align-items: center;
}

.amount-input {
  width: 100%;
  padding: 16px 60px 16px 16px;
  border: 2px solid #e5e7eb;
  border-radius: 12px;
  font-size: 16px;
  font-weight: 500;
  background: #f9fafb;
  transition: all 0.2s ease;
}

.amount-input:focus {
  outline: none;
  border-color: #6366f1;
  background: white;
  box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
}

.input-suffix {
  position: absolute;
  right: 16px;
  color: #6b7280;
  font-weight: 500;
  font-size: 14px;
}

/* Rate Info */
.rate-info {
  margin-bottom: 24px;
}

.rate-card {
  display: flex;
  align-items: center;
  gap: 12px;
  background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
  border: 1px solid #bae6fd;
  border-radius: 12px;
  padding: 16px;
}

.rate-card i {
  font-size: 24px;
  color: #0284c7;
}

.rate-details {
  flex: 1;
}

.rate-label {
  font-size: 12px;
  color: #6b7280;
  margin-bottom: 4px;
}

.rate-value {
  font-size: 16px;
  font-weight: 600;
  color: #0f172a;
}

/* Preview Section */
.preview-section {
  margin-bottom: 24px;
}

.preview-card {
  background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%);
  border: 1px solid #bbf7d0;
  border-radius: 16px;
  padding: 20px;
}

.preview-header {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
  color: #15803d;
  margin-bottom: 16px;
  font-size: 14px;
}



.preview-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
  color: #374151;
}

.preview-row.receive {
  color: #15803d;
  font-size: 18px;
}

.preview-arrow {
  text-align: center;
  margin: 12px 0;
}

.preview-arrow i {
  font-size: 20px;
  color: #22c55e;
}

/* Submit Button */
.swap-btn {
  width: 100%;
  background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%);
  color: white;
  border: none;
  padding: 16px 24px;
  border-radius: 16px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  margin-bottom: 20px;
}

.swap-btn:hover:not(:disabled) {
  background: linear-gradient(135deg, #5b56f0 0%, #4338ca 100%);
  transform: translateY(-1px);
  box-shadow: 0 8px 25px rgba(99, 102, 241, 0.3);
}

.swap-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
}

/* Message */
.message {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  border-radius: 12px;
  font-weight: 500;
}

.message.success {
  background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%);
  color: #15803d;
  border: 1px solid #bbf7d0;
}

.message.error {
  background: linear-gradient(135deg, #fef2f2 0%, #fecaca 100%);
  color: #dc2626;
  border: 1px solid #fca5a5;
}

/* Loading Card */
.loading-card {
  background: rgba(255, 255, 255, 0.9);
  border-radius: 24px;
  padding: 40px;
  text-align: center;
  color: #6b7280;
}

.loading-card i {
  font-size: 48px;
  margin-bottom: 16px;
}

/* Animations */
.spinning {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

/* Responsive */
@media (max-width: 480px) {
  .wrap {
    padding: 16px;
  }
  
  .main-card {
    padding: 20px;
  }
  
  .balance-grid {
    grid-template-columns: 1fr;
  }
  
  .title {
    font-size: 24px;
  }
}
</style>