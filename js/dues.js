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
  let duesSearch = '';
  let duesDateFrom = '';
  let duesDateTo = '';
  let duesAmtMin = '';
  let duesAmtMax = '';
  let duesSortBy = 'date_desc'; // 'date_desc'|'date_asc'|'amount_desc'|'amount_asc'
  let duesFilterOpen = false;

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

    // Filter list — type
    let filtered = all;
    if (activeFilter === 'pending') filtered = all.filter(d => !d.paid);
    if (activeFilter === 'i_owe') filtered = all.filter(d => !d.paid && d.type === 'i_owe');
    if (activeFilter === 'they_owe') filtered = all.filter(d => !d.paid && d.type === 'they_owe');
    if (activeFilter === 'paid') filtered = all.filter(d => d.paid);

    // Advanced filters
    if (duesSearch) {
      const q = duesSearch.toLowerCase();
      filtered = filtered.filter(d =>
        (d.person || '').toLowerCase().includes(q) ||
        (d.description || '').toLowerCase().includes(q) ||
        (d.note || '').toLowerCase().includes(q)
      );
    }
    if (duesDateFrom) filtered = filtered.filter(d => (d.date || '') >= duesDateFrom);
    if (duesDateTo)   filtered = filtered.filter(d => (d.date || '') <= duesDateTo);
    if (duesAmtMin !== '') filtered = filtered.filter(d => d.amount >= parseFloat(duesAmtMin));
    if (duesAmtMax !== '') filtered = filtered.filter(d => d.amount <= parseFloat(duesAmtMax));

    // Sort
    filtered = [...filtered].sort((a, b) => {
      if (duesSortBy === 'date_desc') return (b.date || '').localeCompare(a.date || '');
      if (duesSortBy === 'date_asc')  return (a.date || '').localeCompare(b.date || '');
      if (duesSortBy === 'amount_desc') return b.amount - a.amount;
      if (duesSortBy === 'amount_asc')  return a.amount - b.amount;
      return 0;
    });
    // Always push paid to bottom
    if (activeFilter === 'pending' || activeFilter === 'all') {
      filtered.sort((a, b) => (a.paid === b.paid) ? 0 : a.paid ? 1 : -1);
    }

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
      <div class="dues-filter-row" style="margin-bottom:10px; flex-wrap:wrap; gap:6px;">
        ${['pending', 'i_owe', 'they_owe', 'paid'].map(f => `
          <button class="dues-filter-btn ${activeFilter === f ? 'active' : ''}"
            onclick="window.MT.dues.setFilter('${f}')">
            ${{ pending: 'All Pending', i_owe: 'I Owe', they_owe: 'They Owe Me', paid: '\u2713 Settled' }[f]}
          </button>
        `).join('')}
        <button class="dues-filter-btn" style="margin-left:auto; ${duesFilterOpen ? 'background:var(--accent);color:#000;border-color:var(--accent);' : ''}" onclick="window.MT.dues.toggleFilter()">
          \uD83D\uDD0D ${duesFilterOpen ? 'Hide' : 'More Filters'}
        </button>
      </div>

      ${duesFilterOpen ? `
      <div style="background:var(--bg2); border:1px solid var(--card-border); border-radius:12px; padding:14px; margin-bottom:14px;">
        <div style="display:flex; gap:10px; flex-wrap:wrap;">
          <div style="flex:2; min-width:160px;">
            <label style="font-size:11px; color:var(--muted); display:block; margin-bottom:4px;">\uD83D\uDD0D Search person / description</label>
            <input id="duesSearchInput" type="text" value="${duesSearch}" placeholder="e.g. Rahul..." style="width:100%;" oninput="window.MT.dues.applyFilter()" />
          </div>
          <div style="flex:1; min-width:120px;">
            <label style="font-size:11px; color:var(--muted); display:block; margin-bottom:4px;">From Date</label>
            <input id="duesFromDate" type="date" value="${duesDateFrom}" style="width:100%;" onchange="window.MT.dues.applyFilter()" />
          </div>
          <div style="flex:1; min-width:120px;">
            <label style="font-size:11px; color:var(--muted); display:block; margin-bottom:4px;">To Date</label>
            <input id="duesToDate" type="date" value="${duesDateTo}" style="width:100%;" onchange="window.MT.dues.applyFilter()" />
          </div>
          <div style="flex:1; min-width:100px;">
            <label style="font-size:11px; color:var(--muted); display:block; margin-bottom:4px;">Min \u20b9</label>
            <input id="duesAmtMinInput" type="number" value="${duesAmtMin}" placeholder="0" step="1" style="width:100%;" oninput="window.MT.dues.applyFilter()" />
          </div>
          <div style="flex:1; min-width:100px;">
            <label style="font-size:11px; color:var(--muted); display:block; margin-bottom:4px;">Max \u20b9</label>
            <input id="duesAmtMaxInput" type="number" value="${duesAmtMax}" placeholder="\u221E" step="1" style="width:100%;" oninput="window.MT.dues.applyFilter()" />
          </div>
          <div style="flex:1; min-width:140px;">
            <label style="font-size:11px; color:var(--muted); display:block; margin-bottom:4px;">Sort By</label>
            <select id="duesSortBySelect" style="width:100%;" onchange="window.MT.dues.applyFilter()">
              <option value="date_desc" ${duesSortBy==='date_desc'?'selected':''}>Newest First</option>
              <option value="date_asc"  ${duesSortBy==='date_asc'?'selected':''}>Oldest First</option>
              <option value="amount_desc" ${duesSortBy==='amount_desc'?'selected':''}>Highest Amount</option>
              <option value="amount_asc"  ${duesSortBy==='amount_asc'?'selected':''}>Lowest Amount</option>
            </select>
          </div>
        </div>
        <div style="margin-top:10px; display:flex; justify-content:space-between; align-items:center;">
          <span style="font-size:12px; color:var(--muted); font-weight:600;">${filtered.length} result${filtered.length !== 1 ? 's' : ''}</span>
          <button class="btn-small" onclick="window.MT.dues.clearFilters()" style="font-size:11px; color:var(--danger); border-color:var(--danger);">\u2715 Clear All Filters</button>
        </div>
      </div>
      ` : ''}

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
                        <button class="due-pay-btn" style="background:var(--card-hover); color:var(--text);" title="Undo Settlement"
                          onclick="window.MT.dues.undoPaid('${due.id}')">↩ Undo</button>
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

    // Link back to main history (Entry page)
    if (window.MT.db) {
       const store = window.MT.db.loadStore();
       if (!store.days[date]) store.days[date] = [];
       store.days[date].push({
          id: `due_history_${Date.now()}`,
          dateStr: date,
          type: activeTab === 'i_owe' ? 'Income' : 'Expense',
          description: desc,
          category: activeTab === 'i_owe' ? 'Debt' : 'Loan',
          payMethod: 'Cash',
          amount: 0, // MINIMIZED as requested
          note: `Auto-linked due for ${person}`,
          createdAt: new Date().toISOString(),
          occasion: 'Direct Entry', // Tagged for linking settlement logic
          isLinkedDue: true
       });
       window.MT.db.saveStore(store);
       window.dispatchEvent(new Event('mt:entries-changed'));
    }

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

  function markPaid(id, headlessDate = null, headlessBank = 'Cash') {
    const list = loadDues();
    const due = list.find(d => d.id === id);
    if (!due) return;

    const isIncome = due.type === 'they_owe';
    const actionLabel = isIncome ? 'Received' : 'Paid';

    const executePayment = (chosenBank, customDate) => {
      const allDues = loadDues();
      const idx = allDues.findIndex(d => d.id === id);
      if (idx < 0) return;
      if (allDues[idx].paid) return; // Guard: already paid
      allDues[idx].paid = true;
      allDues[idx].paidDate = customDate;
      saveDues(allDues);

      const db = window.MT.db;
      if (db) {
        const store = db.loadStore();
        const settlementDesc = `Settled: ${due.description} (${due.person})`;

        // Find original entry category to inherit it
        const descMatch0 = due.description?.startsWith('Split: ') ? due.description.substring(7) : due.description;
        let originalCategory = 'Due settlement'; // fallback
        for (const dateK in store.days) {
          for (const entry of (store.days[dateK] || [])) {
            const isMatch = (entry.description === descMatch0 && entry.dateStr === due.date) ||
                            (entry.description?.startsWith(descMatch0) && entry.dateStr === due.date);
            if (isMatch && entry.category) { originalCategory = entry.category; break; }
          }
          if (originalCategory !== 'Due settlement') break;
        }

        // 1. Only create settlement transaction if one doesn't already exist
        const alreadyExists = (store.days[customDate] || []).some(e =>
          e.isDueSettlement && e.description === settlementDesc && Math.abs(e.amount - due.amount) < 0.01
        );
        if (!alreadyExists) {
          if (!store.days[customDate]) store.days[customDate] = [];
          store.days[customDate].push({
            id: Date.now() + Math.random(),
            dateStr: customDate,
            type: actionLabel === 'Received' ? 'Income' : 'Expense',
            description: settlementDesc,
            category: originalCategory,
            payMethod: 'Bank',
            paySubType: chosenBank,
            amount: due.amount,
            note: `Settled due with ${due.person} via ${chosenBank}`,
            createdAt: new Date().toISOString(),
            split: null,
            isDueSettlement: true,
            dueId: id
          });
        }

        // 2. Locate and Update the Original Source Transaction
        const descMatch = due.description?.startsWith('Split: ') ? due.description.substring(7) : due.description;
        for (const dateK in store.days) {
          store.days[dateK].forEach(e => {
            const isMatch = (e.description === descMatch && e.dateStr === due.date) ||
                          (e.description?.startsWith(descMatch) && e.dateStr === due.date);
            if (isMatch) {
              if (e.split?.enabled) {
                e.split.participants.forEach(p => {
                  if ((p.name || '').trim() === (due.person || '').trim()) p.received = true;
                });
                e.isSettled = e.split.participants.every(p => p.received);
              } else {
                e.isSettled = true;
                e.settledBy = due.person;
              }
            }
          });
        }

        db.saveStore(store);
        window.dispatchEvent(new Event('mt:entries-changed'));
      }

      window.MT.ui?.showToast(`\u2713 ${actionLabel}! \u20b9${due.amount.toFixed(0)} logged`, 'success');
      renderDuesView();
    };

    if (headlessDate) {
      executePayment(headlessBank, headlessDate);
      return;
    }

    // Show inline settlement panel instead of prompt()
    const itemEl = document.querySelector(`.due-item[data-id="${id}"]`);
    if (!itemEl) return;

    // Avoid duplicates
    if (itemEl.querySelector('.settle-panel')) {
      itemEl.querySelector('.settle-panel').remove();
      return;
    }

    const banks = window.MT.db?.loadStore()?.settings?.banks || ['Cash'];
    const panel = document.createElement('div');
    panel.className = 'settle-panel';
    panel.style.cssText = `
      background: var(--card-hover); border: 1px solid var(--accent);
      border-radius: 10px; padding: 12px; margin-top: 10px; grid-column: 1/-1;
    `;
    panel.innerHTML = `
      <div style="font-size:12px; font-weight:700; margin-bottom:8px; color:var(--accent);">
        ✓ Settle — ${isIncome ? 'Mark as Received' : 'Mark as Paid'}
      </div>
      <div style="display:flex; gap:8px; flex-wrap:wrap; align-items:flex-end;">
        <div style="flex:1; min-width:110px;">
          <label style="font-size:11px; color:var(--muted);">Account</label>
          <select id="settleBank_${id}" style="width:100%;">
            ${banks.map(b => `<option value="${b}">${b}</option>`).join('')}
          </select>
        </div>
        <div style="flex:1; min-width:120px;">
          <label style="font-size:11px; color:var(--muted);">Date</label>
          <input id="settleDate_${id}" type="date" value="${todayISO()}" style="width:100%;" />
        </div>
        <button id="settleConfirm_${id}" class="btn-primary" style="height:38px; padding:0 16px; font-size:13px;">✓ Confirm</button>
        <button id="settleCancel_${id}" class="btn-secondary" style="height:38px; padding:0 12px;">✕</button>
      </div>
    `;

    // Insert panel into the due item
    itemEl.appendChild(panel);

    document.getElementById(`settleCancel_${id}`)?.addEventListener('click', () => panel.remove());

    document.getElementById(`settleConfirm_${id}`)?.addEventListener('click', () => {
      const chosenBank = document.getElementById(`settleBank_${id}`)?.value || 'Cash';
      const customDate = document.getElementById(`settleDate_${id}`)?.value || todayISO();
      executePayment(chosenBank, customDate);
    });
  }

  function undoPaid(id, headless = false) {
    if (!headless && !confirm('Undo this settlement? This will also remove the transaction from your history.')) return false;

    const allDues = loadDues();
    const idx = allDues.findIndex(d => d.id === id);
    if (idx < 0) return;

    const due = allDues[idx];
    const paidDate = due.paidDate; // Date when it was marked paid 
    
    // 1. Unmark the due itself
    due.paid = false;
    due.paidDate = null;
    saveDues(allDues);

    const db = window.MT.db;
    if (db) {
      const store = db.loadStore();
      
      // 2. Remove the Settlement Transaction (Bank Record)
      if (paidDate && store.days[paidDate]) {
        const descMatchStr = `Settled: ${due.description} (${due.person})`;
        store.days[paidDate] = store.days[paidDate].filter(e => {
            return !(e.isDueSettlement && e.description.startsWith(descMatchStr) && Math.abs(e.amount - due.amount) < 0.01);
        });
        if (store.days[paidDate].length === 0) delete store.days[paidDate];
      }

      // 3. Locate and Un-update the Original Source Transaction
      const originalDescMatch = due.description?.startsWith('Split: ') ? due.description.substring(7) : due.description;
      
      // Look through all days to find original (similar to settle logic)
      for (const dateK in store.days) {
        store.days[dateK].forEach(e => {
          const isMatch = (e.description === originalDescMatch && e.dateStr === due.date) || 
                        (e.description?.startsWith(originalDescMatch) && e.dateStr === due.date);
          if (isMatch) {
            if (e.split?.enabled) {
              e.split.participants.forEach(p => {
                if ((p.name || '').trim() === (due.person || '').trim()) {
                  p.received = false;
                }
              });
              e.isSettled = e.split.participants.every(p => p.received);
            } else {
              e.isSettled = false;
              e.settledBy = null;
            }
          }
        });
      }

      db.saveStore(store);
      window.dispatchEvent(new Event('mt:entries-changed'));
    }

    window.MT.ui?.showToast('Settlement undone.', 'info');
    renderDuesView();
  }


  function deleteDue(id) {
    const itemEl = document.querySelector(`.due-item[data-id="${id}"]`);
    if (!itemEl) return;

    // If already showing confirm, go ahead and delete
    if (itemEl.querySelector('.delete-confirm')) {
      const list = loadDues();
      saveDues(list.filter(d => d.id !== id));
      window.MT.ui?.showToast('Deleted', 'warning');
      renderDuesView();
      return;
    }

    // Show inline confirm strip
    const strip = document.createElement('div');
    strip.className = 'delete-confirm';
    strip.style.cssText = 'display:flex; align-items:center; gap:8px; margin-top:8px; padding:8px 10px; background:rgba(244,63,94,0.08); border:1px solid var(--danger); border-radius:8px;';
    strip.innerHTML = `
      <span style="flex:1; font-size:12px; color:var(--danger); font-weight:600;">🗑 Delete this due?</span>
      <button class="btn-small" style="background:var(--danger); color:#fff; border:none; padding:4px 12px;">Yes</button>
      <button class="btn-small" style="padding:4px 12px;">No</button>
    `;
    itemEl.appendChild(strip);

    strip.querySelectorAll('.btn-small')[0].addEventListener('click', () => {
      const list = loadDues();
      saveDues(list.filter(d => d.id !== id));
      window.MT.ui?.showToast('Deleted', 'warning');
      renderDuesView();
    });
    strip.querySelectorAll('.btn-small')[1].addEventListener('click', () => strip.remove());
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

  /* ---- ADVANCED FILTER ACTIONS ---- */
  function toggleFilter() {
    duesFilterOpen = !duesFilterOpen;
    renderDuesView();
  }

  function applyFilter() {
    duesSearch    = (document.getElementById('duesSearchInput')?.value || '').trim();
    duesDateFrom  = document.getElementById('duesFromDate')?.value || '';
    duesDateTo    = document.getElementById('duesToDate')?.value || '';
    duesAmtMin    = document.getElementById('duesAmtMinInput')?.value || '';
    duesAmtMax    = document.getElementById('duesAmtMaxInput')?.value || '';
    duesSortBy    = document.getElementById('duesSortBySelect')?.value || 'date_desc';
    renderDuesView();
  }

  function clearFilters() {
    duesSearch = ''; duesDateFrom = ''; duesDateTo = '';
    duesAmtMin = ''; duesAmtMax = ''; duesSortBy = 'date_desc';
    renderDuesView();
  }

  /* ================================================================
     EXPOSE & INIT
  ================================================================ */
  window.MT = window.MT || {};
  window.MT.dues = {
    loadDues, saveDues,
    renderDuesView, setFilter, setAddTab,
    addDue, clearForm, markPaid, undoPaid, deleteDue,
    updateDuesBadge,
    toggleFilter, applyFilter, clearFilters
  };

  function initDues() {
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
  }

  // Handle both late load and event-based init
  if (document.getElementById('appRoot') && document.getElementById('appRoot').style.display !== 'none') {
    initDues();
  } else {
    window.addEventListener('mt:auth-entered', initDues);
  }

})();
