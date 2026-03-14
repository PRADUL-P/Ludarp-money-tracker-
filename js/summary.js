/* summary.js — Summary rendering, pie drawing, history list
   Expects global loadStore(), saveStore(), renderEntries(), startEdit(), toggleSplitReceived(), toggleAllSplit() if present.
   If not present it will still work with read-only rendering (exporter will still use loadStore).
*/
(function () {
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
    trendChartCanvas: document.getElementById('trendChart'),
    summaryHistoryEl: document.getElementById('summaryHistory'),
    monthSumExpenseEl: document.getElementById('monthSumExpense'),
    monthSumIncomeEl: document.getElementById('monthSumIncome'),
    splitOutstandingEl: document.getElementById('splitOutstanding'),
    avgDailySpendEl: document.getElementById('avgDailySpend'),
    vsLastMonthEl: document.getElementById('vsLastMonth'),
    rowsPerPageSelect: document.getElementById('rowsPerPage'),
    summarySearchInput: document.getElementById('summarySearch'),
    summaryExportBtn: document.getElementById('summaryExportBtn'),
  };

  // Safe store loader (expects global loadStore)
  function loadStoreSafe() { if (typeof loadStore === 'function') return loadStore(); try { const raw = localStorage.getItem('money_tracker_v3'); return raw ? JSON.parse(raw) : { version: 1, days: {}, settings: {} }; } catch (e) { return { version: 1, days: {}, settings: {} }; } }
  function currencyFmt(v) { const cur = (window.custom && window.custom.currency) || '₹'; return cur + Number(v || 0).toFixed(2); }
  function formatDateLabel(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' });
  }
  function allEntriesArray() {
    const s = loadStoreSafe(); const arr = [];
    Object.keys(s.days || {}).forEach(d => {
      (s.days[d] || []).forEach(e => arr.push({ ...e, dateStr: d }));
    });
    return arr;
  }
  function getRowsPerPage() { return parseInt(localStorage.getItem('rows_per_page') || (DOM.rowsPerPageSelect ? DOM.rowsPerPageSelect.value : '10'), 10); }

  // init controls
  function initSummaryControls() {
    const modeSel = DOM.dateModeSelect;
    const dayWrap = document.getElementById('dayPickerWrap');
    const monthWrap = DOM.monthPickerWrap;
    const yearWrap = DOM.yearPickerWrap;

    const dayInput = document.getElementById('dayPicker');
    const monthInput = DOM.monthPicker;
    const yearInput = DOM.yearPicker;

    function updateVisibility() {
      const mode = modeSel.value;

      dayWrap.style.display = mode === 'day' ? 'block' : 'none';
      monthWrap.style.display = mode === 'month' ? 'block' : 'none';
      yearWrap.style.display = mode === 'year' ? 'block' : 'none';

      renderSummary();
    }

    modeSel.addEventListener('change', updateVisibility);
    dayInput.addEventListener('change', renderSummary);
    monthInput.addEventListener('change', renderSummary);
    yearInput.addEventListener('change', renderSummary);

    DOM.filterPaymentSelect?.addEventListener('change', renderSummary);
    DOM.filterCategorySelect?.addEventListener('change', renderSummary);
    DOM.typeFilterSelect?.addEventListener('change', renderSummary);

    DOM.rowsPerPageSelect?.addEventListener('change', () => {
      localStorage.setItem('rows_per_page', DOM.rowsPerPageSelect.value);
      renderSummary();
    });

    DOM.summaryExportBtn?.addEventListener('click', () => {
      ExporterModule?.openExportModal();
    });

    DOM.summarySearchInput?.addEventListener('input', renderSummary);

    updateVisibility(); // initial

    // Default to month
    if (modeSel) modeSel.value = 'month';
    if (monthInput) {
      monthInput.value = (window.MT && window.MT.db && window.MT.db.todayISO ? window.MT.db.todayISO() : new Date().toISOString()).slice(0, 7);
    }
    if (dayInput) {
      dayInput.value = (window.MT && window.MT.db && window.MT.db.todayISO ? window.MT.db.todayISO() : new Date().toISOString()).slice(0, 10);
    }
    updateVisibility();
  }


  // main render
  function renderSummary() {
    const arr = allEntriesArray();
    const mode = DOM.dateModeSelect ? DOM.dateModeSelect.value : 'all';
    const monthVal = DOM.monthPicker ? DOM.monthPicker.value : '';
    const yearVal = DOM.yearPicker ? DOM.yearPicker.value : '';
    const dayVal = document.getElementById('dayPicker') ? document.getElementById('dayPicker').value : null;

    let filtered = arr.filter(e => {
      if (mode === 'month' && monthVal) return e.dateStr.startsWith(monthVal);
      if (mode === 'year' && yearVal) return e.dateStr.startsWith(String(yearVal) + '-');
      if (mode === 'day' && dayVal) return e.dateStr === dayVal;
      return true;
    });

    const typeF = DOM.typeFilterSelect ? DOM.typeFilterSelect.value : 'all';
    if (typeF === 'Expense') filtered = filtered.filter(e => e.type === 'Expense' && (!e.split || !e.split.enabled));
    if (typeF === 'Income') filtered = filtered.filter(e => e.type === 'Income');
    if (typeF === 'Split') filtered = filtered.filter(e => e.split && e.split.enabled);
    if (typeF === 'Transfer') filtered = filtered.filter(e => e.type === 'Transfer');

    const payFilter = DOM.filterPaymentSelect ? DOM.filterPaymentSelect.value : 'All';
    if (payFilter && payFilter !== 'All') filtered = filtered.filter(e => e.payMethod === payFilter);

    // populate category dropdown based on current set
    const cats = new Set(filtered.map(e => e.category || 'Uncategorized'));
    if (DOM.filterCategorySelect) {
      const prev = DOM.filterCategorySelect.value || 'All';
      DOM.filterCategorySelect.innerHTML = '<option>All</option>';
      Array.from(cats).sort().forEach(c => {
        const o = document.createElement('option'); o.value = c; o.textContent = c; DOM.filterCategorySelect.appendChild(o);
      });
      if (Array.from(DOM.filterCategorySelect.options).some(o => o.value === prev)) DOM.filterCategorySelect.value = prev;
    }
    const catNow = DOM.filterCategorySelect ? DOM.filterCategorySelect.value : 'All';
    if (catNow && catNow !== 'All') filtered = filtered.filter(e => (e.category || 'Uncategorized') === catNow);

    // -- SEARCH FILTER --
    const searchQuery = (DOM.summarySearchInput?.value || '').toLowerCase().trim();
    if (searchQuery) {
      filtered = filtered.filter(e => 
        (e.description || '').toLowerCase().includes(searchQuery) ||
        (e.category || '').toLowerCase().includes(searchQuery) ||
        (e.note || '').toLowerCase().includes(searchQuery) ||
        (e.payMethod || '').toLowerCase().includes(searchQuery)
      );
    }

    // totals + category totals + daily totals for trend
    let totalExp = 0, totalInc = 0, splitOutstanding = 0;
    const categoryTotals = {};
    const dailyTotals = {};

    filtered.forEach(e => {
      if (e.type === 'Income') totalInc += Number(e.amount || 0);
      else if (e.type === 'Transfer') { }
      else totalExp += Number(e.amount || 0);

      if (e.split && e.split.enabled) {
        const notReceived = e.split.participants.filter(p => !p.received).reduce((a, p) => a + (p.amount || 0), 0);
        splitOutstanding += notReceived;
      }
      const cat = e.category || 'Uncategorized';
      if (e.type !== 'Income' && e.type !== 'Transfer') {
        categoryTotals[cat] = (categoryTotals[cat] || 0) + Number(e.amount || 0);
        dailyTotals[e.dateStr] = (dailyTotals[e.dateStr] || 0) + Number(e.amount || 0);
      }
    });

    if (DOM.monthSumExpenseEl) DOM.monthSumExpenseEl.textContent = currencyFmt(totalExp);
    if (DOM.monthSumIncomeEl) DOM.monthSumIncomeEl.textContent = currencyFmt(totalInc);
    if (DOM.splitOutstandingEl) DOM.splitOutstandingEl.textContent = currencyFmt(splitOutstanding);

    // Advanced Insight: Avg Daily Spend
    if (DOM.avgDailySpendEl) {
      let daysCount = 0;
      if (mode === 'month' && monthVal) {
        const year = parseInt(monthVal.split('-')[0]), month = parseInt(monthVal.split('-')[1]);
        const daysInMonth = new Date(year, month, 0).getDate();
        const today = new Date();
        const isCurrentMonth = today.toISOString().startsWith(monthVal);
        daysCount = isCurrentMonth ? today.getDate() : daysInMonth;
      } else if (mode === 'day') {
        daysCount = 1;
      } else {
        const uniqueDates = new Set(filtered.map(e => e.dateStr));
        daysCount = Math.max(uniqueDates.size, 1);
      }
      const avg = totalExp / (daysCount || 1);
      DOM.avgDailySpendEl.textContent = currencyFmt(avg);
    }

    drawTrendChart(dailyTotals, mode, monthVal, yearVal);
    drawCategoryPie(categoryTotals);
    renderHistoryList(filtered);

    // Advanced Insight: Vs Last Month (Only shows in Month mode)
    if (DOM.vsLastMonthEl) {
      if (mode === 'month' && monthVal) {
        const [y, m] = monthVal.split('-').map(Number);
        const prevMonthVal = m === 1 ? `${y - 1}-12` : `${y}-${String(m - 1).padStart(2, '0')}`;
        
        let prevTotal = 0;
        arr.filter(e => e.dateStr.startsWith(prevMonthVal)).forEach(e => {
          if (e.type === 'Expense' && (!e.split || !e.split.enabled)) prevTotal += Number(e.amount || 0);
          else if (e.split && e.split.enabled) prevTotal += Number(e.split.myShare || 0);
        });

        if (prevTotal > 0) {
          const diff = totalExp - prevTotal;
          const pct = (diff / prevTotal) * 100;
          const isUp = pct > 0;
          DOM.vsLastMonthEl.parentElement.style.display = 'block';
          DOM.vsLastMonthEl.innerHTML = `
            <span style="color:${isUp ? 'var(--danger)' : 'var(--success)'}; font-weight:800;">
              ${isUp ? '↑' : '↓'} ${Math.abs(pct).toFixed(0)}%
            </span>
            <span style="font-size:10px; color:var(--muted); margin-left:4px;">vs last month</span>
          `;
        } else {
          DOM.vsLastMonthEl.parentElement.style.display = 'none';
        }
      } else {
        DOM.vsLastMonthEl.parentElement.style.display = 'none';
      }
    }
  }



  function drawTrendChart(dailyTotals, mode, monthVal, yearVal) {
    const canvas = DOM.trendChartCanvas;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const parent = canvas.parentElement;
    const w = parent.clientWidth;
    const h = parent.clientHeight;

    const cs = getComputedStyle(document.body);
    const accent1 = cs.getPropertyValue('--accent-1').trim() || '#38bdf8';
    const accent2 = cs.getPropertyValue('--accent-2').trim() || '#6366f1';
    const muted = cs.getPropertyValue('--muted').trim() || '#5a7394';
    const border = cs.getPropertyValue('--card-border').trim() || 'rgba(255,255,255,0.07)';

    const dpr = window.devicePixelRatio || 1;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    canvas.style.width = w + 'px';
    canvas.style.height = h + 'px';
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, w, h);

    // Prepare data points based on mode
    let labels = [];
    let values = [];

    if (mode === 'month' && monthVal) {
      const year = parseInt(monthVal.split('-')[0]);
      const month = parseInt(monthVal.split('-')[1]);
      const daysInMonth = new Date(year, month, 0).getDate();
      for (let i = 1; i <= daysInMonth; i++) {
        const dateStr = `${monthVal}-${String(i).padStart(2, '0')}`;
        labels.push(i);
        values.push(dailyTotals[dateStr] || 0);
      }
    } else if (mode === 'year' && yearVal) {
      for (let i = 1; i <= 12; i++) {
        const monthPrefix = `${yearVal}-${String(i).padStart(2, '0')}`;
        labels.push(new Date(yearVal, i - 1).toLocaleString('default', { month: 'short' }));
        values.push(Object.keys(dailyTotals).reduce((sum, d) => d.startsWith(monthPrefix) ? sum + dailyTotals[d] : sum, 0));
      }
    } else {
      // For 'all' or 'day', just show the last 30 days of data if present
      const sortedDates = Object.keys(dailyTotals).sort();
      labels = sortedDates.slice(-30).map(d => d.split('-').slice(1).join('/'));
      values = sortedDates.slice(-30).map(d => dailyTotals[d]);
    }

    if (values.length === 0) return;

    const maxVal = Math.max(...values, 100);
    const padding = 30;
    const chartW = w - padding * 2;
    const chartH = h - padding * 2;
    const barW = (chartW / values.length) * 0.8;
    const gap = (chartW / values.length) * 0.2;

    // Draw bars
    values.forEach((v, i) => {
      const barH = (v / maxVal) * chartH;
      const x = padding + i * (barW + gap);
      const y = h - padding - barH;

      const grad = ctx.createLinearGradient(x, y, x, h - padding);
      grad.addColorStop(0, accent1);
      grad.addColorStop(1, accent2);

      ctx.fillStyle = grad;
      ctx.beginPath();
      // Rounded top bars
      const radius = Math.min(barW / 2, 4);
      ctx.moveTo(x, h - padding);
      ctx.lineTo(x, y + radius);
      ctx.quadraticCurveTo(x, y, x + radius, y);
      ctx.lineTo(x + barW - radius, y);
      ctx.quadraticCurveTo(x + barW, y, x + barW, y + radius);
      ctx.lineTo(x + barW, h - padding);
      ctx.fill();

      // Labels for few items
      if (values.length <= 15) {
        ctx.fillStyle = muted;
        ctx.font = '10px Inter';
        ctx.textAlign = 'center';
        ctx.fillText(labels[i], x + barW / 2, h - padding + 15);
      }
    });

    // Baseline
    ctx.strokeStyle = border;
    ctx.beginPath();
    ctx.moveTo(padding, h - padding);
    ctx.lineTo(w - padding, h - padding);
    ctx.stroke();
  }


  // pie draw with fixed logical size + DPR
  function drawCategoryPie(categoryTotals) {
    const canvas = DOM.categoryPieCanvas;
    const legendEl = DOM.categoryLegendEl;
    if (!canvas || !legendEl) return;
    const ctx = canvas.getContext('2d');
    const logical = 320;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = logical * dpr;
    canvas.height = logical * dpr;
    canvas.style.width = logical + 'px';
    canvas.style.height = logical + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, logical, logical);

    const cats = Object.keys(categoryTotals);
    const total = cats.reduce((s, c) => s + (categoryTotals[c] || 0), 0);
    if (!cats.length || total <= 0) {
      ctx.fillStyle = getComputedStyle(document.body).getPropertyValue('--card') || '#0b1220';
      ctx.beginPath(); ctx.arc(logical / 2, logical / 2, logical / 2 - 8, 0, Math.PI * 2); ctx.fill();
      legendEl.innerHTML = '<div class="info">No expense data for this filter.</div>';
      return;
    }

    const colors = {};
    cats.forEach((c, i) => colors[c] = `hsl(${(i * 47) % 360} 80% 54%)`);
    const cx = logical / 2, cy = logical / 2, radius = logical / 2 - 12;
    let start = -Math.PI / 2;
    cats.forEach(cat => {
      const val = categoryTotals[cat] || 0;
      const angle = (val / total) * Math.PI * 2;
      const end = start + angle;
      ctx.beginPath(); ctx.moveTo(cx, cy); ctx.arc(cx, cy, radius, start, end); ctx.closePath();
      ctx.fillStyle = colors[cat]; ctx.fill();
      start = end;
    });

    // legend
    legendEl.innerHTML = '';
    cats.forEach(cat => {
      const val = categoryTotals[cat] || 0;
      const pct = total ? ((val / total) * 100).toFixed(1) : '0.0';
      const row = document.createElement('div'); row.className = 'legend-item';
      const left = document.createElement('div'); left.className = 'legend-left';
      const sw = document.createElement('div'); sw.style.width = '12px'; sw.style.height = '12px'; sw.style.borderRadius = '3px'; sw.style.backgroundColor = colors[cat];
      left.appendChild(sw);
      const lab = document.createElement('div'); lab.style.marginLeft = '8px'; lab.style.color = getComputedStyle(document.body).getPropertyValue('--text'); lab.textContent = cat;
      left.appendChild(lab);
      const right = document.createElement('div'); right.style.fontWeight = '600'; right.textContent = currencyFmt(val) + ` (${pct}%)`;
      row.appendChild(left); row.appendChild(right);
      legendEl.appendChild(row);
    });
  }

  const CAT_ICONS = {
    'food': '🍔', 'dining': '🍕', 'grocery': '🛒', 'groceries': '🛒',
    'travel': '✈️', 'transport': '🚗', 'fuel': '⛽', 'petrol': '⛽',
    'rent': '🏠', 'emi': '💳', 'loan': '🤝', 'debt': '🤝',
    'shopping': '🛍️', 'online': '📦', 'amazon': '📦',
    'health': '🏥', 'medicine': '💊', 'medical': '🏥',
    'salary': '💰', 'income': '💹', 'bonus': '🎁',
    'entertainment': '🎬', 'movie': '🍿', 'sports': '⚽',
    'utilities': '💡', 'bills': '🧾', 'recharge': '📱', 'mobile': '📱',
    'others': '📁', 'uncategorized': '❓'
  };
  function getCatIcon(cat = '') {
    const c = cat.toLowerCase().trim();
    for(const key in CAT_ICONS) if(c.includes(key)) return CAT_ICONS[key];
    return '📝';
  }

  // Carousel logic
  let currentChartIdx = 0;
  const chartTitles = ["Expense Categories", "Monthly Trend"];
  
  function showChart(idx) {
    currentChartIdx = idx;
    document.querySelectorAll('.chart-slide').forEach((s, i) => {
      s.classList.toggle('active', i === idx);
    });
    document.querySelectorAll('.chart-dot').forEach((d, i) => {
      d.classList.toggle('active', i === idx);
    });
    const titleEl = document.getElementById('chartTitle');
    if (titleEl) titleEl.textContent = chartTitles[idx];
  }
  
  function nextChart() {
    showChart((currentChartIdx + 1) % 2);
  }
  
  function prevChart() {
    showChart((currentChartIdx + 1) % 2); // 2 slides total
  }

  // history list rendering
  function renderHistoryList(entries) {
    const el = DOM.summaryHistoryEl;
    if (!el) return;
    el.innerHTML = '';
    if (!entries || entries.length === 0) { el.innerHTML = '<div class="info">No entries for this filter.</div>'; return; }
    
    // --- SORTING ---
    const sortBy = document.getElementById('summarySortBy')?.value || 'date';
    const sortOrder = document.getElementById('summarySortOrder')?.value || 'desc';
    
    const sorted = [...entries].sort((a, b) => {
      let valA, valB;
      if (sortBy === 'amount') { valA = a.amount; valB = b.amount; }
      else if (sortBy === 'category') { valA = (a.category || '').toLowerCase(); valB = (b.category || '').toLowerCase(); }
      else if (sortBy === 'description') { valA = (a.description || '').toLowerCase(); valB = (b.description || '').toLowerCase(); }
      else { valA = a.dateStr + (a.id || ''); valB = b.dateStr + (b.id || ''); } // date

      if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
      if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    const rows = getRowsPerPage();
    const paged = sorted.slice(0, rows);
    const groupMode = document.getElementById('summaryGroupMode')?.value || 'date';
    
    let lastGroup = null;
    let groupTotal = 0;

    paged.forEach((e, idx) => {
      try {
        if (!e) return;
        
        // --- GROUPING HEADERS ---
        let currentGroup = null;
        if (groupMode === 'date') currentGroup = formatDateLabel(e.dateStr);
        else if (groupMode === 'month') {
           const d = new Date(e.dateStr + 'T00:00:00');
           currentGroup = d.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
        }

        if (groupMode !== 'none' && currentGroup !== lastGroup) {
          lastGroup = currentGroup;
          const header = document.createElement('div');
          header.className = 'history-group-header';
          header.innerHTML = `<span>${currentGroup}</span>`;
          el.appendChild(header);
        }

        const row = document.createElement('div'); row.className = 'entry';
        const left = document.createElement('div'); left.className = 'entry-main';
        left.style.cursor = 'pointer';
        left.title = 'Click to expand/collapse';
        left.addEventListener('click', (ev) => {
            if (ev.target.tagName !== 'INPUT') row.classList.toggle('collapsed');
        });
        const desc = (e.description || '').toString().toUpperCase();
        const catIcon = getCatIcon(e.category);
        const title = document.createElement('div'); title.className = 'entry-title'; title.style.color = '#ffffff'; 
        title.innerHTML = `<span style="opacity:0.6; font-size:12px; margin-right:6px;">${idx + 1}.</span> <span>${catIcon}</span> ${desc}`;
        const meta = document.createElement('div'); meta.className = 'entry-meta'; meta.style.color = 'var(--muted)';
        let metaText = `${e.type || ''} • ${(e.category || 'No category')} • ${e.payMethod || ''}` + (e.paySubType ? (' • ' + e.paySubType) : '');
        if (e.mappedBank) metaText += ` • ${e.mappedBank}`;
        meta.textContent = metaText;
        left.appendChild(title); left.appendChild(meta);
        if (e.note) { const n = document.createElement('div'); n.className = 'entry-note'; n.textContent = e.note; left.appendChild(n); }

        if (e.fuel && e.fuel.mileage > 0) {
          const fn = document.createElement('div'); fn.className = 'entry-note';
          fn.style.color = 'var(--warning)';
          fn.innerHTML = `⛽ <strong>Mileage: ${e.fuel.mileage.toFixed(1)} km/l</strong> · ODO: ${e.fuel.currentKm} km${e.fuel.liters ? ` · ${e.fuel.liters}L` : ''}`;
          left.appendChild(fn);
        }
        if (e.tripDate) {
          const tn = document.createElement('div'); tn.className = 'entry-note';
          tn.style.color = 'var(--accent)';
          tn.innerHTML = `🚉 <strong>Trip Date: ${formatDateLabel(e.tripDate)}</strong>`;
          left.appendChild(tn);
        }

        if (e.split && e.split.enabled) {
          const sp = document.createElement('div'); sp.className = 'entry-note';
          sp.textContent = `Split: your ${currencyFmt(e.split.myShare)} · to receive ${currencyFmt((e.split.participants || []).reduce((a, p) => a + (p.amount || 0), 0))}`;
          left.appendChild(sp);

          if (Array.isArray(e.split.participants)) {
            e.split.participants.forEach((p, pidx) => {
              const prow = document.createElement('div'); prow.style.display = 'flex'; prow.style.justifyContent = 'space-between'; prow.style.alignItems = 'center'; prow.style.marginTop = '6px';
              const pleft = document.createElement('div'); pleft.textContent = `${p.name} — ${currencyFmt(p.amount)}`; pleft.style.color = 'var(--muted)';
              const pright = document.createElement('div'); const cb = document.createElement('input'); cb.type = 'checkbox'; cb.checked = !!p.received;
              cb.addEventListener('change', () => {
                if (typeof toggleSplitReceived === 'function') { toggleSplitReceived(e.id, e.dateStr, pidx, cb.checked); }
                else {
                  const s = loadStoreSafe(); const day = s.days[e.dateStr] || []; const idxItem = day.findIndex(x => x.id === e.id); 
                  if (idxItem >= 0 && day[idxItem].split) { 
                    day[idxItem].split.participants[pidx].received = cb.checked; 
                    
                    if (window.MT && window.MT.dues && window.MT.dues.loadDues) {
                       const duesList = window.MT.dues.loadDues();
                       const descMatch = 'Split: ' + e.description;
                       let updated = false;
                       duesList.forEach(d => {
                         if (d.date === e.dateStr && (d.person||'').trim() === (p.name||'').trim() && Math.abs(d.amount - p.amount) < 0.01 && d.description === descMatch) {
                            d.paid = cb.checked;
                            d.paidDate = cb.checked ? (window.MT.db && window.MT.db.todayISO ? window.MT.db.todayISO() : new Date().toISOString().slice(0,10)) : null;
                            updated = true;
                         }
                       });
                       if (updated) { window.MT.dues.saveDues(duesList); window.MT.dues.updateDuesBadge(); window.dispatchEvent(new Event('mt:entries-changed')); }
                    }

                    if (window.MT && window.MT.db && window.MT.db.saveStore) window.MT.db.saveStore(s);
                    else if (typeof saveStore === 'function') saveStore(s); 
                    renderSummary(); 
                    if (window.MT && window.MT.entry && window.MT.entry.renderEntries) window.MT.entry.renderEntries();
                    else if (typeof renderEntries === 'function') renderEntries(); 
                  }
                }
              });
              pright.appendChild(cb); prow.appendChild(pleft); prow.appendChild(pright); left.appendChild(prow);
            });
          }

          const allRow = document.createElement('div'); allRow.style.marginTop = '8px';
          const allChk = document.createElement('input'); allChk.type = 'checkbox';
          const allReceived = (e.split.participants || []).every(p => p.received);
          allChk.checked = allReceived;
          allChk.addEventListener('change', () => {
            if (typeof toggleAllSplit === 'function') { toggleAllSplit(e.id, e.dateStr, allChk.checked); }
            else {
              const s = loadStoreSafe(); const day = s.days[e.dateStr] || []; const idxItem = day.findIndex(x => x.id === e.id); 
              if (idxItem >= 0 && day[idxItem].split) { 
                day[idxItem].split.participants.forEach(p => p.received = allChk.checked); 
                
                if (window.MT && window.MT.dues && window.MT.dues.loadDues) {
                   const duesList = window.MT.dues.loadDues();
                   const descMatch = 'Split: ' + e.description;
                   let updated = false;
                   day[idxItem].split.participants.forEach(p => {
                       duesList.forEach(d => {
                         if (d.date === e.dateStr && (d.person||'').trim() === (p.name||'').trim() && Math.abs(d.amount - p.amount) < 0.01 && d.description === descMatch) {
                            d.paid = allChk.checked;
                            d.paidDate = allChk.checked ? (window.MT.db && window.MT.db.todayISO ? window.MT.db.todayISO() : new Date().toISOString().slice(0,10)) : null;
                            updated = true;
                         }
                       });
                   });
                   if (updated) { window.MT.dues.saveDues(duesList); window.MT.dues.updateDuesBadge(); window.dispatchEvent(new Event('mt:entries-changed')); }
                }

                if (window.MT && window.MT.db && window.MT.db.saveStore) window.MT.db.saveStore(s);
                else if (typeof saveStore === 'function') saveStore(s); 
                renderSummary(); 
                if (window.MT && window.MT.entry && window.MT.entry.renderEntries) window.MT.entry.renderEntries();
                else if (typeof renderEntries === 'function') renderEntries(); 
              }
            }
          });
          allRow.appendChild(allChk);
          const allLbl = document.createElement('span'); allLbl.style.marginLeft = '8px'; allLbl.textContent = 'Mark all received';
          allRow.appendChild(allLbl);
          left.appendChild(allRow);
        }

        if (e.type === 'Transfer' && e.transfer) {
          const tr = document.createElement('div'); tr.className = 'entry-note'; tr.textContent = `Transfer: ${e.transfer.from || '-'} → ${e.transfer.to || '-'}`;
          left.appendChild(tr);
        }

        if (e.category && e.category.toLowerCase() === 'petrol' && e.fuel && e.fuel.currentKm) {
          const fr = document.createElement('div'); fr.className = 'entry-note'; 
          fr.style.color = 'var(--warning)'; fr.style.fontSize = '11px'; fr.style.marginTop = '4px';
          const dist = e.fuel.currentKm - (e.fuel.prevKm || 0);
          const mil = dist / (e.fuel.liters || 1);
          fr.textContent = `⛽ ODO: ${e.fuel.currentKm} | ${dist}km run | ${mil.toFixed(1)} km/l`;
          left.appendChild(fr);
        }

        const right = document.createElement('div'); right.className = 'entry-right';
        const amt = document.createElement('div'); amt.className = 'entry-amount ' + (e.type === 'Income' ? 'income' : (e.type === 'Transfer' ? '' : 'expense'));
        amt.textContent = (e.type === 'Income' ? '+' : '-') + currencyFmt(e.amount || 0);
        const edit = document.createElement('button'); edit.className = 'btn-small'; edit.innerHTML = `Edit`;
        edit.addEventListener('click', () => {
          if (window.MT && window.MT.entry && window.MT.entry.startEdit) {
            window.MT.entry.startEdit(e.dateStr, e);
          } else if (typeof startEdit === 'function') {
            startEdit(e.dateStr, e);
          } else if (window.startEdit) {
            window.startEdit(e.dateStr, e);
          }
        });
        right.appendChild(amt); right.appendChild(edit);

        row.appendChild(left); row.appendChild(right); el.appendChild(row);
      } catch (err) {
        console.error('Render error for entry', e, err);
      }
    });
  }

  // expose module
  window.SummaryModule = { initSummaryControls, renderSummary, drawCategoryPie, renderHistoryList, nextChart, prevChart, showChart };

  // Re-render whenever user navigates to the summary view
  window.addEventListener('mt:view-changed', (ev) => {
    if (ev.detail && ev.detail.viewName === 'summary') {
      const modeSel = document.getElementById('dateMode');
      const dayInput = document.getElementById('dayPicker');
      const monthInput = document.getElementById('monthPicker');
      const isoDate = (window.MT && window.MT.db && window.MT.db.todayISO) ? window.MT.db.todayISO() : new Date().toISOString();
      
      if (dayInput && modeSel && modeSel.value === 'day' && !dayInput.value) {
        dayInput.value = isoDate.slice(0, 10);
      }
      if (monthInput && modeSel && modeSel.value === 'month' && !monthInput.value) {
        monthInput.value = isoDate.slice(0, 7);
      }
      try { renderSummary(); } catch (e) { console.error('Summary render error', e); }
    }
  });

  // Re-render whenever entries are added/changed
  window.addEventListener('mt:entries-changed', () => {
    const summaryView = document.getElementById('view-summary');
    if (summaryView && summaryView.classList.contains('active')) {
      try { renderSummary(); } catch (e) { console.error('Summary render error', e); }
    }
  });

  // Auto-init controls on DOM ready; actual data render happens when the view is shown
  document.addEventListener('DOMContentLoaded', () => {
    initSummaryControls();
    // Attempt an initial render — may show empty if user not yet authenticated, that's fine
    try { renderSummary(); } catch (e) { }
  });

  /* Expand/Collapse logic */
  document.getElementById('btnExpandAll')?.addEventListener('click', () => {
      document.querySelectorAll('#summaryHistory .entry').forEach(e => e.classList.remove('collapsed'));
  });
  document.getElementById('btnCollapseAll')?.addEventListener('click', () => {
      document.querySelectorAll('#summaryHistory .entry').forEach(e => e.classList.add('collapsed'));
  });
})();
