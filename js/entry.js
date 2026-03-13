'use strict';
/* entry.js
   Handles the entry form: rendering category pills, pay subtype, transfer UI, submit, clear,
   render entries for selected date, edit and delete.
   Depends on window.MT.db and window.MT.ui
*/

(function () {
  const db = window.MT.db;
  const ui = window.MT.ui;

  // DOM refs
  const dateInput = document.getElementById('date');
  const selectedDateLabel = document.getElementById('selectedDateLabel');
  const sumExpenseEl = document.getElementById('sumExpense');
  const sumIncomeEl = document.getElementById('sumIncome');
  const sumNetEl = document.getElementById('sumNet');

  const form = document.getElementById('money-form');
  const typeEl = document.getElementById('type');
  const amountEl = document.getElementById('amount');
  const descriptionEl = document.getElementById('description');
  const categoryEl = document.getElementById('category');
  const categoryPillsRow = document.getElementById('category-pills');
  const payMethodSelect = document.getElementById('payMethod');
  const paySubTypeWrap = document.getElementById('paySubTypeWrap');
  const paySubTypeLabel = document.getElementById('paySubTypeLabel');
  const paySubTypeSelect = document.getElementById('paySubType');
  const noteInput = document.getElementById('note');
  const submitBtn = document.getElementById('submitBtn');
  const clearBtn = document.getElementById('clear-btn');
  const statusEl = document.getElementById('status');
  const entriesListEl = document.getElementById('entriesList');

  const isGroupCheckbox = document.getElementById('isGroup');
  const splitOptions = document.getElementById('splitOptions');
  const splitNamesInput = document.getElementById('splitNames');
  const splitModeSelect = document.getElementById('splitMode');
  const myShareInput = document.getElementById('myShare');
  const customSplitsDiv = document.getElementById('customSplits');
  const splitAmountsInput = document.getElementById('splitAmounts');
  const myShareWrap = document.getElementById('myShareWrap');

  let currentEdit = null;

  function initDatePickers() {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const monthPicker = document.getElementById('monthPicker');
    if (monthPicker) monthPicker.value = `${y}-${m}`;
    if (dateInput) dateInput.value = db.todayISO();
    updateSelectedDateLabel();
    if (dateInput) dateInput.addEventListener('change', () => { updateSelectedDateLabel(); renderEntries(); });
  }
  function updateSelectedDateLabel() { if (selectedDateLabel) selectedDateLabel.textContent = db.formatDateLabel(dateInput.value); }

  // --- Presets Rendering ---
  function renderPresets() {
    const container = document.getElementById('presetButtonsContainer');
    if (!container) return;
    const s = db.loadStore();
    const presets = s.settings?.presets || [];
    container.innerHTML = '';
    
    presets.forEach(p => {
       const b = document.createElement('button');
       b.type = 'button';
       b.className = 'btn-secondary preset-run-btn';
       b.style.cssText = 'flex:1; min-width:80px; font-size:12px; padding:10px; border:1px solid var(--card-border);';
       // Give petrol a distinct look if requested or just use defaults
       if (p.category.toLowerCase() === 'petrol') b.style.borderColor = 'var(--warning-dim)';
       
       b.textContent = p.label;
       b.onclick = () => {
           descriptionEl.value = p.description || '';
           categoryEl.value = p.category || '';
           amountEl.value = p.amount || '';
           noteInput.value = p.note || '';
           // Trigger panel visibility logic
           categoryEl.dispatchEvent(new Event('input', { bubbles: true }));
       };
       container.appendChild(b);
    });
  }

  function renderCategoryPills() {
    const s = db.loadStore();
    const cats = s.settings && s.settings.categories ? s.settings.categories : db.DEFAULTS.settings.categories;
    if (!categoryPillsRow) return;
    categoryPillsRow.innerHTML = '';
    cats.forEach(cat => {
      const pill = document.createElement('div');
    pill.className = 'pill';
    pill.textContent = cat;
    pill.addEventListener('click', () => {
      categoryEl.value = cat;
      // Manually trigger the input event so Petrol/Travel widgets show up
      categoryEl.dispatchEvent(new Event('input', { bubbles: true }));
      renderCategoryPills();
    });
    categoryPillsRow.appendChild(pill);
    });
  }

  function updatePaySubTypeOptions() {
    if (!payMethodSelect) return;
    const s = db.loadStore();
    const method = payMethodSelect.value;
    let list = [], label = '';
    if (method === 'UPI') { list = s.settings.upiApps; label = 'UPI app'; }
    else if (method === 'Card') { list = s.settings.cards; label = 'Card'; }
    else if (method === 'Bank') { list = s.settings.banks; label = 'Bank'; }
    else { if (paySubTypeWrap) paySubTypeWrap.style.display = 'none'; return; }
    paySubTypeLabel.textContent = label;
    paySubTypeSelect.innerHTML = '';
    list.forEach(i => { const o = document.createElement('option'); o.value = i; o.textContent = i; paySubTypeSelect.appendChild(o); });
    const customOpt = document.createElement('option'); customOpt.value = '__custom__'; customOpt.textContent = '+ Custom...'; paySubTypeSelect.appendChild(customOpt);
    paySubTypeWrap.style.display = 'block';
    paySubTypeSelect.onchange = () => {
      if (paySubTypeSelect.value === '__custom__') {
        const val = prompt(`Enter new ${label}:`);
        if (val && val.trim()) {
          const t = val.trim();
          const s2 = db.loadStore();
          if (method === 'UPI' && !s2.settings.upiApps.includes(t)) s2.settings.upiApps.push(t);
          if (method === 'Card' && !s2.settings.cards.includes(t)) s2.settings.cards.push(t);
          if (method === 'Bank' && !s2.settings.banks.includes(t)) s2.settings.banks.push(t);
          db.saveStore(s2); renderSettingsUI(); updatePaySubTypeOptions();
          paySubTypeSelect.value = t;
        } else {
          paySubTypeSelect.value = list[0] || '';
        }
      }
    };
  }

  function updateTransferUI() {
    const method = payMethodSelect ? payMethodSelect.value : null;
    const wrap = document.getElementById('transferWrap');
    if (!wrap) return;
    if (method === 'Self transfer' || (typeEl && typeEl.value === 'Transfer')) {
      wrap.style.display = 'block';
      const s = db.loadStore();
      const banks = s.settings && s.settings.banks ? s.settings.banks : db.DEFAULTS.settings.banks;
      const from = document.getElementById('transferFrom');
      const to = document.getElementById('transferTo');
      if (from && to) {
        from.innerHTML = ''; to.innerHTML = '';
        banks.forEach(b => {
          const o1 = document.createElement('option'); o1.value = b; o1.textContent = b; from.appendChild(o1);
          const o2 = document.createElement('option'); o2.value = b; o2.textContent = b; to.appendChild(o2);
        });
      }
    } else {
      wrap.style.display = 'none';
    }
  }

  // split UI
  isGroupCheckbox && isGroupCheckbox.addEventListener('change', () => {
    if (splitOptions) splitOptions.style.display = isGroupCheckbox.checked ? 'block' : 'none';
  });
  splitModeSelect && splitModeSelect.addEventListener('change', () => {
    const isCustom = splitModeSelect.value === 'custom';
    if (customSplitsDiv) customSplitsDiv.style.display = isCustom ? 'block' : 'none';
    if (myShareWrap) myShareWrap.style.display = isCustom ? 'block' : 'none';
  });

  // form submit
  form && form.addEventListener('submit', (e) => {
    e.preventDefault();
    const dateStr = dateInput.value;
    if (!dateStr) { statusEl.textContent = 'Choose a date'; return; }
    const type = typeEl.value;
    const amountValue = parseFloat(amountEl.value) || 0;
    const description = descriptionEl.value.trim();
    const category = categoryEl.value.trim();
    const payMethod = payMethodSelect.value;
    const paySubType = (paySubTypeWrap.style.display === 'none') ? '' : (paySubTypeSelect.value === '__custom__' ? '' : paySubTypeSelect.value);
    const note = noteInput.value.trim();

    // Fuel data
    const currentKm = parseFloat(document.getElementById('fuelCurrentKm')?.value) || 0;
    const liters = parseFloat(document.getElementById('fuelLiters')?.value) || 0;
    const prevKm = parseFloat(document.getElementById('fuelPrevKm')?.value) || 0;

    // Trip data
    const tripDate = document.getElementById('tripDate')?.value || null;

    if (!description || (!amountEl.value && type !== 'Transfer')) { statusEl.textContent = 'Enter description and amount'; return; }

    const transferFrom = document.getElementById('transferFrom') ? document.getElementById('transferFrom').value : '';
    const transferTo = document.getElementById('transferTo') ? document.getElementById('transferTo').value : '';
    
    // Quick handle for pure dues where they bypass the "split" checkbox but used the quick buttons
    let forceDuePerson = null;
    let forceDueType = window.pendingQuickDueType; // Capture the type immediately

    if (forceDueType && !isGroupCheckbox.checked) {
       const qdp = document.getElementById('quickDuePerson');
       forceDuePerson = qdp ? qdp.value.trim() : null;
       if (!forceDuePerson) {
          alert('Name is required to log a Due.');
          return;
       }
    }

    let entry = {
      id: currentEdit ? currentEdit.id : Date.now(),
      dateStr,
      type,
      description,
      category,
      payMethod,
      paySubType,
      amount: 0,
      note,
      createdAt: new Date().toISOString(),
      split: null,
      fuel: (category === 'Petrol' && currentKm > 0) ? { currentKm, liters, prevKm, mileage: (liters > 0 ? (currentKm - prevKm) / liters : 0) } : null,
      tripDate: (category === 'Travel' && tripDate) ? tripDate : null
    };

    // map payment to bank automatically if mapping exists
    const s = db.loadStore();
    const map = s.paymentBankMap || {};
    if (payMethod === 'UPI' && paySubType) {
      const mapped = map[`upi:${paySubType}`];
      if (mapped) entry.mappedBank = mapped;
    }
    if (payMethod === 'Card' && paySubType) {
      const mapped = map[`card:${paySubType}`];
      if (mapped) entry.mappedBank = mapped;
    }

    if (type === 'Transfer' || payMethod === 'Self transfer') {
      entry.type = 'Transfer';
      entry.amount = +amountValue;
      entry.transfer = { from: transferFrom || '', to: transferTo || '' };
    } else {
      if (isGroupCheckbox && isGroupCheckbox.checked) {
        const participants = splitNamesInput.value.trim() ? splitNamesInput.value.split(',').map(s => s.trim()).filter(Boolean) : [];
        if (participants.length === 0) { alert('Provide participants for split'); return; }

        let participantsSplit = [];
        let myShare = 0;

        if (splitModeSelect.value === 'equal') {
          const totalPeople = participants.length + 1;
          const per = +(amountValue / totalPeople).toFixed(2);
          participantsSplit = participants.map(p => ({ name: p, amount: per, received: false }));
          myShare = per;
        } else {
          const raw = splitAmountsInput.value.trim();
          if (!raw) { alert('Provide custom amounts for participants'); return; }
          const arr = raw.split(',').map(s => parseFloat(s.trim()) || 0);
          if (arr.length !== participants.length) { alert('Number of custom amounts must match participants'); return; }
          participantsSplit = participants.map((p, i) => ({ name: p, amount: +arr[i].toFixed(2), received: false }));
          const sumOthers = arr.reduce((a, b) => a + b, 0);
          myShare = +(amountValue - sumOthers).toFixed(2);
          if (myShare < 0) { alert('Custom amounts exceed total. Fix amounts.'); return; }
        }

        entry.amount = myShare;
        entry.split = { enabled: true, participants: participantsSplit, myShare: myShare, mode: splitModeSelect.value, status: 'pending' };

        // Link to Dues Tracker
        const linkToDues = document.getElementById('linkToDues');
        if (linkToDues && linkToDues.checked && window.MT.dues) {
          const duesList = window.MT.dues.loadDues();
          participantsSplit.forEach(p => {
            duesList.push({
              id: `due_split_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
              type: 'they_owe',
              person: p.name,
              amount: p.amount,
              description: `Split: ${description}`,
              date: dateStr,
              occasion: 'Split Payment',
              note: `From transaction: ${description}`,
              paid: false,
              paidDate: null,
              createdAt: new Date().toISOString()
            });
          });
          window.MT.dues.saveDues(duesList);
          window.MT.dues.updateDuesBadge();
        }
      } else {
        // Fallback for Quick Due if they didn't use split
        if (forceDuePerson && window.MT.dues) {
          // Minimise the value: user wants the entry itself to be 0 since it's a 100% due
          entry.amount = 0; 
          
          const duesList = window.MT.dues.loadDues();
          duesList.push({
            id: `due_quick_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
            type: forceDueType, // use the captured type
            person: forceDuePerson,
            amount: amountValue,
            description: description,
            date: dateStr,
            occasion: 'Direct Entry',
            note: note,
            paid: false,
            paidDate: null,
            createdAt: new Date().toISOString()
          });
          window.MT.dues.saveDues(duesList);
          window.MT.dues.updateDuesBadge();
        } else {
          entry.amount = amountValue;
        }
      }
    }

    if (typeof window.cancelQuickDue === 'function') window.cancelQuickDue();
    else window.pendingQuickDueType = null;

    if (currentEdit) {
      const s2 = db.loadStore();
      const oldDate = currentEdit.dateStr;
      if (s2.days[oldDate]) { s2.days[oldDate] = s2.days[oldDate].filter(x => x.id !== currentEdit.id); if (s2.days[oldDate].length === 0) delete s2.days[oldDate]; }
      if (!s2.days[dateStr]) s2.days[dateStr] = [];
      s2.days[dateStr].push(entry);
      db.saveStore(s2);
      currentEdit = null;
      submitBtn.textContent = 'Save entry';
      statusEl.textContent = 'Updated ✓';
      ui.showToast('Updated');
    } else {
      const s2 = db.loadStore();
      if (!s2.days[dateStr]) s2.days[dateStr] = [];
      s2.days[dateStr].push(entry);
      db.saveStore(s2);
      statusEl.textContent = 'Saved ✓';
      ui.showToast('Saved');
    }

    form.reset(); if (splitOptions) splitOptions.style.display = 'none'; if (customSplitsDiv) customSplitsDiv.style.display = 'none'; if (myShareWrap) myShareWrap.style.display = 'none';
    if (document.getElementById('fuelPanel')) document.getElementById('fuelPanel').style.display = 'none';
    if (document.getElementById('travelPresets')) document.getElementById('travelPresets').style.display = 'none';
    if (document.getElementById('tripDateWrap')) document.getElementById('tripDateWrap').style.display = 'none';

    updatePaySubTypeOptions(); updateTransferUI();
    renderCategoryPills(); renderEntries();
    window.dispatchEvent(new Event('mt:entries-changed'));
    window.dispatchEvent(new CustomEvent('mt:entry-added', { detail: entry }));
  });

  clearBtn && clearBtn.addEventListener('click', () => {
    form.reset(); if (splitOptions) splitOptions.style.display = 'none'; if (customSplitsDiv) customSplitsDiv.style.display = 'none'; if (myShareWrap) myShareWrap.style.display = 'none';
    if (statusEl) statusEl.textContent = ''; currentEdit = null; submitBtn.textContent = 'Save entry';
    if (typeof window.cancelQuickDue === 'function') window.cancelQuickDue();
  });

  // Render entries for the active day
  function renderEntries() {
    if (!entriesListEl) return;
    entriesListEl.innerHTML = '';
    const dateStr = dateInput.value;
    const s = db.loadStore();
    const entries = s.days[dateStr] || [];
    if (entries.length === 0) { entriesListEl.innerHTML = '<div class="info">No entries for this day.</div>'; updateDailySummary(entries); return; }

    entries.forEach(entry => {
      const row = document.createElement('div'); row.className = 'entry';
      const main = document.createElement('div'); main.className = 'entry-main';
      const title = document.createElement('div'); title.className = 'entry-title'; title.textContent = (entry.description || '').toUpperCase();
      let metaText = `${entry.type} • ${entry.category || 'No category'} • ${entry.payMethod}${entry.paySubType ? (' • ' + entry.paySubType) : ''}`;
      if (entry.mappedBank) metaText += ` • ${entry.mappedBank}`;
      const meta = document.createElement('div'); meta.className = 'entry-meta'; meta.textContent = metaText;
      main.appendChild(title); main.appendChild(meta);
      if (entry.note) { const n = document.createElement('div'); n.className = 'entry-note'; n.textContent = entry.note; main.appendChild(n); }
      if (entry.split && entry.split.enabled) {
        const sdiv = document.createElement('div'); sdiv.className = 'entry-note'; sdiv.textContent = `Split: your share ${db.currencyFmt(entry.split.myShare)}, to receive ${db.currencyFmt(entry.split.participants.reduce((a, p) => a + p.amount, 0))}`;
        main.appendChild(sdiv);
        const pList = document.createElement('div'); pList.className = 'entry-note';
        pList.textContent = entry.split.participants.map(p => `${p.name}${p.received ? ' ✓' : ''} (${db.currencyFmt(p.amount)})`).join(' · ');
        main.appendChild(pList);
      }
      if (entry.type === 'Transfer' && entry.transfer) {
        const tr = document.createElement('div'); tr.className = 'entry-note'; tr.textContent = `Transfer: ${entry.transfer.from || '-'} → ${entry.transfer.to || '-'}`;
        main.appendChild(tr);
      }

      const right = document.createElement('div'); right.className = 'entry-right';
      const amt = document.createElement('div'); amt.className = 'entry-amount ' + (entry.type === 'Income' ? 'income' : (entry.type === 'Transfer' ? '' : 'expense')); amt.textContent = (entry.type === 'Income' ? '+' : '-') + db.currencyFmt(entry.amount);
      const actions = document.createElement('div'); actions.className = 'entry-actions';
      const editBtn = document.createElement('button'); editBtn.className = 'btn-small';
      editBtn.innerHTML = `<svg width="16" height="16" aria-hidden="true"><use href="#icon-edit"></use></svg> Edit`;
      editBtn.addEventListener('click', () => startEdit(dateInput.value, entry));
      const delBtn = document.createElement('button'); delBtn.className = 'btn-small';
      delBtn.innerHTML = `<svg width="16" height="16" aria-hidden="true"><use href="#icon-delete"></use></svg> Delete`;
      delBtn.addEventListener('click', () => { if (confirm('Delete this entry?')) { deleteEntry(dateInput.value, entry.id); } });
      actions.appendChild(editBtn); actions.appendChild(delBtn);
      right.appendChild(amt); right.appendChild(actions);

      row.appendChild(main); row.appendChild(right);
      entriesListEl.appendChild(row);
    });

    updateDailySummary(entries);
  }

  function updateDailySummary(entries) {
    let exp = 0, inc = 0;
    entries.forEach(e => {
      if (e.type === 'Income') inc += e.amount;
      else if (e.type === 'Transfer') { /* ignore in totals */ }
      else exp += e.amount;
    });
    if (sumExpenseEl) sumExpenseEl.textContent = db.currencyFmt(exp);
    if (sumIncomeEl) sumIncomeEl.textContent = db.currencyFmt(inc);
    if (sumNetEl) sumNetEl.textContent = db.currencyFmt(inc - exp);
  }

  function startEdit(dateStr, entry) {
    currentEdit = { id: entry.id, dateStr };
    // Navigate to entry view first
    window.MT && window.MT.nav && window.MT.nav.showView && window.MT.nav.showView('entry');
    dateInput.value = dateStr; updateSelectedDateLabel();

    // --- Set type pill ---
    const entryType = entry.type || 'Expense';
    if (typeEl) typeEl.value = entryType;
    document.querySelectorAll('#type-pills button').forEach(b => {
      b.classList.toggle('active', b.dataset.value === entryType);
    });

    if (entry.split && entry.split.enabled) {
      const others = entry.split.participants.reduce((a, p) => a + (p.amount || 0), 0);
      const total = +((entry.split.myShare || 0) + others).toFixed(2);
      amountEl.value = total;
      splitNamesInput.value = entry.split.participants.map(p => p.name).join(',');
      splitAmountsInput.value = entry.split.participants.map(p => p.amount).join(',');
      myShareInput.value = entry.split.myShare || '';
      splitModeSelect.value = entry.split.mode || 'custom';
      if (entry.split.mode === 'equal') { customSplitsDiv.style.display = 'none'; myShareWrap.style.display = 'none'; }
      else { customSplitsDiv.style.display = 'block'; myShareWrap.style.display = 'block'; }
      isGroupCheckbox.checked = true; splitOptions.style.display = 'block';
    } else {
      amountEl.value = entry.amount || '';
      if (isGroupCheckbox) isGroupCheckbox.checked = false; if (splitOptions) splitOptions.style.display = 'none'; if (customSplitsDiv) customSplitsDiv.style.display = 'none'; if (myShareWrap) myShareWrap.style.display = 'none';
    }
    descriptionEl.value = entry.description || '';
    categoryEl.value = entry.category || '';
    // Trigger category input so petrol/travel panels show if needed
    categoryEl.dispatchEvent(new Event('input', { bubbles: true }));

    // --- Set pay method pill ---
    const pm = entry.payMethod || 'Cash';
    if (payMethodSelect) payMethodSelect.value = pm;
    document.querySelectorAll('#pay-pills button').forEach(b => {
      b.classList.toggle('active', b.dataset.value === pm);
    });

    updatePaySubTypeOptions();
    if (entry.paySubType) paySubTypeSelect.value = entry.paySubType;
    noteInput.value = entry.note || '';
    if (entry.type === 'Transfer' && entry.transfer) {
      payMethodSelect.value = 'Self transfer';
      updateTransferUI();
      document.getElementById('transferFrom').value = entry.transfer.from || '';
      document.getElementById('transferTo').value = entry.transfer.to || '';
    } else {
      updateTransferUI();
    }
    submitBtn.textContent = 'Update entry';
    statusEl.textContent = 'Editing...';

    // Scroll to form top
    const entryView = document.getElementById('view-entry');
    if (entryView) entryView.scrollTop = 0;
  }

  function deleteEntry(dateStr, id) {
    const s = db.loadStore();
    if (!s.days[dateStr]) return;
    s.days[dateStr] = s.days[dateStr].filter(e => e.id !== id);
    if (s.days[dateStr].length === 0) delete s.days[dateStr];
    db.saveStore(s);
    renderEntries(); window.dispatchEvent(new Event('mt:entries-changed'));
  }

  // expose helpers for other modules (e.g., accounts or summary need to call renderEntries)
  window.MT = window.MT || {};
  window.MT.entry = {
    initDatePickers, renderCategoryPills, updatePaySubTypeOptions, updateTransferUI, renderEntries,
    startEdit, deleteEntry
  };

  // init on auth-entered so DOM is visible
  window.addEventListener('mt:auth-entered', () => {
    initDatePickers();
    renderCategoryPills();
    updatePaySubTypeOptions();
    updateTransferUI();
    renderEntries();
    ui.ensureSelectColors();
    // listeners for pay method / type changes
    payMethodSelect && payMethodSelect.addEventListener('change', () => { updatePaySubTypeOptions(); updateTransferUI(); });
    typeEl && typeEl.addEventListener('change', updateTransferUI);
  });

  window.addEventListener('mt:entries-changed', renderEntries);
  
  // Quick Dues Buttons Logic
  window.pendingQuickDueType = null;
  const btnIOwe = document.getElementById('btnQuickIOwe');
  const btnTheyOwe = document.getElementById('btnQuickTheyOwe');
  const quickDueWrap = document.getElementById('quickDueWrap');
  const quickDueBtnRow = document.getElementById('quickDueBtnRow');
  const quickDuePerson = document.getElementById('quickDuePerson');
  const btnCancelQuickDue = document.getElementById('btnCancelQuickDue');
  const quickDueLabel = document.getElementById('quickDueLabel');
  const quickDuePersonList = document.getElementById('quickDuePersonList');

  function triggerQuickDue(typeVal) {
      if (document.getElementById('type')) document.getElementById('type').value = typeVal === 'i_owe' ? 'Income' : 'Expense';
      window.pendingQuickDueType = typeVal;
      
      if (quickDueWrap && quickDueBtnRow) {
         quickDueBtnRow.style.display = 'none';
         quickDueWrap.style.display = 'block';
         quickDueLabel.textContent = typeVal === 'i_owe' ? 'Person I owe' : 'Person who owes me';
         quickDueLabel.style.color = typeVal === 'i_owe' ? 'var(--danger)' : 'var(--success)';
         quickDueWrap.style.borderColor = typeVal === 'i_owe' ? 'var(--danger)' : 'var(--success)';
         
         if (window.MT && window.MT.dues && quickDuePersonList) {
             const known = [...new Set(window.MT.dues.loadDues().map(d => d.person).filter(Boolean))].sort();
             quickDuePersonList.innerHTML = known.map(p => `<option value="${p}">`).join('');
         }
         
         if (quickDuePerson) quickDuePerson.focus();
      }
      ui.showToast(typeVal === 'i_owe' ? 'Selected: I Owe (Income)' : 'Selected: They Owe Me (Expense)', 'info');
  }
  
  window.cancelQuickDue = function() {
      window.pendingQuickDueType = null;
      if (quickDuePerson) quickDuePerson.value = '';
      if (quickDueWrap) quickDueWrap.style.display = 'none';
      if (quickDueBtnRow) quickDueBtnRow.style.display = 'flex';
  };

  if (btnIOwe) btnIOwe.addEventListener('click', () => triggerQuickDue('i_owe'));
  if (btnTheyOwe) btnTheyOwe.addEventListener('click', () => triggerQuickDue('they_owe'));
  if (btnCancelQuickDue) btnCancelQuickDue.addEventListener('click', window.cancelQuickDue);

  // --- Fuel & Travel Special Logic ---
  const fuelPanel = document.getElementById('fuelPanel');
  const travelPresets = document.getElementById('travelPresets');
  const tripDateWrap = document.getElementById('tripDateWrap');

  categoryEl && categoryEl.addEventListener('input', () => {
      const cat = categoryEl.value.trim().toLowerCase();
      if (fuelPanel) fuelPanel.style.display = (cat === 'petrol') ? 'block' : 'none';
      if (tripDateWrap) tripDateWrap.style.display = (cat === 'travel') ? 'block' : 'none';
      
      if (cat === 'petrol') updateFuelContext();
  });

  function updateFuelContext() {
      const s = db.loadStore();
      let lastKm = 0;
      // Find latest petrol entry with ODO
      const allEntries = [];
      Object.keys(s.days).forEach(d => allEntries.push(...s.days[d]));
      const petrols = allEntries.filter(e => (e.category || '').toLowerCase() === 'petrol' && e.fuel && e.fuel.currentKm).sort((a,b) => new Date(b.dateStr) - new Date(a.dateStr));
      
      if (petrols.length > 0) {
          lastKm = petrols[0].fuel.currentKm;
      }
      const prevKmInput = document.getElementById('fuelPrevKm');
      if (prevKmInput) prevKmInput.value = lastKm;
  }

  const fuelCurrentKm = document.getElementById('fuelCurrentKm');
  const fuelLiters = document.getElementById('fuelLiters');
  const fuelStats = document.getElementById('fuelStats');

  function reCalcBusStats() {
      const cur = parseFloat(fuelCurrentKm.value) || 0;
      const prev = parseFloat(document.getElementById('fuelPrevKm').value) || 0;
      const l = parseFloat(fuelLiters.value) || 0;
      const amt = parseFloat(amountEl.value) || 0;
      
      if (cur > prev && l > 0) {
          const mil = (cur - prev) / l;
          const cpkm = amt / (cur - prev);
          fuelStats.innerHTML = `<span>📊 Mileage: ${mil.toFixed(1)} km/l</span> <span>💰 Cost: ₹${cpkm.toFixed(1)}/km</span>`;
      } else {
          fuelStats.innerHTML = '';
      }
  }

  fuelCurrentKm?.addEventListener('input', reCalcBusStats);
  fuelLiters?.addEventListener('input', reCalcBusStats);
  amountEl?.addEventListener('input', () => { if(categoryEl.value==='Petrol') reCalcBusStats(); });
  // --- Entry Pills Logic ---
  const typeInput = document.getElementById('type');
  const payMethodInput = document.getElementById('payMethod');
  
  function setupPills(containerId, inputId, callback) {
      const container = document.getElementById(containerId);
      const input = document.getElementById(inputId);
      if (!container || !input) return;
      
      container.addEventListener('click', (e) => {
          const btn = e.target.closest('button');
          if (!btn) return;
          
          container.querySelectorAll('button').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          input.value = btn.dataset.value;
          
          if (callback) callback(input.value);
      });
  }

  setupPills('type-pills', 'type', (val) => {
      // Any specific logic for type change
  });
  
  setupPills('pay-pills', 'payMethod', (val) => {
      updatePaySubTypeOptions();
      updateTransferUI();
  });

  // ✅ LIVE sync when settings change (categories / UPI / banks / presets)
  document.addEventListener('settingsUpdated', () => {
    renderCategoryPills();
    renderPresets();
    updatePaySubTypeOptions();
    renderEntries();
  });

  // Re-render whenever entries are changed globally
  window.addEventListener('mt:entries-changed', renderEntries);

  // --- 🧮 Mini Calculator Logic ---
  let calcInput = '0';
  let calcOp = null;
  let calcPrev = null;
  const cDisp = document.getElementById('calcDisplay');
  const mCalc = document.getElementById('miniCalc');
  const btnCT = document.getElementById('btnCalcToggle');

  function updateCalc() { if (cDisp) cDisp.textContent = calcInput; }

  window.MT = window.MT || {};
  window.MT.calc = {
      append: (v) => {
          if (calcInput === '0' && v !== '.') calcInput = v;
          else calcInput += v;
          updateCalc();
      },
      setOp: (op) => {
          calcPrev = parseFloat(calcInput);
          calcOp = op;
          calcInput = '0';
          updateCalc();
      },
      clear: () => { calcInput = '0'; calcOp = null; calcPrev = null; updateCalc(); },
      calculate: () => {
          const cur = parseFloat(calcInput);
          if (calcPrev !== null && calcOp) {
              let res = 0;
              if (calcOp === '+') res = calcPrev + cur;
              if (calcOp === '-') res = calcPrev - cur;
              if (calcOp === '*') res = calcPrev * cur;
              if (calcOp === '/') res = calcPrev / (cur || 1);
              calcInput = res.toFixed(2).replace(/\.00$/, '');
              updateCalc();
              calcOp = null;
              calcPrev = null;
              // Auto fill the amount input
              if (amountEl) amountEl.value = calcInput;
          }
      },
      close: () => { if (mCalc) mCalc.style.display = 'none'; },
      toggle: () => { 
          if (!mCalc) return;
          const isOff = mCalc.style.display === 'none';
          mCalc.style.display = isOff ? 'block' : 'none';
          if (isOff && amountEl && amountEl.value) {
              calcInput = amountEl.value;
              updateCalc();
          }
      }
  };

  btnCT?.addEventListener('click', () => window.MT.calc.toggle());

  // Init presets
  renderPresets();
})();
