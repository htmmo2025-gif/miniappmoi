<script setup>
import { useRoute, useRouter } from 'vue-router'
const route = useRoute()
const router = useRouter()
</script>

<template>
  <nav class="tabs">
    <button 
      :class="{ active: route.path === '/mining' }" 
      @click="router.push('/mining')"
      class="tab-button"
    >
      <div class="icon">⚡</div>
      <span class="label">Mining</span>
    </button>
    
    <button 
      :class="{ active: route.path === '/tasks' }" 
      @click="router.push('/tasks')"
      class="tab-button"
    >
      <div class="icon">✅</div>
      <span class="label">Tasks</span>
    </button>
    
    <button 
      :class="{ active: route.path === '/invite' }" 
      @click="router.push('/invite')"
      class="tab-button"
    >
      <div class="icon">🤝</div>
      <span class="label">Invite</span>
    </button>
    
    <button 
      :class="{ active: route.path === '/account' }" 
      @click="router.push('/account')"
      class="tab-button"
    >
      <div class="icon">⚙️</div>
      <span class="label">Account</span>
    </button>
  </nav>
</template>

<style scoped>
.tabs {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  background: linear-gradient(180deg, #0f1722 0%, #1a2332 100%);
  border-top: 1px solid #2a3441;
  padding: 4px 8px 8px;
  box-shadow: 0 -4px 20px rgba(0, 0, 0, 0.3);
  backdrop-filter: blur(10px);
}

.tab-button {
  background: transparent;
  border: none;
  padding: 8px 4px;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  border-radius: 12px;
  position: relative;
  overflow: hidden;
}

.tab-button::before {
  content: '';
  position: absolute;
  top: 0;
  left: 50%;
  width: 0;
  height: 2px;
  background: linear-gradient(90deg, #4ade80, #22c55e);
  transition: all 0.3s ease;
  transform: translateX(-50%);
}

.tab-button:hover {
  background: rgba(74, 222, 128, 0.1);
}

.tab-button:hover::before {
  width: 80%;
}

.tab-button.active {
  background: rgba(74, 222, 128, 0.15);
}

.tab-button.active::before {
  width: 100%;
}

.icon {
  font-size: 20px;
  transition: all 0.3s ease;
  filter: grayscale(1) brightness(0.7);
}

.tab-button:hover .icon,
.tab-button.active .icon {
  filter: none;
  transform: scale(1.1);
}

.label {
  font-size: 11px;
  font-weight: 600;
  color: #9aa6b2;
  transition: all 0.3s ease;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.tab-button:hover .label,
.tab-button.active .label {
  color: #ffffff;
  text-shadow: 0 0 8px rgba(74, 222, 128, 0.5);
}

/* Mobile responsive */
@media (max-width: 320px) {
  .label {
    font-size: 10px;
  }
  
  .icon {
    font-size: 18px;
  }
}
</style>