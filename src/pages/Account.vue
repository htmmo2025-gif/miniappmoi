<script setup>
import { onMounted, ref } from 'vue'
import BottomNav from '../components/BottomNav.vue'
const tg = window.Telegram?.WebApp
const user = ref(null); const balance = ref(0); const vnd = ref(0)
onMounted(async ()=>{
  user.value = tg?.initDataUnsafe?.user ?? null
  const p = await fetch('/api/profile').then(r=>r.json()).catch(()=>null)
  if(p){ balance.value=p.balance||0; vnd.value=p.vnd||0 }
})
</script>

<template>
  <div style="padding:16px 16px 72px">
    <h2 style="color:#e2e8f0">Tài khoản</h2>
    <div class="card" style="display:flex;gap:12px;align-items:center">
      <div style="width:44px;height:44px;border-radius:999px;background:#334155;display:grid;place-items:center;color:#fff">
        {{ (user?.first_name || 'U')[0] }}
      </div>
      <div>
        <div style="color:#fff;font-weight:700">{{ user?.first_name }} {{ user?.last_name }}</div>
        <div style="color:#93a4b2;font-size:12px">UID: {{ user?.id }}</div>
        <div style="color:#93a4b2;font-size:12px">@{{ user?.username }}</div>
      </div>
    </div>

    <div class="card" style="margin-top:12px;color:#93a4b2">
      <div>Số dư</div>
      <div style="color:#fff;font-size:28px;font-weight:800">{{ balance }} HTW</div>
    </div>

    <div class="card" style="margin-top:12px;color:#93a4b2">
      <div>VND</div>
      <div style="color:#fff;font-size:28px;font-weight:800">{{ vnd }} VND</div>
    </div>
  </div>
  <BottomNav/>
</template>
