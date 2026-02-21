'use strict';
/* ui.js — upgraded
   UI helpers: toasts (with type support), theme
*/

(function () {
  const db = window.MT?.db;

  /* ================= TOAST ================= */

  let toastQueue = [];
  let toastOffset = 0;

  function showToast(text, type = 'success', short = true) {
    const t = document.createElement('div');
    t.className = 'toast-success';

    const icons = {
      success: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>`,
      error: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`,
      warning: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`
    };

    const colors = {
      success: 'linear-gradient(135deg, #38bdf8, #6366f1)',
      error: 'linear-gradient(135deg, #f87171, #dc2626)',
      warning: 'linear-gradient(135deg, #fbbf24, #f97316)'
    };

    t.style.cssText = `
      position: fixed;
      right: 18px;
      bottom: ${90 + toastOffset * 60}px;
      z-index: 99999;
      display: flex;
      align-items: center;
      gap: 10px;
      background: ${colors[type] || colors.success};
      color: white;
      border-radius: 14px;
      padding: 13px 18px;
      font-size: 14px;
      font-weight: 700;
      font-family: inherit;
      box-shadow: 0 8px 32px rgba(0,0,0,0.28);
      max-width: 320px;
      animation: toastIn 0.35s cubic-bezier(0.34,1.56,0.64,1);
      pointer-events: none;
    `;
    t.innerHTML = (icons[type] || icons.success) + `<div>${text}</div>`;
    document.body.appendChild(t);

    toastOffset++;
    const delay = short ? 2000 : 3500;

    setTimeout(() => {
      t.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
      t.style.opacity = '0';
      t.style.transform = 'translateX(20px)';
      setTimeout(() => { t.remove(); toastOffset = Math.max(0, toastOffset - 1); }, 300);
    }, delay);
  }

  /* ================= SELECT COLOR FIX ================= */

  function ensureSelectColors() {
    const textColor = getComputedStyle(document.documentElement)
      .getPropertyValue('--text').trim();
    const bgColor = getComputedStyle(document.documentElement)
      .getPropertyValue('--bg').trim();
    document.querySelectorAll('select').forEach(s => {
      s.style.color = textColor;
      s.style.backgroundColor = bgColor;
    });
  }

  /* ================= THEME SYSTEM ================= */

  function applyTheme(theme) {
    const t = theme === 'light' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', t);
    localStorage.setItem('mt-theme', t);
    setTimeout(ensureSelectColors, 50);
  }

  function loadTheme() {
    let theme = 'dark';
    try {
      const s = window.MT?.db?.loadStore?.();
      theme = s?.settings?.theme || localStorage.getItem('mt-theme') || 'dark';
    } catch (e) { }
    applyTheme(theme);
    return theme;
  }

  /* ================= HELPERS ================= */

  function $id(id) { return document.getElementById(id); }

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

  if (typeof window.showView === 'function') {
    window.showView(view);
  }

  document.querySelectorAll('.fn-item')
    .forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
});


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
