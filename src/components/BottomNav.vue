<script setup>
import { useRoute, useRouter } from 'vue-router'
const route = useRoute(); const router = useRouter()
</script>
<template>
  <nav class="tabs">
    <button :class="{a: route.path==='/mining'}" @click="router.push('/mining')">⛏ Mining</button>
    <button :class="{a: route.path==='/tasks'}"  @click="router.push('/tasks')">📝 Tasks</button>
    <button :class="{a: route.path==='/invite'}" @click="router.push('/invite')">👥 Invite</button>
    <button :class="{a: route.path==='/account'}" @click="router.push('/account')">👤 Account</button>
  </nav>
</template>
<style scoped>
.tabs{position:fixed;left:0;right:0;bottom:0;display:grid;grid-template-columns:repeat(4,1fr);
  background:#0f1722;border-top:1px solid #1f2a37;padding:8px}
button{background:transparent;color:#9aa6b2;border:0;padding:10px 4px;font-weight:700}
button.a{color:#fff}
</style>
