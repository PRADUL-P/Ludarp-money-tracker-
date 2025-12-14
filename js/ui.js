'use strict';
/* ui.js
   UI helpers: toasts, select color tweaks, custom select behavior (moved from inline),
   small helpers that other modules use.
*/

(function(){
  const db = window.MT.db;

  function showToast(text, short=true){
    const t = document.createElement('div'); t.className='toast-success';
    t.innerHTML = `<svg width="16" height="16" aria-hidden="true"><use href="#icon-check"></use></svg><div>${text}</div>`;
    document.body.appendChild(t);
    t.style.position = 'fixed'; t.style.right = '18px'; t.style.bottom = '18px'; t.style.zIndex = 99999;
    setTimeout(()=> { t.style.transition = 'opacity .32s ease'; t.style.opacity = '0'; setTimeout(()=> t.remove(), 320); }, short ? 1500 : 3000);
  }

  function ensureSelectColors(){
    document.querySelectorAll('select').forEach(s => s.style.color = getComputedStyle(document.body).getPropertyValue('--text') || '');
  }

  // small helper: safe query id wrapper
  function $id(id){ return document.getElementById(id); }

  window.MT = window.MT || {};
  window.MT.ui = { showToast, ensureSelectColors, $id };

  // CustomSelect: if you prefer to keep it inline, remove this file. This is a small duplicate of
  // the inline CustomSelect but better to keep in a dedicated file for clarity.
  // (Skipping code here if you already load a customselect.js)
})();
