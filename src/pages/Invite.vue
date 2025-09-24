<script setup>
import { ref, onMounted, computed } from 'vue'
import BottomNav from '../components/BottomNav.vue'

const loading = ref(true)
const msg = ref('')
const info = ref({
  uid: null,
  share_link: '',
  direct_count: 0,
  referrals: []
})

async function load() {
  loading.value = true
  msg.value = ''
  try {
    const r = await fetch('/api/invite', { credentials: 'include' })
    if (!r.ok) throw new Error(await r.text())
    info.value = await r.json()
  } catch (e) {
    console.error(e)
    msg.value = 'Không tải được dữ liệu mời bạn bè.'
  } finally {
    loading.value = false
  }
}

function copyText(t) {
  navigator.clipboard?.writeText(t)
}

function share() {
  const link = info.value.share_link || ''
  const text = encodeURIComponent('Tham gia HTW cùng mình! 🚀')
  const url  = encodeURIComponent(link)
  const tgShare = `https://t.me/share/url?url=${url}&text=${text}`
  if (window.Telegram?.WebApp?.openTelegramLink) {
    window.Telegram.WebApp.openTelegramLink(tgShare)
  } else {
    window.open(tgShare, '_blank')
  }
}

const hasBot = computed(() => !!info.value.share_link)

onMounted(load)
</script>

<template>
  <div class="page">
    <header class="topbar">
      <h1>Mời bạn bè</h1>
      <span class="spacer"></span>
    </header>

    <main class="wrap">
      <!-- Card: Link mời -->
      <section class="card">
        <div class="title">
          <i class="bi bi-people-fill"></i>
          Chia sẻ để nhận F1
        </div>

        <div class="invite-box">
          <div class="code">
            <div class="lbl">Mã của bạn (UID)</div>
            <div class="val">{{ info.uid ?? '—' }}</div>
          </div>

          <div class="link">
            <div class="lbl">Link mời</div>
            <div class="row">
              <input class="inp" :value="info.share_link || 'Thiếu BOT_USERNAME'" readonly />
              <button class="act" @click="copyText(info.share_link)" :disabled="!hasBot">
                <i class="bi bi-clipboard"></i>
              </button>
              <button class="act" @click="share" :disabled="!hasBot">
                <i class="bi bi-telegram"></i>
              </button>
            </div>
            <p v-if="!hasBot" class="warn">
              Chưa cấu hình <b>BOT_USERNAME</b> trong Vercel nên không tạo được link mời.
            </p>
          </div>
        </div>
      </section>

      <!-- Card: Thống kê -->
      <section class="card">
        <div class="title"><i class="bi bi-bar-chart"></i> Thống kê</div>
        <div class="stats">
          <div class="stat">
            <div class="stat-lbl">Số F1</div>
            <div class="stat-val">{{ info.direct_count }}</div>
          </div>
        </div>
      </section>

      <!-- Card: Danh sách F1 -->
      <section class="card">
        <div class="title"><i class="bi bi-people"></i> Danh sách F1</div>

        <div v-if="loading" class="center">
          <i class="bi bi-hourglass-split big spin"></i>
          <div>Đang tải…</div>
        </div>

        <div v-else-if="!info.referrals?.length" class="empty">
          <i class="bi bi-inbox"></i>
          <p>Chưa có người dùng nào được mời</p>
        </div>

        <div v-else class="list">
          <div v-for="u in info.referrals" :key="u.id" class="row">
            <div class="ava">{{ (u.first_name?.[0] || u.username?.[0] || 'U').toUpperCase() }}</div>
            <div class="rt">
              <div class="name">
                {{ [u.first_name,u.last_name].filter(Boolean).join(' ') || ('@'+u.username) || ('UID '+u.id) }}
              </div>
              <div class="sub">@{{ u.username || '—' }}</div>
            </div>
            <div class="uid">#{{ u.id }}</div>
          </div>
        </div>

        <p v-if="msg" class="note err"><i class="bi bi-exclamation-circle"></i> {{ msg }}</p>
      </section>
    </main>
  </div>
  <BottomNav/>
