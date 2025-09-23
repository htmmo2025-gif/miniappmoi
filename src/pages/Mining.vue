<script setup>
import { onMounted, ref } from 'vue'
import BottomNav from '../components/BottomNav.vue'

const state = ref({ balance:0, timeLeft:0, canMine:false })
const loading = ref(false)

async function load(){ state.value = await fetch('/api/mine').then(r=>r.json()).catch(()=>state.value) }
async function claim(){
  if(!state.value.canMine || loading.value) return
  loading.value = true
  state.value = await fetch('/api/mine',{method:'POST'}).then(r=>r.json()).finally(()=>loading.value=false)
}
onMounted(async ()=>{
  await load()
  setInterval(()=>{ if(!state.value.canMine && state.value.timeLeft>0) state.value.timeLeft-- },1000)
})
</script>

<template>
  <div style="padding:16px 16px 72px">
    <h2 style="color:#e2e8f0">HTW COIN</h2>

    <div class="card" style="color:#93a4b2">
      <div style="display:flex;justify-content:space-between">
        <div>Trạng thái:</div>
        <div style="color:#34d399;font-weight:700">
          {{ state.canMine ? 'Sẵn sàng khai thác' : `Chờ ${state.timeLeft}s` }}
        </div>
      </div>

      <div style="margin:16px 0">
        <div style="height:10px;background:#1f2a37;border-radius:999px;overflow:hidden">
          <div :style="{width:(state.canMine?100:Math.max(0,100-state.timeLeft/18))+'%',height:'100%',background:'#7c3aed'}"></div>
        </div>
      </div>

      <button class="btn" style="width:100%" :disabled="!state.canMine || loading" @click="claim">
        {{ loading ? 'Đang nhận…' : (state.canMine ? 'Claim 1 HTW' : 'Đang đếm…') }}
      </button>

      <div style="margin-top:12px;color:#e2e8f0">Balance: <b>{{ state.balance }}</b> HTW</div>
    </div>
  </div>
  <BottomNav/>
</template>
