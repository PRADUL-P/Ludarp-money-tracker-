'use strict';
/* colors.js
   Small theme / accent helpers — applies CSS variables based on stored customizations.
   Depends on window.MT.db
*/

(function(){
  const db = window.MT.db;
  const accentColorInput = document.getElementById('accentColor');
  const currencySymbolInput = document.getElementById('currencySymbol');
  const themeSelect = document.getElementById('themeSelect');
  const themeToggleTop = document.getElementById('themeToggleTop');

  function applyCustom(){
    const custom = db.loadCustom();
    document.documentElement.style.setProperty('--accent', custom.accent||db.DEFAULTS.custom.accent);
    if(accentColorInput) accentColorInput.value = custom.accent || db.DEFAULTS.custom.accent;
    if(currencySymbolInput) currencySymbolInput.value = custom.currency || db.DEFAULTS.custom.currency;
  }

  function setupThemeControls(){
    const stored = localStorage.getItem('money_theme') || 'dark';
    document.body.dataset.theme = stored;
    if(themeToggleTop) themeToggleTop.textContent = stored === 'dark' ? '🌙' : '☀️';
    if(themeSelect) themeSelect.value = stored;

    if(themeToggleTop){
      themeToggleTop.addEventListener('click', ()=> {
        const cur = document.body.dataset.theme || 'dark';
        const next = cur === 'dark' ? 'light' : 'dark';
        document.body.dataset.theme = next;
        localStorage.setItem('money_theme', next);
        themeToggleTop.textContent = next === 'dark' ? '🌙' : '☀️';
        if(themeSelect) themeSelect.value = next;
      });
    }

    if(themeSelect){
      themeSelect.addEventListener('change', ()=> {
        const v = themeSelect.value || 'dark';
        document.body.dataset.theme = v;
        localStorage.setItem('money_theme', v);
        themeToggleTop.textContent = v === 'dark' ? '🌙' : '☀️';
      });
    }
  }

  // expose apply for others
  window.MT = window.MT || {};
  window.MT.theme = { applyCustom, setupThemeControls };

  // apply immediately on load so UI shows colors
  applyCustom();
})();
