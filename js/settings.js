/* =========================================================
   SETTINGS MODULE – FULL VERSION (NO FEATURE LOSS)
========================================================= */
(function () {
  'use strict';

  /* ---------- DOM ---------- */
  const settingsCategoriesEl = document.getElementById('settingsCategories');
  const newCategoryInput = document.getElementById('newCategory');
  const addCategoryBtn = document.getElementById('addCategoryBtn');

  const settingsUpiEl = document.getElementById('settingsUpi');
  const settingsCardsEl = document.getElementById('settingsCards');
  const settingsBanksEl = document.getElementById('settingsBanks');
  const mapList = document.getElementById('mapList');

  const newUpiInput = document.getElementById('newUpi');
  const newCardInput = document.getElementById('newCard');
  const newBankInput = document.getElementById('newBank');

  const addUpiBtn = document.getElementById('addUpiBtn');
  const addCardBtn = document.getElementById('addCardBtn');
  const addBankBtn = document.getElementById('addBankBtn');

  const accentColorInput = document.getElementById('accentColor');
  const currencySymbolInput = document.getElementById('currencySymbol');

  const saveCustomizationBtn = document.getElementById('saveCustomization');
  const resetCustomizationBtn = document.getElementById('resetCustomization');

  /* ---------- HELPERS ---------- */
  const fireUpdate = () =>
    document.dispatchEvent(new Event('settingsUpdated'));

  function seed() {
    const s = loadStore();

    s.settings ||= {};
    s.settings.categories ||= [...DEFAULTS.settings.categories];
    s.settings.upiApps ||= [...DEFAULTS.settings.upiApps];
    s.settings.cards ||= [...DEFAULTS.settings.cards];
    s.settings.banks ||= [...DEFAULTS.settings.banks];

    s.paymentBankMap ||= {};

    saveStore(s);
    return s;
  }

  /* ---------- PILL ---------- */
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

  /* ---------- MAP ROW ---------- */
  function mapRow(label, mapKey, s) {
    const r = document.createElement('div');
    r.style.display = 'flex';
    r.style.gap = '8px';
    r.style.alignItems = 'center';

    const l = document.createElement('div');
    l.style.minWidth = '140px';
    l.textContent = label;

    const sel = document.createElement('select');
    sel.innerHTML = '<option value="">None</option>';

    s.settings.banks.forEach(b => {
      const o = document.createElement('option');
      o.value = b;
      o.textContent = b;
      sel.appendChild(o);
    });

    sel.value = s.paymentBankMap[mapKey] || '';

    sel.onchange = () => {
      s.paymentBankMap[mapKey] = sel.value || null;
      saveStore(s);
      fireUpdate();
    };

    r.appendChild(l);
    r.appendChild(sel);
    mapList.appendChild(r);
  }

  /* ---------- RENDER ---------- */
  function renderSettingsUI() {
    const s = seed();

    settingsCategoriesEl.innerHTML = '';
    settingsUpiEl.innerHTML = '';
    settingsCardsEl.innerHTML = '';
    settingsBanksEl.innerHTML = '';
    mapList.innerHTML = '';

    /* Categories */
    s.settings.categories.forEach(c =>
      settingsCategoriesEl.appendChild(pill(c, 'categories'))
    );

    /* UPI / Cards / Banks */
    s.settings.upiApps.forEach(u =>
      settingsUpiEl.appendChild(pill(u, 'upiApps'))
    );

    s.settings.cards.forEach(c =>
      settingsCardsEl.appendChild(pill(c, 'cards'))
    );

    s.settings.banks.forEach(b =>
      settingsBanksEl.appendChild(pill(b, 'banks'))
    );

    /* Mapping */
    s.settings.upiApps.forEach(u =>
      mapRow(`UPI: ${u}`, `upi:${u}`, s)
    );

    s.settings.cards.forEach(c =>
      mapRow(`Card: ${c}`, `card:${c}`, s)
    );

    /* Customization */
    const custom = loadCustom();
    accentColorInput.value = custom.accent;
    currencySymbolInput.value = custom.currency;
  }

  /* ---------- ADDERS ---------- */
  function addItem(key, input) {
    const v = input.value.trim();
    if (!v) return;

    const s = seed();
    if (!s.settings[key].includes(v)) {
      s.settings[key].push(v);
      saveStore(s);
      input.value = '';
      renderSettingsUI();
      fireUpdate();
    }
  }

  addCategoryBtn.onclick = () =>
    addItem('categories', newCategoryInput);

  addUpiBtn.onclick = () =>
    addItem('upiApps', newUpiInput);

  addCardBtn.onclick = () =>
    addItem('cards', newCardInput);

  addBankBtn.onclick = () =>
    addItem('banks', newBankInput);

  /* ---------- SAVE CUSTOMIZATION ---------- */
  saveCustomizationBtn.onclick = () => {
    const c = loadCustom();
    c.accent = accentColorInput.value;
    c.currency = currencySymbolInput.value;
    saveCustom(c);

    renderSettingsUI();
    fireUpdate();
  };

  /* ---------- RESET ---------- */
  resetCustomizationBtn.onclick = () => {
    if (!confirm('Reset all settings to defaults?')) return;

    saveStore({
      version: 1,
      days: {},
      settings: JSON.parse(JSON.stringify(DEFAULTS.settings)),
      accounts: {},
      paymentBankMap: {}
    });

    saveCustom(DEFAULTS.custom);
    renderSettingsUI();
    fireUpdate();
  };

  /* ---------- EXPORT ---------- */
  window.renderSettingsUI = renderSettingsUI;

  /* ---------- INIT ---------- */
  window.addEventListener('mt:auth-entered', renderSettingsUI);
})();
/* ================= EXPORT / IMPORT (SETTINGS) ================= */