</template>

<style scoped>
/* layout full-bleed, ăn safe-area như Withdraw/Swap */
.page{
  --bg:#0b0f1a; --card:#101826; --mut:#9aa3b2; --ring:1px solid rgba(148,163,184,.14);
  background:var(--bg); color:#e5e7eb; width:100dvw; min-height:100dvh;
}
.topbar{
  position: sticky; top: 0; z-index: 10;
  padding-block: calc(10px + env(safe-area-inset-top)) 10px;
  padding-left: max(16px, env(safe-area-inset-left));
  padding-right: max(16px, env(safe-area-inset-right));
  display: flex; align-items: center; gap: 10px;
  background: linear-gradient(180deg, rgba(11,15,26,.96), rgba(11,15,26,.7) 65%, transparent);
  backdrop-filter: blur(8px);
}
.topbar h1{margin:0; font:800 20px/1 ui-sans-serif,system-ui}
.spacer{flex:1}

.wrap{
  width:100%;
  padding-top:12px;
  padding-bottom:calc(20px + env(safe-area-inset-bottom));
  padding-left:max(16px, env(safe-area-inset-left));
  padding-right:max(16px, env(safe-area-inset-right));
  display:grid; gap:14px;
}

/* card base */
.card{
  width:100%; margin-inline:0; overflow:hidden;
  background:#0f172a; border:var(--ring); border-radius:14px; padding:16px;
  box-shadow:0 10px 30px rgba(2,8,23,.35);
}
.center{display:grid;place-items:center;gap:8px;padding:20px}
.big{font-size:36px}
.spin{animation:spin 1s linear infinite} @keyframes spin{to{transform:rotate(360deg)}}

/* titles */
.title{display:flex; align-items:center; gap:8px; font-weight:800; margin-bottom:12px}

/* invite panel */
.invite-box{display:grid; gap:14px}
.code .lbl, .link .lbl{color:#9aa3b2; font-size:12px; margin-bottom:6px}
.code .val{font:800 20px/1 ui-sans-serif,system-ui}

.link .row{display:grid; grid-template-columns:1fr auto auto; gap:8px}
.inp{
  width:100%; padding:12px 14px; border-radius:12px; border:var(--ring);
  background:#0b1222; color:#cbd5e1; font-weight:700;
}
.act{
  width:42px; height:42px; border-radius:12px; border:var(--ring); background:#0e1726; color:#cbd5e1;
  display:grid; place-items:center;
}
.warn{margin-top:6px; color:#fbbf24; font-size:12px}

/* stats */
.stats{display:grid; grid-template-columns:1fr; gap:10px}
.stat{background:#0e1525;border:var(--ring);border-radius:12px;padding:12px}
.stat-lbl{color:#9aa3b2; font-size:12px}
.stat-val{font:800 22px/1 ui-sans-serif,system-ui}

/* list */
.empty{padding:24px 8px; text-align:center; color:#9aa3b2}
.list{display:grid; gap:10px}
.row{
  display:grid; grid-template-columns:auto 1fr auto; gap:10px;
  background:#0e1525;border:var(--ring);border-radius:12px;padding:10px;
}
.ava{
  width:38px;height:38px;border-radius:10px;display:grid;place-items:center;
  background:linear-gradient(145deg,#6366f1,#22d3ee); font-weight:900;
}
.rt{display:grid; gap:2px}
.name{font-weight:800}
.sub{font-size:12px; color:#8aa0be}
.uid{font-size:12px; color:#9aa3b2; align-self:center}

/* notes */
.note{margin-top:10px; padding:10px 12px; border-radius:10px; background:#0e1525; color:#cbd5e1}
.err{color:#fda4af}

:global(*), :global(*::before), :global(*::after){ box-sizing: border-box }
:global(html, body, #app){ margin:0; overflow-x:hidden }
</style>
