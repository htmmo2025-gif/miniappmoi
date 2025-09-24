<script setup>
import BottomNav from '../components/BottomNav.vue'
const tg = window.Telegram?.WebApp
const link = location.origin + '/?startapp=' + (tg?.initDataUnsafe?.user?.id || '')
</script>
<template>
  <div style="padding:16px 16px 72px">
    <h2 style="color:#e2e8f0">Invite</h2>
    <div class="card" style="color:#93a4b2">
      Chia sẻ link:
      <div style="word-break:break-all;color:#fff;margin-top:8px">{{ link }}</div>
    </div>
  </div>
  <BottomNav/>
</template>
