<script setup>
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'
const router = useRouter()
const tg = window.Telegram?.WebApp

onMounted(async () => {
  tg?.ready()
  const qs = new URLSearchParams(tg?.initData || '')
  const ok = await fetch('/api/tg/verify?' + qs.toString()).then(r => r.ok).catch(()=>false)
  router.replace(ok ? '/mining' : '/error')
})
</script>

<template>
  <div style="height:100%;display:grid;place-items:center;color:#9aa6b2">Đang tải…</div>
</template>
