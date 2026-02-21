'use strict';
/* recurring.js
   Full-featured recurring transaction scheduler.
   - CRUD for recurring rules (stored under store.recurring[])
   - Auto-applies due entries on app load (mt:auth-entered)
   - UI lives in the Settings view under a dedicated section
   Depends on window.MT.db, window.MT.ui
*/

(function () {

  const RECURRING_KEY = 'mt_recurring_v1';

  /* ---- STORAGE ---- */
  function loadRecurring() {
    try {
      const r = localStorage.getItem(RECURRING_KEY);
      return r ? JSON.parse(r) : [];
    } catch { return []; }
  }
  function saveRecurring(list) {
    localStorage.setItem(RECURRING_KEY, JSON.stringify(list));
  }

  /* ---- DATE HELPERS ---- */
  function todayISO() {
    const d = new Date();
    return new Date(d - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
  }
  function addDays(iso, n) {
    const d = new Date(iso + 'T00:00:00');
    d.setDate(d.getDate() + n);
    return d.toISOString().slice(0, 10);
  }
  function nextDueDate(rule) {
    // Returns the next ISO date this rule should fire
    const freq = rule.frequency;
    const last = rule.lastApplied || rule.startDate;
    const d = new Date(last + 'T00:00:00');

    switch (freq) {
      case 'daily': d.setDate(d.getDate() + 1); break;
      case 'weekly': d.setDate(d.getDate() + 7); break;
      case 'monthly': d.setMonth(d.getMonth() + 1); break;
      case 'yearly': d.setFullYear(d.getFullYear() + 1); break;
      default: d.setMonth(d.getMonth() + 1);
    }
    return d.toISOString().slice(0, 10);
  }

  function getDueDate(rule) {
    if (!rule.lastApplied) return rule.startDate;
    return nextDueDate(rule);
  }

  function daysUntil(iso) {
    const today = new Date(todayISO() + 'T00:00:00');
    const target = new Date(iso + 'T00:00:00');
    return Math.round((target - today) / 86400000);
  }

  /* ---- AUTO-APPLY on load ---- */
  function applyDueRecurring() {
    const db = window.MT.db;
    if (!db) return;

    const list = loadRecurring();
    if (!list.length) return;

    const today = todayISO();
    let applied = 0;

    list.forEach(rule => {
      if (!rule.active) return;
      const due = getDueDate(rule);
      if (due > today) return; // not yet due

      // Could be multiple missed periods - apply up to today
      let cursor = due;
      while (cursor <= today) {
        // Create entry in the store
        const store = db.loadStore();
        if (!store.days[cursor]) store.days[cursor] = [];
        const entry = {
          id: Date.now() + Math.random(),
          dateStr: cursor,
          type: rule.type,
          description: rule.description,
          category: rule.category || '',
          payMethod: rule.payMethod || 'Cash',
          paySubType: '',
          amount: rule.amount,
          note: `🔁 Auto-added recurring: ${rule.description}`,
          createdAt: new Date().toISOString(),
          split: null,
          isRecurring: true
        };
        store.days[cursor].push(entry);
        db.saveStore(store);
        rule.lastApplied = cursor;
        applied++;

        // Advance to next period
        const next = nextDueDate({ ...rule, lastApplied: cursor });
        if (next <= cursor) break; // safety guard
        cursor = next;
      }
    });

    if (applied > 0) {
      saveRecurring(list);
      window.dispatchEvent(new Event('mt:entries-changed'));
      window.MT.ui?.showToast(`🔁 ${applied} recurring transaction${applied > 1 ? 's' : ''} added`);
    }
  }

  /* ---- UI RENDERING ---- */
  function getContainer() {
    return document.getElementById('recurringContainer');
  }

  function freqLabel(f) {
    return { daily: 'Daily', weekly: 'Weekly', monthly: 'Monthly', yearly: 'Yearly' }[f] || f;
  }

  function renderRecurringUI() {
    const container = getContainer();
    if (!container) return;

    const list = loadRecurring();
    const db = window.MT.db;
    const todayStr = todayISO();

    let html = `
      <div class="recurring-list" id="recurringList">
        ${list.length === 0 ? `
          <div class="recurring-empty">
            <span>🔁</span>
            No recurring transactions yet.<br>
            Add one below to auto-post on schedule.
          </div>
        ` : list.map((rule, idx) => {
      const dueISO = getDueDate(rule);
      const days = daysUntil(dueISO);
      let badgeClass = 'next-badge';
      let badgeText = '';
      if (days < 0) {
        badgeClass += ' overdue';
        badgeText = `Overdue ${Math.abs(days)}d`;
      } else if (days === 0) {
        badgeClass += ' due-today';
        badgeText = 'Due today';
      } else {
        badgeText = `In ${days}d`;
      }
      const amtClass = rule.type === 'Income' ? 'income' : 'expense';
      const icon = rule.type === 'Income' ? '💰' : '💸';
      const amtSign = rule.type === 'Income' ? '+' : '-';
      const sym = db?.loadCustom().currency || '₹';

      return `
          <div class="recurring-item ${rule.active ? '' : 'opacity-50'}" data-idx="${idx}">
            <div class="recurring-icon">${icon}</div>
            <div class="recurring-info">
              <div class="recurring-title">${rule.description || 'Untitled'}</div>
              <div class="recurring-meta">
                <span class="freq-tag">${freqLabel(rule.frequency)}</span>
                <span>${rule.category || 'No category'}</span>
                <span class="entry-meta-dot">•</span>
                <span>${rule.payMethod || 'Cash'}</span>
                <span class="entry-meta-dot">•</span>
                <span ${!rule.active ? 'style="color:var(--danger)"' : ''}>${rule.active ? 'Active' : 'Paused'}</span>
              </div>
            </div>
            <div style="display:flex;flex-direction:column;align-items:flex-end;gap:6px;">
              <span class="recurring-amount ${amtClass}">${amtSign}${sym}${Number(rule.amount).toFixed(2)}</span>
              <span class="${badgeClass}">${badgeText}</span>
            </div>
            <div class="recurring-actions">
              <button class="btn-small" onclick="window.MT.recurring.toggleActive(${idx})">${rule.active ? '⏸' : '▶'}</button>
              <button class="btn-small" onclick="window.MT.recurring.deleteRule(${idx})" style="color:var(--danger)">🗑</button>
            </div>
          </div>
          `;
    }).join('')}
      </div>

      <div style="margin-top:20px;">
        <div class="section-title">Add Recurring Transaction</div>
        <div class="recurring-add-form" style="margin-top:12px;">
          <div>
            <label>Description</label>
            <input id="recurDesc" placeholder="e.g. Rent, Salary..." />
          </div>
          <div>
            <label>Amount</label>
            <input id="recurAmount" type="number" min="0" step="0.01" placeholder="0.00" />
          </div>
          <div>
            <label>Type</label>
            <select id="recurType">
              <option value="Expense">Expense</option>
              <option value="Income">Income</option>
            </select>
          </div>
          <div>
            <label>Category</label>
            <input id="recurCategory" placeholder="Food, Bills..." />
          </div>
          <div>
            <label>Frequency</label>
            <select id="recurFreq">
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly" selected>Monthly</option>
              <option value="yearly">Yearly</option>
            </select>
          </div>
          <div>
            <label>Start date</label>
            <input id="recurStart" type="date" />
          </div>
          <div>
            <label>Payment</label>
            <select id="recurPayMethod">
              <option>Cash</option>
              <option>UPI</option>
              <option>Card</option>
              <option>Bank</option>
            </select>
          </div>
        </div>
        <div style="margin-top:12px;">
          <button class="btn-primary" onclick="window.MT.recurring.addRule()">
            + Add Recurring
          </button>
        </div>
        <div id="recurStatus" class="modal-status"></div>
      </div>
    `;

    container.innerHTML = html;

    // Set today as default start date
    const startEl = document.getElementById('recurStart');
    if (startEl) startEl.value = todayStr;
  }

  /* ---- CRUD ACTIONS ---- */
  function addRule() {
    const desc = document.getElementById('recurDesc')?.value.trim();
    const amount = parseFloat(document.getElementById('recurAmount')?.value) || 0;
    const type = document.getElementById('recurType')?.value || 'Expense';
    const category = document.getElementById('recurCategory')?.value.trim() || '';
    const frequency = document.getElementById('recurFreq')?.value || 'monthly';
    const startDate = document.getElementById('recurStart')?.value;
    const payMethod = document.getElementById('recurPayMethod')?.value || 'Cash';
    const statusEl = document.getElementById('recurStatus');

    if (!desc) { if (statusEl) statusEl.textContent = '⚠️ Description required'; return; }
    if (!amount || amount <= 0) { if (statusEl) statusEl.textContent = '⚠️ Enter a valid amount'; return; }
    if (!startDate) { if (statusEl) statusEl.textContent = '⚠️ Start date required'; return; }

    const list = loadRecurring();
    list.push({
      id: Date.now(),
      description: desc,
      amount,
      type,
      category,
      frequency,
      startDate,
      payMethod,
      lastApplied: null,
      active: true,
      createdAt: new Date().toISOString()
    });
    saveRecurring(list);
    window.MT.ui?.showToast('Recurring transaction added');
    renderRecurringUI();
  }

  function deleteRule(idx) {
    if (!confirm('Delete this recurring transaction?')) return;
    const list = loadRecurring();
    list.splice(idx, 1);
    saveRecurring(list);
    renderRecurringUI();
  }

  function toggleActive(idx) {
    const list = loadRecurring();
    if (!list[idx]) return;
    list[idx].active = !list[idx].active;
    saveRecurring(list);
    renderRecurringUI();
  }

  /* ---- INIT ---- */
  window.MT = window.MT || {};
  window.MT.recurring = {
    loadRecurring, saveRecurring,
    applyDueRecurring, renderRecurringUI,
    addRule, deleteRule, toggleActive,
    getDueDate, daysUntil
  };

  // Auto-apply on login
  window.addEventListener('mt:auth-entered', () => {
    applyDueRecurring();

    // Render UI when settings view opens
    window.addEventListener('mt:view-changed', (e) => {
      if (e.detail?.viewName === 'settings') renderRecurringUI();
    });
  });

})();
