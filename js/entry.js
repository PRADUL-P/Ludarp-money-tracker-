'use strict';
/* entry.js
   Handles the entry form: rendering category pills, pay subtype, transfer UI, submit, clear,
   render entries for selected date, edit and delete.
   Depends on window.MT.db and window.MT.ui
*/

(function(){
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

  function initDatePickers(){
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth()+1).padStart(2,'0');
    const monthPicker = document.getElementById('monthPicker');
    if(monthPicker) monthPicker.value = `${y}-${m}`;
    if(dateInput) dateInput.value = db.todayISO();
    updateSelectedDateLabel();
    if(dateInput) dateInput.addEventListener('change', ()=> { updateSelectedDateLabel(); renderEntries(); });
  }
  function updateSelectedDateLabel(){ if(selectedDateLabel) selectedDateLabel.textContent = db.formatDateLabel(dateInput.value); }

  function renderCategoryPills(){
    const s = db.loadStore();
    const cats = s.settings && s.settings.categories ? s.settings.categories : db.DEFAULTS.settings.categories;
    if(!categoryPillsRow) return;
    categoryPillsRow.innerHTML='';
    cats.forEach(cat=>{
      const b = document.createElement('button'); b.type='button'; b.className='pill'; b.textContent=cat;
      b.addEventListener('click', ()=> { if(categoryEl) categoryEl.value = cat; });
      categoryPillsRow.appendChild(b);
    });
  }

  function updatePaySubTypeOptions(){
    if(!payMethodSelect) return;
    const s = db.loadStore();
    const method = payMethodSelect.value;
    let list = [], label='';
    if(method==='UPI'){ list = s.settings.upiApps; label='UPI app'; }
    else if(method==='Card'){ list = s.settings.cards; label='Card'; }
    else if(method==='Bank'){ list = s.settings.banks; label='Bank'; }
    else { if(paySubTypeWrap) paySubTypeWrap.style.display='none'; return; }
    paySubTypeLabel.textContent = label;
    paySubTypeSelect.innerHTML = '';
    list.forEach(i=>{ const o=document.createElement('option'); o.value=i; o.textContent=i; paySubTypeSelect.appendChild(o); });
    const customOpt = document.createElement('option'); customOpt.value='__custom__'; customOpt.textContent = '+ Custom...'; paySubTypeSelect.appendChild(customOpt);
    paySubTypeWrap.style.display='block';
    paySubTypeSelect.onchange = ()=>{
      if(paySubTypeSelect.value === '__custom__'){
        const val = prompt(`Enter new ${label}:`);
        if(val && val.trim()){
          const t = val.trim();
          const s2 = db.loadStore();
          if(method==='UPI' && !s2.settings.upiApps.includes(t)) s2.settings.upiApps.push(t);
          if(method==='Card' && !s2.settings.cards.includes(t)) s2.settings.cards.push(t);
          if(method==='Bank' && !s2.settings.banks.includes(t)) s2.settings.banks.push(t);
          db.saveStore(s2); renderSettingsUI(); updatePaySubTypeOptions();
          paySubTypeSelect.value = t;
        } else {
          paySubTypeSelect.value = list[0] || '';
        }
      }
    };
  }

  function updateTransferUI(){
    const method = payMethodSelect ? payMethodSelect.value : null;
    const wrap = document.getElementById('transferWrap');
    if(!wrap) return;
    if(method === 'Self transfer' || (typeEl && typeEl.value === 'Transfer')){
      wrap.style.display = 'block';
      const s = db.loadStore();
      const banks = s.settings && s.settings.banks ? s.settings.banks : db.DEFAULTS.settings.banks;
      const from = document.getElementById('transferFrom');
      const to = document.getElementById('transferTo');
      if(from && to){
        from.innerHTML = ''; to.innerHTML = '';
        banks.forEach(b=>{
          const o1 = document.createElement('option'); o1.value=b; o1.textContent=b; from.appendChild(o1);
          const o2 = document.createElement('option'); o2.value=b; o2.textContent=b; to.appendChild(o2);
        });
      }
    } else {
      wrap.style.display = 'none';
    }
  }

  // split UI
  isGroupCheckbox && isGroupCheckbox.addEventListener('change', ()=> {
    if(splitOptions) splitOptions.style.display = isGroupCheckbox.checked ? 'block' : 'none';
  });
  splitModeSelect && splitModeSelect.addEventListener('change', ()=>{
    const isCustom = splitModeSelect.value === 'custom';
    if(customSplitsDiv) customSplitsDiv.style.display = isCustom ? 'block' : 'none';
    if(myShareWrap) myShareWrap.style.display = isCustom ? 'block' : 'none';
  });

  // form submit
  form && form.addEventListener('submit', (e)=>{
    e.preventDefault();
    const dateStr = dateInput.value;
    if(!dateStr){ statusEl.textContent = 'Choose a date'; return; }
    const type = typeEl.value;
    const amountValue = parseFloat(amountEl.value) || 0;
    const description = descriptionEl.value.trim();
    const category = categoryEl.value.trim();
    const payMethod = payMethodSelect.value;
    const paySubType = (paySubTypeWrap.style.display==='none') ? '' : (paySubTypeSelect.value==='__custom__' ? '' : paySubTypeSelect.value);
    const note = noteInput.value.trim();

    if(!description || (!amountEl.value && type !== 'Transfer')){ statusEl.textContent = 'Enter description and amount'; return; }

    const transferFrom = document.getElementById('transferFrom') ? document.getElementById('transferFrom').value : '';
    const transferTo = document.getElementById('transferTo') ? document.getElementById('transferTo').value : '';

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
      split: null
    };

    // map payment to bank automatically if mapping exists
    const s = db.loadStore();
    const map = s.paymentBankMap || {};
    if(payMethod === 'UPI' && paySubType){
      const mapped = map[`upi:${paySubType}`];
      if(mapped) entry.mappedBank = mapped;
    }
    if(payMethod === 'Card' && paySubType){
      const mapped = map[`card:${paySubType}`];
      if(mapped) entry.mappedBank = mapped;
    }

    if(type === 'Transfer' || payMethod === 'Self transfer'){
      entry.type = 'Transfer';
      entry.amount = +amountValue;
      entry.transfer = { from: transferFrom || '', to: transferTo || '' };
    } else {
      if(isGroupCheckbox && isGroupCheckbox.checked){
        const participants = splitNamesInput.value.trim() ? splitNamesInput.value.split(',').map(s=>s.trim()).filter(Boolean) : [];
        if(participants.length === 0){ alert('Provide participants for split'); return; }

        if(splitModeSelect.value === 'equal'){
          const totalPeople = participants.length + 1;
          const per = +(amountValue / totalPeople).toFixed(2);
          const participantsSplit = participants.map(p => ({ name: p, amount: per, received: false }));
          const myShare = per;
          entry.amount = myShare;
          entry.split = { enabled: true, participants: participantsSplit, myShare: myShare, mode: 'equal', status: 'pending' };
        } else {
          const raw = splitAmountsInput.value.trim();
          if(!raw){ alert('Provide custom amounts for participants'); return; }
          const arr = raw.split(',').map(s => parseFloat(s.trim()) || 0);
          if(arr.length !== participants.length){ alert('Number of custom amounts must match participants'); return; }
          const participantsSplit = participants.map((p,i) => ({ name: p, amount: +arr[i].toFixed(2), received: false }));
          const sumOthers = arr.reduce((a,b)=>a+b,0);
          const myShare = +(amountValue - sumOthers).toFixed(2);
          if(myShare < 0){ alert('Custom amounts exceed total. Fix amounts.'); return; }
          entry.amount = myShare;
          entry.split = { enabled: true, participants: participantsSplit, myShare: myShare, mode: 'custom', status: (participantsSplit.every(p=>p.received)?'settled':'pending') };
        }
      } else {
        entry.amount = amountValue;
      }
    }

    if(currentEdit){
      const s2 = db.loadStore();
      const oldDate = currentEdit.dateStr;
      if(s2.days[oldDate]){ s2.days[oldDate] = s2.days[oldDate].filter(x => x.id !== currentEdit.id); if(s2.days[oldDate].length === 0) delete s2.days[oldDate]; }
      if(!s2.days[dateStr]) s2.days[dateStr] = [];
      s2.days[dateStr].push(entry);
      db.saveStore(s2);
      currentEdit = null;
      submitBtn.textContent = 'Save entry';
      statusEl.textContent = 'Updated ✓';
      ui.showToast('Updated');
    } else {
      const s2 = db.loadStore();
      if(!s2.days[dateStr]) s2.days[dateStr] = [];
      s2.days[dateStr].push(entry);
      db.saveStore(s2);
      statusEl.textContent = 'Saved ✓';
      ui.showToast('Saved');
    }

    form.reset(); if(splitOptions) splitOptions.style.display='none'; if(customSplitsDiv) customSplitsDiv.style.display='none'; if(myShareWrap) myShareWrap.style.display='none';
    updatePaySubTypeOptions(); updateTransferUI();
    renderCategoryPills(); renderEntries(); window.dispatchEvent(new Event('mt:entries-changed'));
  });

  clearBtn && clearBtn.addEventListener('click', ()=>{
    form.reset(); if(splitOptions) splitOptions.style.display='none'; if(customSplitsDiv) customSplitsDiv.style.display='none'; if(myShareWrap) myShareWrap.style.display='none';
    if(statusEl) statusEl.textContent = ''; currentEdit = null; submitBtn.textContent = 'Save entry';
  });

  // Render entries for the active day
  function renderEntries(){
    if(!entriesListEl) return;
    entriesListEl.innerHTML = '';
    const dateStr = dateInput.value;
    const s = db.loadStore();
    const entries = s.days[dateStr] || [];
    if(entries.length === 0){ entriesListEl.innerHTML = '<div class="info">No entries for this day.</div>'; updateDailySummary(entries); return; }

    entries.forEach(entry => {
      const row = document.createElement('div'); row.className = 'entry';
      const main = document.createElement('div'); main.className = 'entry-main';
      const title = document.createElement('div'); title.className = 'entry-title'; title.textContent = (entry.description || '').toUpperCase();
      let metaText = `${entry.type} • ${entry.category || 'No category'} • ${entry.payMethod}${entry.paySubType ? (' • ' + entry.paySubType) : ''}`;
      if(entry.mappedBank) metaText += ` • ${entry.mappedBank}`;
      const meta = document.createElement('div'); meta.className = 'entry-meta'; meta.textContent = metaText;
      main.appendChild(title); main.appendChild(meta);
      if(entry.note){ const n = document.createElement('div'); n.className = 'entry-note'; n.textContent = entry.note; main.appendChild(n); }
      if(entry.split && entry.split.enabled){
        const sdiv = document.createElement('div'); sdiv.className = 'entry-note'; sdiv.textContent = `Split: your share ${db.currencyFmt(entry.split.myShare)}, to receive ${db.currencyFmt(entry.split.participants.reduce((a,p)=>a+p.amount,0))}`;
        main.appendChild(sdiv);
        const pList = document.createElement('div'); pList.className = 'entry-note';
        pList.textContent = entry.split.participants.map(p => `${p.name}${p.received ? ' ✓' : ''} (${db.currencyFmt(p.amount)})`).join(' · ');
        main.appendChild(pList);
      }
      if(entry.type === 'Transfer' && entry.transfer){
        const tr = document.createElement('div'); tr.className = 'entry-note'; tr.textContent = `Transfer: ${entry.transfer.from || '-'} → ${entry.transfer.to || '-'}`;
        main.appendChild(tr);
      }

      const right = document.createElement('div'); right.className = 'entry-right';
      const amt = document.createElement('div'); amt.className = 'entry-amount ' + (entry.type==='Income' ? 'income' : (entry.type==='Transfer' ? '' : 'expense')); amt.textContent = (entry.type==='Income'?'+':'-') + db.currencyFmt(entry.amount);
      const actions = document.createElement('div'); actions.className = 'entry-actions';
      const editBtn = document.createElement('button'); editBtn.className = 'btn-small';
      editBtn.innerHTML = `<svg width="16" height="16" aria-hidden="true"><use href="#icon-edit"></use></svg> Edit`;
      editBtn.addEventListener('click', ()=> startEdit(dateInput.value, entry));
      const delBtn = document.createElement('button'); delBtn.className = 'btn-small';
      delBtn.innerHTML = `<svg width="16" height="16" aria-hidden="true"><use href="#icon-delete"></use></svg> Delete`;
      delBtn.addEventListener('click', ()=> { if(confirm('Delete this entry?')) { deleteEntry(dateInput.value, entry.id); }});
      actions.appendChild(editBtn); actions.appendChild(delBtn);
      right.appendChild(amt); right.appendChild(actions);

      row.appendChild(main); row.appendChild(right);
      entriesListEl.appendChild(row);
    });

    updateDailySummary(entries);
  }

  function updateDailySummary(entries){
    let exp = 0, inc = 0;
    entries.forEach(e => {
      if(e.type === 'Income') inc += e.amount;
      else if(e.type === 'Transfer') { /* ignore in totals */ }
      else exp += e.amount;
    });
    if(sumExpenseEl) sumExpenseEl.textContent = db.currencyFmt(exp);
    if(sumIncomeEl) sumIncomeEl.textContent = db.currencyFmt(inc);
    if(sumNetEl) sumNetEl.textContent = db.currencyFmt(inc - exp);
  }

  function startEdit(dateStr, entry){
    currentEdit = { id: entry.id, dateStr };
    // ensure entry view visible
    window.MT && window.MT.nav && window.MT.nav.showView && window.MT.nav.showView('entry');
    dateInput.value = dateStr; updateSelectedDateLabel();
    if(typeEl) typeEl.value = entry.type || 'Expense';
    if(entry.split && entry.split.enabled){
      const others = entry.split.participants.reduce((a,p) => a + (p.amount||0), 0);
      const total = +( (entry.split.myShare || 0) + others ).toFixed(2);
      amountEl.value = total;
      splitNamesInput.value = entry.split.participants.map(p => p.name).join(',');
      splitAmountsInput.value = entry.split.participants.map(p => p.amount).join(',');
      myShareInput.value = entry.split.myShare || '';
      splitModeSelect.value = entry.split.mode || 'custom';
      if(entry.split.mode === 'equal'){ customSplitsDiv.style.display='none'; myShareWrap.style.display='none'; }
      else { customSplitsDiv.style.display='block'; myShareWrap.style.display='block'; }
      isGroupCheckbox.checked = true; splitOptions.style.display='block';
    } else {
      amountEl.value = entry.amount || '';
      if(isGroupCheckbox) isGroupCheckbox.checked = false; if(splitOptions) splitOptions.style.display='none'; if(customSplitsDiv) customSplitsDiv.style.display='none'; if(myShareWrap) myShareWrap.style.display='none';
    }
    descriptionEl.value = entry.description || '';
    categoryEl.value = entry.category || '';
    payMethodSelect.value = entry.payMethod || 'Cash';
    updatePaySubTypeOptions();
    if(entry.paySubType) paySubTypeSelect.value = entry.paySubType;
    noteInput.value = entry.note || '';
    if(entry.type === 'Transfer' && entry.transfer){
      payMethodSelect.value = 'Self transfer';
      updateTransferUI();
      document.getElementById('transferFrom').value = entry.transfer.from || '';
      document.getElementById('transferTo').value = entry.transfer.to || '';
    } else {
      updateTransferUI();
    }
    submitBtn.textContent = 'Update entry';
    statusEl.textContent = 'Editing...';
  }

  function deleteEntry(dateStr, id){
    const s = db.loadStore();
    if(!s.days[dateStr]) return;
    s.days[dateStr] = s.days[dateStr].filter(e => e.id !== id);
    if(s.days[dateStr].length === 0) delete s.days[dateStr];
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
  window.addEventListener('mt:auth-entered', ()=>{
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

  // also refresh when entries change
  window.addEventListener('mt:entries-changed', renderEntries);

})();
// ✅ LIVE sync when settings change (categories / UPI / banks)
document.addEventListener('settingsUpdated', () => {
  if (!window.MT || !window.MT.entry) return;

  window.MT.entry.renderCategoryPills();
  window.MT.entry.updatePaySubTypeOptions();
  window.MT.entry.renderEntries();
});

// 🔥 AUTO-REFRESH when settings change (categories, UPI, banks)
document.addEventListener('settingsUpdated', () => {
  const s = window.MT?.db?.loadStore?.();
  if (!s) return;

  // Refresh categories
  renderCategoryPills();

  // Keep pay subtype in sync too
  updatePaySubTypeOptions();

  // Re-render entries to reflect category text changes
  renderEntries();
});
window.MT.entry = {
  initDatePickers,
  renderCategoryPills,
  updatePaySubTypeOptions,
  updateTransferUI,
  renderEntries,
  startEdit,
  deleteEntry
};
