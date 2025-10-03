// src/lib/useMonetag.js
export function useMonetag() {
    const ZONE = String(import.meta.env.VITE_MONETAG_ZONE_ID || '9966675');
    const FUNC = String(import.meta.env.VITE_MONETAG_FUNC || `show_${ZONE}`);
    const SDK  = String(import.meta.env.VITE_MONETAG_SDK_URL || 'https://liblt.com/sdk.js');
  
    const getFn = () => window?.[FUNC];
  
    function ensureTag() {
      let tag = [...document.scripts].find(s =>
        s.src.includes('liblt.com/sdk.js') || s.getAttribute('data-zone') === ZONE
      );
      if (!tag) {
        tag = document.createElement('script');
        tag.src = SDK.startsWith('http') ? SDK : `https:${SDK}`;
        tag.defer = true; // giữ thứ tự
        tag.setAttribute('data-zone', ZONE);
        tag.setAttribute('data-sdk', `show_${ZONE}`);
        document.head.appendChild(tag);
        console.log('[Monetag] injected SDK tag', tag);
      } else {
        // đảm bảo attr đúng
        if (!tag.getAttribute('data-zone')) tag.setAttribute('data-zone', ZONE);
        if (!tag.getAttribute('data-sdk'))  tag.setAttribute('data-sdk', `show_${ZONE}`);
        console.log('[Monetag] found existing SDK tag', tag);
      }
      return tag;
    }
  
    function waitForFn(timeoutMs = 10000) {
      return new Promise((resolve, reject) => {
        const t0 = Date.now();
        const iv = setInterval(() => {
          const fn = getFn();
          if (typeof fn === 'function') {
            clearInterval(iv);
            resolve(fn);
          } else if (Date.now() - t0 > timeoutMs) {
            clearInterval(iv);
            reject(new Error('Monetag SDK chưa sẵn sàng (hàm show_* chưa được đăng ký)'));
          }
        }, 120);
      });
    }
  
    async function ensureLoaded(opts) {
      ensureTag();
      // có thể preload cho mượt, không bắt buộc
      try {
        const fn = await waitForFn();
        await fn({ type: 'preload', ymid: opts?.ymid });
      } catch (e) {
        console.warn('[Monetag] ensureLoaded:', e.message);
        // vẫn cho user bấm, khi bấm sẽ thử lại
      }
    }
  
    async function show(opts) {
      ensureTag();
      const fn = await waitForFn();
      return fn(opts || {}); // SDK trả Promise
    }
  
    return { ensureLoaded, show, fnName: FUNC };
  }
  