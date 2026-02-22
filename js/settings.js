'use strict';
/* settings.js - Cleaned up version */
(function () {
  const { loadStore, saveStore, DEFAULTS, loadCustom, saveCustom } = window.MT.db;

  /* ---------- DOM ---------- */
  const DOM = {
    categories: document.getElementById('settingsCategories'),
    upi: document.getElementById('settingsUpi'),
    cards: document.getElementById('settingsCards'),
    banks: document.getElementById('settingsBanks'),
    mapList: document.getElementById('mapList'),
    accent: document.getElementById('accentColor'),
    currency: document.getElementById('currencySymbol'),
    themeSelect: document.getElementById('themeSelect')
  };

  const fireUpdate = () => document.dispatchEvent(new Event('settingsUpdated'));

  function seed() {
    const s = loadStore();
    s.settings ||= {};
    ['categories', 'upiApps', 'cards', 'banks'].forEach(k => {
      s.settings[k] ||= [...DEFAULTS.settings[k === 'upiApps' ? 'upiApps' : k]];
    });
    s.paymentBankMap ||= {};
    saveStore(s);
    return s;
  }

  function pill(text, key) {
    const d = document.createElement('div');
    d.className = 'settings-pill';
    d.textContent = text;
    const x = document.createElement('button');
    x.textContent = '×';
    x.onclick = () => {
      if (!confirm(`Remove "${text}"?`)) return;
      const s = seed();
      s.settings[key] = s.settings[key].filter(v => v !== text);
      saveStore(s);
      renderSettingsUI();
      fireUpdate();
    };
    d.appendChild(x);
    return d;
  }

  function mapRow(label, mapKey, s) {
    const r = document.createElement('div');
    r.className = 'flex-row';
    r.style.gap = '8px';
    r.innerHTML = `<div style="min-width:140px;">${label}</div>`;
    const sel = document.createElement('select');
    sel.innerHTML = '<option value="">None</option>' + s.settings.banks.map(b => `<option value="${b}">${b}</option>`).join('');
    sel.value = s.paymentBankMap[mapKey] || '';
    sel.onchange = () => {
      s.paymentBankMap[mapKey] = sel.value || null;
      saveStore(s);
      fireUpdate();
    };
    r.appendChild(sel);
    DOM.mapList.appendChild(r);
  }

  function renderSettingsUI() {
    const s = seed();
    DOM.categories.innerHTML = '';
    DOM.upi.innerHTML = '';
    DOM.cards.innerHTML = '';
    DOM.banks.innerHTML = '';
    DOM.mapList.innerHTML = '';

    s.settings.categories.forEach(c => DOM.categories.appendChild(pill(c, 'categories')));
    s.settings.upiApps.forEach(u => DOM.upi.appendChild(pill(u, 'upiApps')));
    s.settings.cards.forEach(c => DOM.cards.appendChild(pill(c, 'cards')));
    s.settings.banks.forEach(b => DOM.banks.appendChild(pill(b, 'banks')));

    s.settings.upiApps.forEach(u => mapRow(`UPI: ${u}`, `upi:${u}`, s));
    s.settings.cards.forEach(c => mapRow(`Card: ${c}`, `card:${c}`, s));

    const custom = loadCustom();
    DOM.accent.value = custom.accent;
    DOM.currency.value = custom.currency;
    if (DOM.themeSelect) DOM.themeSelect.value = document.documentElement.getAttribute('data-theme') || 'dark';

    const autoInp = document.getElementById('autoDownloadStmt');
    if (autoInp) autoInp.checked = custom.autoDownload || false;
  }

  function addItem(key, inputId) {
    const input = document.getElementById(inputId);
    const v = input?.value.trim();
    if (!v) return;
    const s = seed();
    const storeKey = key === 'upi' ? 'upiApps' : (key === 'cards' ? 'cards' : (key === 'banks' ? 'banks' : 'categories'));
    if (!s.settings[storeKey].includes(v)) {
      s.settings[storeKey].push(v);
      saveStore(s);
      input.value = '';
      renderSettingsUI();
      fireUpdate();
    }
  }

  // Wiring
  document.getElementById('addCategoryBtn').onclick = () => addItem('categories', 'newCategory');
  document.getElementById('addUpiBtn').onclick = () => addItem('upi', 'newUpi');
  document.getElementById('addCardBtn').onclick = () => addItem('cards', 'newCard');
  document.getElementById('addBankBtn').onclick = () => addItem('banks', 'newBank');

  document.getElementById('saveCustomization').onclick = () => {
    const c = loadCustom();
    c.accent = DOM.accent.value;
    c.currency = DOM.currency.value;
    const autoInp = document.getElementById('autoDownloadStmt');
    if (autoInp) c.autoDownload = autoInp.checked;
    saveCustom(c);
    document.documentElement.style.setProperty('--accent', c.accent);
    fireUpdate();
    window.MT.ui.showToast('Customization saved');
  };

  const checkAutoDownload = () => {
    const c = loadCustom();
    if (!c.autoDownload) return;

    const now = new Date();
    const currentMonthStr = now.toISOString().slice(0, 7); // YYYY-MM
    const lastCheckedMonth = localStorage.getItem('mt_last_auto_download');

    if (lastCheckedMonth && lastCheckedMonth !== currentMonthStr) {
      // It's a new month! Trigger download for the previous month
      const prevDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const prevMonthStr = prevDate.toISOString().slice(0, 7);

      if (window.ExporterModule && window.ExporterModule.exportXLSX) {
        window.MT.ui.showToast(`Auto-downloading statement for ${prevMonthStr}...`);
        window.ExporterModule.exportXLSX(prevMonthStr);
        localStorage.setItem('mt_last_auto_download', currentMonthStr);
      }
    } else if (!lastCheckedMonth) {
      localStorage.setItem('mt_last_auto_download', currentMonthStr);
    }
  };

  // Live preview accent
  DOM.accent.oninput = () => {
    document.documentElement.style.setProperty('--accent', DOM.accent.value);
  };

  document.getElementById('resetCustomization').onclick = () => {
    if (!confirm('Warning: This will delete ALL data. An automatic backup will be downloaded first. Proceed?')) return;

    // Trigger full backup before wipe
    if (window.ExporterModule && window.ExporterModule.exportJSON) {
      window.ExporterModule.exportJSON();
    }

    setTimeout(() => {
      saveStore({ version: 1, days: {}, settings: JSON.parse(JSON.stringify(DEFAULTS.settings)), accounts: {}, paymentBankMap: {} });
      saveCustom(DEFAULTS.custom);
      // Clear other modules
      localStorage.removeItem('mt_dues_v1');
      localStorage.removeItem('mt_budgets_v1');
      localStorage.removeItem('mt_recurring_v1');
      location.reload();
    }, 1000);
  };

  // Theme
  DOM.themeSelect?.addEventListener('change', () => {
    const t = DOM.themeSelect.value;
    window.MT.ui.applyTheme(t);
    const topIcon = document.getElementById('themeToggleTop');
    if (topIcon) topIcon.textContent = t === 'dark' ? '🌙' : '☀️';
  });

  // Settings Accordion
  document.addEventListener('click', (e) => {
    const h = e.target.closest('.settings-header');
    if (!h) return;
    const panel = document.getElementById(h.dataset.target);
    if (panel) {
      const isOpen = panel.classList.contains('open');
      panel.classList.toggle('open', !isOpen);
      h.classList.toggle('collapsed', isOpen);
    }
  });

  /* ---------- BACKUP / RESTORE ---------- */
  document.getElementById('settingsExpJson')?.addEventListener('click', () => {
    ExporterModule?.exportJSON();
  });

  document.getElementById('settingsImportFile')?.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file || !confirm('Import from backup? (Overwrites current data)')) return;
    const text = await file.text();
    try {
      const data = JSON.parse(text);
      if (data.main) {
        saveStore(data.main);
        if (data.dues) localStorage.setItem('mt_dues_v1', JSON.stringify(data.dues));
        if (data.budgets) localStorage.setItem('mt_budgets_v1', JSON.stringify(data.budgets));
        if (data.recurring) localStorage.setItem('mt_recurring_v1', JSON.stringify(data.recurring));
        if (data.custom) saveCustom(data.custom);
        alert('Restore successful');
        location.reload();
      } else {
        // Legacy settings-only import
        const s = loadStore();
        if (data.settings) s.settings = data.settings;
        if (data.paymentBankMap) s.paymentBankMap = data.paymentBankMap;
        saveStore(s);
        if (data.custom) saveCustom(data.custom);
        renderSettingsUI();
        fireUpdate();
        alert('Settings imported');
      }
    } catch (err) { alert('Invalid backup file'); }
  });

  window.MT.settings = { renderSettingsUI };
  window.addEventListener('mt:auth-entered', () => {
    renderSettingsUI();
    checkAutoDownload();
  });

})();
