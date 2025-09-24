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
        <i class="bi bi-gem"></i>
      </div>
      <span class="label">Mining</span>
    </button>
    
    <button 
      :class="{ active: route.path === '/tasks' }" 
      @click="router.push('/tasks')"
      class="tab-button"
    >
      <div class="icon">
        <i class="bi bi-list-check"></i>
      </div>
      <span class="label">Tasks</span>
    </button>
    
    <button 
      :class="{ active: route.path === '/invite' }" 
      @click="router.push('/invite')"
      class="tab-button"
    >
      <div class="icon">
        <i class="bi bi-people"></i>
      </div>
      <span class="label">Invite</span>
    </button>
    
    <button 
      :class="{ active: route.path === '/account' }" 
      @click="router.push('/account')"
      class="tab-button"
    >
      <div class="icon">
        <i class="bi bi-person-circle"></i>
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
  background: linear-gradient(180deg, #0a0a0b 0%, #1a1a1d 50%, #16161a 100%);
  border-top: 1px solid #2d2d34;
  padding: 4px 8px 8px;
  box-shadow: 
    0 -8px 32px rgba(0, 0, 0, 0.6),
    0 -2px 8px rgba(0, 0, 0, 0.4),
    inset 0 1px 0 rgba(255, 255, 255, 0.05);
  backdrop-filter: blur(20px) saturate(180%);
  z-index: 9999;
  min-height: 65px;
}

.tab-button {
  background: transparent;
  border: none;
  padding: 10px 8px;
  cursor: pointer;
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  border-radius: 16px;
  position: relative;
  overflow: hidden;
}

.tab-button::before {
  content: '';
  position: absolute;
  top: 0;
  left: 50%;
  width: 0;
  height: 3px;
  background: linear-gradient(90deg, #ff6b6b, #4ecdc4, #45b7d1, #96ceb4);
  background-size: 300% 300%;
  animation: gradient-shift 3s ease infinite;
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  transform: translateX(-50%);
  border-radius: 0 0 8px 8px;
  box-shadow: 0 0 20px rgba(255, 107, 107, 0.3);
}

.tab-button::after {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(135deg, 
    rgba(255, 107, 107, 0.1) 0%,
    rgba(78, 205, 196, 0.1) 25%,
    rgba(69, 183, 209, 0.1) 50%,
    rgba(150, 206, 180, 0.1) 75%,
    rgba(255, 107, 107, 0.1) 100%);
  background-size: 300% 300%;
  opacity: 0;
  transition: all 0.4s ease;
  border-radius: 16px;
  animation: gradient-shift 4s ease infinite;
}

@keyframes gradient-shift {
  0% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
}

.tab-button:hover {
  background: rgba(255, 255, 255, 0.08);
  transform: translateY(-2px) scale(1.02);
  box-shadow: 
    0 8px 25px rgba(0, 0, 0, 0.3),
    0 0 20px rgba(255, 107, 107, 0.2);
}

.tab-button:hover::before {
  width: 90%;
}

.tab-button:hover::after {
  opacity: 1;
}

.tab-button.active {
  background: linear-gradient(135deg, 
    rgba(255, 107, 107, 0.15) 0%,
    rgba(78, 205, 196, 0.15) 50%,
    rgba(69, 183, 209, 0.15) 100%);
  transform: translateY(-1px);
  box-shadow: 
    0 4px 20px rgba(0, 0, 0, 0.4),
    0 0 30px rgba(255, 107, 107, 0.3),
    inset 0 1px 0 rgba(255, 255, 255, 0.1);
}

.tab-button.active::before {
  width: 100%;
  height: 3px;
}

.tab-button.active::after {
  opacity: 1;
}

.icon {
  font-size: 22px;
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  color: #666670;
  display: flex;
  align-items: center;
  justify-content: center;
  filter: drop-shadow(0 0 0 transparent);
}

.tab-button:hover .icon {
  color: #ff6b6b;
  transform: scale(1.15) rotate(5deg);
  filter: 
    drop-shadow(0 0 8px rgba(255, 107, 107, 0.5))
    drop-shadow(0 0 15px rgba(255, 107, 107, 0.3));
}

.tab-button.active .icon {
  color: #ff6b6b;
  transform: scale(1.1);
  filter: 
    drop-shadow(0 0 10px rgba(255, 107, 107, 0.6))
    drop-shadow(0 0 20px rgba(255, 107, 107, 0.4))
    drop-shadow(0 0 30px rgba(255, 107, 107, 0.2));
}

.label {
  font-size: 11px;
  font-weight: 700;
  color: #666670;
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  text-transform: uppercase;
  letter-spacing: 0.8px;
  text-shadow: none;
}

.tab-button:hover .label {
  color: #ff6b6b;
  text-shadow: 
    0 0 10px rgba(255, 107, 107, 0.5),
    0 0 20px rgba(255, 107, 107, 0.3);
  transform: translateY(-1px);
}

.tab-button.active .label {
  color: #ff6b6b;
  text-shadow: 
    0 0 10px rgba(255, 107, 107, 0.6),
    0 0 20px rgba(255, 107, 107, 0.4),
    0 0 30px rgba(255, 107, 107, 0.2);
}

/* Ripple effect */
.tab-button:active {
  transform: scale(0.98);
}

.tab-button:active::before {
  animation: ripple 0.6s ease-out;
}

@keyframes ripple {
  0% {
    box-shadow: 0 0 0 0 rgba(255, 107, 107, 0.7);
  }
  70% {
    box-shadow: 0 0 0 10px rgba(255, 107, 107, 0);
  }
  100% {
    box-shadow: 0 0 0 0 rgba(255, 107, 107, 0);
  }
}

/* Mobile responsive */
@media (max-width: 320px) {
  .label {
    font-size: 10px;
    letter-spacing: 0.5px;
  }
  
  .icon {
    font-size: 20px;
  }
  
  .tab-button {
    padding: 8px 6px;
  }
}

/* Ultra dark mode enhancement */
@media (prefers-color-scheme: dark) {
  .tabs {
    background: linear-gradient(180deg, #000000 0%, #0f0f0f 50%, #1a1a1a 100%);
    border-top: 1px solid #333338;
    box-shadow: 
      0 -12px 40px rgba(0, 0, 0, 0.8),
      0 -4px 12px rgba(0, 0, 0, 0.6),
      inset 0 1px 0 rgba(255, 255, 255, 0.03);
  }
}
</style>