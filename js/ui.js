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
  function launchConfetti() {
    const container = document.createElement('div');
    container.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:999999;';
    document.body.appendChild(container);
    const colors = ['#38bdf8', '#6366f1', '#a78bfa', '#10b981', '#fbbf24', '#f43f5e'];
    for (let i = 0; i < 60; i++) {
        const p = document.createElement('div');
        const color = colors[Math.floor(Math.random() * colors.length)];
        const size = Math.random() * 8 + 4;
        p.style.cssText = `position:absolute;left:50%;top:50%;width:${size}px;height:${size}px;background:${color};border-radius:${Math.random() > 0.5 ? '50%' : '2px'};`;
        container.appendChild(p);
        const angle = Math.random() * Math.PI * 2;
        const velocity = Math.random() * 15 + 10;
        const vx = Math.cos(angle) * velocity;
        const vy = Math.sin(angle) * velocity;
        let x = 0, y = 0, grav = 0.5, op = 1;
        const anim = () => {
            x += vx; y += vy + grav; grav += 0.2; op -= 0.015;
            p.style.transform = `translate(${x}px, ${y}px) rotate(${x*2}deg)`;
            p.style.opacity = op;
            if (op > 0) requestAnimationFrame(anim); else p.remove();
        };
        requestAnimationFrame(anim);
    }
    setTimeout(() => container.remove(), 2000);
  }

  /* ================= EXPORT ================= */
  window.MT = window.MT || {};
  window.MT.ui = {
    showToast,
    ensureSelectColors,
    applyTheme,
    loadTheme,
    $id,
    showModal,
    launchConfetti
  };

  /* ================= MODAL SYSTEM ================= */
  function showModal(title, contentHtml) {
    const backdrop = document.createElement('div');
    backdrop.style.cssText = `
      position: fixed; top: 0; left: 0; width: 100%; height: 100%;
      background: rgba(0,0,0,0.8); backdrop-filter: blur(8px);
      display: flex; align-items: center; justify-content: center;
      z-index: 100000; animation: mtFadeIn 0.3s ease;
    `;
    const modal = document.createElement('div');
    modal.style.cssText = `
      background: var(--card); border: 1px solid var(--card-border);
      width: 90%; max-width: 450px; border-radius: 20px;
      padding: 24px; position: relative; box-shadow: 0 20px 50px rgba(0,0,0,0.5);
    `;
    modal.innerHTML = `
      <div style="font-size: 18px; font-weight: 800; margin-bottom: 12px; display: flex; align-items: center; gap: 10px;">${title}</div>
      <div style="font-size: 13.5px; line-height: 1.6; color: var(--text-secondary); margin-bottom: 20px; max-height: 60vh; overflow-y: auto;">${contentHtml}</div>
      <button class="btn-primary" style="width: 100%;" onclick="this.closest('.mt-modal-backdrop').remove()">Got it!</button>
    `;
    backdrop.className = 'mt-modal-backdrop';
    backdrop.appendChild(modal);
    backdrop.addEventListener('click', (e) => { if (e.target === backdrop) backdrop.remove(); });
    document.body.appendChild(backdrop);
  }

  // --- DYNAMIC VERSION DISPLAY & AUTO-UPDATE POPUP SYSTEM ---
  window.addEventListener('DOMContentLoaded', () => {
    const version = window.LUDARP_VERSION || '6.1.4';
    document.title = `LUDARP Money Tracker v${version} | Secure Private Expense Manager`;
    
    // Find all version display elements and set their text
    document.querySelectorAll('.app-version-display').forEach(el => {
      el.textContent = version;
    });
    
    // Also scan About section header
    const aboutTitle = document.querySelector('#view-about .section-title');
    if (aboutTitle) {
      aboutTitle.innerHTML = `LUDARP v${version} Stable`;
    }

    // Check if this is a fresh version upgrade to show the premium release notes modal!
    const lastSeen = localStorage.getItem('ludarp_last_seen_version');
    if (lastSeen !== version) {
      setTimeout(() => {
        const updateNotesHtml = `
          <div style="text-align: center; margin-bottom: 18px;">
            <div style="font-size: 42px; margin-bottom: 8px;">🚀</div>
            <span style="background: rgba(56, 189, 248, 0.1); color: var(--accent); padding: 4px 12px; border-radius: 20px; font-size: 11px; font-weight: 800; letter-spacing: 1px; text-transform: uppercase;">Update Successful</span>
          </div>
          <div style="font-size: 14px; margin-bottom: 15px; color: var(--text); font-weight: 600;">Welcome to LUDARP v${version} Stable Release! Here's what's new:</div>
          <ul style="margin-left: 18px; display: flex; flex-direction: column; gap: 10px; font-size: 12.5px; color: var(--text-secondary); line-height: 1.5; list-style-type: '⚡ ';">
            <li><strong>Bi-directional Google Sheet Sync:</strong> Checked/unchecked split bills and settlements now dynamically sync additions and deletions in real-time, preventing double entries!</li>
            <li><strong>Self-Healing Spreadsheet Columns:</strong> The Google Apps Script now automatically detects and inserts the missing "Account" (bank name) column without losing your data!</li>
            <li><strong>Real-time Finance Dropdowns:</strong> Newly added bank accounts in Settings instantly populate in your Finance Opening Balance dropdowns without needing a page refresh!</li>
            <li><strong>Card Balance mapping fix:</strong> Corrected card transaction bank account mapping in balance calculation, ensuring card purchases perfectly update mapped bank balances in real-time.</li>
            <li><strong>In-app Apps Script Modal:</strong> Access and copy the upgraded Google Sheets synchronizer script directly in-app via a beautiful, copyable code modal.</li>
          </ul>
        `;
        
        showModal(`LUDARP v${version} Premium Upgrade`, updateNotesHtml);
        localStorage.setItem('ludarp_last_seen_version', version);
        
        if (typeof launchConfetti === 'function') {
          launchConfetti();
        }
      }, 800);
    }
  });

})();

/* ===============================
   BOTTOM NAV HANDLER
================================ */

