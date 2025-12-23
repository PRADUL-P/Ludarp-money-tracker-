'use strict';
/* ui.js
   UI helpers: toasts, select color tweaks, theme handling
*/

(function(){
  const db = window.MT?.db;

  /* ================= TOAST ================= */

  function showToast(text, short=true){
    const t = document.createElement('div');
    t.className='toast-success';
    t.innerHTML = `
      <svg width="16" height="16" aria-hidden="true">
        <use href="#icon-check"></use>
      </svg>
      <div>${text}</div>
    `;
    document.body.appendChild(t);
    t.style.position = 'fixed';
    t.style.right = '18px';
    t.style.bottom = '18px';
    t.style.zIndex = 99999;

    setTimeout(()=>{
      t.style.transition='opacity .3s ease';
      t.style.opacity='0';
      setTimeout(()=>t.remove(),300);
    }, short ? 1500 : 3000);
  }

  /* ================= SELECT COLOR FIX ================= */

  function ensureSelectColors(){
    document.querySelectorAll('select').forEach(s=>{
      s.style.color =
        getComputedStyle(document.documentElement)
          .getPropertyValue('--text');
    });
  }

  /* ================= THEME SYSTEM ================= */

  /* ================= THEME SYSTEM ================= */

function applyTheme(theme){
  const t = theme === 'light' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', t);
  localStorage.setItem('mt-theme', t);
  ensureSelectColors();
}

function loadTheme(){
  let theme = 'dark';

  try{
    const s = window.MT?.db?.loadStore?.();
    theme = s?.settings?.theme
      || localStorage.getItem('mt-theme')
      || 'dark';
  }catch(e){}

  applyTheme(theme);
  return theme;
}

  /* ================= HELPERS ================= */

  function $id(id){ return document.getElementById(id); }

  /* ================= EXPORT ================= */

  window.MT = window.MT || {};
  window.MT.ui = {
    showToast,
    ensureSelectColors,
    applyTheme,
    loadTheme,
    $id
  };

})();

/* ===============================
   BOTTOM NAV HANDLER
================================ */
document.addEventListener('click', (e) => {
  const btn = e.target.closest('.fn-item');
  if (!btn) return;

  const view = btn.dataset.view;
  if (!view) return;

  // Switch view
  if (typeof window.showView === 'function') {
    window.showView(view);
  }

  // Active state (optional but recommended)
  document.querySelectorAll('.fn-item')
    .forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
});
