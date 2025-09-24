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
      <div class="icon">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M12 2L13.09 8.26L20 9L13.09 9.74L12 16L10.91 9.74L4 9L10.91 8.26L12 2Z"/>
          <path d="M8 21L8.5 18.5L11 18L8.5 17.5L8 15L7.5 17.5L5 18L7.5 18.5L8 21Z"/>
          <path d="M19 15L19.5 13.5L21 13L19.5 12.5L19 11L18.5 12.5L17 13L18.5 13.5L19 15Z"/>
        </svg>
      </div>
      <span class="label">Mining</span>
    </button>
    
    <button 
      :class="{ active: route.path === '/tasks' }" 
      @click="router.push('/tasks')"
      class="tab-button"
    >
      <div class="icon">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
          <path d="M14 2v6h6"/>
          <path d="M9 15l2 2 4-4"/>
        </svg>
      </div>
      <span class="label">Tasks</span>
    </button>
    
    <button 
      :class="{ active: route.path === '/invite' }" 
      @click="router.push('/invite')"
      class="tab-button"
    >
      <div class="icon">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
          <circle cx="9" cy="7" r="4"/>
          <path d="M22 21v-2a4 4 0 0 0-3-3.87"/>
          <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
        </svg>
      </div>
      <span class="label">Invite</span>
    </button>
    
    <button 
      :class="{ active: route.path === '/account' }" 
      @click="router.push('/account')"
      class="tab-button"
    >
      <div class="icon">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
          <circle cx="12" cy="7" r="4"/>
        </svg>
      </div>
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
  z-index: 9999;
  min-height: 60px;
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
  width: 24px;
  height: 24px;
  transition: all 0.3s ease;
  color: #6b7280;
  display: flex;
  align-items: center;
  justify-content: center;
}

.tab-button:hover .icon,
.tab-button.active .icon {
  color: #4ade80;
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