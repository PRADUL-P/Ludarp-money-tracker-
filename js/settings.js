'use strict';
/* settings.js - Cleaned up version */
(function () {
  const { loadStore, saveStore, DEFAULTS, loadCustom, saveCustom } = window.MT.db;
  const db = window.MT.db; // shorthand reference

  /* ---------- DOM ---------- */
  const DOM = {
    categories: document.getElementById('settingsCategories'),
    upi: document.getElementById('settingsUpi'),
    cards: document.getElementById('settingsCards'),
    banks: document.getElementById('settingsBanks'),
    presets: document.getElementById('settingsPresetsList'),
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
    s.settings.presets = (s.settings.presets && s.settings.presets.length > 0)
      ? s.settings.presets
      : JSON.parse(JSON.stringify(DEFAULTS.settings.presets));
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
    if (DOM.categories) DOM.categories.innerHTML = '';
    if (DOM.upi) DOM.upi.innerHTML = '';
    if (DOM.cards) DOM.cards.innerHTML = '';
    if (DOM.banks) DOM.banks.innerHTML = '';
    if (DOM.mapList) DOM.mapList.innerHTML = '';

    s.settings.categories.forEach(c => DOM.categories && DOM.categories.appendChild(pill(c, 'categories')));
    s.settings.upiApps.forEach(u => DOM.upi && DOM.upi.appendChild(pill(u, 'upiApps')));
    s.settings.cards.forEach(c => DOM.cards && DOM.cards.appendChild(pill(c, 'cards')));
    s.settings.banks.forEach(b => DOM.banks && DOM.banks.appendChild(pill(b, 'banks')));

    // Presets
    if (DOM.presets) renderPresetsList(s);

    if (DOM.mapList) {
      s.settings.upiApps.forEach(u => mapRow(`UPI: ${u}`, `upi:${u}`, s));
      s.settings.cards.forEach(c => mapRow(`Card: ${c}`, `card:${c}`, s));
    }

    const custom = loadCustom();
    if (DOM.accent) DOM.accent.value = custom.accent;
    if (DOM.currency) DOM.currency.value = custom.currency;
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

  function renderPresetsList(s) {
    DOM.presets.innerHTML = '';
    const presets = s.settings.presets || [];
    presets.forEach(p => {
      const item = document.createElement('div');
      item.className = 'entry';
      item.innerHTML = `
        <div class="entry-main">
          <div class="entry-title">${p.label}</div>
          <div class="entry-meta">${p.category}${p.amount ? ' | ' + db.currencyFmt(p.amount) : ''}${p.description ? ' | ' + p.description : ''}</div>
        </div>
        <div class="entry-right" style="gap:5px;">
           <button class="btn-small edit-preset-btn">✏️</button>
           <button class="btn-small del-preset-btn" style="color:var(--danger);">×</button>
        </div>
      `;
      item.querySelector('.edit-preset-btn').onclick = () => openPresetModal(p);
      item.querySelector('.del-preset-btn').onclick = () => {
        if (!confirm(`Delete "${p.label}" preset?`)) return;
        const st = seed();
        st.settings.presets = st.settings.presets.filter(x => x.id !== p.id);
        saveStore(st);
        renderSettingsUI();
        fireUpdate();
      };
      DOM.presets.appendChild(item);
    });
    if (presets.length === 0) {
      DOM.presets.innerHTML = '<div style="text-align:center; padding:16px; color:var(--muted); font-size:13px;">No presets yet. Click "+ Add New Preset" to create one.</div>';
    }
  }

  function openPresetModal(preset = null) {
      const isEdit = !!preset;
      const modal = document.createElement('div');
      modal.className = 'export-modal'; // reusing modal overlay styles
      
      const card = document.createElement('div');
      card.className = 'export-card';
      card.style.maxWidth = '400px';
      
      card.innerHTML = `
        <h3 style="margin-bottom:15px;">${isEdit ? 'Edit Preset' : 'New Preset'}</h3>
        <div style="display:grid; gap:12px;">
           <div>
             <label>Label (Emoji + Text)</label>
             <input id="preLabel" value="${isEdit ? preset.label : '⛽ Petrol'}" />
           </div>
           <div>
             <label>Category</label>
             <input id="preCat" value="${isEdit ? preset.category : 'Petrol'}" list="catSuggest" />
             <datalist id="catSuggest"></datalist>
           </div>
           <div>
             <label>Default Amount</label>
             <input id="preAmt" type="number" step="0.01" value="${isEdit ? preset.amount : 0}" />
           </div>
           <div>
             <label>Description (Prefill)</label>
             <input id="preDesc" value="${isEdit ? preset.description : ''}" />
           </div>
           <div>
             <label>Note (Internal info)</label>
             <input id="preNote" value="${isEdit ? (preset.note||'') : ''}" />
           </div>
        </div>
        <div style="display:flex; justify-content:flex-end; gap:10px; margin-top:20px;">
           <button class="btn-secondary" id="preCancel">Cancel</button>
           <button class="btn-primary" id="preSave">Save Preset</button>
        </div>
      `;
      
      modal.appendChild(card);
      document.body.appendChild(modal);
      
      // Auto-suggest categories
      const s = seed();
      const datalist = card.querySelector('#catSuggest');
      (s.settings.categories || []).forEach(c => {
         const o = document.createElement('option'); o.value = c; datalist.appendChild(o);
      });

      card.querySelector('#preCancel').onclick = () => modal.remove();
      card.querySelector('#preSave').onclick = () => {
          const st = seed();
          const newP = {
              id: isEdit ? preset.id : Date.now(),
              label: card.querySelector('#preLabel').value.trim() || 'New Preset',
              category: card.querySelector('#preCat').value.trim() || 'Other',
              amount: Number(card.querySelector('#preAmt').value) || 0,
              description: card.querySelector('#preDesc').value.trim(),
              note: card.querySelector('#preNote').value.trim()
          };

          if (isEdit) {
              st.settings.presets = st.settings.presets.map(x => x.id === preset.id ? newP : x);
          } else {
              st.settings.presets.push(newP);
          }
          
          saveStore(st);
          modal.remove();
          renderSettingsUI();
          fireUpdate();
      };
  }

  // Wiring
  document.getElementById('addPresetBtn').onclick = () => openPresetModal();
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
  
  // Danger Zone Data Clear
  const btnSettingsClearData = document.getElementById('btnSettingsClearData');
  if (btnSettingsClearData) {
      btnSettingsClearData.addEventListener('click', () => {
         if (!confirm('⚠️ WARNING: This will delete ALL your data permanently.\n\nThe app will automatically download a backup file first.\n\nDo you want to proceed and wipe the data?')) return;
         if (!confirm('Are you absolutely sure? Click OK to export and wipe your account.')) return;
         
         // Auto-export Full Backup
         if (window.ExporterModule && window.ExporterModule.exportJSON) {
            window.ExporterModule.exportJSON();
         }
         
         // Wait for file download to trigger before nuking DB
         setTimeout(() => {
             localStorage.removeItem('money_tracker_v3');
             localStorage.removeItem('mt_dues_v1');
             localStorage.removeItem('mt_budgets_v1');
             localStorage.removeItem('mt_recurring_v1');
             localStorage.removeItem('mt_custom_settings');
             alert('All data has been successfully cleared. The app will now reload.');
             window.location.reload();
         }, 1500);
      });
  }

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

  // Settings Expand/Collapse All
  document.getElementById('btnSettingsExpandAll')?.addEventListener('click', () => {
    document.querySelectorAll('.settings-panel').forEach(p => p.classList.add('open'));
    document.querySelectorAll('.settings-header').forEach(h => h.classList.remove('collapsed'));
  });
  document.getElementById('btnSettingsCollapseAll')?.addEventListener('click', () => {
    document.querySelectorAll('.settings-panel').forEach(p => p.classList.remove('open'));
    document.querySelectorAll('.settings-header').forEach(h => h.classList.add('collapsed'));
  });

  // Settings Sub-Tabs
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('.settings-tab');
    if (!btn || !btn.dataset.stab) return;
    const targetId = btn.dataset.stab;
    document.querySelectorAll('.settings-tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.settings-tab-panel').forEach(p => p.classList.remove('active'));
    btn.classList.add('active');
    const panel = document.getElementById(targetId);
    if (panel) panel.classList.add('active');
  });

  /* ---------- BACKUP / RESTORE ---------- */
  // Export Settings
  document.getElementById('expSettingsJson')?.addEventListener('click', () => ExporterModule?.exportSettingsJSON());
  document.getElementById('expSettingsCsv')?.addEventListener('click', () => ExporterModule?.exportSettingsCSV());
  document.getElementById('expSettingsXlsx')?.addEventListener('click', () => ExporterModule?.exportSettingsXLSX());
  // Export Transactions
  document.getElementById('expTxJson')?.addEventListener('click', () => ExporterModule?.exportTransactionsJSON());
  document.getElementById('expTxCsv')?.addEventListener('click', () => ExporterModule?.exportTransactionsCSV());
  document.getElementById('expTxXlsx')?.addEventListener('click', () => ExporterModule?.exportTransactionsXLSX());
  // Export All
  document.getElementById('expAllJson')?.addEventListener('click', () => ExporterModule?.exportAllJSON());
  document.getElementById('expAllCsv')?.addEventListener('click', () => ExporterModule?.exportAllCSV());
  document.getElementById('expAllXlsx')?.addEventListener('click', () => ExporterModule?.exportAllXLSX());
  // Legacy buttons (if still present elsewhere)
  document.getElementById('settingsExpJson')?.addEventListener('click', () => ExporterModule?.exportAllJSON());
  document.getElementById('settingsExpCsv')?.addEventListener('click', () => ExporterModule?.exportTransactionsCSV());
  document.getElementById('settingsExpXlsx')?.addEventListener('click', () => ExporterModule?.exportTransactionsXLSX());

  // Smart Import — auto-detects file type + content type
  document.getElementById('settingsImportFile')?.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    await ExporterModule?.smartImport(file);
    // Reset input so same file can be re-selected
    e.target.value = '';
  });

  window.MT.settings = { renderSettingsUI };
  window.addEventListener('mt:auth-entered', () => {
    renderSettingsUI();
    checkAutoDownload();
    initNavOrder();
  });

  /* ============================================
     🗂️ NAV ORDER CUSTOMIZATION
  ============================================ */
  const NAV_ORDER_KEY = 'mt_nav_order';
  const DEFAULT_NAV = [
    { view: 'summary',  icon: '📊', label: 'Summary' },
    { view: 'dues',     icon: '🤝', label: 'Dues' },
    { view: 'accounts', icon: '🏦', label: 'Finance' },
    { view: 'settings', icon: '⚙️', label: 'Settings' }
  ];

  function loadNavOrder() {
    try {
      const saved = localStorage.getItem(NAV_ORDER_KEY);
      return saved ? JSON.parse(saved) : [...DEFAULT_NAV];
    } catch { return [...DEFAULT_NAV]; }
  }

  function saveNavOrder(order) {
    localStorage.setItem(NAV_ORDER_KEY, JSON.stringify(order));
  }

  function applyNavOrder(order) {
    const nav = document.getElementById('floatingNav');
    if (!nav) return;
    // Move buttons (not fab-outer) into new order
    const fabOuter = nav.querySelector('.fab-outer');
    const btns = Array.from(nav.querySelectorAll('.fn-item'));

    // Remove all fn-items first
    btns.forEach(b => b.remove());

    // Insert in new order, always with fab in center (after 2nd item)
    order.forEach((item, i) => {
      const btn = document.querySelector(`.fn-item[data-view="${item.view}"]`) || createNavBtn(item);
      // Re-insert icon/label in case they were added
      const iconEl = btn.querySelector('.fn-icon');
      const labelEl = btn.querySelector('.fn-label');
      if (iconEl) iconEl.textContent = item.icon;
      if (labelEl) labelEl.textContent = item.label;

      if (i === 2) nav.insertBefore(fabOuter, nav.lastChild.nextSibling);  // Insert fab before 3rd
      nav.appendChild(btn);
      if (i === 1) nav.insertBefore(fabOuter, btn.nextSibling); // fab after 2nd item
    });
  }

  function createNavBtn(item) {
    const btn = document.createElement('button');
    btn.className = 'fn-item';
    btn.dataset.view = item.view;
    btn.title = item.label;
    btn.innerHTML = `<span class="fn-icon">${item.icon}</span><span class="fn-label">${item.label}</span>`;
    return btn;
  }

  function renderNavOrderList(order) {
    const list = document.getElementById('navOrderList');
    if (!list) return;
    list.innerHTML = '';
    order.forEach((item, i) => {
      const row = document.createElement('div');
      row.className = 'nav-order-item';
      row.innerHTML = `
        <span class="nav-order-icon">${item.icon}</span>
        <span class="nav-order-label">${item.label}</span>
        <div class="nav-order-arrows">
          <button ${i === 0 ? 'disabled' : ''} data-dir="up" data-idx="${i}">▲</button>
          <button ${i === order.length - 1 ? 'disabled' : ''} data-dir="down" data-idx="${i}">▼</button>
        </div>
      `;
      list.appendChild(row);
    });

    list.querySelectorAll('[data-dir]').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = parseInt(btn.dataset.idx);
        const dir = btn.dataset.dir;
        const order = loadNavOrder();
        if (dir === 'up' && idx > 0) [order[idx - 1], order[idx]] = [order[idx], order[idx - 1]];
        if (dir === 'down' && idx < order.length - 1) [order[idx], order[idx + 1]] = [order[idx + 1], order[idx]];
        saveNavOrder(order);
        renderNavOrderList(order);
        applyNavOrder(order);
        window.MT.ui?.showToast(`Moved ${order[dir === 'up' ? idx - 1 : idx + 1]?.label || 'item'}`);
      });
    });
  }

  function initNavOrder() {
    const order = loadNavOrder();
    renderNavOrderList(order);
    applyNavOrder(order);

    document.getElementById('resetNavOrderBtn')?.addEventListener('click', () => {
      localStorage.removeItem(NAV_ORDER_KEY);
      const fresh = [...DEFAULT_NAV];
      renderNavOrderList(fresh);
      applyNavOrder(fresh);
      window.MT.ui?.showToast('Nav order reset to default');
    });

    // Finance sub-tabs
    makeTabOrderUI({
      listId: 'financeTabOrderList',
      resetBtnId: 'resetFinanceTabOrderBtn',
      storageKey: 'mt_finance_tab_order',
      defaults: [
        { target: 'finance-accounts', icon: '🏦', label: 'Balances' },
        { target: 'finance-statement', icon: '📄', label: 'Statement' },
        { target: 'finance-petrol',   icon: '⛽', label: 'Petrol Log' }
      ],
      applyFn: applyFinanceTabOrder
    });

    // Settings sub-tabs
    makeTabOrderUI({
      listId: 'settingsTabOrderList',
      resetBtnId: 'resetSettingsTabOrderBtn',
      storageKey: 'mt_settings_tab_order',
      defaults: [
        { target: 'stab-general',  icon: '⚙️', label: 'General' },
        { target: 'stab-payments', icon: '💳', label: 'Payments' },
        { target: 'stab-data',     icon: '📦', label: 'Data & Sync' },
        { target: 'stab-user',     icon: '👤', label: 'User Profile' }
      ],
      applyFn: applySettingsTabOrder
    });

    // General tab internal sections
    makeTabOrderUI({
      listId: 'generalSectionsOrderList',
      resetBtnId: 'resetGeneralSectionsOrderBtn',
      storageKey: 'mt_general_sections_order',
      defaults: [
        { target: 'gs-customization', icon: '🎨', label: 'App Customization' },
        { target: 'gs-presets',       icon: '⚡', label: 'Quick Action Prefills' },
        { target: 'gs-categories',    icon: '🏷️', label: 'Categories' },
        { target: 'gs-reminders',     icon: '🔔', label: 'Daily Reminders' },
        { target: 'gs-taborder',      icon: '🗂️', label: 'Tab & Nav Order' }
      ],
      applyFn: applyGeneralSectionsOrder
    });

    window.addEventListener('mt:view-changed', () => renderNavOrderList(loadNavOrder()));
  }

  /* ────────────────────────────────────────────────
     Generic tab-order helper — supports drag-and-drop (pointer events) + ▲▼ fallback
  ──────────────────────────────────────────────── */

  /* ── Reusable drag-and-drop for any ordered list ── */
  function attachDragSort(listEl, getOrder, setOrder) {
    let dragging = null;   // the DOM row being dragged
    let dragIdx  = -1;     // original index
    let dropIdx  = -1;     // where it will land
    let startY   = 0;
    let ghost    = null;   // floating clone
    let indicator = null;  // blue drop line

    function createIndicator() {
      const el = document.createElement('div');
      el.style.cssText = `height:3px; background:var(--accent); border-radius:4px;
        margin:2px 0; transition:opacity 0.1s; pointer-events:none;`;
      return el;
    }

    function getRows() { return Array.from(listEl.querySelectorAll('.nav-order-item')); }

    function rowIndexAt(clientY) {
      const rows = getRows();
      for (let i = 0; i < rows.length; i++) {
        const r = rows[i].getBoundingClientRect();
        if (clientY < r.top + r.height / 2) return i;
      }
      return rows.length;
    }

    function beginDrag(row, idx, clientY) {
      dragging = row;
      dragIdx  = idx;
      dropIdx  = idx;
      startY   = clientY;

      // Ghost (floating clone)
      ghost = row.cloneNode(true);
      ghost.style.cssText = `
        position:fixed; left:${row.getBoundingClientRect().left}px;
        top:${row.getBoundingClientRect().top}px;
        width:${row.offsetWidth}px; z-index:9999;
        background:var(--card-hover); border:2px solid var(--accent);
        border-radius:10px; box-shadow:0 8px 30px rgba(0,0,0,0.4);
        opacity:0.95; pointer-events:none; transition:none;
        transform:scale(1.03);
      `;
      document.body.appendChild(ghost);

      // Indicator line
      indicator = createIndicator();
      listEl.insertBefore(indicator, row);

      row.style.opacity = '0.3';
      row.style.pointerEvents = 'none';
    }

    function moveDrag(clientY) {
      if (!ghost || !dragging) return;
      const dy = clientY - startY;
      ghost.style.top = (parseFloat(ghost.style.top) + dy) + 'px';
      startY = clientY;

      const newIdx = rowIndexAt(clientY);
      if (newIdx !== dropIdx) {
        dropIdx = newIdx;
        const rows = getRows().filter(r => r !== dragging);
        const insertBefore = rows[dropIdx] || null;
        listEl.insertBefore(indicator, insertBefore);
      }
    }

    function endDrag() {
      if (!dragging) return;
      ghost?.remove(); ghost = null;
      indicator?.remove(); indicator = null;
      dragging.style.opacity = '';
      dragging.style.pointerEvents = '';

      if (dropIdx !== dragIdx && dropIdx !== dragIdx + 1) {
        const order = getOrder();
        const item = order.splice(dragIdx, 1)[0];
        const insertAt = dropIdx > dragIdx ? dropIdx - 1 : dropIdx;
        order.splice(insertAt, 0, item);
        setOrder(order);
      }
      dragging = null; dragIdx = -1; dropIdx = -1;
    }

    // Wire pointer events on the handle
    listEl.addEventListener('pointerdown', e => {
      const handle = e.target.closest('.drag-handle');
      if (!handle) return;
      const row = handle.closest('.nav-order-item');
      const rows = getRows();
      const idx = rows.indexOf(row);
      if (idx < 0) return;
      e.preventDefault();
      listEl.setPointerCapture(e.pointerId);
      beginDrag(row, idx, e.clientY);
    });

    listEl.addEventListener('pointermove', e => {
      if (!dragging) return;
      e.preventDefault();
      moveDrag(e.clientY);
    });

    listEl.addEventListener('pointerup',     () => endDrag());
    listEl.addEventListener('pointercancel', () => endDrag());
  }

  function makeTabOrderUI({ listId, resetBtnId, storageKey, defaults, applyFn }) {
    function load() {
      try { const s = localStorage.getItem(storageKey); return s ? JSON.parse(s) : [...defaults]; }
      catch { return [...defaults]; }
    }
    function save(o) { localStorage.setItem(storageKey, JSON.stringify(o)); }

    function renderList(order) {
      const list = document.getElementById(listId);
      if (!list) return;
      list.innerHTML = '';
      order.forEach((item, i) => {
        const row = document.createElement('div');
        row.className = 'nav-order-item';
        row.innerHTML = `
          <span class="drag-handle" title="Drag to reorder" style="
            cursor:grab; font-size:18px; color:var(--muted); padding:0 4px;
            touch-action:none; user-select:none; line-height:1;">⠿</span>
          <span class="nav-order-icon">${item.icon}</span>
          <span class="nav-order-label">${item.label}</span>
          <div class="nav-order-arrows">
            <button ${i === 0 ? 'disabled' : ''} data-dir="up" data-idx="${i}">▲</button>
            <button ${i === order.length - 1 ? 'disabled' : ''} data-dir="down" data-idx="${i}">▼</button>
          </div>
        `;
        list.appendChild(row);
      });

      // ▲▼ button clicks
      list.querySelectorAll('[data-dir]').forEach(btn => {
        btn.addEventListener('click', () => {
          const idx = parseInt(btn.dataset.idx);
          const dir = btn.dataset.dir;
          const o = load();
          if (dir === 'up' && idx > 0) [o[idx - 1], o[idx]] = [o[idx], o[idx - 1]];
          if (dir === 'down' && idx < o.length - 1) [o[idx], o[idx + 1]] = [o[idx + 1], o[idx]];
          save(o); renderList(o); applyFn(o);
          window.MT.ui?.showToast('Moved ✓');
        });
      });

      // Drag-and-drop
      attachDragSort(list, load, (newOrder) => {
        save(newOrder); renderList(newOrder); applyFn(newOrder);
        window.MT.ui?.showToast('Reordered ✓');
      });
    }

    const initial = load();
    renderList(initial);
    applyFn(initial);

    document.getElementById(resetBtnId)?.addEventListener('click', () => {
      localStorage.removeItem(storageKey);
      const fresh = [...defaults];
      renderList(fresh); applyFn(fresh);
      window.MT.ui?.showToast('Order reset');
    });
  }

  /* Apply Finance sub-tab order */
  function applyFinanceTabOrder(order) {
    const tabBar = document.querySelector('#view-accounts .finance-tab-bar');
    if (!tabBar) return;
    // Reorder tab buttons
    order.forEach(item => {
      const btn = tabBar.querySelector(`[data-target="${item.target}"]`);
      if (btn) tabBar.appendChild(btn); // move to end = new order
    });
    // Reorder panel visibility (don't change display, just DOM order for first-active logic)
    const container = document.getElementById('view-accounts');
    if (!container) return;
    order.forEach(item => {
      const panel = document.getElementById(item.target);
      if (panel) container.appendChild(panel);
    });
  }

  /* Apply Settings sub-tab order */
  function applySettingsTabOrder(order) {
    const tabBar = document.querySelector('.settings-tab-bar');
    if (!tabBar) return;
    order.forEach(item => {
      const btn = tabBar.querySelector(`[data-stab="${item.target}"]`);
      if (btn) tabBar.appendChild(btn);
    });
    const settingsView = document.getElementById('view-settings');
    if (!settingsView) return;
    order.forEach(item => {
      const panel = document.getElementById(item.target);
      if (panel) settingsView.appendChild(panel);
    });
  }

  /* Apply General tab internal sections order */
  function applyGeneralSectionsOrder(order) {
    const container = document.getElementById('stab-general');
    if (!container) return;
    order.forEach(item => {
      const section = document.getElementById(item.target);
      if (section) container.appendChild(section);
    });
  }

})();
