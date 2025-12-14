/* summary.js — Summary rendering, pie drawing, history list
   Expects global loadStore(), saveStore(), renderEntries(), startEdit(), toggleSplitReceived(), toggleAllSplit() if present.
   If not present it will still work with read-only rendering (exporter will still use loadStore).
*/
(function(){
  // DOM refs
  const DOM = {
    dateModeSelect: document.getElementById('dateMode'),
    monthPicker: document.getElementById('monthPicker'),
    yearPicker: document.getElementById('yearPicker'),
    monthPickerWrap: document.getElementById('monthPickerWrap'),
    yearPickerWrap: document.getElementById('yearPickerWrap'),
    filterPaymentSelect: document.getElementById('filterPayment'),
    filterCategorySelect: document.getElementById('filterCategory'),
    typeFilterSelect: document.getElementById('typeFilter'),
    categoryPieCanvas: document.getElementById('categoryPie'),
    categoryLegendEl: document.getElementById('categoryLegend'),
    summaryHistoryEl: document.getElementById('summaryHistory'),
    monthSumExpenseEl: document.getElementById('monthSumExpense'),
    monthSumIncomeEl: document.getElementById('monthSumIncome'),
    splitOutstandingEl: document.getElementById('splitOutstanding'),
    rowsPerPageSelect: document.getElementById('rowsPerPage'),
    summaryExportBtn: document.getElementById('summaryExportBtn'),
  };

  // Safe store loader (expects global loadStore)
  function loadStoreSafe(){ if(typeof loadStore === 'function') return loadStore(); try { const raw = localStorage.getItem('money_tracker_v3'); return raw?JSON.parse(raw):{version:1,days:{},settings:{}}; } catch(e){ return {version:1,days:{},settings:{}}; } }
  function currencyFmt(v){ const cur = (window.custom && window.custom.currency) || '₹'; return cur + Number(v||0).toFixed(2); }
  function formatDateLabel(dateStr){
    if(!dateStr) return '';
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString(undefined,{day:'2-digit',month:'short',year:'numeric'});
  }
  function allEntriesArray(){
    const s = loadStoreSafe(); const arr = [];
    Object.keys(s.days || {}).forEach(d=>{
      (s.days[d] || []).forEach(e => arr.push({ ...e, dateStr: d }));
    });
    return arr;
  }
  function getRowsPerPage(){ return parseInt(localStorage.getItem('rows_per_page') || (DOM.rowsPerPageSelect ? DOM.rowsPerPageSelect.value : '10'), 10); }

  // init controls
 function initSummaryControls(){
  const modeSel = DOM.dateModeSelect;
  const dayWrap = document.getElementById('dayPickerWrap');
  const monthWrap = DOM.monthPickerWrap;
  const yearWrap = DOM.yearPickerWrap;

  const dayInput = document.getElementById('dayPicker');
  const monthInput = DOM.monthPicker;
  const yearInput = DOM.yearPicker;

  function updateVisibility(){
    const mode = modeSel.value;

    dayWrap.style.display   = mode === 'day'   ? 'block' : 'none';
    monthWrap.style.display = mode === 'month' ? 'block' : 'none';
    yearWrap.style.display  = mode === 'year'  ? 'block' : 'none';

    renderSummary();
  }

  modeSel.addEventListener('change', updateVisibility);
  dayInput.addEventListener('change', renderSummary);
  monthInput.addEventListener('change', renderSummary);
  yearInput.addEventListener('change', renderSummary);

  DOM.filterPaymentSelect?.addEventListener('change', renderSummary);
  DOM.filterCategorySelect?.addEventListener('change', renderSummary);
  DOM.typeFilterSelect?.addEventListener('change', renderSummary);

  DOM.rowsPerPageSelect?.addEventListener('change', ()=>{
    localStorage.setItem('rows_per_page', DOM.rowsPerPageSelect.value);
    renderSummary();
  });

  DOM.summaryExportBtn?.addEventListener('click', ()=>{
    ExporterModule?.openExportModal();
  });

  updateVisibility(); // initial
}


  // main render
  function renderSummary(){
    const arr = allEntriesArray();
    const mode = DOM.dateModeSelect ? DOM.dateModeSelect.value : 'all';
    const monthVal = DOM.monthPicker ? DOM.monthPicker.value : '';
    const yearVal = DOM.yearPicker ? DOM.yearPicker.value : '';
    const dayVal = document.getElementById('dayPicker') ? document.getElementById('dayPicker').value : null;

    let filtered = arr.filter(e=>{
      if(mode === 'month' && monthVal) return e.dateStr.startsWith(monthVal);
      if(mode === 'year' && yearVal) return e.dateStr.startsWith(String(yearVal) + '-');
      if(mode === 'day' && dayVal) return e.dateStr === dayVal;
      return true;
    });

    const typeF = DOM.typeFilterSelect ? DOM.typeFilterSelect.value : 'all';
    if(typeF === 'Expense') filtered = filtered.filter(e => e.type === 'Expense' && (!e.split || !e.split.enabled));
    if(typeF === 'Income') filtered = filtered.filter(e => e.type === 'Income');
    if(typeF === 'Split') filtered = filtered.filter(e => e.split && e.split.enabled);
    if(typeF === 'Transfer') filtered = filtered.filter(e => e.type === 'Transfer');

    const payFilter = DOM.filterPaymentSelect ? DOM.filterPaymentSelect.value : 'All';
    if(payFilter && payFilter !== 'All') filtered = filtered.filter(e => e.payMethod === payFilter);

    // populate category dropdown based on filtered
    const cats = new Set(filtered.map(e => e.category || 'Uncategorized'));
    if(DOM.filterCategorySelect){
      const prev = DOM.filterCategorySelect.value || 'All';
      DOM.filterCategorySelect.innerHTML = '<option>All</option>';
      Array.from(cats).sort().forEach(c=>{
        const o = document.createElement('option'); o.value = c; o.textContent = c; DOM.filterCategorySelect.appendChild(o);
      });
      if(Array.from(DOM.filterCategorySelect.options).some(o=>o.value===prev)) DOM.filterCategorySelect.value = prev;
    }
    const catNow = DOM.filterCategorySelect ? DOM.filterCategorySelect.value : 'All';
    if(catNow && catNow !== 'All') filtered = filtered.filter(e => (e.category || 'Uncategorized') === catNow);

    // totals + category totals
    let totalExp = 0, totalInc = 0, splitOutstanding = 0;
    const categoryTotals = {};
    filtered.forEach(e=>{
      if(e.type === 'Income') totalInc += Number(e.amount||0);
      else if(e.type === 'Transfer') {}
      else totalExp += Number(e.amount||0);
      if(e.split && e.split.enabled){
        const notReceived = e.split.participants.filter(p => !p.received).reduce((a,p)=>a+(p.amount||0),0);
        splitOutstanding += notReceived;
      }
      const cat = e.category || 'Uncategorized';
      if(e.type !== 'Income' && e.type !== 'Transfer') categoryTotals[cat] = (categoryTotals[cat]||0) + Number(e.amount||0);
    });

    if(DOM.monthSumExpenseEl) DOM.monthSumExpenseEl.textContent = currencyFmt(totalExp);
    if(DOM.monthSumIncomeEl) DOM.monthSumIncomeEl.textContent = currencyFmt(totalInc);
    if(DOM.splitOutstandingEl) DOM.splitOutstandingEl.textContent = currencyFmt(splitOutstanding);

    drawCategoryPie(categoryTotals);
    renderHistoryList(filtered);
  }

  // pie draw with fixed logical size + DPR
  function drawCategoryPie(categoryTotals){
    const canvas = DOM.categoryPieCanvas;
    const legendEl = DOM.categoryLegendEl;
    if(!canvas || !legendEl) return;
    const ctx = canvas.getContext('2d');
    const logical = 320;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = logical * dpr;
    canvas.height = logical * dpr;
    canvas.style.width = logical + 'px';
    canvas.style.height = logical + 'px';
    ctx.setTransform(dpr,0,0,dpr,0,0);
    ctx.clearRect(0,0,logical,logical);

    const cats = Object.keys(categoryTotals);
    const total = cats.reduce((s,c)=> s + (categoryTotals[c]||0), 0);
    if(!cats.length || total <= 0){
      ctx.fillStyle = getComputedStyle(document.body).getPropertyValue('--card') || '#0b1220';
      ctx.beginPath(); ctx.arc(logical/2, logical/2, logical/2 - 8, 0, Math.PI*2); ctx.fill();
      legendEl.innerHTML = '<div class="info">No expense data for this filter.</div>';
      return;
    }

    const colors = {};
    cats.forEach((c,i)=> colors[c] = `hsl(${(i*47)%360} 80% 54%)`);
    const cx = logical/2, cy = logical/2, radius = logical/2 - 12;
    let start = -Math.PI/2;
    cats.forEach(cat=>{
      const val = categoryTotals[cat] || 0;
      const angle = (val/total) * Math.PI * 2;
      const end = start + angle;
      ctx.beginPath(); ctx.moveTo(cx,cy); ctx.arc(cx,cy,radius,start,end); ctx.closePath();
      ctx.fillStyle = colors[cat]; ctx.fill();
      start = end;
    });

    // legend
    legendEl.innerHTML = '';
    cats.forEach(cat=>{
      const val = categoryTotals[cat]||0;
      const pct = total ? ((val/total)*100).toFixed(1) : '0.0';
      const row = document.createElement('div'); row.className = 'legend-item';
      const left = document.createElement('div'); left.className = 'legend-left';
      const sw = document.createElement('div'); sw.style.width='12px'; sw.style.height='12px'; sw.style.borderRadius='3px'; sw.style.backgroundColor = colors[cat];
      left.appendChild(sw);
      const lab = document.createElement('div'); lab.style.marginLeft='8px'; lab.style.color = getComputedStyle(document.body).getPropertyValue('--text'); lab.textContent = cat;
      left.appendChild(lab);
      const right = document.createElement('div'); right.style.fontWeight='600'; right.textContent = currencyFmt(val) + ` (${pct}%)`;
      row.appendChild(left); row.appendChild(right);
      legendEl.appendChild(row);
    });
  }

  // history list rendering
  function renderHistoryList(entries){
    const el = DOM.summaryHistoryEl;
    if(!el) return;
    el.innerHTML = '';
    if(!entries || entries.length === 0){ el.innerHTML = '<div class="info">No entries for this filter.</div>'; return; }
    const sorted = [...entries].sort((a,b)=> a.dateStr === b.dateStr ? b.id - a.id : (a.dateStr < b.dateStr ? 1 : -1));
    const rows = getRowsPerPage();
    const paged = sorted.slice(0, rows);
    let cur = null;
    paged.forEach((e, idx)=>{
      if(e.dateStr !== cur){
        cur = e.dateStr;
        const dl = document.createElement('div'); dl.className = 'summary-history-date'; dl.textContent = formatDateLabel(cur);
        el.appendChild(dl);
      }
      const row = document.createElement('div'); row.className = 'entry';
      const left = document.createElement('div'); left.className = 'entry-main';
      const title = document.createElement('div'); title.className = 'entry-title'; title.textContent = `${(idx+1)}. ${e.description || ''}`;
      const meta = document.createElement('div'); meta.className = 'entry-meta';
      let metaText = `${e.type || ''} • ${(e.category || 'No category')} • ${e.payMethod || ''}` + (e.paySubType ? (' • '+e.paySubType) : '');
      if(e.mappedBank) metaText += ` • ${e.mappedBank}`;
      meta.textContent = metaText;
      left.appendChild(title); left.appendChild(meta);
      if(e.note){ const n = document.createElement('div'); n.className='entry-note'; n.textContent = e.note; left.appendChild(n); }

      if(e.split && e.split.enabled){
        const sp = document.createElement('div'); sp.className = 'entry-note';
        sp.textContent = `Split: your ${currencyFmt(e.split.myShare)} · to receive ${currencyFmt(e.split.participants.reduce((a,p)=>a+(p.amount||0),0))}`;
        left.appendChild(sp);

        e.split.participants.forEach((p,pidx)=>{
          const prow = document.createElement('div'); prow.style.display='flex'; prow.style.justifyContent='space-between'; prow.style.alignItems='center'; prow.style.marginTop='6px';
          const pleft = document.createElement('div'); pleft.textContent = `${p.name} — ${currencyFmt(p.amount)}`; pleft.style.color = 'var(--muted)';
          const pright = document.createElement('div'); const cb = document.createElement('input'); cb.type='checkbox'; cb.checked = !!p.received;
          cb.addEventListener('change', ()=> {
            if(typeof toggleSplitReceived === 'function'){ toggleSplitReceived(e.id, e.dateStr, pidx, cb.checked); }
            else { // fallback update in local store if possible
              const s = loadStoreSafe(); const day = s.days[e.dateStr]||[]; const idx = day.findIndex(x=>x.id===e.id); if(idx>=0 && day[idx].split) { day[idx].split.participants[pidx].received = cb.checked; if(typeof saveStore === 'function') saveStore(s); renderSummary(); if(typeof renderEntries === 'function') renderEntries(); }
            }
          });
          pright.appendChild(cb); prow.appendChild(pleft); prow.appendChild(pright); left.appendChild(prow);
        });

        const allRow = document.createElement('div'); allRow.style.marginTop='8px';
        const allChk = document.createElement('input'); allChk.type='checkbox';
        const allReceived = e.split.participants.every(p => p.received);
        allChk.checked = allReceived;
        allChk.addEventListener('change', ()=> {
          if(typeof toggleAllSplit === 'function'){ toggleAllSplit(e.id, e.dateStr, allChk.checked); }
          else {
            const s = loadStoreSafe(); const day = s.days[e.dateStr]||[]; const idx = day.findIndex(x=>x.id===e.id); if(idx>=0 && day[idx].split){ day[idx].split.participants.forEach(p=>p.received = allChk.checked); if(typeof saveStore === 'function') saveStore(s); renderSummary(); if(typeof renderEntries === 'function') renderEntries(); }
          }
        });
        allRow.appendChild(allChk);
        const allLbl = document.createElement('span'); allLbl.style.marginLeft='8px'; allLbl.textContent = 'Mark all received';
        allRow.appendChild(allLbl);
        left.appendChild(allRow);
      }

      if(e.type === 'Transfer' && e.transfer){
        const tr = document.createElement('div'); tr.className = 'entry-note'; tr.textContent = `Transfer: ${e.transfer.from || '-'} → ${e.transfer.to || '-'}`;
        left.appendChild(tr);
      }

      const right = document.createElement('div'); right.className = 'entry-right';
      const amt = document.createElement('div'); amt.className = 'entry-amount ' + (e.type==='Income' ? 'income' : (e.type==='Transfer' ? '' : 'expense'));
      amt.textContent = (e.type==='Income'?'+':'-') + currencyFmt(e.amount || 0);
      const edit = document.createElement('button'); edit.className='btn-small'; edit.innerHTML = `Edit`;
      edit.addEventListener('click', ()=> { if(typeof startEdit === 'function') startEdit(e.dateStr, e); else if(window.startEdit) window.startEdit(e.dateStr, e); });
      right.appendChild(amt); right.appendChild(edit);

      row.appendChild(left); row.appendChild(right); el.appendChild(row);
    });
  }

  // expose module
  window.SummaryModule = { initSummaryControls, renderSummary, drawCategoryPie, renderHistoryList };

  // auto init
  document.addEventListener('DOMContentLoaded', ()=> { initSummaryControls(); try{ renderSummary(); }catch(e){} });
})();
