'use strict';
/* colors.js
   Theme + accent helpers
   ✔ Single source of truth
   ✔ Works with navbar + settings page
   Depends on window.MT.db and window.MT.ui
*/

(function () {

  const db = window.MT?.db;

  /* ---------- DOM ---------- */
  const accentColorInput   = document.getElementById('accentColor');
  const currencySymbolInput = document.getElementById('currencySymbol');
  const themeSelect        = document.getElementById('themeSelect');
  const themeToggleTop     = document.getElementById('themeToggleTop');

  /* ---------- APPLY CUSTOM COLORS ---------- */
  function applyCustom() {
    if (!db) return;

    const custom = db.loadCustom();

    const accent =
      custom.accent || db.DEFAULTS.custom.accent;

    document.documentElement.style.setProperty('--accent', accent);

    if (accentColorInput) accentColorInput.value = accent;
    if (currencySymbolInput)
      currencySymbolInput.value =
        custom.currency || db.DEFAULTS.custom.currency;
  }

  /* ---------- THEME CONTROLS ---------- */
  function setupThemeControls() {
    if (!window.MT?.ui) return;

    // read current theme from unified system
    const currentTheme =
      document.documentElement.getAttribute('data-theme') || 'dark';

    // sync UI
    if (themeSelect) themeSelect.value = currentTheme;
    if (themeToggleTop)
      themeToggleTop.textContent =
        currentTheme === 'dark' ? '🌙' : '☀️';

    /* --- NAVBAR TOGGLE --- */
    if (themeToggleTop) {
      themeToggleTop.addEventListener('click', () => {
        const cur =
          document.documentElement.getAttribute('data-theme') || 'dark';

        const next = cur === 'dark' ? 'light' : 'dark';

        // 🔥 single source of truth
        window.MT.ui.applyTheme(next);

        if (themeSelect) themeSelect.value = next;
        themeToggleTop.textContent = next === 'dark' ? '🌙' : '☀️';
      });
    }

    /* --- SETTINGS DROPDOWN --- */
    if (themeSelect) {
      themeSelect.addEventListener('change', () => {
        const v = themeSelect.value || 'dark';

        window.MT.ui.applyTheme(v);

        if (themeToggleTop)
          themeToggleTop.textContent =
            v === 'dark' ? '🌙' : '☀️';
      });
    }
  }

  /* ---------- EXPORT ---------- */
  window.MT = window.MT || {};
  window.MT.theme = {
    applyCustom,
    setupThemeControls
  };

  /* ---------- INIT ---------- */
  applyCustom();

})();

(function () {
  const toggle = document.getElementById('themeToggleTop');
  const select = document.getElementById('themeSelect');

  if (!toggle || !window.MT?.ui) return;

  function syncIcon(theme) {
    toggle.textContent = theme === 'dark' ? '🌙' : '☀️';
  }

  // Initial sync
  const initialTheme =
    document.documentElement.getAttribute('data-theme') || 'dark';
  syncIcon(initialTheme);
  if (select) select.value = initialTheme;

  // 🔥 TOP ICON CLICK
  toggle.addEventListener('click', () => {
    const current =
      document.documentElement.getAttribute('data-theme') || 'dark';

    const next = current === 'dark' ? 'light' : 'dark';

    window.MT.ui.applyTheme(next);
    syncIcon(next);

    if (select) select.value = next;
  });

  // 🔁 SETTINGS PAGE SYNC
  if (select) {
    select.addEventListener('change', () => {
      const theme = select.value || 'dark';
      window.MT.ui.applyTheme(theme);
      syncIcon(theme);
    });
  }
})();
