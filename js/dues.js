'use strict';
/* dues.js
   Full "Dues" tracker — "I Owe" & "They Owe Me" entries.
   Features:
     - Add dues with person name, amount, description, type
     - Mark as paid (optionally log as expense/income in the main tracker)
     - Group by person with subtotals
     - Summary: total I owe vs total owed to me
     - Filter: All / I Owe / They Owe / Paid
   Stored in localStorage under 'mt_dues_v1'
   Depends on: window.MT.db, window.MT.ui
*/

(function () {

  const DUES_KEY = 'mt_dues_v1';

  /* ---- STORAGE ---- */
  function loadDues() {
    try { const r = localStorage.getItem(DUES_KEY); return r ? JSON.parse(r) : []; }
    catch { return []; }
  }
  function saveDues(list) { localStorage.setItem(DUES_KEY, JSON.stringify(list)); }

  /* ---- HELPERS ---- */
  function todayISO() {
    const d = new Date();
    return new Date(d - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
  }
  function fmtDate(iso) {
    if (!iso) return '';
    const d = new Date(iso + 'T00:00:00');
    return d.toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' });
  }
  function sym() { return window.MT?.db?.loadCustom()?.currency || '₹'; }
  function fmt(v) { return sym() + Number(v || 0).toFixed(2); }

  /* ---- STATE ---- */
  let activeFilter = 'pending'; // 'pending' | 'i_owe' | 'they_owe' | 'paid'
  let activeTab = 'i_owe';  // 'i_owe' | 'they_owe'  (on the add form)

  /* ================================================================
     RENDER MAIN VIEW
  ================================================================ */
  function renderDuesView() {
    const root = document.getElementById('view-dues');
    if (!root) return;

    const all = loadDues();
    const currency = sym();

    // Totals
    const pendingIOwe = all.filter(d => !d.paid && d.type === 'i_owe').reduce((s, d) => s + d.amount, 0);
    const pendingTheyOwe = all.filter(d => !d.paid && d.type === 'they_owe').reduce((s, d) => s + d.amount, 0);
    const net = pendingTheyOwe - pendingIOwe;

    // Filter list
    let filtered = all;
    if (activeFilter === 'pending') filtered = all.filter(d => !d.paid);
    if (activeFilter === 'i_owe') filtered = all.filter(d => !d.paid && d.type === 'i_owe');
    if (activeFilter === 'they_owe') filtered = all.filter(d => !d.paid && d.type === 'they_owe');
    if (activeFilter === 'paid') filtered = all.filter(d => d.paid);

    // Sort: unpaid first by date, paid last
    filtered = [...filtered].sort((a, b) => {
      if (a.paid !== b.paid) return a.paid ? 1 : -1;
      return (b.date || '').localeCompare(a.date || '');
    });

    // Group by person
    const groups = {};
    filtered.forEach(d => {
      const key = (d.person || 'Unknown').trim();
      if (!groups[key]) groups[key] = [];
      groups[key].push(d);
    });

    root.innerHTML = `
      <!-- SUMMARY STRIP -->
      <section class="card small-card no-hover" style="margin-bottom:14px;">
        <div class="dues-summary-strip">

          <div class="dues-stat dues-stat-iowe">
            <div class="dues-stat-label">I Owe</div>
            <div class="dues-stat-value">${fmt(pendingIOwe)}</div>
            <div class="dues-stat-sub">${all.filter(d => !d.paid && d.type === 'i_owe').length} pending</div>
          </div>

          <div class="dues-stat-divider"></div>

          <div class="dues-stat dues-net" style="flex:1.2;">
            <div class="dues-stat-label">Net Balance</div>
            <div class="dues-stat-value ${net >= 0 ? 'net-pos' : 'net-neg'}">${net >= 0 ? '+' : ''}${fmt(net)}</div>
            <div class="dues-stat-sub">${net >= 0 ? 'in your favour' : 'you owe more'}</div>
          </div>

          <div class="dues-stat-divider"></div>

          <div class="dues-stat dues-stat-theyowe">
            <div class="dues-stat-label">They Owe Me</div>
            <div class="dues-stat-value">${fmt(pendingTheyOwe)}</div>
            <div class="dues-stat-sub">${all.filter(d => !d.paid && d.type === 'they_owe').length} pending</div>
          </div>

        </div>
      </section>

      <!-- FILTER TABS -->
      <div class="dues-filter-row" style="margin-bottom:14px;">
        ${['pending', 'i_owe', 'they_owe', 'paid'].map(f => `
          <button class="dues-filter-btn ${activeFilter === f ? 'active' : ''}"
            onclick="window.MT.dues.setFilter('${f}')">
            ${{ pending: 'All Pending', i_owe: 'I Owe', they_owe: 'They Owe Me', paid: '✓ Settled' }[f]}
          </button>
        `).join('')}
      </div>

      <!-- DUE ENTRIES grouped by person -->
      <section class="card no-hover" style="padding:8px 12px;">
        ${Object.keys(groups).length === 0 ? `
          <div class="dues-empty">
            <span>🤝</span>
            <div>${activeFilter === 'paid' ? 'No settled dues yet.' : 'No pending dues. Great!'}</div>
            <div style="font-size:12px;color:var(--muted);margin-top:4px;">Use the form below to log a due.</div>
          </div>
        ` : Object.keys(groups).map(person => {
      const items = groups[person];
      const personTotal = items.filter(d => !d.paid).reduce((s, d) => s + (d.type === 'they_owe' ? 1 : -1) * d.amount, 0);
      const hasIOwe = items.some(d => !d.paid && d.type === 'i_owe');
      const hasTheyOwe = items.some(d => !d.paid && d.type === 'they_owe');

      return `
          <div class="dues-person-group">
            <div class="dues-person-header">
              <div class="dues-person-avatar">${person.charAt(0).toUpperCase()}</div>
              <div class="dues-person-name">${person}</div>
              <div class="dues-person-net ${personTotal >= 0 ? 'net-pos' : 'net-neg'}">
                ${personTotal >= 0 ? '+' : ''}${fmt(personTotal)}
              </div>
            </div>

            <div class="dues-items">
              ${items.map(due => `
                <div class="due-item ${due.paid ? 'due-paid' : ''} ${due.type === 'i_owe' ? 'due-iowe' : 'due-theyowe'}"
                     data-id="${due.id}">

                  <div class="due-item-left">
                    <div class="due-type-dot ${due.type === 'i_owe' ? 'dot-iowe' : 'dot-theyowe'}"></div>
                    <div class="due-item-info">
                      <div class="due-item-desc">${due.description || 'No description'}</div>
                      <div class="due-item-meta">
                        <span>${fmtDate(due.date)}</span>
                        ${due.occasion ? `<span class="due-meta-dot">•</span><span>${due.occasion}</span>` : ''}
                        ${due.note ? `<span class="due-meta-dot">•</span><span class="due-note">${due.note}</span>` : ''}
                        ${due.paid ? `<span class="due-meta-dot">•</span><span style="color:var(--success);font-weight:700;">Paid ${fmtDate(due.paidDate)}</span>` : ''}
                      </div>
                    </div>
                  </div>

                  <div class="due-item-right">
                    <div class="due-amount ${due.type === 'i_owe' ? 'iowe-amount' : 'theyowe-amount'}">
                      ${due.type === 'i_owe' ? '−' : '+'}${fmt(due.amount)}
                    </div>
                    ${!due.paid ? `
                      <div class="due-item-actions">
                        <button class="due-pay-btn" title="Mark as ${due.type === 'i_owe' ? 'paid' : 'received'}"
                          onclick="window.MT.dues.markPaid('${due.id}')">
                          ${due.type === 'i_owe' ? '✓ Paid' : '✓ Received'}
                        </button>
                        <button class="due-del-btn" title="Delete"
                          onclick="window.MT.dues.deleteDue('${due.id}')">✕</button>
                      </div>
                    ` : `
                      <div class="due-item-actions">
                        <button class="due-del-btn" title="Delete"
                          onclick="window.MT.dues.deleteDue('${due.id}')">✕</button>
                      </div>
                    `}
                  </div>
                </div>
              `).join('')}
            </div>
          </div>
          `;
    }).join('')}
      </section>

      <!-- ADD DUE FORM -->
      <section class="card" style="margin-top:6px;">
        <div class="section-title">Add Due</div>

        <!-- Type tabs -->
        <div class="dues-add-tabs">
          <button class="dues-add-tab ${activeTab === 'i_owe' ? 'active' : ''}"
            onclick="window.MT.dues.setAddTab('i_owe')">
            <span>💸</span> I Owe Someone
          </button>
          <button class="dues-add-tab ${activeTab === 'they_owe' ? 'active' : ''}"
            onclick="window.MT.dues.setAddTab('they_owe')">
            <span>💰</span> They Owe Me
          </button>
        </div>

        <div class="dues-add-form" style="margin-top:14px;">
          <div>
            <label>${activeTab === 'i_owe' ? 'Person I owe' : 'Person who owes me'}</label>
            <input id="duePerson" type="text" placeholder="e.g. Rahul, Mom, John..." list="duePersonList" />
            <datalist id="duePersonList">
              ${getKnownPeople().map(p => `<option value="${p}">`).join('')}
            </datalist>
          </div>
          <div>
            <label>Amount (${currency})</label>
            <input id="dueAmount" type="number" min="0" step="0.01" placeholder="0.00" />
          </div>
          <div class="full">
            <label>What for?</label>
            <input id="dueDesc" type="text" placeholder="e.g. Dinner at restaurant, Petrol, Movie tickets..." />
          </div>
          <div>
            <label>Date</label>
            <input id="dueDate" type="date" value="${todayISO()}" />
          </div>
          <div>
            <label>Occasion (optional)</label>
            <input id="dueOccasion" type="text" placeholder="e.g. Birthday lunch, Trip..." />
          </div>
          <div class="full">
            <label>Note (optional)</label>
            <input id="dueNote" type="text" placeholder="Any extra detail..." />
          </div>
        </div>

        <div style="display:flex;gap:10px;align-items:center;margin-top:14px;flex-wrap:wrap;">
          <button class="btn-primary" onclick="window.MT.dues.addDue()">
            ${activeTab === 'i_owe' ? '+ I Owe This' : '+ They Owe Me This'}
          </button>
          <button class="btn-secondary" onclick="window.MT.dues.clearForm()">Clear</button>
        </div>
        <div id="dueStatus" class="modal-status"></div>
      </section>
    `;
  }

  /* ---- Known people autocomplete ---- */
  function getKnownPeople() {
    const dues = loadDues();
    const set = new Set(dues.map(d => d.person).filter(Boolean));
    return Array.from(set).sort();
  }

  /* ================================================================
     ACTIONS
  ================================================================ */
  function setFilter(f) {
    activeFilter = f;
    renderDuesView();
  }

  function setAddTab(tab) {
    activeTab = tab;
    renderDuesView();
    // restore form values after re-render
  }

  function addDue() {
    const person = document.getElementById('duePerson')?.value.trim();
    const amount = parseFloat(document.getElementById('dueAmount')?.value) || 0;
    const desc = document.getElementById('dueDesc')?.value.trim();
    const date = document.getElementById('dueDate')?.value || todayISO();
    const occasion = document.getElementById('dueOccasion')?.value.trim();
    const note = document.getElementById('dueNote')?.value.trim();
    const statusEl = document.getElementById('dueStatus');

    if (!person) { if (statusEl) statusEl.textContent = '⚠️ Enter the person\'s name'; return; }
    if (!amount || amount <= 0) { if (statusEl) statusEl.textContent = '⚠️ Enter a valid amount'; return; }
    if (!desc) { if (statusEl) statusEl.textContent = '⚠️ Describe what this is for'; return; }

    const list = loadDues();
    list.push({
      id: `due_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      type: activeTab,     // 'i_owe' | 'they_owe'
      person, amount, description: desc,
      date, occasion, note,
      paid: false,
      paidDate: null,
      createdAt: new Date().toISOString()
    });
    saveDues(list);

    const label = activeTab === 'i_owe'
      ? `You owe ${person} ${fmt(amount)}`
      : `${person} owes you ${fmt(amount)}`;
    window.MT.ui?.showToast(label, 'success');

    // Keep filter on pending to show new entry
    activeFilter = 'pending';
    renderDuesView();
  }

  function clearForm() {
    ['duePerson', 'dueAmount', 'dueDesc', 'dueOccasion', 'dueNote'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.value = (id === 'dueAmount') ? '' : '';
    });
    const dateEl = document.getElementById('dueDate');
    if (dateEl) dateEl.value = todayISO();
    const statusEl = document.getElementById('dueStatus');
    if (statusEl) statusEl.textContent = '';
  }

  function markPaid(id) {
    const list = loadDues();
    const idx = list.findIndex(d => d.id === id);
    if (idx < 0) return;

    const due = list[idx];
    const currency = sym();

    // Ask if they want to log it as an expense/income too
    const isIncome = due.type === 'they_owe';
    const actionLabel = isIncome ? 'received' : 'paid';
    const logIt = confirm(
      `Mark as ${actionLabel}?\n\n` +
      `${isIncome
        ? `✓ ${due.person} paid you ${currency}${due.amount.toFixed(2)} for "${due.description}"`
        : `✓ You paid ${due.person} ${currency}${due.amount.toFixed(2)} for "${due.description}"`
      }\n\n` +
      `Click OK to mark as ${actionLabel}, Cancel to abort.`
    );
    if (!logIt) return;

    list[idx].paid = true;
    list[idx].paidDate = todayISO();
    saveDues(list);

    const db = window.MT.db;
    if (db) {
      const store = db.loadStore();

      // Prompt for account/bank and date
      const banks = store.settings?.banks || ['Cash'];
      const bankListIdx = prompt(`Choose account used for settlement:\n${banks.map((b, i) => `${i + 1}. ${b}`).join('\n')}\n(Enter number or name)`);

      let chosenBank = 'Cash';
      if (bankListIdx) {
        const idxVal = parseInt(bankListIdx) - 1;
        chosenBank = banks[idxVal] || bankListIdx;
      }
      const customDate = prompt(`Date of receipt/payment (YYYY-MM-DD):`, todayISO()) || todayISO();

      if (!store.days[customDate]) store.days[customDate] = [];
      store.days[customDate].push({
        id: Date.now() + Math.random(),
        dateStr: customDate,
        type: isIncome ? 'Income' : 'Expense',
        description: `${due.description} (${due.person})`,
        category: 'Due settlement',
        payMethod: 'Bank',
        paySubType: chosenBank,
        amount: due.amount,
        note: `Settled due with ${due.person} via ${chosenBank}`,
        createdAt: new Date().toISOString(),
        split: null,
        isDueSettlement: true
      });
      db.saveStore(store);
      window.dispatchEvent(new Event('mt:entries-changed'));
    }

    window.MT.ui?.showToast(`✓ Marked as paid!`, 'success');
    renderDuesView();
  }

  function deleteDue(id) {
    if (!confirm('Delete this due entry?')) return;
    const list = loadDues();
    saveDues(list.filter(d => d.id !== id));
    window.MT.ui?.showToast('Deleted', 'warning');
    renderDuesView();
  }

  /* ---- BADGE COUNT for nav ---- */
  function updateDuesBadge() {
    const list = loadDues();
    const count = list.filter(d => !d.paid).length;

    // Top nav badge
    const badge = document.getElementById('duesBadge');
    if (badge) {
      badge.textContent = count > 0 ? count : '';
      badge.style.display = count > 0 ? 'flex' : 'none';
    }

    // Bottom nav badge
    const badgeFn = document.getElementById('duesBadgeFn');
    if (badgeFn) {
      badgeFn.textContent = count > 0 ? count : '';
      badgeFn.style.display = count > 0 ? 'flex' : 'none';
    }
  }

  /* ================================================================
     EXPOSE & INIT
  ================================================================ */
  window.MT = window.MT || {};
  window.MT.dues = {
    loadDues, saveDues,
    renderDuesView, setFilter, setAddTab,
    addDue, clearForm, markPaid, deleteDue,
    updateDuesBadge
  };

  window.addEventListener('mt:auth-entered', () => {
    renderDuesView();
    updateDuesBadge();

    window.addEventListener('mt:view-changed', e => {
      if (e.detail?.viewName === 'dues') renderDuesView();
      updateDuesBadge();
    });

    window.addEventListener('mt:entries-changed', () => {
      updateDuesBadge();
      const view = document.getElementById('view-dues');
      if (view && view.classList.contains('active')) {
        renderDuesView();
      }
    });
  });

})();
