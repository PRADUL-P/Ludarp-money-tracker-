'use strict';
/* budget.js
   Monthly budget tracking per category.
   - CRUD for budgets (stored in localStorage)
   - Shows spending progress bars vs budget
   - Alerts when over budget
   Depends on window.MT.db, window.MT.ui
*/

(function () {

  const BUDGET_KEY = 'mt_budgets_v1';

  /* ---- STORAGE ---- */
  function loadBudgets() {
    try {
      const r = localStorage.getItem(BUDGET_KEY);
      return r ? JSON.parse(r) : {};
      // Structure: { "2026-02": { "Food": 5000, "Travel": 2000 }, ... }
    } catch { return {}; }
  }
  function saveBudgets(data) {
    localStorage.setItem(BUDGET_KEY, JSON.stringify(data));
  }

  /* ---- HELPERS ---- */
  function currentMonth() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  }

  function getBudgetsForMonth(month) {
    const all = loadBudgets();
    return all[month] || {};
  }

  function getSpendingForMonth(month) {
    const db = window.MT.db;
    if (!db) return {};
    const store = db.loadStore();
    const cats = {};
    Object.keys(store.days || {}).forEach(dateStr => {
      if (!dateStr.startsWith(month)) return;
      (store.days[dateStr] || []).forEach(e => {
        if (e.type === 'Income' || e.type === 'Transfer') return;
        const cat = e.category || 'Uncategorized';
        cats[cat] = (cats[cat] || 0) + Number(e.amount || 0);
      });
    });
    return cats;
  }

  /* ---- UI RENDERING ---- */
  function getContainer() {
    return document.getElementById('budgetContainer');
  }

  function renderBudgetUI() {
    const container = getContainer();
    if (!container) return;

    const db = window.MT.db;
    const sym = db?.loadCustom().currency || '₹';
    const month = document.getElementById('budgetMonthPicker')?.value || currentMonth();

    const budgets = getBudgetsForMonth(month);
    const spending = getSpendingForMonth(month);
    const budgetKeys = Object.keys(budgets);

    // Combine all categories from budgets + spending for display
    const allCats = new Set([...budgetKeys, ...Object.keys(spending)]);

    // Fetch settings categories for the add-form dropdown
    const store = db?.loadStore();
    const categories = store?.settings?.categories || [];

    const totalBudget = budgetKeys.reduce((s, k) => s + (budgets[k] || 0), 0);
    const totalSpent = budgetKeys.reduce((s, k) => s + (spending[k] || 0), 0);
    const overallPct = totalBudget > 0 ? Math.min((totalSpent / totalBudget) * 100, 100) : 0;

    let html = `
      <div class="budget-header">
        <div>
          <div class="section-title">Monthly Budgets</div>
          ${totalBudget > 0 ? `
            <div style="font-size:13px;color:var(--muted);margin-top:-8px;margin-left:11px;">
              Overall: <strong style="color:var(--text)">${sym}${totalSpent.toFixed(2)}</strong>
              of <strong style="color:var(--text)">${sym}${totalBudget.toFixed(2)}</strong>
            </div>
          ` : ''}
        </div>
        <div style="display:flex;align-items:center;gap:10px;">
          <input type="month" id="budgetMonthPicker" value="${month}"
            style="max-width:160px;"
            onchange="window.MT.budget.renderBudgetUI()" />
        </div>
      </div>

      ${totalBudget > 0 ? `
        <div style="margin-bottom:16px;">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
            <span style="font-size:12px;font-weight:600;color:var(--muted);text-transform:uppercase;letter-spacing:0.6px;">Total Budget Progress</span>
            <span style="font-size:13px;font-weight:700;color:${totalSpent > totalBudget ? 'var(--danger)' : totalSpent / totalBudget > 0.8 ? 'var(--warning)' : 'var(--success)'}">
              ${overallPct.toFixed(0)}%
            </span>
          </div>
          <div class="budget-bar-wrap" style="height:12px;">
            <div class="budget-bar-fill ${totalSpent > totalBudget ? 'over' : totalSpent / totalBudget > 0.8 ? 'warn' : ''}"
              style="width:${overallPct}%"></div>
          </div>
        </div>
      ` : ''}

      <div class="budget-list">
        ${budgetKeys.length === 0 ? `
          <div class="budget-empty">
            <span>🎯</span>
            No budgets set for this month.<br>
            Add your first budget below.
          </div>
        ` : budgetKeys.map(cat => {
      const bud = budgets[cat] || 0;
      const spent = spending[cat] || 0;
      const pct = bud > 0 ? Math.min((spent / bud) * 100, 100) : 0;
      const overBudget = spent > bud;
      const nearLimit = !overBudget && spent / bud > 0.8;
      let barClass = overBudget ? 'over' : nearLimit ? 'warn' : '';
      let statusClass = overBudget ? 'over' : nearLimit ? 'warn' : 'ok';
      let statusText = overBudget
        ? `Over by ${sym}${(spent - bud).toFixed(2)}`
        : nearLimit
          ? `${sym}${(bud - spent).toFixed(2)} remaining (${(100 - pct).toFixed(0)}%)`
          : `${sym}${(bud - spent).toFixed(2)} remaining`;

      return `
          <div class="budget-item">
            <div class="budget-item-header">
              <div class="budget-item-title">
                <div style="width:10px;height:10px;border-radius:3px;background:${catColor(cat)};flex-shrink:0;"></div>
                ${cat}
              </div>
              <div style="display:flex;align-items:center;gap:10px;">
                <div class="budget-item-amounts">
                  <span class="spent">${sym}${spent.toFixed(2)}</span>
                  <span style="color:var(--muted)"> / ${sym}${bud.toFixed(2)}</span>
                </div>
                <button class="btn-small" onclick="window.MT.budget.deleteBudget('${cat}', '${month}')"
                  style="color:var(--danger);border-color:var(--danger-dim)">✕</button>
              </div>
            </div>
            <div class="budget-bar-wrap">
              <div class="budget-bar-fill ${barClass}" style="width:${pct}%"></div>
            </div>
            <div class="budget-status ${statusClass}" style="margin-top:6px;font-size:12px;font-weight:600">
              ${overBudget ? '⚠️' : nearLimit ? '⚡' : '✓'} ${statusText}
            </div>
          </div>
          `;
    }).join('')}
      </div>

      <div style="margin-top:20px;">
        <div class="section-title">Set Budget</div>
        <div class="budget-add-form" style="margin-top:12px;">
          <div>
            <label>Category</label>
            <select id="budgetCatSelect">
              ${categories.map(c => `<option>${c}</option>`).join('')}
              <option value="__custom__">+ Custom...</option>
            </select>
          </div>
          <div>
            <label>Budget Amount (${sym})</label>
            <input id="budgetAmount" type="number" min="0" step="0.01" placeholder="e.g. 5000" />
          </div>
          <div style="display:flex;align-items:flex-end;">
            <button class="btn-primary" style="width:100%" onclick="window.MT.budget.addBudget('${month}')">
              Set Budget
            </button>
          </div>
        </div>
        <div id="budgetStatus" class="modal-status" style="margin-top:8px;"></div>
      </div>
    `;

    container.innerHTML = html;

    // Custom category handler
    const catSel = document.getElementById('budgetCatSelect');
    if (catSel) {
      catSel.addEventListener('change', () => {
        if (catSel.value === '__custom__') {
          const val = prompt('Enter category name:');
          if (val && val.trim()) {
            const opt = document.createElement('option');
            opt.value = val.trim();
            opt.textContent = val.trim();
            catSel.insertBefore(opt, catSel.lastElementChild);
            catSel.value = val.trim();
          } else {
            catSel.value = categories[0] || '';
          }
        }
      });
    }
  }

  function catColor(cat) {
    const colors = ['#38bdf8', '#6366f1', '#a78bfa', '#34d399', '#fbbf24', '#f87171', '#818cf8', '#2dd4bf', '#fb923c'];
    let h = 0;
    for (let i = 0; i < cat.length; i++) h = cat.charCodeAt(i) + ((h << 5) - h);
    return colors[Math.abs(h) % colors.length];
  }

  /* ---- CRUD ---- */
  function addBudget(month) {
    const catEl = document.getElementById('budgetCatSelect');
    const amountEl = document.getElementById('budgetAmount');
    const statusEl = document.getElementById('budgetStatus');

    const cat = catEl?.value?.trim();
    const amount = parseFloat(amountEl?.value) || 0;

    if (!cat || cat === '__custom__') { if (statusEl) statusEl.textContent = '⚠️ Select a category'; return; }
    if (!amount || amount <= 0) { if (statusEl) statusEl.textContent = '⚠️ Enter a valid amount'; return; }

    const all = loadBudgets();
    if (!all[month]) all[month] = {};
    all[month][cat] = amount;
    saveBudgets(all);

    window.MT.ui?.showToast(`Budget set for ${cat}`);
    renderBudgetUI();

    // Check if already over budget
    const spending = getSpendingForMonth(month);
    const sym = window.MT.db?.loadCustom().currency || '₹';
    if (spending[cat] && spending[cat] > amount) {
      setTimeout(() => {
        window.MT.ui?.showToast(`⚠️ Already over ${cat} budget!`);
      }, 600);
    }
  }

  function deleteBudget(cat, month) {
    if (!confirm(`Remove budget for "${cat}"?`)) return;
    const all = loadBudgets();
    if (all[month]) {
      delete all[month][cat];
      if (Object.keys(all[month]).length === 0) delete all[month];
    }
    saveBudgets(all);
    renderBudgetUI();
  }

  /* ---- OVER-BUDGET ALERTS (called after each save) ---- */
  function checkBudgetAlerts() {
    const month = currentMonth();
    const budgets = getBudgetsForMonth(month);
    const spending = getSpendingForMonth(month);
    const sym = window.MT.db?.loadCustom().currency || '₹';

    Object.keys(budgets).forEach(cat => {
      const bud = budgets[cat];
      const spent = spending[cat] || 0;
      if (spent > bud) {
        // Only alert once per session
        const key = `mt_alert_${month}_${cat}`;
        if (!sessionStorage.getItem(key)) {
          sessionStorage.setItem(key, '1');
          setTimeout(() => {
            window.MT.ui?.showToast(`⚠️ Over budget: ${cat} (${sym}${spent.toFixed(2)} / ${sym}${bud.toFixed(2)})`);
          }, 800);
        }
      }
    });
  }

  /* ---- EXPORT ---- */
  window.MT = window.MT || {};
  window.MT.budget = {
    loadBudgets, saveBudgets,
    getBudgetsForMonth, getSpendingForMonth,
    renderBudgetUI, addBudget, deleteBudget,
    checkBudgetAlerts, currentMonth, catColor
  };

  /* ---- INIT ---- */
  window.addEventListener('mt:auth-entered', () => {
    // Check alerts on login
    checkBudgetAlerts();

    // Render UI when settings view opens
    window.addEventListener('mt:view-changed', (e) => {
      if (e.detail?.viewName === 'settings') renderBudgetUI();
    });
  });

  // Re-check after any entry change
  window.addEventListener('mt:entries-changed', () => {
    checkBudgetAlerts();
    // Re-render budget UI if open
    const container = getContainer();
    if (container && container.innerHTML) renderBudgetUI();
  });

})();
