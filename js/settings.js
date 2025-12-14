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
