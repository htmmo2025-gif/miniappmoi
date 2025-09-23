<script setup>
</script>

<template>
  <div class="app">
    <router-view />
  </div>
</template>

<style>
:root { color-scheme: dark; }
html,body,#app,.app{height:100%;}
body{ margin:0; background:#0b0f14; font-family: system-ui, -apple-system, Segoe UI, Roboto, sans-serif;}
.card{ background:#0f1722; border:1px solid #1f2a37; border-radius:16px; padding:16px;}
.btn{ background:#2563eb; color:#fff; border:0; border-radius:12px; padding:12px 14px; font-weight:700; }
.row{ display:flex; align-items:center; gap:12px;}
</style>