// EXPORT SETTINGS ONLY
const exportSettingsJSON = () => {
  const store = loadStore();
  const payload = {
    version: store.version || 1,
    settings: store.settings,
    paymentBankMap: store.paymentBankMap,
    custom: loadCustom()
  };

  const blob = new Blob(
    [JSON.stringify(payload, null, 2)],
    { type: 'application/json' }
  );

  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'money-tracker-settings.json';
  a.click();
  URL.revokeObjectURL(a.href);
};

// IMPORT SETTINGS ONLY
const importSettingsJSON = async (file) => {
  const text = await file.text();
  const data = JSON.parse(text);

  const store = loadStore();

  if (data.settings) store.settings = data.settings;
  if (data.paymentBankMap) store.paymentBankMap = data.paymentBankMap;

  saveStore(store);

  if (data.custom) saveCustom(data.custom);

  renderSettingsUI();
  fireUpdate(); // 🔥 updates Entry + Accounts instantly
  alert('Settings imported successfully');
};

/* ---------- BUTTON WIRING ---------- */
const settingsExportBtn = document.getElementById('settingsExportBtn');
const settingsImportInput = document.getElementById('settingsImportInput');

settingsExportBtn?.addEventListener('click', exportSettingsJSON);

settingsImportInput?.addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (!file) return;

  if (!confirm('Import settings? This will overwrite current settings.')) return;
  importSettingsJSON(file);
});
/* ===============================
   SETTINGS EXPORT / IMPORT
================================ */

window.addEventListener('mt:auth-entered', () => {

  const btnCsv  = document.getElementById('settingsExpCsv');
  const btnXlsx = document.getElementById('settingsExpXlsx');
  const btnJson = document.getElementById('settingsExpJson');
  const fileInp = document.getElementById('settingsImportFile');

  /* ---------- CSV EXPORT (ALL DATA) ---------- */
  btnCsv?.addEventListener('click', () => {
    if (!window.exportCSV) {
      alert('CSV exporter not loaded');
      return;
    }
    // false = full export
    window.exportCSV(false, null);
  });

  /* ---------- EXCEL EXPORT (ALL DATA) ---------- */
  btnXlsx?.addEventListener('click', () => {
    if (!window.exportXLSX) {
      alert('Excel exporter not loaded');
      return;
    }
    window.exportXLSX(false, null);
  });

  /* ---------- SETTINGS JSON EXPORT ---------- */
  btnJson?.addEventListener('click', () => {
    const store = loadStore();

    const payload = {
      version: 1,
      settings: store.settings,
      paymentBankMap: store.paymentBankMap || {},
      custom: loadCustom()
    };

    const blob = new Blob(
      [JSON.stringify(payload, null, 2)],
      { type: 'application/json' }
    );

    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'money-tracker-settings.json';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(a.href);
  });

  /* ---------- SETTINGS IMPORT ---------- */
  fileInp?.addEventListener('change', async () => {
    const file = fileInp.files[0];
    if (!file) return;

    try {
      const text = await file.text();
      const data = JSON.parse(text);

      if (!data.settings || typeof data.settings !== 'object') {
        throw new Error('Invalid settings file');
      }

      const store = loadStore();
      store.settings = data.settings;
      store.paymentBankMap = data.paymentBankMap || {};

      saveStore(store);

      if (data.custom) {
        saveCustom(data.custom);
      }

      // 🔥 LIVE UPDATE EVERYWHERE
      renderSettingsUI();
      document.dispatchEvent(new Event('settingsUpdated'));
      document.dispatchEvent(new Event('accountsUpdated'));

      alert('Settings imported successfully');

    } catch (err) {
      console.error(err);
      alert('Invalid settings file');
    } finally {
      fileInp.value = '';
    }
  });

});

window.addEventListener('mt:auth-entered', renderSettingsUI);


/* ================= SETTINGS DROPDOWN LOGIC ================= */
(function () {
  document.addEventListener('click', (e) => {
    const header = e.target.closest('.settings-header');
    if (!header) return;

    const targetId = header.dataset.target;
    const panel = document.getElementById(targetId);
    if (!panel) return;

    const isOpen = panel.classList.contains('open');

    panel.classList.toggle('open', !isOpen);
    header.classList.toggle('collapsed', isOpen);
  });
})();
const themeSelect = document.getElementById('themeSelect');

themeSelect?.addEventListener('change', () => {
  const theme = themeSelect.value;
  window.MT.ui.applyTheme(theme);

  const toggle = document.getElementById('themeToggleTop');
  if(toggle){
    toggle.textContent = theme === 'dark' ? '🌙' : '☀️';
  }
});


/* ===============================
   USER PAGE – CHANGE PASSWORD
================================ */

(function () {
  const { loadUser, saveUser } = window.MT.db;

  const oldPwInput = document.getElementById('oldPassword');
  const newPwInput = document.getElementById('newPassword');
  const changeBtn  = document.getElementById('changePasswordBtn');
  const statusEl   = document.getElementById('passwordStatus');

  if (!changeBtn) return; // User page not loaded

  changeBtn.addEventListener('click', () => {
    const user = loadUser();

    if (!user) {
      statusEl.textContent = 'No user found';
      return;
    }

    const oldPw = oldPwInput.value.trim();
    const newPw = newPwInput.value.trim();

    if (!oldPw || !newPw) {
      statusEl.textContent = 'Please fill both fields';
      return;
    }

    if (oldPw !== user.password) {
      statusEl.textContent = 'Current password is incorrect';
      return;
    }

    user.password = newPw;
    saveUser(user);

    oldPwInput.value = '';
    newPwInput.value = '';
    statusEl.textContent = 'Password updated successfully';
  });
})();
