// src/lib/useMonetag.js
export function useMonetag() {
    const ZONE = String(import.meta.env.VITE_MONETAG_ZONE_ID || '9966675');
    const FUNC = String(import.meta.env.VITE_MONETAG_FUNC || `show_${ZONE}`);
    const SDK  = String(import.meta.env.VITE_MONETAG_SDK_URL || 'https://liblt.com/sdk.js');
  
    let loading = false;
  
    const getFn = () => window?.[FUNC];
  
    function injectScript() {
      return new Promise((resolve, reject) => {
        // có sẵn rồi thì thôi
        if (getFn()) return resolve();
  
        // đã có thẻ SDK hợp lệ trong head thì poll luôn
        const existing = [...document.scripts].find(s =>
          s.src.includes('liblt.com/sdk.js') ||
          s.getAttribute('data-zone') === ZONE
        );
  
        if (!existing && !loading) {
          loading = true;
          const s = document.createElement('script');
          s.src = SDK.startsWith('http') ? SDK : `https:${SDK}`;
          s.async = true; s.defer = true;
          s.setAttribute('data-zone', ZONE);
          s.setAttribute('data-sdk', `show_${ZONE}`);
          s.onload = () => { loading = false; };
          s.onerror = () => { loading = false; reject(new Error('Không tải được Monetag SDK')); };
          document.head.appendChild(s);
        }
  
        // poll tối đa 5s chờ hàm xuất hiện
        const t0 = Date.now();
        const iv = setInterval(() => {
          if (getFn()) { clearInterval(iv); resolve(); }
          else if (Date.now() - t0 > 5000) {
            clearInterval(iv);
            reject(new Error('Monetag SDK chưa sẵn sàng'));
          }
        }, 120);
      });
    }
  
    async function ensureLoaded(opts) {
      await injectScript();
      // preload theo docs, không bắt buộc
      try { await getFn()({ type: 'preload', ymid: opts?.ymid }); } catch {}
    }
  
    async function show(opts) {
      await injectScript();
      return getFn()(opts || {}); // SDK trả Promise: .then() user watched, .catch() fail/skipped
    }
  
    return { ensureLoaded, show, fnName: FUNC };
  }
  