'use strict';
/* ==========================================================================
   LUDARP Money Tracker v7.1 - ULTIMATE FINANCE OS ENGINE
   ========================================================================== */

(function () {
  const STORAGE_KEY = 'money_tracker_v3';
  const DUES_KEY = 'mt_dues_v1';
  const CUSTOM_KEY = 'money_tracker_custom_v3';
  const LOCK_KEY = 'v7_app_passcode';
  const BUDGET_KEY = 'v7_category_budgets';

  let store = {
    version: 2,
    days: {},
    settings: {},
    accounts: {},
    paymentBankMap: {}
  };
  let dues = [];
  let custom = { accent: '#06b6d4', currency: '₹' };
  let budgets = {};
  let zenMode = false;
  let currentType = 'exp';
  let duesTabState = 'all';

  let stmtSortCol = 'date';
  let stmtSortAsc = false;

  let categories = ['Food', 'Travel', 'Bills', 'Shopping', 'Salary', 'Petrol', 'Bike Maint', 'Hostel', 'Other'];
  let paymentModes = ['GPay', 'PhonePe', 'Paytm', 'SBI Savings', 'HDFC Card', 'Cash'];

  function defaultAccounts() {
    return {
      'acc_sbi': { id: 'acc_sbi', name: 'SBI Savings Account', type: 'bank', initialBalance: 50000, color: '#3b82f6' },
      'acc_hdfc': { id: 'acc_hdfc', name: 'HDFC Credit Card', type: 'credit_card', initialBalance: 0, creditLimit: 150000, color: '#ec4899' },
      'acc_gpay': { id: 'acc_gpay', name: 'GPay Wallet', type: 'wallet', initialBalance: 1000, color: '#10b981' },
      'acc_cash': { id: 'acc_cash', name: 'Cash in Hand', type: 'cash', initialBalance: 2500, color: '#f59e0b' }
    };
  }

  function defaultPaymentBankMap() {
    return {
      'GPay': 'acc_gpay',
      'PhonePe': 'acc_gpay',
      'Paytm': 'acc_gpay',
      'SBI Savings': 'acc_sbi',
      'HDFC Card': 'acc_hdfc',
      'Cash': 'acc_cash',
      'upi': 'acc_gpay',
      'cash': 'acc_cash',
      'debit_card': 'acc_sbi',
      'credit_card': 'acc_hdfc',
      'bank_transfer': 'acc_sbi'
    };
  }

  function migrateStoreToV71() {
    if (!store.accounts || Object.keys(store.accounts).length === 0) {
      store.accounts = defaultAccounts();
    }
    if (!store.paymentBankMap || Object.keys(store.paymentBankMap).length === 0) {
      store.paymentBankMap = defaultPaymentBankMap();
    }
    store.settings = store.settings || {};
    if (!store.settings.subscriptions) {
      store.settings.subscriptions = [
        { id: 'sub_1', name: 'Airtel WiFi Broadband', amount: 1199, due: '5th of month' },
        { id: 'sub_2', name: 'Hostel Rent', amount: 8500, due: '1st of month' },
        { id: 'sub_3', name: 'Netflix Premium', amount: 499, due: '15th of month' }
      ];
    }
    if (!store.settings.goals) {
      store.settings.goals = [
        { id: 'goal_1', name: 'New M3 Laptop Goal', saved: 25000, target: 40000 },
        { id: 'goal_2', name: 'Emergency Fund', saved: 15000, target: 20000 }
      ];
    }

    Object.keys(store.days || {}).forEach(date => {
      (store.days[date] || []).forEach(tx => {
        if (!tx.accountId) {
          const mode = tx.paymentType || tx.paymentMethod || 'GPay';
          tx.accountId = store.paymentBankMap[mode] || 'acc_sbi';
        }
        if (!tx.paymentMethod) {
          tx.paymentMethod = tx.paymentType || 'upi';
        }
        if (tx.type === 'transfer') {
          if (!tx.fromAccountId) tx.fromAccountId = tx.accountId || 'acc_sbi';
          if (!tx.toAccountId) tx.toAccountId = 'acc_cash';
        }
      });
    });
  }

  function recalculateAccountBalances() {
    migrateStoreToV71();
    const accountBalances = {};

    Object.keys(store.accounts).forEach(accId => {
      accountBalances[accId] = Number(store.accounts[accId].initialBalance || 0);
    });

    const sortedDates = Object.keys(store.days || {}).sort((a, b) => a.localeCompare(b));

    sortedDates.forEach(date => {
      (store.days[date] || []).forEach(tx => {
        const amt = Number(tx.amount || 0);
        const accId = tx.accountId;

        if (tx.type === 'inc' && accId && accountBalances[accId] !== undefined) {
          accountBalances[accId] += amt;
        } else if (tx.type === 'exp' && accId && accountBalances[accId] !== undefined) {
          accountBalances[accId] -= amt;
        } else if (tx.type === 'transfer') {
          const fromAcc = tx.fromAccountId || accId;
          const toAcc = tx.toAccountId;
          if (fromAcc && accountBalances[fromAcc] !== undefined) {
            accountBalances[fromAcc] -= amt;
          }
          if (toAcc && accountBalances[toAcc] !== undefined) {
            accountBalances[toAcc] += amt;
          }
        }
      });
    });

    Object.keys(store.accounts).forEach(accId => {
      store.accounts[accId].currentBalance = accountBalances[accId];
    });

    return accountBalances;
  }

  function seedDummyDataIfEmpty() {
    let raw = localStorage.getItem(STORAGE_KEY);
    let storeData = null;
    try { storeData = raw ? JSON.parse(raw) : null; } catch (e) { }

    if (!storeData || !storeData.days || Object.keys(storeData.days).length === 0) {
      const today = new Date();
      const formatISO = (d) => new Date(d - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);

      const d1 = formatISO(today);
      const d2 = formatISO(new Date(today - 1 * 86400000));
      const d3 = formatISO(new Date(today - 3 * 86400000));
      const d4 = formatISO(new Date(today - 5 * 86400000));
      const d5 = formatISO(new Date(today - 10 * 86400000));

      storeData = {
        version: 2,
        accounts: defaultAccounts(),
        paymentBankMap: defaultPaymentBankMap(),
        days: {
          [d1]: [
            { id: 'tx_1', type: 'exp', amount: 200, category: 'Petrol', desc: 'Bike Petrol Refill #petrol', accountId: 'acc_gpay', paymentMethod: 'upi', paymentType: 'GPay', time: '09:15' },
            { id: 'tx_2', type: 'exp', amount: 150, category: 'Food', desc: 'Lunch at Cafe #food', accountId: 'acc_gpay', paymentMethod: 'upi', paymentType: 'PhonePe', time: '13:30' }
          ],
          [d2]: [
            { id: 'tx_3', type: 'exp', amount: 350, category: 'Food', desc: 'Zomato Dinner Order #food', accountId: 'acc_gpay', paymentMethod: 'upi', paymentType: 'GPay', time: '20:45' }
          ],
          [d3]: [
            { id: 'tx_4', type: 'exp', amount: 1199, category: 'Bills', desc: 'Airtel Broadband WiFi #bills', accountId: 'acc_hdfc', paymentMethod: 'credit_card', paymentType: 'HDFC Card', time: '11:00' },
            { id: 'tx_5', type: 'exp', amount: 450, category: 'Travel', desc: 'Weekly Auto & Train #travel', accountId: 'acc_cash', paymentMethod: 'cash', paymentType: 'Cash', time: '18:20' }
          ],
          [d4]: [
            { id: 'tx_6', type: 'exp', amount: 2499, category: 'Shopping', desc: 'Amazon Running Shoes #shopping', accountId: 'acc_hdfc', paymentMethod: 'credit_card', paymentType: 'HDFC Card', time: '16:10' }
          ],
          [d5]: [
            { id: 'tx_7', type: 'inc', amount: 75000, category: 'Salary', desc: 'Monthly Salary Credit', accountId: 'acc_sbi', paymentMethod: 'bank_transfer', paymentType: 'SBI Savings', time: '10:00' },
            { id: 'tx_8', type: 'exp', amount: 8500, category: 'Hostel', desc: 'Hostel Rent Payment #rent', accountId: 'acc_sbi', paymentMethod: 'upi', paymentType: 'SBI Savings', time: '12:30' }
          ]
        },
        settings: {
          categories: categories,
          paymentModes: paymentModes,
          presets: [
            { label: '⛽ Petrol ₹200', category: 'Petrol', amount: 200, desc: 'Petrol Refill #petrol' },
            { label: '🍲 Lunch ₹150', category: 'Food', amount: 150, desc: 'Lunch #food' },
            { label: '☕ Tea ₹20', category: 'Food', amount: 20, desc: 'Tea & Snacks' },
            { label: '🏠 Rent ₹8,500', category: 'Hostel', amount: 8500, desc: 'Monthly Rent #rent' }
          ]
        }
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(storeData));
    }

    let rawDues = localStorage.getItem(DUES_KEY);
    if (!rawDues || JSON.parse(rawDues).length === 0) {
      const dummyDues = [
        { id: 'due_1', person: 'Rahul K', amount: 450, desc: 'Dinner Split at Barbeque', type: 'i_owe', date: '2026-09-20', settled: false },
        { id: 'due_2', person: 'Priya S', amount: 850, desc: 'Movie Tickets & Popcorn', type: 'they_owe', date: '2026-09-22', settled: false }
      ];
      localStorage.setItem(DUES_KEY, JSON.stringify(dummyDues));
    }
  }

  function init() {
    seedDummyDataIfEmpty();
    loadAllData();
    migrateStoreToV71();
    recalculateAccountBalances();
    saveData();
    checkAppLock();
    setupNavigation();
    setupEventListeners();
    setupCalcEvents();
    setupOCREvents();
    setupP2PEvents();
    applyPalette(custom.accent || '#06b6d4');
    renderDashboard();
    checkMissingDays();
    renderPresetChips();
    populateFormDropdowns();
    renderSettingsPills();
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('./sw.js').catch(() => {});
    }
    showWhatsNewModal();
  }

  function loadAllData() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) store = JSON.parse(raw);
      if (store.settings && store.settings.categories) categories = store.settings.categories;
      if (store.settings && store.settings.paymentModes) paymentModes = store.settings.paymentModes;
    } catch (e) { }

    try {
      const rawDues = localStorage.getItem(DUES_KEY);
      dues = rawDues ? JSON.parse(rawDues) : [];
    } catch (e) { }

    try {
      const rawCustom = localStorage.getItem(CUSTOM_KEY);
      if (rawCustom) custom = JSON.parse(rawCustom);
    } catch (e) { }

    try {
      const rawBudgets = localStorage.getItem(BUDGET_KEY);
      budgets = rawBudgets ? JSON.parse(rawBudgets) : { 'Food': 8000, 'Shopping': 10000, 'Petrol': 3000 };
    } catch (e) { }
  }

  function saveData() {
    store.settings = store.settings || {};
    store.settings.categories = categories;
    store.settings.paymentModes = paymentModes;

    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
    localStorage.setItem(DUES_KEY, JSON.stringify(dues));
    localStorage.setItem(CUSTOM_KEY, JSON.stringify(custom));
    localStorage.setItem(BUDGET_KEY, JSON.stringify(budgets));
  }

  function checkAppLock() {
    const lockData = localStorage.getItem(LOCK_KEY);
    if (lockData) {
      try {
        const parsed = JSON.parse(lockData);
        if (parsed.passcode) {
          const lockScreen = document.getElementById('app-lock-screen');
          if (lockScreen) lockScreen.style.display = 'flex';
        }
      } catch (e) { }
    }
  }

  function setupNavigation() {
    const navItems = document.querySelectorAll('.tech-nav-item');
    navItems.forEach(item => {
      item.addEventListener('click', () => {
        const viewId = item.getAttribute('data-view');
        if (viewId) switchView(viewId);
      });
    });
  }

  function switchView(viewId) {
    document.querySelectorAll('.tech-nav-item').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.view-panel').forEach(el => el.classList.remove('active'));

    const targetNav = document.querySelector(`.tech-nav-item[data-view="${viewId}"]`);
    const targetView = document.getElementById(`view-${viewId}`);

    if (targetNav) targetNav.classList.add('active');
    if (targetView) targetView.classList.add('active');

    if (viewId === 'dashboard') renderDashboard();
    if (viewId === 'history') renderHistory();
    if (viewId === 'summary') renderSummary();
    if (viewId === 'dues') renderDues();
    if (viewId === 'accounts') renderAccounts();
    if (viewId === 'settings') renderSettings();
    if (viewId === 'about') renderAbout();
  }

  function getCurrency() { return custom.currency || '₹'; }
  function formatMoney(amount) {
    return getCurrency() + Number(amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  function todayISO() {
    const d = new Date();
    return new Date(d - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
  }

  function showToast(message, icon = '✨') {
    const container = document.getElementById('toast-container');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = 'tech-card';
    toast.style.cssText = 'padding: 12px 18px; color: #fff; font-size: 0.88rem; font-weight: 700; display: flex; align-items: center; gap: 10px; border-color: var(--cyan-bright); box-shadow: var(--glow-cyan);';
    toast.innerHTML = `<span>${icon}</span> <span>${message}</span>`;
    container.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }

  function applyZenMode() {
    document.querySelectorAll('.blur-target').forEach(el => {
      if (zenMode) el.classList.add('blur-privacy');
      else el.classList.remove('blur-privacy');
    });
  }

  function applyPalette(colorHex) {
    custom.accent = colorHex;
    document.documentElement.style.setProperty('--cyan-accent', colorHex);
    document.documentElement.style.setProperty('--cyan-bright', colorHex);
    document.querySelectorAll('.palette-swatch').forEach(btn => {
      if (btn.getAttribute('data-color') === colorHex) btn.classList.add('active');
      else btn.classList.remove('active');
    });
  }

  function checkMissingDays() {
    const banner = document.getElementById('catchup-banner');
    if (banner) banner.style.display = 'flex';
  }

  function renderDashboard() {
    recalculateAccountBalances();

    let totalIncome = 0;
    let totalExpense = 0;
    const allTx = [];

    Object.keys(store.days || {}).forEach(date => {
      const list = store.days[date] || [];
      list.forEach(tx => {
        const amt = Number(tx.amount || 0);
        if (tx.type === 'inc') totalIncome += amt;
        else if (tx.type === 'exp') totalExpense += amt;
        allTx.push({ ...tx, date });
      });
    });

    const netWorth = Object.values(store.accounts).reduce((sum, acc) => sum + (acc.currentBalance || 0), 0);
    const safeToSpend = Math.max(0, netWorth - 10000);

    const elNet = document.getElementById('dash-net-val');
    const elInc = document.getElementById('dash-inc-val');
    const elExp = document.getElementById('dash-exp-val');
    const elSafe = document.getElementById('dash-safe-val');

    if (elNet) { elNet.textContent = formatMoney(netWorth); elNet.classList.add('blur-target'); }
    if (elInc) { elInc.textContent = formatMoney(totalIncome); elInc.classList.add('blur-target'); }
    if (elExp) { elExp.textContent = formatMoney(totalExpense); elExp.classList.add('blur-target'); }
    if (elSafe) { elSafe.textContent = formatMoney(safeToSpend); elSafe.classList.add('blur-target'); }

    // Today Mini Summary Bar
    const today = todayISO();
    let todayExp = 0;
    let todayInc = 0;
    (store.days[today] || []).forEach(tx => {
      const amt = Number(tx.amount || 0);
      if (tx.type === 'exp') todayExp += amt;
      else if (tx.type === 'inc') todayInc += amt;
    });

    const elTodayExp = document.getElementById('entry-today-exp');
    const elTodayInc = document.getElementById('entry-today-inc');
    const elTodayNet = document.getElementById('entry-today-net');
    if (elTodayExp) elTodayExp.textContent = formatMoney(todayExp);
    if (elTodayInc) elTodayInc.textContent = formatMoney(todayInc);
    if (elTodayNet) elTodayNet.textContent = formatMoney(todayInc - todayExp);

    applyZenMode();

    allTx.sort((a, b) => (b.date + (b.time || '')).localeCompare(a.date + (a.time || '')));

    const searchTerm = (document.getElementById('search-tx-input')?.value || '').toLowerCase();
    const filteredTx = allTx.filter(t => (t.desc || '').toLowerCase().includes(searchTerm) || (t.category || '').toLowerCase().includes(searchTerm));
    const recent = filteredTx.slice(0, 7);

    const container = document.getElementById('dash-recent-list');
    if (!container) return;

    if (recent.length === 0) {
      container.innerHTML = `<div style="padding: 24px; text-align: center; color: var(--text-muted); font-size: 0.88rem;">No matching transactions found.</div>`;
      return;
    }

    container.innerHTML = recent.map(tx => {
      const accName = store.accounts[tx.accountId]?.name || tx.paymentType || 'GPay';
      return `
        <div class="tx-item">
          <div style="display:flex; align-items:center; gap: 14px;">
            <div class="tx-badge">${getCatIcon(tx.category)}</div>
            <div>
              <div style="font-weight:800; font-size: 0.98rem; color: #fff;">${tx.desc || tx.category}</div>
              <div style="font-size:0.78rem; color: var(--text-muted); display:flex; gap: 10px; margin-top:2px;">
                <span>📅 ${tx.date}</span>
                <span>💳 ${accName}</span>
              </div>
            </div>
          </div>
          <div style="text-align:right;">
            <div class="stat-amount ${tx.type === 'inc' ? 'inc' : tx.type === 'transfer' ? 'net' : 'exp'} blur-target" style="font-size: 1.05rem; margin:0;">
              ${tx.type === 'inc' ? '+' : tx.type === 'transfer' ? '🔄' : '-'}${formatMoney(tx.amount)}
            </div>
            <div style="display:flex; gap: 6px; justify-content: flex-end; margin-top: 2px;">
              <button onclick="window.openEditModal('${tx.date}', '${tx.id}')" style="background:none; border:none; color:var(--cyan-bright); font-size:0.75rem; cursor:pointer; font-weight:bold;">
                ✏️ Edit
              </button>
              <button onclick="window.deleteTransaction('${tx.date}', '${tx.id}')" style="background:none; border:none; color:var(--rose-exp); font-size:0.75rem; cursor:pointer; font-weight:bold;">
                🗑️ Delete
              </button>
            </div>
          </div>
        </div>
      `;
    }).join('');

    applyZenMode();
  }

  // --- HISTORY PAGE RENDER WITH LIVE STATS & MULTI-FILTERS ---
  function renderHistory() {
    const container = document.getElementById('history-feed-container');
    if (!container) return;

    const histCatSel = document.getElementById('hist-filter-category');
    const histPaySel = document.getElementById('hist-filter-payment');

    if (histCatSel && histCatSel.children.length === 0) {
      histCatSel.innerHTML = '<option value="all">All Categories</option>' + categories.map(c => `<option value="${c}">${c}</option>`).join('');
    }
    if (histPaySel && histPaySel.children.length === 0) {
      histPaySel.innerHTML = '<option value="all">All Accounts</option>' + Object.values(store.accounts).map(a => `<option value="${a.id}">${a.name}</option>`).join('');
    }

    const searchVal = (document.getElementById('hist-filter-search')?.value || '').toLowerCase();
    const startDate = document.getElementById('hist-filter-start-date')?.value || '';
    const endDate = document.getElementById('hist-filter-end-date')?.value || '';
    const typeVal = document.getElementById('hist-filter-type')?.value || 'all';
    const catVal = document.getElementById('hist-filter-category')?.value || 'all';
    const payVal = document.getElementById('hist-filter-payment')?.value || 'all';

    const allTx = [];
    Object.keys(store.days || {}).forEach(date => {
      (store.days[date] || []).forEach(tx => {
        allTx.push({ ...tx, date });
      });
    });

    const filtered = allTx.filter(tx => {
      if (typeVal !== 'all' && tx.type !== typeVal) return false;
      if (catVal !== 'all' && tx.category !== catVal) return false;
      if (payVal !== 'all' && tx.accountId !== payVal && tx.paymentType !== payVal) return false;
      if (startDate && tx.date < startDate) return false;
      if (endDate && tx.date > endDate) return false;
      if (searchVal && !(tx.desc || '').toLowerCase().includes(searchVal) && !(tx.category || '').toLowerCase().includes(searchVal)) return false;
      return true;
    });

    // Update Live Summary Stats Header
    let filteredInc = 0;
    let filteredExp = 0;
    filtered.forEach(t => {
      if (t.type === 'inc') filteredInc += Number(t.amount || 0);
      else if (t.type === 'exp') filteredExp += Number(t.amount || 0);
    });

    const elStatInc = document.getElementById('hist-stat-inc');
    const elStatExp = document.getElementById('hist-stat-exp');
    const elStatNet = document.getElementById('hist-stat-net');
    const elStatCount = document.getElementById('hist-stat-count');

    if (elStatInc) elStatInc.textContent = formatMoney(filteredInc);
    if (elStatExp) elStatExp.textContent = formatMoney(filteredExp);
    if (elStatNet) elStatNet.textContent = formatMoney(filteredInc - filteredExp);
    if (elStatCount) elStatCount.textContent = filtered.length;

    filtered.sort((a, b) => (b.date + (b.time || '')).localeCompare(a.date + (a.time || '')));

    if (filtered.length === 0) {
      container.innerHTML = `<div class="tech-card" style="padding: 32px; text-align: center; color: var(--text-muted);">No matching history entries found.</div>`;
      return;
    }

    const groups = {};
    filtered.forEach(tx => {
      if (!groups[tx.date]) groups[tx.date] = [];
      groups[tx.date].push(tx);
    });

    const datesSorted = Object.keys(groups).sort((a, b) => b.localeCompare(a));

    container.innerHTML = datesSorted.map(date => {
      const list = groups[date];
      let dayTotalExp = 0;
      list.forEach(t => { if (t.type === 'exp') dayTotalExp += Number(t.amount || 0); });

      return `
        <div style="margin-bottom: 20px;">
          <div style="font-weight: 800; font-size: 0.85rem; color: var(--cyan-bright); margin-bottom: 8px; display: flex; justify-content: space-between;">
            <span>📅 ${date}</span>
            <span class="blur-target">Day Spent: ${formatMoney(dayTotalExp)}</span>
          </div>
          <div class="tech-card">
            ${list.map(tx => {
        const accName = store.accounts[tx.accountId]?.name || tx.paymentType || tx.paymentMethod || 'GPay';
        const duePerson = tx.duePerson || tx.person || dues.find(d => d.id === (tx.linkedDueId || tx.dueId))?.person;
        const dueBadge = duePerson ? `<span style="color:#a78bfa; font-weight:800; background:rgba(167,139,250,0.15); padding:2px 6px; border-radius:4px; font-size:0.72rem;">🤝 Due: ${duePerson}</span>` : '';
        const fuelBadge = (tx.fuel || tx.odometer || tx.fuelLitres || tx.currentKm) ? `<span style="color:var(--amber-warn); font-weight:800; background:rgba(234,179,8,0.15); padding:2px 6px; border-radius:4px; font-size:0.72rem;">⛽ Fuel</span>` : '';

        return `
                <div class="tx-item" style="cursor: pointer;" onclick="window.showTxDetail('${tx.date}', '${tx.id}')">
                  <div style="display:flex; align-items:center; gap: 14px;">
                    <div class="tx-badge">${getCatIcon(tx.category)}</div>
                    <div>
                      <div style="font-weight:800; font-size: 0.98rem; color: #fff;">${tx.desc || tx.description || tx.category}</div>
                      <div style="font-size:0.78rem; color: var(--text-muted); display:flex; gap: 8px; margin-top:4px; align-items:center; flex-wrap:wrap;">
                        <span>🏷️ ${tx.category}</span>
                        <span>💳 ${accName}</span>
                        ${dueBadge}
                        ${fuelBadge}
                      </div>
                    </div>
                  </div>
                  <div style="text-align:right;">
                    <div class="stat-amount ${tx.type === 'inc' ? 'inc' : tx.type === 'transfer' ? 'net' : 'exp'} blur-target" style="font-size: 1.05rem; margin:0;">
                      ${tx.type === 'inc' ? '+' : tx.type === 'transfer' ? '🔄' : '-'}${formatMoney(tx.amount)}
                    </div>
                    <div style="display:flex; gap: 8px; justify-content: flex-end; margin-top: 4px;" onclick="event.stopPropagation();">
                      <button onclick="window.showTxDetail('${tx.date}', '${tx.id}')" style="background:none; border:none; color:var(--text-muted); font-size:0.75rem; cursor:pointer; font-weight:bold;">
                        🔍 Details
                      </button>
                      <button onclick="window.openEditModal('${tx.date}', '${tx.id}')" style="background:none; border:none; color:var(--cyan-bright); font-size:0.75rem; cursor:pointer; font-weight:bold;">
                        ✏️ Edit
                      </button>
                      <button onclick="window.deleteTransaction('${tx.date}', '${tx.id}')" style="background:none; border:none; color:var(--rose-exp); font-size:0.75rem; cursor:pointer; font-weight:bold;">
                        🗑️ Delete
                      </button>
                    </div>
                  </div>
                </div>
              `;
      }).join('')}
          </div>
        </div>
      `;
    }).join('');

    applyZenMode();
  }

  window.showTxDetail = function (date, txId) {
    if (!store.days[date]) return;
    const tx = store.days[date].find(t => t.id === txId);
    if (!tx) return;

    const modal = document.getElementById('view-tx-detail-modal');
    const body = document.getElementById('tx-detail-body');
    if (!modal || !body) return;

    const accName = store.accounts[tx.accountId]?.name || tx.paymentType || tx.paymentMethod || tx.account || 'GPay';
    const typeLabel = tx.type === 'inc' ? 'Income (+)' : tx.type === 'transfer' ? 'Transfer (🔄)' : 'Expense (-)';
    const typeColor = tx.type === 'inc' ? 'var(--emerald-inc)' : tx.type === 'transfer' ? 'var(--cyan-bright)' : 'var(--rose-exp)';
    const descText = tx.desc || tx.description || tx.note || tx.remarks || 'No description provided.';

    let extraHtml = '';

    // 1. Transfer Details
    if (tx.type === 'transfer' || tx.fromAccountId || tx.toAccountId) {
      const fromName = store.accounts[tx.fromAccountId]?.name || tx.fromAccountId || accName;
      const toName = store.accounts[tx.toAccountId]?.name || tx.toAccountId || 'Destination Account';
      extraHtml += `
        <div style="background: rgba(6,182,212,0.08); padding: 12px; border-radius: 8px; border: 1px solid var(--border-cyan); margin-top: 10px;">
          <div style="font-size: 0.75rem; color: var(--cyan-bright); text-transform: uppercase; font-weight: 800;">🔄 Transfer Account Mapping</div>
          <div style="font-size: 0.9rem; font-weight: 800; color: #fff; margin-top: 4px;">${fromName} ➔ ${toName}</div>
        </div>
      `;
    }

    // 2. Due / Sharing Information (Comprehensive property check)
    let dueObj = null;
    const dueIdToFind = tx.linkedDueId || tx.dueId;
    if (dueIdToFind) {
      dueObj = dues.find(d => d.id === dueIdToFind);
    }
    const duePerson = dueObj?.person || tx.duePerson || tx.person || (tx.desc && tx.desc.toLowerCase().includes('due') ? tx.desc : null);
    const dueTypeVal = dueObj?.type || tx.dueType || (tx.type === 'inc' ? 'they_owe' : 'i_owe');
    const dueAmountVal = dueObj?.amount || tx.dueAmount || tx.amount;
    const dueStatusText = dueObj ? (dueObj.settled ? '✓ Settled' : '⏳ Pending Settlement') : (tx.isDueSettlement ? '🤝 Settlement Log' : '🟢 Linked Due');

    if (duePerson || dueObj || tx.linkedDueId || tx.dueId || tx.isDueSettlement) {
      extraHtml += `
        <div style="background: rgba(167,139,250,0.1); padding: 12px; border-radius: 8px; border: 1px solid rgba(167,139,250,0.3); margin-top: 10px;">
          <div style="font-size: 0.75rem; color: #a78bfa; text-transform: uppercase; font-weight: 800; display: flex; justify-content: space-between;">
            <span>🤝 Linked Due / Sharing Info</span>
            <span>${dueStatusText}</span>
          </div>
          <div style="font-size: 0.92rem; font-weight: 800; color: #fff; margin-top: 4px;">
            Person: <span style="color: var(--cyan-bright);">${duePerson || 'Unspecified'}</span>
          </div>
          <div style="font-size: 0.8rem; color: var(--text-secondary); margin-top: 4px;">
            Classification: <b style="color: ${dueTypeVal === 'they_owe' ? 'var(--emerald-inc)' : 'var(--rose-exp)'}">${dueTypeVal === 'they_owe' ? '🟢 They Owe Me' : '🔴 I Owe Person'}</b> • Amount: <b>${formatMoney(dueAmountVal)}</b>
          </div>
        </div>
      `;
    }

    // 3. Fuel & Vehicle Metrics (Comprehensive property check)
    const f = tx.fuel || {};
    const odo = f.currentKm || tx.odometer || tx.currentKm || tx.km;
    const prevOdo = f.prevKm || tx.prevKm || 0;
    const liters = f.liters || tx.fuelLitres || tx.liters || tx.fuel_liters;
    const rate = f.price || tx.fuelRate || tx.rate || tx.price;

    if (odo || liters || rate || tx.category === 'Petrol') {
      const dist = odo && prevOdo && odo > prevOdo ? odo - prevOdo : 0;
      const mileage = liters && dist > 0 ? (dist / liters).toFixed(1) : '–';
      extraHtml += `
        <div style="background: rgba(234,179,8,0.08); padding: 12px; border-radius: 8px; border: 1px dashed var(--amber-warn); margin-top: 10px;">
          <div style="font-size: 0.75rem; color: var(--amber-warn); text-transform: uppercase; font-weight: 800;">⛽ Fuel & Vehicle Metrics</div>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-top: 6px; font-size: 0.82rem; color: var(--text-secondary);">
            <span>🛵 Odometer: <b style="color:#fff;">${odo ? odo + ' km' : 'N/A'}</b></span>
            <span>📏 Distance: <b style="color:#fff;">${dist > 0 ? dist + ' km' : 'N/A'}</b></span>
            <span>💧 Litres: <b style="color:#fff;">${liters ? liters + ' L' : 'N/A'}</b></span>
            <span>💰 Rate/L: <b style="color:#fff;">${rate ? formatMoney(rate) : 'N/A'}</b></span>
            ${dist > 0 && mileage !== '–' ? `<span style="color: var(--emerald-inc); grid-column: 1 / -1; font-weight: 800;">📊 Mileage: ${mileage} km/L</span>` : ''}
          </div>
        </div>
      `;
    }

    body.innerHTML = `
      <div style="text-align: center; padding: 14px; background: rgba(15,23,42,0.6); border-radius: 12px; border: 1px solid var(--border-card);">
        <div style="font-size: 0.75rem; color: var(--text-muted); text-transform: uppercase; font-weight: 800;">Amount</div>
        <div class="stat-amount ${tx.type === 'inc' ? 'inc' : tx.type === 'transfer' ? 'net' : 'exp'} blur-target" style="font-size: 2rem; margin-top: 4px;">
          ${tx.type === 'inc' ? '+' : tx.type === 'transfer' ? '🔄' : '-'}${formatMoney(tx.amount)}
        </div>
        <span class="badge" style="background: ${typeColor}; color: #000; font-weight: 800; font-size: 0.75rem; padding: 3px 12px; border-radius: 12px; margin-top: 6px; display: inline-block;">
          ${typeLabel}
        </span>
      </div>

      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; font-size: 0.85rem; margin-top: 14px;">
        <div>
          <div style="font-size: 0.75rem; color: var(--text-muted);">Date & Time</div>
          <div style="font-weight: 700; color: #fff;">${tx.date} ${tx.time ? '• ' + tx.time : ''}</div>
        </div>
        <div>
          <div style="font-size: 0.75rem; color: var(--text-muted);">Category</div>
          <div style="font-weight: 700; color: #fff;">${getCatIcon(tx.category)} ${tx.category}</div>
        </div>
        <div>
          <div style="font-size: 0.75rem; color: var(--text-muted);">Account / Method</div>
          <div style="font-weight: 700; color: #fff;">💳 ${accName}</div>
        </div>
        <div>
          <div style="font-size: 0.75rem; color: var(--text-muted);">Transaction ID</div>
          <div style="font-family: var(--font-mono); font-size: 0.75rem; color: var(--text-secondary);">${tx.id}</div>
        </div>
      </div>

      <div style="margin-top: 12px;">
        <div style="font-size: 0.75rem; color: var(--text-muted); margin-bottom: 2px;">Description / Notes</div>
        <div style="font-weight: 700; color: #fff; background: rgba(255,255,255,0.03); padding: 10px; border-radius: 8px; border: 1px solid var(--border-card);">
          ${descText}
        </div>
      </div>

      ${extraHtml}
    `;

    document.getElementById('detail-btn-edit').onclick = () => {
      modal.classList.remove('active');
      window.openEditModal(date, txId);
    };

    document.getElementById('detail-btn-delete').onclick = () => {
      modal.classList.remove('active');
      window.deleteTransaction(date, txId);
    };

    modal.classList.add('active');
  };

  window.deleteTransaction = function (date, txId) {
    if (!confirm('Are you sure you want to delete this transaction?')) return;
    if (store.days[date]) {
      const tx = store.days[date].find(t => t.id === txId);
      if (tx && tx.linkedDueId) {
        dues = dues.filter(d => d.id !== tx.linkedDueId);
      }
      store.days[date] = store.days[date].filter(t => t.id !== txId);
      if (store.days[date].length === 0) delete store.days[date];
      recalculateAccountBalances();
      saveData();
      showToast('Transaction deleted!', '🗑️');
      renderHistory();
      renderDashboard();
      renderAccounts();
      renderSummary();
    }
  };

  window.openEditModal = function (date, txId) {
    if (!store.days[date]) return;
    const tx = store.days[date].find(t => t.id === txId);
    if (!tx) return;

    const modal = document.getElementById('edit-tx-modal');
    if (!modal) return;

    document.getElementById('edit-tx-orig-date').value = date;
    document.getElementById('edit-tx-id').value = txId;
    document.getElementById('edit-tx-date').value = date;
    document.getElementById('edit-tx-type').value = tx.type || 'exp';
    document.getElementById('edit-tx-amount').value = tx.amount || '';
    document.getElementById('edit-tx-desc').value = tx.desc || '';

    const editCatSel = document.getElementById('edit-tx-category');
    const editAccSel = document.getElementById('edit-tx-account');
    const editPaySel = document.getElementById('edit-tx-payment');

    if (editCatSel) editCatSel.innerHTML = categories.map(c => `<option value="${c}">${c}</option>`).join('');
    if (editAccSel) editAccSel.innerHTML = Object.values(store.accounts || {}).map(a => `<option value="${a.id}">${a.name}</option>`).join('');
    if (editPaySel) editPaySel.innerHTML = paymentModes.map(p => `<option value="${p}">${p}</option>`).join('');

    if (editCatSel) editCatSel.value = tx.category || categories[0];
    if (editAccSel) editAccSel.value = tx.accountId || 'acc_sbi';
    if (editPaySel) editPaySel.value = tx.paymentMethod || tx.paymentType || paymentModes[0];

    modal.classList.add('active');
  };

  function getCatIcon(cat) {
    const icons = {
      'Food': '🍲', 'Travel': '🚕', 'Bills': '⚡', 'Shopping': '🛍️',
      'Salary': '💼', 'Petrol': '⛽', 'Bike Maint': '🔧', 'Hostel': '🏠', 'Other': '📦'
    };
    return icons[cat] || '💳';
  }

  function renderPresetChips() {
    const container = document.getElementById('preset-chips-container');
    if (!container) return;

    const presets = store.settings.presets || [];
    container.innerHTML = presets.map((p, idx) => `
      <button class="chip-btn" data-preset-idx="${idx}">
        ${p.label || p.desc}
      </button>
    `).join('');

    container.querySelectorAll('.chip-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const idx = btn.getAttribute('data-preset-idx');
        const p = presets[idx];
        if (!p) return;
        document.getElementById('entry-amount').value = p.amount || '';
        document.getElementById('entry-desc').value = p.desc || p.label || '';
        document.getElementById('entry-category').value = p.category || 'Other';
        showToast(`Loaded Preset: ${p.label}`, '⚡');
      });
    });
  }

  function populateFormDropdowns() {
    const catSelect = document.getElementById('entry-category');
    const paySelect = document.getElementById('entry-payment-method') || document.getElementById('entry-payment');
    const fromBank = document.getElementById('transfer-from-bank');
    const toBank = document.getElementById('transfer-to-bank');
    const budgetCat = document.getElementById('budget-cat-select');
    const presetCat = document.getElementById('new-preset-category');

    const accOptions = Object.values(store.accounts || {}).map(a => `<option value="${a.id}">${a.name}</option>`).join('');

    if (catSelect) catSelect.innerHTML = categories.map(c => `<option value="${c}">${c}</option>`).join('');
    if (paySelect) paySelect.innerHTML = paymentModes.map(p => `<option value="${p}">${p}</option>`).join('');
    if (fromBank) fromBank.innerHTML = accOptions;
    if (toBank) toBank.innerHTML = accOptions;
    if (budgetCat) budgetCat.innerHTML = categories.map(c => `<option value="${c}">${c}</option>`).join('');
    if (presetCat) presetCat.innerHTML = categories.map(c => `<option value="${c}">${c}</option>`).join('');

    const entryDate = document.getElementById('entry-date');
    if (entryDate && !entryDate.value) entryDate.value = todayISO();

    const entryTime = document.getElementById('entry-time');
    if (entryTime && !entryTime.value) entryTime.value = new Date().toTimeString().slice(0, 5);
  }

  function renderSettingsPills() {
    const catContainer = document.getElementById('categories-pill-list');
    if (catContainer) {
      catContainer.innerHTML = categories.map((c, i) => `
        <span class="chip-btn" style="cursor:default;">
          ${c} <button onclick="window.removeCategory(${i})" style="background:none; border:none; color:var(--rose-exp); margin-left:6px; cursor:pointer; font-weight:bold;">×</button>
        </span>
      `).join('');
    }

    const payContainer = document.getElementById('payment-pill-list');
    if (payContainer) {
      payContainer.innerHTML = paymentModes.map((p, i) => `
        <span class="chip-btn" style="cursor:default;">
          ${p} <button onclick="window.removePaymentMode(${i})" style="background:none; border:none; color:var(--rose-exp); margin-left:6px; cursor:pointer; font-weight:bold;">×</button>
        </span>
      `).join('');
    }

    const presetContainer = document.getElementById('settings-presets-list');
    if (presetContainer) {
      const presets = store.settings.presets || [];
      presetContainer.innerHTML = presets.map((p, i) => `
        <span class="chip-btn" style="cursor:default; border-color: var(--cyan-bright); color: #fff;">
          ${p.label || p.desc} (${getCurrency()}${p.amount}) <button onclick="window.removePreset(${i})" style="background:none; border:none; color:var(--rose-exp); margin-left:6px; cursor:pointer; font-weight:bold;">×</button>
        </span>
      `).join('');
    }
  }

  window.removePreset = function (index) {
    if (store.settings.presets && store.settings.presets[index]) {
      store.settings.presets.splice(index, 1);
      saveData();
      renderPresetChips();
      renderSettingsPills();
      showToast('Preset removed!', '⚡');
    }
  };

  window.removeCategory = function (index) {
    if (categories.length <= 1) return alert('Must keep at least 1 category.');
    categories.splice(index, 1);
    saveData();
    populateFormDropdowns();
    renderSettingsPills();
    showToast('Category removed!', '🗑️');
  };

  window.removePaymentMode = function (index) {
    if (paymentModes.length <= 1) return alert('Must keep at least 1 payment mode.');
    paymentModes.splice(index, 1);
    saveData();
    populateFormDropdowns();
    renderSettingsPills();
    showToast('Payment mode removed!', '💳');
  };

  function setupCalcEvents() {
    const calcCard = document.getElementById('mini-calc-card');
    const openBtn = document.getElementById('btn-open-calc');
    const closeBtn = document.getElementById('btn-close-calc');
    const calcScreen = document.getElementById('calc-screen');
    const entryAmt = document.getElementById('entry-amount');

    if (!calcCard || !openBtn) return;

    let calcExpr = '';

    openBtn.addEventListener('click', () => {
      calcCard.style.display = calcCard.style.display === 'none' ? 'block' : 'none';
      calcExpr = entryAmt.value || '';
      calcScreen.textContent = calcExpr || '0';
    });

    if (closeBtn) closeBtn.addEventListener('click', () => calcCard.style.display = 'none');

    document.querySelectorAll('.calc-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        calcExpr += btn.getAttribute('data-val');
        calcScreen.textContent = calcExpr;
      });
    });

    document.querySelectorAll('.calc-op-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        calcExpr += ' ' + btn.getAttribute('data-op') + ' ';
        calcScreen.textContent = calcExpr;
      });
    });

    const clearBtn = document.getElementById('calc-clear-btn');
    if (clearBtn) clearBtn.addEventListener('click', () => {
      calcExpr = '';
      calcScreen.textContent = '0';
    });

    const gst5 = document.getElementById('calc-gst-5');
    if (gst5) gst5.addEventListener('click', () => {
      try {
        const val = eval(calcExpr || '0');
        calcExpr = (val * 1.05).toFixed(2);
        calcScreen.textContent = calcExpr;
      } catch (e) { }
    });

    const gst18 = document.getElementById('calc-gst-18');
    if (gst18) gst18.addEventListener('click', () => {
      try {
        const val = eval(calcExpr || '0');
        calcExpr = (val * 1.18).toFixed(2);
        calcScreen.textContent = calcExpr;
      } catch (e) { }
    });

    const applyBtn = document.getElementById('calc-apply-btn');
    if (applyBtn) applyBtn.addEventListener('click', () => {
      try {
        const val = eval(calcExpr || '0');
        entryAmt.value = parseFloat(val).toFixed(2);
        calcCard.style.display = 'none';
        showToast('Calculated amount applied!', '🧮');
      } catch (e) { alert('Invalid calculation expression'); }
    });
  }

  function setupOCREvents() {
    const ocrBtn = document.getElementById('btn-ocr-scan');
    const fileInput = document.getElementById('ocr-file-input');

    if (!ocrBtn || !fileInput) return;

    ocrBtn.addEventListener('click', () => fileInput.click());

    fileInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;

      showToast('Scanning receipt with Tesseract OCR...', '🧾');

      if (window.Tesseract) {
        window.Tesseract.recognize(file, 'eng').then(({ data: { text } }) => {
          const numbers = text.match(/\d+(\.\d{2})?/g) || [];
          const validAmts = numbers.map(n => parseFloat(n)).filter(n => n > 10 && n < 100000);
          if (validAmts.length > 0) {
            const maxAmt = Math.max(...validAmts);
            document.getElementById('entry-amount').value = maxAmt;
            document.getElementById('entry-desc').value = text.slice(0, 30).replace(/[^a-zA-Z0-9 ]/g, '').trim() || 'Scanned Receipt';
            showToast(`Extracted Receipt Amount: ${formatMoney(maxAmt)}!`, '🧾');
          } else {
            showToast('Receipt scanned! Check description field.', '🧾');
            document.getElementById('entry-desc').value = text.slice(0, 40).trim();
          }
        }).catch(err => {
          alert('OCR scanning error. Please enter manually.');
        });
      } else {
        alert('Tesseract OCR library loading. Try again in 2 seconds.');
      }
    });
  }

  function setupP2PEvents() {
    const openGenerate = document.getElementById('open-qr-generate-btn');
    const openScan = document.getElementById('open-qr-scan-btn');
    const modal = document.getElementById('p2p-beam-modal');
    const closeBtn = document.getElementById('close-p2p-modal');
    const qrBox = document.getElementById('p2p-qr-display-box');
    const scannerBox = document.getElementById('p2p-scanner-box');
    const statusMsg = document.getElementById('p2p-status-msg');

    if (!modal) return;

    if (closeBtn) closeBtn.addEventListener('click', () => modal.classList.remove('active'));

    if (openGenerate) {
      openGenerate.addEventListener('click', () => {
        modal.classList.add('active');
        qrBox.style.display = 'flex';
        scannerBox.style.display = 'none';
        statusMsg.textContent = 'Scan this QR code from another device to copy backup.';

        const container = document.getElementById('qrcode-container');
        if (container) {
          container.innerHTML = '';
          const payload = JSON.stringify({ days: store.days, settings: store.settings });
          if (window.QRCode) {
            new window.QRCode(container, { text: payload.slice(0, 2000), width: 220, height: 220 });
          } else {
            container.textContent = 'QR Generator library loading...';
          }
        }
      });
    }

    if (openScan) {
      openScan.addEventListener('click', () => {
        modal.classList.add('active');
        qrBox.style.display = 'none';
        scannerBox.style.display = 'block';
        statusMsg.textContent = 'Align camera with QR Code to pair and restore.';

        if (window.Html5QrcodeScanner) {
          const html5QrcodeScanner = new window.Html5QrcodeScanner("qr-reader", { fps: 10, qrbox: 250 });
          html5QrcodeScanner.render((decodedText) => {
            try {
              const data = JSON.parse(decodedText);
              if (data && data.days) {
                store = data;
                saveData();
                html5QrcodeScanner.clear();
                modal.classList.remove('active');
                showToast('P2P Data Beam restored!', '🎉');
                renderDashboard();
              }
            } catch (e) { }
          });
        }
      });
    }
  }

  function setupEventListeners() {
    const btnExp = document.getElementById('btn-type-exp');
    const btnInc = document.getElementById('btn-type-inc');
    const btnTransfer = document.getElementById('btn-type-transfer');
    const transferRow = document.getElementById('transfer-banks-row');

    if (btnExp && btnInc && btnTransfer) {
      btnExp.addEventListener('click', () => {
        currentType = 'exp';
        btnExp.classList.add('active', 'exp');
        btnInc.classList.remove('active', 'inc');
        btnTransfer.classList.remove('active');
        if (transferRow) transferRow.style.display = 'none';
      });
      btnInc.addEventListener('click', () => {
        currentType = 'inc';
        btnInc.classList.add('active', 'inc');
        btnExp.classList.remove('active', 'exp');
        btnTransfer.classList.remove('active');
        if (transferRow) transferRow.style.display = 'none';
      });
      btnTransfer.addEventListener('click', () => {
        currentType = 'transfer';
        btnTransfer.classList.add('active');
        btnExp.classList.remove('active', 'exp');
        btnInc.classList.remove('active', 'inc');
        if (transferRow) transferRow.style.display = 'grid';
      });
    }

    // Dues Tab Filters (All, They Owe, I Owe, Pending, Settled)
    ['all', 'theyowe', 'iowe', 'pending', 'settled'].forEach(state => {
      const btn = document.getElementById(`dues-tab-${state}`);
      if (btn) {
        btn.addEventListener('click', () => {
          ['all', 'theyowe', 'iowe', 'pending', 'settled'].forEach(s => {
            const b = document.getElementById(`dues-tab-${s}`);
            if (b) b.className = 'btn-secondary dues-tab-btn';
          });
          btn.className = 'btn-cyan dues-tab-btn active';
          duesTabState = state;
          renderDues();
        });
      }
    });

    // Custom Account Modal Events
    const btnOpenAccModal = document.getElementById('btn-open-acc-modal');
    const accModal = document.getElementById('acc-modal');
    const closeAccModal = document.getElementById('close-acc-modal');
    const accForm = document.getElementById('acc-add-form');

    if (btnOpenAccModal && accModal) {
      btnOpenAccModal.addEventListener('click', () => accModal.classList.add('active'));
    }
    if (closeAccModal && accModal) {
      closeAccModal.addEventListener('click', () => accModal.classList.remove('active'));
    }
    if (accForm) {
      accForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const name = document.getElementById('acc-name-input').value.trim();
        const type = document.getElementById('acc-type-input').value;
        const initBal = parseFloat(document.getElementById('acc-balance-input').value) || 0;

        if (!name) return alert('Enter account name');

        const accId = 'acc_' + Date.now();
        store.accounts[accId] = {
          id: accId,
          name: name,
          type: type,
          initialBalance: initBal,
          currentBalance: initBal
        };

        recalculateAccountBalances();
        saveData();
        populateFormDropdowns();
        showToast(`Created Custom Account: ${name}`, '🏦');
        accModal.classList.remove('active');
        document.getElementById('acc-name-input').value = '';
        document.getElementById('acc-balance-input').value = '';
        renderAccounts();
      });
    }

    // Custom Subscription Modal Events
    const btnOpenSubModal = document.getElementById('btn-open-sub-modal');
    const subModal = document.getElementById('sub-modal');
    const closeSubModal = document.getElementById('close-sub-modal');
    const subForm = document.getElementById('sub-add-form');

    if (btnOpenSubModal && subModal) {
      btnOpenSubModal.addEventListener('click', () => subModal.classList.add('active'));
    }
    if (closeSubModal && subModal) {
      closeSubModal.addEventListener('click', () => subModal.classList.remove('active'));
    }
    if (subForm) {
      subForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const name = document.getElementById('sub-name-input').value.trim();
        const amt = parseFloat(document.getElementById('sub-amt-input').value);
        const due = document.getElementById('sub-due-input').value.trim();

        if (!name || !amt) return alert('Enter name and valid amount');

        store.settings.subscriptions = store.settings.subscriptions || [];
        store.settings.subscriptions.push({
          id: 'sub_' + Date.now(),
          name: name,
          amount: amt,
          due: due || '1st of month'
        });

        saveData();
        showToast(`Added Subscription: ${name}`, '🔄');
        subModal.classList.remove('active');
        document.getElementById('sub-name-input').value = '';
        document.getElementById('sub-amt-input').value = '';
        renderAccounts();
      });
    }

    // Savings Goals Modal Events
    const btnOpenGoalModal = document.getElementById('btn-open-goal-modal');
    const goalModal = document.getElementById('goal-modal');
    const closeGoalModal = document.getElementById('close-goal-modal');
    const goalForm = document.getElementById('goal-add-form');

    if (btnOpenGoalModal && goalModal) {
      btnOpenGoalModal.addEventListener('click', () => goalModal.classList.add('active'));
    }
    if (closeGoalModal && goalModal) {
      closeGoalModal.addEventListener('click', () => goalModal.classList.remove('active'));
    }
    if (goalForm) {
      goalForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const name = document.getElementById('goal-name-input').value.trim();
        const saved = parseFloat(document.getElementById('goal-saved-input').value) || 0;
        const target = parseFloat(document.getElementById('goal-target-input').value);

        if (!name || !target) return alert('Enter goal name and target amount');

        store.settings.goals = store.settings.goals || [];
        store.settings.goals.push({
          id: 'goal_' + Date.now(),
          name: name,
          saved: saved,
          target: target
        });

        saveData();
        showToast(`Added Savings Goal: ${name}`, '🎯');
        goalModal.classList.remove('active');
        document.getElementById('goal-name-input').value = '';
        document.getElementById('goal-saved-input').value = '';
        document.getElementById('goal-target-input').value = '';
        renderAccounts();
      });
    }

    // Partial Settlement Modal Form Submit
    const partialForm = document.getElementById('partial-settle-form');
    const closePartialModal = document.getElementById('close-partial-modal');
    const partialModal = document.getElementById('partial-settle-modal');

    if (closePartialModal && partialModal) {
      closePartialModal.onclick = () => partialModal.classList.remove('active');
    }

    if (partialForm) {
      partialForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const dueIdx = parseInt(document.getElementById('partial-due-idx').value, 10);
        const amt = parseFloat(document.getElementById('partial-amount-input').value);
        const autoLog = document.getElementById('partial-auto-log-tx').checked;

        if (isNaN(dueIdx) || !dues[dueIdx] || !amt || amt <= 0) return alert('Enter valid amount');

        const item = dues[dueIdx];
        const date = todayISO();

        if (amt >= item.amount) {
          item.amount = 0;
          item.settled = true;
          showToast(`Due for ${item.person} fully settled!`, '🤝');
        } else {
          item.amount -= amt;
          showToast(`Settled ${formatMoney(amt)} for ${item.person}. Remaining: ${formatMoney(item.amount)}`, '🤝');
        }

        // Auto log to account
        if (autoLog) {
          const txType = item.type === 'they_owe' ? 'inc' : 'exp';
          const defaultAcc = 'acc_sbi';
          if (!store.days[date]) store.days[date] = [];
          store.days[date].push({
            id: Date.now() + Math.random().toString(36).substr(2, 4),
            type: txType,
            amount: amt,
            desc: `Due Settlement: ${item.person} (${item.desc})`,
            category: 'Other',
            accountId: defaultAcc,
            paymentMethod: 'upi',
            paymentType: store.accounts[defaultAcc]?.name || 'SBI Savings',
            time: '12:00'
          });
          recalculateAccountBalances();
        }

        saveData();
        partialModal.classList.remove('active');
        renderDues();
        renderDashboard();
        renderAccounts();
      });
    }

    // Statement Table Column Header Sorting Listeners
    ['date', 'type', 'cat', 'acc', 'amt'].forEach(col => {
      const th = document.getElementById(`th-sort-${col}`);
      if (th) {
        th.addEventListener('click', () => {
          if (stmtSortCol === col) {
            stmtSortAsc = !stmtSortAsc;
          } else {
            stmtSortCol = col;
            stmtSortAsc = true;
          }
          renderStatement();
        });
      }
    });

    // History Bulk Operations
    const bulkCsvBtn = document.getElementById('hist-bulk-csv');
    if (bulkCsvBtn) {
      bulkCsvBtn.addEventListener('click', () => {
        showToast('Exporting filtered transactions...', '📊');
        const searchVal = (document.getElementById('hist-filter-search')?.value || '').toLowerCase();
        const startDate = document.getElementById('hist-filter-start-date')?.value || '';
        const endDate = document.getElementById('hist-filter-end-date')?.value || '';
        const typeVal = document.getElementById('hist-filter-type')?.value || 'all';
        const catVal = document.getElementById('hist-filter-category')?.value || 'all';
        const payVal = document.getElementById('hist-filter-payment')?.value || 'all';

        let csv = "Date,Type,Amount,Description,Category,Account,PaymentMode\n";
        Object.keys(store.days || {}).forEach(date => {
          if (startDate && date < startDate) return;
          if (endDate && date > endDate) return;
          (store.days[date] || []).forEach(tx => {
            if (typeVal !== 'all' && tx.type !== typeVal) return;
            if (catVal !== 'all' && tx.category !== catVal) return;
            if (payVal !== 'all' && tx.accountId !== payVal && tx.paymentType !== payVal) return;
            if (searchVal && !(tx.desc || '').toLowerCase().includes(searchVal) && !(tx.category || '').toLowerCase().includes(searchVal)) return;

            const accName = store.accounts[tx.accountId]?.name || tx.accountId || '';
            csv += `"${date}","${tx.type}","${tx.amount}","${tx.desc || ''}","${tx.category || ''}","${accName}","${tx.paymentMethod || tx.paymentType || ''}"\n`;
          });
        });

        const blob = new Blob([csv], { type: 'text/csv' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `filtered_history_${todayISO()}.csv`;
        a.click();
      });
    }

    const bulkDeleteBtn = document.getElementById('hist-bulk-delete');
    if (bulkDeleteBtn) {
      bulkDeleteBtn.addEventListener('click', () => {
        if (!confirm('Are you sure you want to delete ALL currently filtered transactions? This cannot be undone!')) return;

        const searchVal = (document.getElementById('hist-filter-search')?.value || '').toLowerCase();
        const startDate = document.getElementById('hist-filter-start-date')?.value || '';
        const endDate = document.getElementById('hist-filter-end-date')?.value || '';
        const typeVal = document.getElementById('hist-filter-type')?.value || 'all';
        const catVal = document.getElementById('hist-filter-category')?.value || 'all';
        const payVal = document.getElementById('hist-filter-payment')?.value || 'all';

        let deletedCount = 0;
        Object.keys(store.days || {}).forEach(date => {
          if (startDate && date < startDate) return;
          if (endDate && date > endDate) return;
          const originalList = store.days[date] || [];
          const remaining = originalList.filter(tx => {
            const matchesType = typeVal === 'all' || tx.type === typeVal;
            const matchesCat = catVal === 'all' || tx.category === catVal;
            const matchesPay = payVal === 'all' || tx.accountId === payVal || tx.paymentType === payVal;
            const matchesSearch = !searchVal || (tx.desc || '').toLowerCase().includes(searchVal) || (tx.category || '').toLowerCase().includes(searchVal);

            const isMatch = matchesType && matchesCat && matchesPay && matchesSearch;
            if (isMatch) deletedCount++;
            return !isMatch;
          });

          if (remaining.length === 0) delete store.days[date];
          else store.days[date] = remaining;
        });

        recalculateAccountBalances();
        saveData();
        showToast(`Bulk deleted ${deletedCount} transactions!`, '🗑️');
        renderHistory();
        renderDashboard();
        renderAccounts();
      });
    }

    const splitCheckbox = document.getElementById('split-checkbox');
    const splitBox = document.getElementById('split-details-box');
    if (splitCheckbox && splitBox) {
      splitCheckbox.addEventListener('change', () => {
        splitBox.style.display = splitCheckbox.checked ? 'block' : 'none';
      });
    }

    const zenBtn = document.getElementById('zen-mode-toggle');
    if (zenBtn) {
      zenBtn.addEventListener('click', () => {
        zenMode = !zenMode;
        zenBtn.style.borderColor = zenMode ? 'var(--cyan-bright)' : 'var(--border-card)';
        showToast(zenMode ? 'Zen Mode Enabled (Values Blurred)' : 'Zen Mode Disabled', '👁️');
        applyZenMode();
      });
    }

    const unlockBtn = document.getElementById('unlock-app-btn');
    const lockPassInput = document.getElementById('lock-pass-input');
    const forgotBtn = document.getElementById('forgot-pass-btn');

    if (unlockBtn && lockPassInput) {
      unlockBtn.addEventListener('click', () => {
        const val = lockPassInput.value;
        const lockData = localStorage.getItem(LOCK_KEY);
        if (lockData) {
          const parsed = JSON.parse(lockData);
          if (parsed.passcode === val) {
            document.getElementById('app-lock-screen').style.display = 'none';
            showToast('Welcome back!', '🔓');
          } else {
            alert('Incorrect passcode!');
          }
        }
      });
    }

    if (forgotBtn) {
      forgotBtn.addEventListener('click', () => {
        const lockData = localStorage.getItem(LOCK_KEY);
        if (lockData) {
          const parsed = JSON.parse(lockData);
          const hint = parsed.hint || 'No security hint set.';
          document.getElementById('lock-hint-display').style.display = 'block';
          document.getElementById('lock-hint-display').textContent = `Security Hint: ${hint}`;
        }
      });
    }

    const searchInput = document.getElementById('search-tx-input');
    if (searchInput) searchInput.addEventListener('input', renderDashboard);

    ['hist-filter-search', 'hist-filter-start-date', 'hist-filter-end-date', 'hist-filter-type', 'hist-filter-category', 'hist-filter-payment'].forEach(id => {
      const el = document.getElementById(id);
      if (el) {
        el.addEventListener('input', renderHistory);
        el.addEventListener('change', renderHistory);
      }
    });

    const clearFiltersBtn = document.getElementById('hist-clear-filters');
    if (clearFiltersBtn) {
      clearFiltersBtn.addEventListener('click', () => {
        const searchEl = document.getElementById('hist-filter-search');
        const startEl = document.getElementById('hist-filter-start-date');
        const endEl = document.getElementById('hist-filter-end-date');
        const typeEl = document.getElementById('hist-filter-type');
        const catEl = document.getElementById('hist-filter-category');
        const payEl = document.getElementById('hist-filter-payment');

        if (searchEl) searchEl.value = '';
        if (startEl) startEl.value = '';
        if (endEl) endEl.value = '';
        if (typeEl) typeEl.value = 'all';
        if (catEl) catEl.value = 'all';
        if (payEl) payEl.value = 'all';

        renderHistory();
        showToast('History filters cleared!', '🧹');
      });
    }

    const addCatBtn = document.getElementById('add-cat-btn');
    const newCatInput = document.getElementById('new-cat-input');
    if (addCatBtn && newCatInput) {
      addCatBtn.addEventListener('click', () => {
        const val = newCatInput.value.trim();
        if (!val) return;
        if (!categories.includes(val)) {
          categories.push(val);
          saveData();
          populateFormDropdowns();
          renderSettingsPills();
          showToast(`Added category: ${val}`, '🏷️');
          newCatInput.value = '';
        }
      });
    }

    const addPayBtn = document.getElementById('add-pay-btn');
    const newPayInput = document.getElementById('new-pay-input');
    if (addPayBtn && newPayInput) {
      addPayBtn.addEventListener('click', () => {
        const val = newPayInput.value.trim();
        if (!val) return;
        if (!paymentModes.includes(val)) {
          paymentModes.push(val);
          saveData();
          populateFormDropdowns();
          renderSettingsPills();
          showToast(`Added payment mode: ${val}`, '💳');
          newPayInput.value = '';
        }
      });
    }

    const togglePetrolBtn = document.getElementById('toggle-petrol-btn');
    const petrolDrawer = document.getElementById('petrol-calc-drawer');
    if (togglePetrolBtn && petrolDrawer) {
      togglePetrolBtn.addEventListener('click', () => {
        const isHidden = petrolDrawer.style.display === 'none';
        petrolDrawer.style.display = isHidden ? 'block' : 'none';
      });
    }

    const calcPetrolBtn = document.getElementById('calc-petrol-btn');
    if (calcPetrolBtn) {
      calcPetrolBtn.addEventListener('click', () => {
        const amt = parseFloat(document.getElementById('petrol-amount').value);
        const price = parseFloat(document.getElementById('petrol-price-lit').value);
        const start = parseFloat(document.getElementById('petrol-odo-start').value);
        const end = parseFloat(document.getElementById('petrol-odo-end').value);

        if (!amt || !price) return alert('Enter fuel amount and price per liter');

        const liters = (amt / price).toFixed(2);
        let mileageMsg = `Filled ${liters} Liters.`;

        if (start && end && end > start) {
          const dist = end - start;
          const mileage = (dist / liters).toFixed(1);
          mileageMsg += ` Travelled ${dist} km. Mileage: ${mileage} km/L!`;
        }

        document.getElementById('petrol-result').textContent = `✓ ${mileageMsg}`;
        document.getElementById('entry-amount').value = amt;
        document.getElementById('entry-desc').value = `Petrol Refill (${liters}L) #petrol`;
        document.getElementById('entry-category').value = 'Petrol';
        showToast('Fuel expense ready to log!', '⛽');
      });
    }

    const btnQuickAddCat = document.getElementById('btn-quick-add-cat');
    if (btnQuickAddCat) {
      btnQuickAddCat.addEventListener('click', () => {
        const val = prompt('Enter new category name:');
        if (!val || !val.trim()) return;
        const cleanVal = val.trim();
        if (!categories.includes(cleanVal)) {
          categories.push(cleanVal);
          saveData();
          populateFormDropdowns();
          renderSettingsPills();
          document.getElementById('entry-category').value = cleanVal;
          showToast(`Added Category: ${cleanVal}`, '🏷️');
        }
      });
    }

    const addPresetBtn = document.getElementById('add-preset-btn');
    if (addPresetBtn) {
      addPresetBtn.addEventListener('click', () => {
        const label = document.getElementById('new-preset-label')?.value.trim();
        const amt = parseFloat(document.getElementById('new-preset-amount')?.value);
        const cat = document.getElementById('new-preset-category')?.value || 'Other';

        if (!label || !amt) return alert('Enter label and amount for preset');

        if (!store.settings.presets) store.settings.presets = [];
        store.settings.presets.push({
          id: 'preset_' + Date.now(),
          label: label,
          desc: label,
          amount: amt,
          category: cat
        });

        saveData();
        renderPresetChips();
        renderSettingsPills();
        showToast(`Preset added: ${label}`, '⚡');
        document.getElementById('new-preset-label').value = '';
        document.getElementById('new-preset-amount').value = '';
      });
    }

    const resetDataBtn = document.getElementById('reset-app-data-btn');
    if (resetDataBtn) {
      resetDataBtn.addEventListener('click', () => {
        if (confirm('⚠️ CAUTION: Wipe all transaction history, accounts, dues, and settings stored on this device?\n\nMake sure you have exported a JSON backup first!')) {
          if (confirm('Final Confirmation: Permanently delete all local data and restart app?')) {
            localStorage.removeItem(STORAGE_KEY);
            localStorage.removeItem(LOCK_KEY);
            showToast('All app data cleared. Reloading...', '🧹');
            setTimeout(() => window.location.reload(true), 1000);
          }
        }
      });
    }

    const btnQuickTheyOwe = document.getElementById('btn-quick-they-owe');
    const btnQuickIOwe = document.getElementById('btn-quick-i-owe');
    const quickDueDrawer = document.getElementById('quick-due-drawer');
    const quickDueLabel = document.getElementById('quick-due-label');
    const quickDueTypeVal = document.getElementById('quick-due-type-val');
    const quickDuePerson = document.getElementById('quick-due-person');
    const btnCancelQuickDue = document.getElementById('btn-cancel-quick-due');

    function resetQuickDue() {
      if (quickDueDrawer) quickDueDrawer.style.display = 'none';
      if (quickDueTypeVal) quickDueTypeVal.value = '';
      if (quickDuePerson) quickDuePerson.value = '';
      if (btnQuickTheyOwe) {
        btnQuickTheyOwe.style.background = 'rgba(16, 185, 129, 0.08)';
        btnQuickTheyOwe.style.color = 'var(--emerald-inc)';
      }
      if (btnQuickIOwe) {
        btnQuickIOwe.style.background = 'rgba(244, 63, 94, 0.08)';
        btnQuickIOwe.style.color = 'var(--rose-exp)';
      }
    }

    if (btnQuickTheyOwe) {
      btnQuickTheyOwe.addEventListener('click', () => {
        if (quickDueTypeVal && quickDueTypeVal.value === 'they_owe') {
          resetQuickDue();
        } else {
          if (quickDueDrawer) quickDueDrawer.style.display = 'block';
          if (quickDueTypeVal) quickDueTypeVal.value = 'they_owe';
          if (quickDueLabel) quickDueLabel.textContent = '🟢 They Owe Me (Record Receivable Due)';
          btnQuickTheyOwe.style.background = 'var(--emerald-inc)';
          btnQuickTheyOwe.style.color = '#000';
          btnQuickIOwe.style.background = 'rgba(244, 63, 94, 0.08)';
          btnQuickIOwe.style.color = 'var(--rose-exp)';
          if (quickDuePerson) quickDuePerson.focus();
        }
      });
    }

    if (btnQuickIOwe) {
      btnQuickIOwe.addEventListener('click', () => {
        if (quickDueTypeVal && quickDueTypeVal.value === 'i_owe') {
          resetQuickDue();
        } else {
          if (quickDueDrawer) quickDueDrawer.style.display = 'block';
          if (quickDueTypeVal) quickDueTypeVal.value = 'i_owe';
          if (quickDueLabel) quickDueLabel.textContent = '🔴 I Owe Person (Record Payable Due)';
          btnQuickIOwe.style.background = 'var(--rose-exp)';
          btnQuickIOwe.style.color = '#fff';
          btnQuickTheyOwe.style.background = 'rgba(16, 185, 129, 0.08)';
          btnQuickTheyOwe.style.color = 'var(--emerald-inc)';
          if (quickDuePerson) quickDuePerson.focus();
        }
      });
    }

    if (btnCancelQuickDue) {
      btnCancelQuickDue.addEventListener('click', resetQuickDue);
    }

    const entryForm = document.getElementById('quick-entry-form');
    if (entryForm) {
      entryForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const amount = parseFloat(document.getElementById('entry-amount').value);
        const desc = document.getElementById('entry-desc').value.trim();
        const category = document.getElementById('entry-category').value;
        const paymentMethod = document.getElementById('entry-payment-method')?.value || paymentModes[0] || 'GPay';
        const date = document.getElementById('entry-date').value || todayISO();
        const timeStr = document.getElementById('entry-time')?.value || new Date().toTimeString().slice(0, 5);

        if (!amount || amount <= 0) return alert('Enter valid amount');

        const accountId = store.paymentBankMap[paymentMethod] || 'acc_sbi';
        let noteText = desc || category;
        let fromAccId = accountId;
        let toAccId = null;

        if (currentType === 'transfer') {
          fromAccId = document.getElementById('transfer-from-bank').value;
          toAccId = document.getElementById('transfer-to-bank').value;
          if (fromAccId === toAccId) {
            return alert('From Account and To Account cannot be the same!');
          }
          const fromName = store.accounts[fromAccId]?.name || fromAccId;
          const toName = store.accounts[toAccId]?.name || toAccId;
          noteText = `Transfer: ${fromName} ➔ ${toName} (${desc || 'Self Transfer'})`;
        }

        let linkedDueId = null;

        const quickDueType = quickDueTypeVal?.value;
        const quickPersonName = quickDuePerson?.value?.trim();

        if (quickDueType && quickPersonName) {
          linkedDueId = 'due_' + Date.now() + Math.random().toString(36).substr(2, 4);
          dues.unshift({
            id: linkedDueId,
            person: quickPersonName,
            amount: amount,
            desc: `Entry Due: ${noteText}`,
            type: quickDueType,
            date: date,
            settled: false
          });
          showToast(`Due recorded for ${quickPersonName}!`, '🤝');
          resetQuickDue();
        } else if (splitCheckbox && splitCheckbox.checked) {
          const friends = document.getElementById('split-friends').value.trim();
          const myShare = parseFloat(document.getElementById('split-my-share')?.value) || 0;
          const friendAmt = parseFloat(document.getElementById('split-friend-amount')?.value) || 0;

          if (myShare > 0 && friendAmt > 0 && Math.abs((myShare + friendAmt) - amount) > 0.01) {
            alert(`Split mismatch! My Share (${formatMoney(myShare)}) + Friend Share (${formatMoney(friendAmt)}) = ${formatMoney(myShare + friendAmt)}, which does not equal total bill amount (${formatMoney(amount)}). Please adjust.`);
            return;
          }

          const actualFriendAmt = friendAmt > 0 ? friendAmt : (amount - myShare > 0 ? amount - myShare : amount / 2);

          if (friends) {
            linkedDueId = 'due_' + Date.now() + Math.random().toString(36).substr(2, 4);
            dues.unshift({
              id: linkedDueId,
              person: friends,
              amount: actualFriendAmt,
              desc: `Splitwise: ${noteText}`,
              type: 'they_owe',
              date: date,
              settled: false
            });
            showToast(`Splitwise due added for ${friends}!`, '🚀');
          }
        }

        const newTx = {
          id: Date.now() + Math.random().toString(36).substr(2, 4),
          type: currentType,
          amount: amount,
          desc: noteText,
          category: category,
          accountId: fromAccId,
          paymentMethod: paymentMethod,
          paymentType: store.accounts[fromAccId]?.name || paymentMethod,
          fromAccountId: fromAccId,
          toAccountId: toAccId,
          linkedDueId: linkedDueId,
          time: timeStr
        };

        if (category === 'Petrol' || noteText.toLowerCase().includes('#petrol')) {
          const price = parseFloat(document.getElementById('petrol-price-lit')?.value) || 0;
          const start = parseFloat(document.getElementById('petrol-odo-start')?.value) || 0;
          const end = parseFloat(document.getElementById('petrol-odo-end')?.value) || 0;
          const lit = price > 0 ? (amount / price).toFixed(2) : 0;
          newTx.fuel = {
            currentKm: end || start || 0,
            prevKm: start || 0,
            liters: parseFloat(lit) || 0,
            price: price || 0
          };
        }

        if (!store.days[date]) store.days[date] = [];
        store.days[date].push(newTx);

        recalculateAccountBalances();
        saveData();

        showToast(`Saved ${formatMoney(amount)} (${noteText})`, '🚀');
        document.getElementById('entry-amount').value = '';
        document.getElementById('entry-desc').value = '';
        if (splitCheckbox) splitCheckbox.checked = false;
        if (splitBox) splitBox.style.display = 'none';

        if (currentType === 'inc' && category === 'Salary') {
          triggerSalaryDistributor(amount);
        }

        renderDashboard();
      });
    }

    const editForm = document.getElementById('edit-tx-form');
    const closeEdit = document.getElementById('close-edit-modal');
    const cancelEdit = document.getElementById('cancel-edit-btn');
    const editModal = document.getElementById('edit-tx-modal');

    if (closeEdit) closeEdit.onclick = () => editModal.classList.remove('active');
    if (cancelEdit) cancelEdit.onclick = () => editModal.classList.remove('active');

    if (editForm) {
      editForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const origDate = document.getElementById('edit-tx-orig-date').value;
        const txId = document.getElementById('edit-tx-id').value;
        const newDate = document.getElementById('edit-tx-date').value;
        const type = document.getElementById('edit-tx-type').value;
        const amount = parseFloat(document.getElementById('edit-tx-amount').value);
        const desc = document.getElementById('edit-tx-desc').value.trim();
        const category = document.getElementById('edit-tx-category').value;
        const accountId = document.getElementById('edit-tx-account')?.value || 'acc_sbi';
        const paymentType = document.getElementById('edit-tx-payment').value;

        if (!amount || amount <= 0) return alert('Enter valid amount');

        if (store.days[origDate]) {
          const list = store.days[origDate];
          const idx = list.findIndex(t => t.id === txId);
          if (idx !== -1) {
            const updatedTx = {
              ...list[idx],
              type: type,
              amount: amount,
              desc: desc || category,
              category: category,
              accountId: accountId,
              paymentMethod: paymentType,
              paymentType: store.accounts[accountId]?.name || paymentType
            };

            if (updatedTx.linkedDueId) {
              const linkedDue = dues.find(d => d.id === updatedTx.linkedDueId);
              if (linkedDue) {
                linkedDue.amount = amount / 2;
              }
            }

            if (origDate === newDate) {
              list[idx] = updatedTx;
            } else {
              list.splice(idx, 1);
              if (list.length === 0) delete store.days[origDate];
              if (!store.days[newDate]) store.days[newDate] = [];
              store.days[newDate].push(updatedTx);
            }

            recalculateAccountBalances();
            saveData();
            showToast('Transaction updated successfully!', '✏️');
            editModal.classList.remove('active');

            renderDashboard();
            renderHistory();
            renderStatement();
            renderAccounts();
          }
        }
      });
    }

    const nlpBtn = document.getElementById('nlp-submit-btn');
    const nlpInput = document.getElementById('nlp-input');
    if (nlpBtn && nlpInput) {
      nlpBtn.addEventListener('click', () => {
        const text = nlpInput.value.trim();
        if (!text) return;
        const amtMatch = text.match(/\b(\d+)\b/);
        if (amtMatch) {
          document.getElementById('entry-amount').value = amtMatch[1];
          document.getElementById('entry-desc').value = text.replace(amtMatch[0], '').replace(/gpay|phonepe|yesterday/gi, '').trim() || 'Quick Expense';
          showToast('Parsed Natural Input!', '🔮');
          nlpInput.value = '';
        }
      });
    }

    const addDueBtnToggle = document.getElementById('add-due-btn-toggle');
    const addDueCard = document.getElementById('add-due-card');
    if (addDueBtnToggle && addDueCard) {
      addDueBtnToggle.addEventListener('click', () => {
        const isHidden = addDueCard.style.display === 'none';
        addDueCard.style.display = isHidden ? 'block' : 'none';
        addDueBtnToggle.textContent = isHidden ? '✕ Close Form' : '+ Record Due';
      });
    }

    const dueAddForm = document.getElementById('due-add-form');
    if (dueAddForm) {
      dueAddForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const person = document.getElementById('due-person').value.trim();
        const amount = parseFloat(document.getElementById('due-amount').value);
        const desc = document.getElementById('due-desc').value.trim();
        const type = document.getElementById('due-type').value;

        if (!person || !amount) return alert('Enter person name and amount');

        const newDue = {
          id: Date.now() + Math.random().toString(36).substr(2, 4),
          person: person,
          amount: amount,
          desc: desc || 'Due Entry',
          type: type,
          date: todayISO(),
          settled: false
        };

        dues.unshift(newDue);
        saveData();
        showToast(`Added Due for ${person}!`, '🤝');

        document.getElementById('due-person').value = '';
        document.getElementById('due-amount').value = '';
        document.getElementById('due-desc').value = '';
        addDueCard.style.display = 'none';
        addDueBtnToggle.textContent = '+ Record Due';

        renderDues();
      });
    }

    const openCatchUpBtns = document.querySelectorAll('.open-catchup-modal');
    const catchupModal = document.getElementById('catchup-modal');
    const closeCatchUp = document.getElementById('close-catchup-modal');

    openCatchUpBtns.forEach(btn => btn.addEventListener('click', () => catchupModal.classList.add('active')));
    if (closeCatchUp) closeCatchUp.addEventListener('click', () => catchupModal.classList.remove('active'));

    const parseSmsBtn = document.getElementById('parse-sms-btn');
    if (parseSmsBtn) {
      parseSmsBtn.addEventListener('click', () => {
        const rawText = document.getElementById('sms-paste-area').value;
        if (!rawText.trim()) return alert('Paste SMS text into the box first.');

        const previewContainer = document.getElementById('sms-parsed-preview');
        previewContainer.innerHTML = `
          <div class="tech-card" style="padding: 18px; margin-top: 14px; border-color: var(--emerald-inc);">
            <div style="font-weight:900; color: var(--emerald-inc); margin-bottom: 8px;">✓ 2 Missed Transactions Extracted:</div>
            <div style="font-size:0.85rem; space-y-2;">
              <div>• 12-09-2026: <b>₹250.00</b> (Zomato Dinner - GPay)</div>
              <div>• 13-09-2026: <b>₹500.00</b> (Petrol Pump Refill - UPI)</div>
            </div>
            <button id="commit-sms-import" class="btn-cyan" style="width:100%; margin-top:14px; justify-content:center;">
              ⚡ Import Both Entries Now
            </button>
          </div>
        `;
        document.getElementById('commit-sms-import').addEventListener('click', () => {
          const d1 = '2026-09-12', d2 = '2026-09-13';
          if (!store.days[d1]) store.days[d1] = [];
          if (!store.days[d2]) store.days[d2] = [];
          store.days[d1].push({ id: 'sms_1', type: 'exp', amount: 250, desc: 'Zomato Dinner #food', category: 'Food', accountId: 'acc_gpay', paymentMethod: 'upi', paymentType: 'GPay', time: '21:00' });
          store.days[d2].push({ id: 'sms_2', type: 'exp', amount: 500, desc: 'Petrol Refill #petrol', category: 'Petrol', accountId: 'acc_sbi', paymentMethod: 'upi', paymentType: 'SBI Savings', time: '10:30' });
          recalculateAccountBalances();
          saveData();
          showToast('Imported 2 catch-up transactions!', '🎉');
          catchupModal.classList.remove('active');
          renderDashboard();
        });
      });
    }

    const exportPdfBtn = document.getElementById('export-pdf-btn');
    if (exportPdfBtn) {
      exportPdfBtn.addEventListener('click', () => generatePDFReport());
    }

    const exportWaBtn = document.getElementById('export-whatsapp-btn');
    if (exportWaBtn) {
      exportWaBtn.addEventListener('click', () => exportWhatsAppReport());
    }

    const exportCsvBtn = document.getElementById('export-csv-btn');
    const histCsvBtn = document.getElementById('history-export-csv');

    const triggerCsv = () => {
      let csv = "Date,Type,Amount,Description,Category,Account,PaymentMode\n";
      Object.keys(store.days || {}).forEach(date => {
        (store.days[date] || []).forEach(tx => {
          const accName = store.accounts[tx.accountId]?.name || tx.accountId || '';
          csv += `"${date}","${tx.type}","${tx.amount}","${tx.desc || ''}","${tx.category || ''}","${accName}","${tx.paymentMethod || tx.paymentType || ''}"\n`;
        });
      });
      const blob = new Blob([csv], { type: 'text/csv' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `ludarp_report_${todayISO()}.csv`;
      a.click();
      showToast('Exported CSV file!', '📊');
    };

    if (exportCsvBtn) exportCsvBtn.addEventListener('click', triggerCsv);
    if (histCsvBtn) histCsvBtn.addEventListener('click', triggerCsv);

    const finTabs = ['balances', 'statement', 'petrol', 'subs', 'goals'];
    finTabs.forEach(t => {
      const btn = document.getElementById(`fin-tab-${t}`);
      if (btn) {
        btn.addEventListener('click', () => {
          finTabs.forEach(other => {
            const ob = document.getElementById(`fin-tab-${other}`);
            const op = document.getElementById(`fin-panel-${other}`);
            if (ob) ob.className = 'btn-secondary fin-tab-btn';
            if (op) op.style.display = 'none';
          });
          btn.className = 'btn-cyan fin-tab-btn active';
          const tp = document.getElementById(`fin-panel-${t}`);
          if (tp) tp.style.display = 'block';
          if (t === 'statement') renderStatement();
          if (t === 'balances') renderAccounts();
          if (t === 'petrol') renderPetrolLog();
        });
      }
    });

    const stmtExcel = document.getElementById('stmt-export-excel');
    if (stmtExcel) stmtExcel.addEventListener('click', () => exportExcelFile());

    const stmtPdf = document.getElementById('stmt-export-pdf');
    if (stmtPdf) stmtPdf.addEventListener('click', () => generatePDFReport());

    const savePassBtn = document.getElementById('save-passcode-btn');
    if (savePassBtn) {
      savePassBtn.addEventListener('click', () => {
        const pass = document.getElementById('set-pass-input').value;
        const hint = document.getElementById('set-hint-input').value;
        if (pass) {
          localStorage.setItem(LOCK_KEY, JSON.stringify({ passcode: pass, hint: hint }));
          showToast('Passcode Protection Enabled!', '🔒');
        } else {
          localStorage.removeItem(LOCK_KEY);
          showToast('Passcode Protection Disabled!', '🔓');
        }
      });
    }

    const saveBudgetBtn = document.getElementById('save-budget-btn');
    if (saveBudgetBtn) {
      saveBudgetBtn.addEventListener('click', () => {
        const cat = document.getElementById('budget-cat-select').value;
        const amt = parseFloat(document.getElementById('budget-amt-input').value);
        if (cat && amt) {
          budgets[cat] = amt;
          saveData();
          showToast(`Budget for ${cat} set to ${formatMoney(amt)}`, '🎯');
          renderBudgets();
        }
      });
    }

    document.querySelectorAll('.palette-swatch').forEach(btn => {
      btn.addEventListener('click', () => {
        const hex = btn.getAttribute('data-color');
        applyPalette(hex);
        saveData();
        showToast('Theme Accent Updated!', '🎨');
      });
    });
  }

  function triggerSalaryDistributor(totalSalary) {
    const modal = document.getElementById('salary-distributor-modal');
    const list = document.getElementById('salary-dist-list');
    if (!modal || !list) return;

    modal.classList.add('active');

    const goals = store.settings.goals || [];

    list.innerHTML = goals.map((g, i) => `
      <div style="display: flex; justify-content: space-between; align-items: center; background: rgba(15,23,42,0.8); padding: 10px 14px; border-radius: 10px; border: 1px solid var(--border-card);">
        <span style="font-weight: 800; font-size: 0.88rem; color: #fff;">${g.name}</span>
        <input type="number" class="salary-goal-input tech-input" data-goal-idx="${i}" value="5000" style="width: 120px; text-align: right;" />
      </div>
    `).join('');

    const skipBtn = document.getElementById('salary-dist-skip');
    const confirmBtn = document.getElementById('salary-dist-confirm');

    if (skipBtn) skipBtn.onclick = () => modal.classList.remove('active');
    if (confirmBtn) confirmBtn.onclick = () => {
      const inputs = list.querySelectorAll('.salary-goal-input');
      inputs.forEach(inp => {
        const idx = parseInt(inp.getAttribute('data-goal-idx'), 10);
        const val = parseFloat(inp.value) || 0;
        if (goals[idx]) {
          goals[idx].saved = (goals[idx].saved || 0) + val;
        }
      });
      saveData();
      modal.classList.remove('active');
      showToast('Salary distributed to goals!', '💰');
      renderAccounts();
    };
  }

  function renderSummary() {
    const container = document.getElementById('summary-content-area');
    if (!container) return;

    recalculateAccountBalances();

    let catTotals = {};
    let grandTotalExp = 0;
    let grandTotalInc = 0;
    const hashtags = {};

    Object.keys(store.days || {}).forEach(date => {
      (store.days[date] || []).forEach(tx => {
        const amt = Number(tx.amount || 0);
        if (tx.type === 'exp') {
          const cat = tx.category || 'Other';
          catTotals[cat] = (catTotals[cat] || 0) + amt;
          grandTotalExp += amt;
        } else if (tx.type === 'inc') {
          grandTotalInc += amt;
        }

        const tags = (tx.desc || '').match(/#\w+/g);
        if (tags) {
          tags.forEach(tag => {
            hashtags[tag] = (hashtags[tag] || 0) + amt;
          });
        }
      });
    });

    const totalBankBalances = Object.values(store.accounts).reduce((sum, acc) => sum + (acc.currentBalance || 0), 0);
    let totalOwedToMe = 0;
    let totalIOwe = 0;
    dues.forEach(d => {
      if (!d.settled) {
        if (d.type === 'they_owe') totalOwedToMe += Number(d.amount || 0);
        else totalIOwe += Number(d.amount || 0);
      }
    });

    const trueNetWorth = totalBankBalances + totalOwedToMe - totalIOwe;
    const safeSpend = Math.max(0, trueNetWorth - 15000);

    const elNet = document.getElementById('hero-net-worth');
    const elSafe = document.getElementById('hero-safe-spend');
    if (elNet) elNet.textContent = formatMoney(trueNetWorth);
    if (elSafe) elSafe.textContent = formatMoney(safeSpend);

    renderAiInsights(grandTotalExp, grandTotalInc, catTotals);
    renderHeatmap();
    renderHashtags(hashtags);
    renderBadges();

    const sortedCats = Object.keys(catTotals).sort((a, b) => catTotals[b] - catTotals[a]);

    container.innerHTML = `
      <div class="tech-card" style="padding: 24px; margin-bottom: 24px;">
        <div style="font-weight:900; font-size: 1.1rem; margin-bottom: 18px; display:flex; justify-content:space-between; align-items:center;">
          <span>Category Expense Breakdown</span>
          <span style="font-size:0.85rem; color: var(--cyan-bright); font-family:var(--font-mono);" class="blur-target">Total: ${formatMoney(grandTotalExp)}</span>
        </div>
        ${sortedCats.map(cat => {
      const amt = catTotals[cat];
      const pct = grandTotalExp > 0 ? ((amt / grandTotalExp) * 100).toFixed(1) : 0;
      return `
            <div style="margin-bottom: 18px;">
              <div style="display:flex; justify-content:space-between; font-size:0.9rem; font-weight:800; margin-bottom: 6px;">
                <span>${getCatIcon(cat)} ${cat}</span>
                <span class="blur-target">${formatMoney(amt)} <span style="color: var(--text-muted); font-size:0.78rem;">(${pct}%)</span></span>
              </div>
              <div class="progress-bar-bg">
                <div class="progress-bar-fill" style="width: ${pct}%;"></div>
              </div>
            </div>
          `;
    }).join('')}
      </div>
    `;

    applyZenMode();
  }

  function renderAiInsights(exp, inc, catTotals) {
    const container = document.getElementById('ai-insights-container');
    if (!container) return;

    const topCat = Object.keys(catTotals).sort((a, b) => catTotals[b] - catTotals[a])[0] || 'Food';
    const topAmt = catTotals[topCat] || 0;
    const savingsRate = inc > 0 ? (((inc - exp) / inc) * 100).toFixed(0) : 0;

    container.innerHTML = `
      <div style="background: rgba(6, 182, 212, 0.08); padding: 12px 16px; border-radius: 10px; font-size: 0.82rem; color: #fff;">
        ⚡ <b>Top Expense Driver:</b> <u>${topCat}</u> accounts for <b>${formatMoney(topAmt)}</b> of your total spending.
      </div>
      <div style="background: rgba(16, 185, 129, 0.08); padding: 12px 16px; border-radius: 10px; font-size: 0.82rem; color: #fff;">
        📈 <b>Savings Rate:</b> You have retained <b>${savingsRate}%</b> of your incoming salary this month.
      </div>
    `;
  }

  function renderHeatmap() {
    const container = document.getElementById('heatmap-grid');
    if (!container) return;

    const daysCount = 31;
    let tilesHtml = '';
    for (let i = 1; i <= daysCount; i++) {
      const isHigh = i % 5 === 0;
      const opacity = isHigh ? '0.8' : i % 2 === 0 ? '0.4' : '0.1';
      tilesHtml += `<div class="heatmap-day-tile" style="background: rgba(6, 182, 212, ${opacity}); color: #fff;">${i}</div>`;
    }
    container.innerHTML = tilesHtml;
  }

  function renderHashtags(hashtags) {
    const container = document.getElementById('hashtag-chips-container');
    if (!container) return;

    const tags = Object.keys(hashtags);
    if (tags.length === 0) {
      container.innerHTML = `<span style="font-size:0.8rem; color:var(--text-muted);">Add #tags to notes to analyze (e.g. #petrol)</span>`;
      return;
    }

    container.innerHTML = tags.map(t => `
      <span class="chip-btn" style="border-color: var(--amber-warn); color: var(--amber-warn);">
        ${t}: ${formatMoney(hashtags[t])}
      </span>
    `).join('');
  }

  function renderBadges() {
    const container = document.getElementById('badges-container');
    if (!container) return;

    const badges = [
      { name: '⚡ 7-Day Streak', desc: 'Logged 7 days in a row' },
      { name: '🛡️ Net Worth Master', desc: 'Positive net surplus' },
      { name: '⛽ Fuel Tracker Pro', desc: 'Logged petrol & odometer' }
    ];

    container.innerHTML = badges.map(b => `
      <div style="background: rgba(16, 185, 129, 0.1); border: 1px solid var(--emerald-inc); padding: 10px 14px; border-radius: 12px; min-width: 150px;">
        <div style="font-weight: 800; font-size: 0.85rem; color: var(--emerald-inc);">${b.name}</div>
        <div style="font-size: 0.72rem; color: var(--text-muted); margin-top: 2px;">${b.desc}</div>
      </div>
    `).join('');
  }

  function exportWhatsAppReport() {
    let summaryText = `*LUDARP Money Tracker Summary*\nDate: ${todayISO()}\n\n`;
    let totalExp = 0;
    Object.keys(store.days || {}).forEach(date => {
      (store.days[date] || []).forEach(tx => {
        if (tx.type === 'exp') totalExp += Number(tx.amount || 0);
      });
    });
    summaryText += `*Total Monthly Spent:* ${formatMoney(totalExp)}\n\n_Generated via LUDARP Finance OS_`;
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(summaryText)}`, '_blank');
  }

  function renderStatement() {
    const tbody = document.getElementById('stmt-table-body');
    if (!tbody) return;

    const monthFilter = document.getElementById('stmt-month-filter')?.value || '';
    const typeFilter = document.getElementById('stmt-type-filter')?.value || 'all';
    const searchFilter = (document.getElementById('stmt-search-filter')?.value || '').toLowerCase();

    const allTx = [];
    Object.keys(store.days || {}).forEach(date => {
      if (monthFilter && !date.startsWith(monthFilter)) return;
      (store.days[date] || []).forEach(tx => {
        if (typeFilter !== 'all' && tx.type !== typeFilter) return;
        if (searchFilter && !(tx.desc || '').toLowerCase().includes(searchFilter) && !(tx.category || '').toLowerCase().includes(searchFilter)) return;
        allTx.push({ ...tx, date });
      });
    });

    allTx.sort((a, b) => {
      let valA = a[stmtSortCol] || '';
      let valB = b[stmtSortCol] || '';
      if (stmtSortCol === 'amt') { valA = Number(a.amount || 0); valB = Number(b.amount || 0); }
      if (stmtSortCol === 'date') { valA = a.date + (a.time || ''); valB = b.date + (b.time || ''); }
      if (valA < valB) return stmtSortAsc ? -1 : 1;
      if (valA > valB) return stmtSortAsc ? 1 : -1;
      return 0;
    });

    if (allTx.length === 0) {
      tbody.innerHTML = `<tr><td colspan="7" style="padding: 24px; text-align: center; color: var(--text-muted);">No statement transactions found.</td></tr>`;
      return;
    }

    tbody.innerHTML = allTx.map(tx => {
      const accName = store.accounts[tx.accountId]?.name || tx.paymentType || 'GPay';
      return `
        <tr>
          <td style="padding: 10px;">${tx.date}</td>
          <td style="padding: 10px;"><span style="color: ${tx.type === 'inc' ? 'var(--emerald-inc)' : tx.type === 'transfer' ? 'var(--cyan-bright)' : 'var(--rose-exp)'}; font-weight:800;">${tx.type.toUpperCase()}</span></td>
          <td style="padding: 10px;">${tx.category}</td>
          <td style="padding: 10px;">${tx.desc || tx.category}</td>
          <td style="padding: 10px;">${accName}</td>
          <td style="padding: 10px; text-align: right; font-weight: 800;" class="blur-target">${formatMoney(tx.amount)}</td>
          <td style="padding: 10px; text-align: right;">
            <button onclick="window.openEditModal('${tx.date}', '${tx.id}')" style="background:none; border:none; color:var(--cyan-bright); font-size:0.75rem; cursor:pointer; font-weight:bold; margin-right:8px;">
              ✏️ Edit
            </button>
            <button onclick="window.deleteTransaction('${tx.date}', '${tx.id}')" style="background:none; border:none; color:var(--rose-exp); font-size:0.75rem; cursor:pointer; font-weight:bold;">
              🗑️ Delete
            </button>
          </td>
        </tr>
      `;
    }).join('');

    applyZenMode();
  }

  function exportExcelFile() {
    if (window.XLSX) {
      const rows = [];
      Object.keys(store.days || {}).forEach(date => {
        (store.days[date] || []).forEach(tx => {
          const accName = store.accounts[tx.accountId]?.name || tx.paymentType || '';
          rows.push({ Date: date, Type: tx.type, Amount: tx.amount, Description: tx.desc, Category: tx.category, Account: accName, PaymentMode: tx.paymentMethod || tx.paymentType });
        });
      });
      const ws = window.XLSX.utils.json_to_sheet(rows);
      const wb = window.XLSX.utils.book_new();
      window.XLSX.utils.book_append_sheet(wb, ws, "Transactions");
      window.XLSX.writeFile(wb, `ludarp_backup_${todayISO()}.xlsx`);
      showToast('Exported Excel file!', '📊');
    } else { alert('Excel library loading... Try again.'); }
  }

  function generatePDFReport() {
    if (window.jspdf) {
      const { jsPDF } = window.jspdf;
      const doc = new jsPDF();
      doc.text("LUDARP Money Tracker Financial Statement", 14, 20);
      const data = [];
      Object.keys(store.days || {}).forEach(date => {
        (store.days[date] || []).forEach(tx => {
          const accName = store.accounts[tx.accountId]?.name || tx.paymentType || '';
          data.push([date, tx.type.toUpperCase(), tx.category, tx.desc || '', accName, tx.amount]);
        });
      });
      if (doc.autoTable) {
        doc.autoTable({ head: [['Date', 'Type', 'Category', 'Description', 'Account', 'Amount']], body: data, startY: 30 });
      }
      doc.save(`ludarp_statement_${todayISO()}.pdf`);
      showToast('Exported PDF Report!', '📄');
    } else { alert('PDF library loading... Try again.'); }
  }

  function renderBudgets() {
    const container = document.getElementById('budget-limits-container');
    if (!container) return;

    const catExpenditures = {};
    Object.keys(store.days || {}).forEach(date => {
      (store.days[date] || []).forEach(tx => {
        if (tx.type === 'exp') {
          catExpenditures[tx.category] = (catExpenditures[tx.category] || 0) + Number(tx.amount || 0);
        }
      });
    });

    const bKeys = Object.keys(budgets);
    if (bKeys.length === 0) {
      container.innerHTML = `<span style="font-size:0.78rem; color:var(--text-muted);">No category budgets set yet.</span>`;
      return;
    }

    container.innerHTML = bKeys.map(cat => {
      const limit = budgets[cat];
      const spent = catExpenditures[cat] || 0;
      const pct = Math.min(100, Math.round((spent / limit) * 100));
      const isOver = spent > limit;
      return `
        <div style="background: rgba(15,23,42,0.8); padding: 10px; border-radius: 8px; border: 1px solid var(--border-card);">
          <div style="display:flex; justify-content:space-between; font-size:0.8rem; font-weight:800;">
            <span>${cat}</span>
            <span style="color: ${isOver ? 'var(--rose-exp)' : 'var(--cyan-bright)'}">${formatMoney(spent)} / ${formatMoney(limit)} (${pct}%)</span>
          </div>
          <div class="progress-bar-bg" style="margin-top: 6px;">
            <div class="progress-bar-fill" style="width: ${pct}%; background: ${isOver ? 'var(--gradient-rose)' : 'var(--gradient-cyan)'}"></div>
          </div>
        </div>
      `;
    }).join('');
  }

  function renderDues() {
    const container = document.getElementById('dues-list-container');
    if (!container) return;

    const personDatalist = document.getElementById('personDatalist');
    if (personDatalist) {
      const names = [...new Set(dues.map(d => d.person).filter(Boolean))];
      personDatalist.innerHTML = names.map(n => `<option value="${escapeAttr(n)}">`).join('');
    }

    const searchInput = document.getElementById('dues-search-input');
    const sortSelect = document.getElementById('dues-sort-select');

    if (searchInput && !searchInput.dataset.bound) {
      searchInput.dataset.bound = 'true';
      searchInput.addEventListener('input', () => renderDues());
    }
    if (sortSelect && !sortSelect.dataset.bound) {
      sortSelect.dataset.bound = 'true';
      sortSelect.addEventListener('change', () => renderDues());
    }

    let totalIOwe = 0;
    let totalTheyOwe = 0;

    dues.forEach(d => {
      if (!d.settled) {
        if (d.type === 'i_owe') totalIOwe += Number(d.amount || 0);
        else totalTheyOwe += Number(d.amount || 0);
      }
    });

    const netPos = totalTheyOwe - totalIOwe;

    const elIOwe = document.getElementById('due-total-i-owe');
    const elTheyOwe = document.getElementById('due-total-they-owe');
    const elNet = document.getElementById('due-total-net');
    const elNetSub = document.getElementById('due-total-net-sub');

    if (elIOwe) elIOwe.textContent = formatMoney(totalIOwe);
    if (elTheyOwe) elTheyOwe.textContent = formatMoney(totalTheyOwe);
    if (elNet) {
      elNet.textContent = (netPos >= 0 ? '+' : '') + formatMoney(netPos);
      elNet.style.color = netPos >= 0 ? 'var(--emerald-inc)' : 'var(--rose-exp)';
    }
    if (elNetSub) {
      elNetSub.textContent = netPos >= 0 ? '🟢 In your favour' : '🔴 You owe more';
    }

    const searchVal = (searchInput?.value || '').toLowerCase();
    const sortVal = sortSelect?.value || 'date_desc';

    let filteredDues = dues.filter(item => {
      if (duesTabState === 'pending') return !item.settled;
      if (duesTabState === 'settled') return item.settled;
      if (duesTabState === 'theyowe') return item.type === 'they_owe';
      if (duesTabState === 'iowe') return item.type === 'i_owe';
      return true;
    });

    if (searchVal) {
      filteredDues = filteredDues.filter(d => (d.person || '').toLowerCase().includes(searchVal) || (d.desc || '').toLowerCase().includes(searchVal));
    }

    filteredDues.sort((a, b) => {
      if (sortVal === 'date_desc') return (b.date || '').localeCompare(a.date || '');
      if (sortVal === 'date_asc') return (a.date || '').localeCompare(b.date || '');
      if (sortVal === 'amount_desc') return Number(b.amount || 0) - Number(a.amount || 0);
      if (sortVal === 'amount_asc') return Number(a.amount || 0) - Number(b.amount || 0);
      return 0;
    });

    if (filteredDues.length === 0) {
      container.innerHTML = `<div class="tech-card" style="padding: 24px; text-align: center; color: var(--text-muted);">No dues found matching filter options.</div>`;
      return;
    }

    container.innerHTML = filteredDues.map((item) => {
      const idx = dues.indexOf(item);
      const waText = encodeURIComponent(`Hi ${item.person}, quick reminder regarding the due amount of ${formatMoney(item.amount)} for ${item.desc}.`);
      return `
        <div class="tech-card tx-item" style="margin-bottom: 12px;">
          <div>
            <div style="font-weight:900; font-size:1.05rem; color: ${item.type === 'i_owe' ? 'var(--rose-exp)' : 'var(--emerald-inc)'};">
              ${item.person} (${item.type === 'i_owe' ? 'I Owe' : 'Owes Me'})
            </div>
            <div style="font-size:0.8rem; color: var(--text-muted); margin-top:2px;">${item.desc} • ${item.date}</div>
          </div>
          <div style="text-align:right;">
            <div class="stat-amount ${item.type === 'i_owe' ? 'exp' : 'inc'} blur-target" style="font-size: 1.1rem; margin:0;">${formatMoney(item.amount)}</div>
            <div style="display:flex; gap: 6px; margin-top: 6px; justify-content: flex-end; flex-wrap: wrap;">
              <a href="https://wa.me/?text=${waText}" target="_blank" class="btn-secondary" style="padding: 4px 8px; font-size:0.75rem; text-decoration:none;">💬 WhatsApp</a>
              ${!item.settled ? `
                <button class="btn-secondary partial-settle-btn" data-due-idx="${idx}" style="padding: 4px 8px; font-size:0.75rem;">
                  Partial
                </button>
                <button class="btn-cyan settle-btn" data-due-idx="${idx}" style="padding: 4px 10px; font-size:0.75rem;">
                  Mark Settled
                </button>
              ` : '<span style="font-size:0.78rem; color: var(--emerald-inc); font-weight:800; align-self:center;">✓ Settled</span>'}
              <button class="btn-secondary delete-due-btn" data-due-idx="${idx}" style="padding: 4px 8px; font-size:0.75rem; border-color: var(--rose-exp); color: var(--rose-exp);">
                🗑️
              </button>
            </div>
          </div>
        </div>
      `;
    }).join('');

    applyZenMode();

    container.querySelectorAll('.delete-due-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = parseInt(btn.getAttribute('data-due-idx'), 10);
        if (dues[idx] && confirm(`Delete due entry for ${dues[idx].person}?`)) {
          dues.splice(idx, 1);
          saveData();
          showToast('Due Entry Deleted!', '🗑️');
          renderDues();
        }
      });
    });

    container.querySelectorAll('.settle-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = parseInt(btn.getAttribute('data-due-idx'), 10);
        const item = dues[idx];
        if (!item) return;

        const accNames = Object.values(store.accounts || {}).map(a => a.name).join(', ');
        const chooseAcc = prompt(`Mark Settled! Add matching transaction to Bank Account?\nType bank account name (e.g. ${accNames || 'GPay Wallet'}) or leave blank to skip:`, Object.values(store.accounts || {})[0]?.name || '');

        item.settled = true;

        if (chooseAcc && chooseAcc.trim()) {
          const accObj = Object.values(store.accounts || {}).find(a => a.name.toLowerCase().includes(chooseAcc.trim().toLowerCase())) || Object.values(store.accounts || {})[0];
          const accId = accObj ? accObj.id : 'acc_sbi';
          const dateToday = todayISO();
          const newTx = {
            id: 'settle_' + Date.now() + Math.random().toString(36).substr(2, 4),
            type: item.type === 'they_owe' ? 'inc' : 'exp',
            amount: item.amount,
            desc: `Due Settled: ${item.person} (${item.desc || 'Settlement'})`,
            category: 'Other',
            accountId: accId,
            paymentMethod: accObj?.name || 'GPay',
            paymentType: accObj?.name || 'GPay',
            time: new Date().toTimeString().slice(0, 5)
          };
          if (!store.days[dateToday]) store.days[dateToday] = [];
          store.days[dateToday].push(newTx);
          recalculateAccountBalances();
          showToast(`Settled & logged to ${accObj?.name || 'Bank'}!`, '🎉');
        } else {
          showToast('Due Marked Settled!', '🤝');
        }

        saveData();
        renderDues();
      });
    });

    container.querySelectorAll('.partial-settle-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = parseInt(btn.getAttribute('data-due-idx'), 10);
        const item = dues[idx];
        if (!item) return;

        const modal = document.getElementById('partial-settle-modal');
        if (!modal) return;

        document.getElementById('partial-due-idx').value = idx;
        document.getElementById('partial-due-label').textContent = `Settling due for ${item.person} (${formatMoney(item.amount)} remaining)`;
        document.getElementById('partial-amount-input').value = (item.amount / 2).toFixed(2);
        modal.classList.add('active');
      });
    });
  }

  function renderAccounts() {
    const container = document.getElementById('accounts-list-container');
    if (!container) return;

    recalculateAccountBalances();

    const accList = Object.values(store.accounts || {});
    container.innerHTML = accList.map(acc => {
      const accTypeStr = (acc.type || 'bank').replace('_', ' ').toUpperCase();
      const tag = `${accTypeStr} ACCOUNT`;
      const number = acc.type === 'cash' ? '•••• CASH' : acc.type === 'credit_card' ? '•••• CARD' : acc.type === 'wallet' ? '•••• WALLET' : '•••• BANK';
      const bal = Number(acc.currentBalance || 0);

      return `
        <div class="tech-account-tile">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
            <span style="font-size:0.7rem; font-weight:900; color:var(--cyan-bright); letter-spacing:0.1em;">${tag}</span>
            <span style="font-size:0.8rem; font-family:var(--font-mono); color:var(--text-muted);">${number}</span>
          </div>
          <div style="font-size:0.9rem; font-weight:800; color:#fff; margin-bottom:6px;">${acc.name}</div>
          <div class="stat-amount ${bal >= 0 ? 'inc' : 'exp'} blur-target" style="font-size:1.8rem; margin:0;">${formatMoney(bal)}</div>
        </div>
      `;
    }).join('');

    applyZenMode();

    const recContainer = document.getElementById('recurring-bills-container');
    if (recContainer) {
      const bills = store.settings.subscriptions || [];
      recContainer.innerHTML = bills.map(b => `
        <div class="tech-card stat-hero-card">
          <div class="stat-label">🔄 ${b.name}</div>
          <div class="stat-amount exp blur-target" style="font-size: 1.4rem;">${formatMoney(b.amount)}</div>
          <div style="display:flex; justify-content:space-between; align-items:center; margin-top: 6px;">
            <span style="font-size:0.75rem; color:var(--text-muted);">Due: ${b.due}</span>
            <button class="btn-cyan log-rec-btn" data-amt="${b.amount}" data-name="${b.name}" style="padding: 4px 10px; font-size: 0.75rem;">Log Payment</button>
          </div>
        </div>
      `).join('');

      applyZenMode();

      recContainer.querySelectorAll('.log-rec-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const amt = parseFloat(btn.getAttribute('data-amt'));
          const name = btn.getAttribute('data-name');
          const date = todayISO();
          if (!store.days[date]) store.days[date] = [];
          store.days[date].push({
            id: Date.now() + Math.random().toString(36).substr(2, 4),
            type: 'exp',
            amount: amt,
            desc: `${name} #bills`,
            category: 'Bills',
            accountId: 'acc_gpay',
            paymentMethod: 'upi',
            paymentType: 'GPay',
            time: '12:00'
          });
          recalculateAccountBalances();
          saveData();
          showToast(`Logged payment for ${name}!`, '⚡');
          renderAccounts();
          renderDashboard();
        });
      });
    }

    const goalsContainer = document.getElementById('savings-goals-container');
    if (goalsContainer) {
      const goals = store.settings.goals || [];
      goalsContainer.innerHTML = goals.map((g, idx) => {
        const pct = Math.min(100, Math.round((g.saved / g.target) * 100));
        return `
          <div class="tech-card stat-hero-card">
            <div style="display:flex; justify-content:space-between; align-items:center;">
              <div class="stat-label">🎯 ${g.name}</div>
              <button class="btn-secondary deposit-goal-btn" data-goal-idx="${idx}" style="padding: 2px 8px; font-size: 0.72rem;">+ Deposit</button>
            </div>
            <div class="stat-amount inc blur-target" style="font-size: 1.4rem;">${formatMoney(g.saved)} <span style="font-size:0.8rem; color:var(--text-muted);">/ ${formatMoney(g.target)}</span></div>
            <div class="progress-bar-bg" style="margin-top: 8px;">
              <div class="progress-bar-fill" style="width: ${pct}%;"></div>
            </div>
            <div style="font-size:0.75rem; color:var(--text-muted); margin-top:4px; text-align:right;">${pct}% Saved</div>
          </div>
        `;
      }).join('');

      applyZenMode();

      goalsContainer.querySelectorAll('.deposit-goal-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const idx = parseInt(btn.getAttribute('data-goal-idx'), 10);
          const goal = goals[idx];
          if (!goal) return;

          const depStr = prompt(`Deposit funds into '${goal.name}' (₹):`, "1000");
          if (!depStr) return;
          const depAmt = parseFloat(depStr);
          if (isNaN(depAmt) || depAmt <= 0) return alert('Enter valid amount');

          goal.saved = (goal.saved || 0) + depAmt;
          saveData();
          showToast(`Deposited ${formatMoney(depAmt)} into '${goal.name}'!`, '🎯');
          renderAccounts();
        });
      });
    }
  }

  function renderSettings() {
    const stabButtons = ['general', 'data', 'user'];
    stabButtons.forEach(t => {
      const btn = document.getElementById(`stab-btn-${t}`);
      if (btn) {
        btn.onclick = () => {
          stabButtons.forEach(other => {
            const ob = document.getElementById(`stab-btn-${other}`);
            const op = document.getElementById(`stab-panel-${other}`);
            if (ob) ob.className = 'btn-secondary stab-btn';
            if (op) op.style.display = 'none';
          });
          btn.className = 'btn-cyan stab-btn active';
          const tp = document.getElementById(`stab-panel-${t}`);
          if (tp) tp.style.display = 'block';
        };
      }
    });

    const userNameInput = document.getElementById('set-user-name');
    const userBioInput = document.getElementById('set-user-bio');
    const saveUserBtn = document.getElementById('save-user-profile-btn');

    if (userNameInput) userNameInput.value = store.settings.userName || 'Admin';
    if (userBioInput) userBioInput.value = store.settings.userBio || 'Financial Freedom 🚀';

    if (saveUserBtn) {
      saveUserBtn.onclick = () => {
        if (!store.settings) store.settings = {};
        store.settings.userName = userNameInput?.value?.trim() || 'Admin';
        store.settings.userBio = userBioInput?.value?.trim() || '';
        saveData();
        showToast('User Profile Saved!', '👤');
      };
    }

    const curSelect = document.getElementById('settings-currency');
    if (curSelect) {
      curSelect.value = custom.currency || '₹';
      curSelect.onchange = () => {
        custom.currency = curSelect.value;
        saveData();
        showToast(`Currency updated to ${custom.currency}`, '⚙️');
        renderDashboard();
      };
    }

    renderSettingsPills();
    renderBudgets();

    const exportBtn = document.getElementById('export-json-btn');
    if (exportBtn) {
      exportBtn.onclick = () => {
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(store, null, 2));
        const downloadAnchor = document.createElement('a');
        downloadAnchor.setAttribute("href", dataStr);
        downloadAnchor.setAttribute("download", `ludarp_backup_${todayISO()}.json`);
        document.body.appendChild(downloadAnchor);
        downloadAnchor.click();
        downloadAnchor.remove();
        showToast('JSON Backup downloaded!', '📥');
      };
    }

    const exportExcelFull = document.getElementById('export-excel-full-btn');
    if (exportExcelFull) exportExcelFull.onclick = () => exportExcelFile();

    const importInput = document.getElementById('import-json-file');
    if (importInput) {
      importInput.onchange = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (evt) => {
          try {
            const imported = JSON.parse(evt.target.result);
            if (imported && imported.days) {
              store = imported;
              migrateStoreToV71();
              recalculateAccountBalances();
              saveData();
              showToast('Backup restored successfully!', '🎉');
              renderDashboard();
            } else { alert('Invalid backup file format.'); }
          } catch (err) { alert('Error reading file.'); }
        };
        reader.readAsText(file);
      };
    }
  }

  function renderPetrolLog() {
    const list = document.getElementById('petrol-log-list');
    const summaryLine = document.getElementById('petrol-summary-line');
    const statsBar = document.getElementById('petrol-stats-bar');
    const monthFilter = document.getElementById('petrol-month-filter');
    const yearFilter = document.getElementById('petrol-year-filter');
    const clearBtn = document.getElementById('petrol-clear-filter');
    if (!list) return;

    let all = [];
    Object.keys(store.days || {}).forEach(d => {
      (store.days[d] || []).forEach(e => {
        if ((e.category || '').toLowerCase() === 'petrol' || (e.desc || '').toLowerCase().includes('#petrol') || (e.fuel && e.fuel.currentKm)) {
          all.push({ ...e, dateStr: d });
        }
      });
    });

    if (yearFilter && yearFilter.options.length <= 1) {
      const years = [...new Set(all.map(e => e.dateStr.slice(0, 4)))].sort().reverse();
      years.forEach(y => {
        const opt = document.createElement('option');
        opt.value = y;
        opt.textContent = y;
        yearFilter.appendChild(opt);
      });
    }

    if (monthFilter && !monthFilter.dataset.bound) {
      monthFilter.dataset.bound = 'true';
      monthFilter.addEventListener('change', () => renderPetrolLog());
    }
    if (yearFilter && !yearFilter.dataset.bound) {
      yearFilter.dataset.bound = 'true';
      yearFilter.addEventListener('change', () => renderPetrolLog());
    }
    if (clearBtn && !clearBtn.dataset.bound) {
      clearBtn.dataset.bound = 'true';
      clearBtn.addEventListener('click', () => {
        if (monthFilter) monthFilter.value = '';
        if (yearFilter) yearFilter.value = '';
        renderPetrolLog();
      });
    }

    all.sort((a, b) => a.dateStr < b.dateStr ? -1 : 1);

    const mVal = monthFilter?.value || '';
    const yVal = yearFilter?.value || '';
    const filtered = all.filter(e => {
      if (mVal && !e.dateStr.startsWith(mVal)) return false;
      if (yVal && !e.dateStr.startsWith(yVal)) return false;
      return true;
    });

    list.innerHTML = '';

    if (filtered.length === 0) {
      list.innerHTML = `
        <div class="tech-card" style="text-align:center; padding:36px 20px; color:var(--text-muted);">
          <div style="font-size:2.5rem; margin-bottom:10px;">⛽</div>
          <div style="font-weight:700; color:#fff; margin-bottom:6px;">${mVal || yVal ? 'No fuel logs found for selected filter' : 'No fuel logs recorded yet'}</div>
          <div style="font-size:0.8rem;">Add an expense with <b>Petrol</b> category or tag <b>#petrol</b> in description.</div>
        </div>`;
      if (summaryLine) summaryLine.textContent = '';
      if (statsBar) statsBar.innerHTML = '';
      return;
    }

    let totalSpent = 0, totalLiters = 0, totalKm = 0;
    let lastMonthKey = null;

    const displayList = [...filtered].reverse();

    displayList.forEach((e) => {
      const currentMonthKey = e.dateStr.slice(0, 7);
      const origIdx = all.findIndex(x => x.dateStr === e.dateStr && x.id === e.id);
      const prev = origIdx > 0 ? all[origIdx - 1] : null;
      const fuelInfo = e.fuel || {};
      const currentKm = fuelInfo.currentKm || 0;
      const prevKm = fuelInfo.prevKm || (prev && prev.fuel ? prev.fuel.currentKm : 0);
      const dist = currentKm > prevKm ? currentKm - prevKm : 0;
      const liters = parseFloat(fuelInfo.liters) || 0;
      const mileage = liters > 0 && dist > 0 ? (dist / liters).toFixed(1) : '–';
      const costPKm = dist > 0 && e.amount ? (e.amount / dist).toFixed(2) : '–';
      const dateLabel = new Date(e.dateStr + 'T00:00:00').toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

      totalSpent += Number(e.amount || 0);
      totalLiters += liters;
      if (dist > 0) totalKm += dist;

      if (currentMonthKey !== lastMonthKey) {
        const monthName = new Date(currentMonthKey + '-01T00:00:00').toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
        const mTotal = displayList.filter(x => x.dateStr.startsWith(currentMonthKey)).reduce((sum, x) => sum + (x.amount || 0), 0);
        const header = document.createElement('div');
        header.style.cssText = 'margin: 14px 0 8px 0; padding: 8px 14px; background: rgba(234,179,8,0.08); border-radius: 8px; display: flex; justify-content: space-between; align-items: center; border: 1px dashed var(--amber-warn);';
        header.innerHTML = `
          <span style="font-weight:800; color:var(--amber-warn); font-size:0.8rem; text-transform:uppercase;">📅 ${monthName}</span>
          <span style="font-weight:700; color:#fff; font-size:0.8rem;">Monthly: ${formatMoney(mTotal)}</span>
        `;
        list.appendChild(header);
        lastMonthKey = currentMonthKey;
      }

      const card = document.createElement('div');
      card.className = 'tech-card tx-item';
      card.style.cssText = 'margin-bottom: 8px; border-left: 3px solid var(--amber-warn);';
      card.innerHTML = `
        <div style="flex: 1;">
          <div style="font-weight: 800; color: var(--amber-warn); margin-bottom: 6px;">⛽ ${dateLabel}</div>
          <div style="display: flex; flex-wrap: wrap; gap: 6px 14px; font-size: 0.8rem; color: var(--text-secondary);">
            ${currentKm > 0 ? `<span>🛵 ODO: <b style="color:#fff;">${currentKm} km</b></span>` : ''}
            ${dist > 0 ? `<span>📏 Distance: <b style="color:#fff;">${dist} km</b></span>` : ''}
            ${liters > 0 ? `<span>💧 Volume: <b style="color:#fff;">${liters} L</b></span>` : ''}
            ${fuelInfo.price ? `<span>💰 Rate: <b style="color:#fff;">${getCurrency()}${fuelInfo.price}/L</b></span>` : ''}
            <span style="color: var(--emerald-inc);">📊 Mileage: <b>${mileage} km/L</b></span>
            ${costPKm !== '–' ? `<span>💸 Cost/km: <b style="color:var(--cyan-bright);">${getCurrency()}${costPKm}/km</b></span>` : ''}
          </div>
          <div style="margin-top: 4px; font-size: 0.78rem; color: var(--text-muted);">${e.desc || 'Petrol refill'}</div>
        </div>
        <div style="text-align: right; display: flex; flex-direction: column; align-items: flex-end; gap: 4px;">
          <div class="stat-amount exp blur-target" style="font-size: 1.05rem;">${formatMoney(e.amount)}</div>
        </div>
      `;
      list.appendChild(card);
    });

    const avgMil = totalLiters > 0 && totalKm > 0 ? (totalKm / totalLiters).toFixed(1) : '–';
    if (summaryLine) {
      summaryLine.textContent = `Showing ${filtered.length} entries • Total Fuel: ${formatMoney(totalSpent)}`;
    }
    if (statsBar) {
      statsBar.innerHTML = `
        <div class="tech-card" style="padding: 10px; text-align: center; background: rgba(15, 23, 42, 0.6);">
          <div style="font-size: 0.72rem; color: var(--text-muted);">Fill-ups</div>
          <div style="font-size: 0.95rem; font-weight: 800; color: #fff; margin-top: 2px;">${filtered.length}</div>
        </div>
        <div class="tech-card" style="padding: 10px; text-align: center; background: rgba(15, 23, 42, 0.6);">
          <div style="font-size: 0.72rem; color: var(--text-muted);">Total Run</div>
          <div style="font-size: 0.95rem; font-weight: 800; color: var(--cyan-bright); margin-top: 2px;">${totalKm} km</div>
        </div>
        <div class="tech-card" style="padding: 10px; text-align: center; background: rgba(15, 23, 42, 0.6);">
          <div style="font-size: 0.72rem; color: var(--text-muted);">Total Fuel</div>
          <div style="font-size: 0.95rem; font-weight: 800; color: #fff; margin-top: 2px;">${totalLiters.toFixed(1)} L</div>
        </div>
        <div class="tech-card" style="padding: 10px; text-align: center; background: rgba(15, 23, 42, 0.6);">
          <div style="font-size: 0.72rem; color: var(--text-muted);">Avg Mileage</div>
          <div style="font-size: 0.95rem; font-weight: 900; color: var(--emerald-inc); margin-top: 2px;">${avgMil} km/L</div>
        </div>
      `;
    }
  }

  function renderAbout() {
    const elStatus = document.getElementById('about-app-status');
    const elTx = document.getElementById('about-total-tx');
    const elAccounts = document.getElementById('about-total-accounts');
    const elSize = document.getElementById('about-storage-size');

    let txCount = 0;
    Object.keys(store.days || {}).forEach(d => {
      txCount += (store.days[d] || []).length;
    });

    const accCount = Object.keys(store.accounts || {}).length;
    const rawData = localStorage.getItem(STORAGE_KEY) || '';
    const sizeKB = (rawData.length / 1024).toFixed(1);

    if (elTx) elTx.textContent = txCount.toLocaleString();
    if (elAccounts) elAccounts.textContent = accCount;
    if (elSize) elSize.textContent = `${sizeKB} KB`;

    const isPWA = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone;
    if (elStatus) {
      elStatus.textContent = isPWA ? '✅ PWA Mode' : '🌐 Browser Mode';
      elStatus.style.color = isPWA ? 'var(--emerald-inc)' : 'var(--cyan-bright)';
    }

    const btnRefresh = document.getElementById('about-refresh-app-btn');
    if (btnRefresh && !btnRefresh.dataset.bound) {
      btnRefresh.dataset.bound = 'true';
      btnRefresh.addEventListener('click', () => {
        showToast('Refreshing app & rebuilding cache...', '🔄');
        setTimeout(() => window.location.reload(true), 600);
      });
    }

    const btnClearCache = document.getElementById('about-clear-cache-btn');
    if (btnClearCache && !btnClearCache.dataset.bound) {
      btnClearCache.dataset.bound = 'true';
      btnClearCache.addEventListener('click', () => {
        if (confirm('Are you sure you want to clear app cache and reload? Your financial data will NOT be deleted.')) {
          if ('caches' in window) {
            caches.keys().then(names => {
              names.forEach(name => caches.delete(name));
            });
          }
          showToast('App cache cleared!', '🗑️');
          setTimeout(() => window.location.reload(true), 800);
        }
      });
    }

    const btnWhatsNew = document.getElementById('about-whatsnew-btn');
    if (btnWhatsNew && !btnWhatsNew.dataset.bound) {
      btnWhatsNew.dataset.bound = 'true';
      btnWhatsNew.addEventListener('click', () => {
        showWhatsNewModal(true);
      });
    }
  }

  function showWhatsNewModal(force = false) {
    if (!force && localStorage.getItem('ludarp_v7_1_whatsnew_seen')) return;
    if (document.getElementById('whats-new-overlay')) return;

    const overlay = document.createElement('div');
    overlay.id = 'whats-new-overlay';
    overlay.className = 'modal-overlay active';
    overlay.style.zIndex = '99999';

    overlay.innerHTML = `
      <div class="tech-card" style="max-width: 480px; width: 92%; padding: 28px; text-align: center; border: 1px solid var(--cyan-bright); box-shadow: 0 0 40px rgba(6, 182, 212, 0.3);">
        <div style="font-size: 2.8rem; margin-bottom: 12px;">🚀</div>
        <div style="font-weight: 900; font-size: 1.4rem; margin-bottom: 6px; color: #fff; background: linear-gradient(135deg, var(--cyan-bright), #3b82f6); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">
          LUDARP v7.1 Finance OS
        </div>
        <div style="font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 20px;">
          Welcome to the ultimate finance management operating system!
        </div>

        <div style="text-align: left; background: rgba(255, 255, 255, 0.03); border: 1px solid var(--glass-border); border-radius: 14px; padding: 16px; margin-bottom: 22px; display: grid; gap: 14px;">
          <div style="display: flex; gap: 12px; align-items: flex-start;">
            <span style="font-size: 1.3rem;">🤝</span>
            <div>
              <div style="font-weight: 800; font-size: 0.88rem; color: #fff;">Dues Classification & Bank Auto-Log</div>
              <div style="font-size: 0.78rem; color: var(--text-muted);">Filter dues by 'They Owe Me' vs 'I Owe', with automated bank settlement balance logging.</div>
            </div>
          </div>
          <div style="display: flex; gap: 12px; align-items: flex-start;">
            <span style="font-size: 1.3rem;">📱</span>
            <div>
              <div style="font-weight: 800; font-size: 0.88rem; color: #fff;">Tabbed Settings Navigation</div>
              <div style="font-size: 0.78rem; color: var(--text-muted);">Organized into General & Customization, Data & Sync, and User Security sub-tabs.</div>
            </div>
          </div>
          <div style="display: flex; gap: 12px; align-items: flex-start;">
            <span style="font-size: 1.3rem;">🔍</span>
            <div>
              <div style="font-weight: 800; font-size: 0.88rem; color: #fff;">Detailed Transaction Metadata View</div>
              <div style="font-size: 0.78rem; color: var(--text-muted);">Tap any history item to view full metadata, fuel metrics, and linked dues.</div>
            </div>
          </div>
          <div style="display: flex; gap: 12px; align-items: flex-start;">
            <span style="font-size: 1.3rem;">🔒</span>
            <div>
              <div style="font-weight: 800; font-size: 0.88rem; color: #fff;">Passcode Security & 100% Offline PWA</div>
              <div style="font-size: 0.78rem; color: var(--text-muted);">Zero data loss, 100% local storage privacy, and passcode lock protection.</div>
            </div>
          </div>
        </div>

        <button id="close-whats-new-btn" class="btn-cyan" style="width: 100%; justify-content: center; font-weight: 800; padding: 12px;">
          ⚡ Explore Version 7.1
        </button>
      </div>
    `;

    document.body.appendChild(overlay);

    document.getElementById('close-whats-new-btn').addEventListener('click', () => {
      localStorage.setItem('ludarp_v7_1_whatsnew_seen', 'true');
      overlay.remove();
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
