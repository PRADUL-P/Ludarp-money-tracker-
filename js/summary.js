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
    totalIOweEl: document.getElementById('totalIOwe'),
    trueBalanceValueEl: document.getElementById('trueBalanceValue'),
    rowsPerPageSelect: document.getElementById('rowsPerPage'),
    summarySearchInput: document.getElementById('summarySearch'),
    summaryExportBtn: document.getElementById('summaryExportBtn'),
    insightsListEl: document.getElementById('insightsList'),
    heatmapCardEl: document.getElementById('heatmapCard'),
    heatmapGridEl: document.getElementById('heatmapGrid'),
    searchScopeEl: document.getElementById('searchScope'),
    badgeListEl: document.getElementById('badgeList'),
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

  // ---- Shared inline settle panel (used from Summary rows) ----
  function showSummarySettlePanel(dueId, anchorEl, onConfirm) {
    // Remove any existing panel on same anchor
    const existing = anchorEl.querySelector('.summary-settle-panel');
    if (existing) { existing.remove(); return; }
    
    const banks = window.MT?.db?.loadStore()?.settings?.banks || ['Cash'];
    const todayVal = (window.MT?.db?.todayISO ? window.MT.db.todayISO() : new Date().toISOString().slice(0, 10));
    
    const panel = document.createElement('div');
    panel.className = 'summary-settle-panel';
    panel.style.cssText = 'margin-top:8px; padding:10px 12px; background:var(--card-hover); border:1px solid var(--accent); border-radius:10px; display:flex; gap:8px; flex-wrap:wrap; align-items:flex-end;';
    panel.innerHTML = `
      <div style="flex:1; min-width:110px;">
        <label style="font-size:11px; color:var(--muted); display:block; margin-bottom:3px;">Account</label>
        <select class="sp-bank" style="width:100%;">${banks.map(b => `<option value="${b}">${b}</option>`).join('')}</select>
      </div>
      <div style="flex:1; min-width:120px;">
        <label style="font-size:11px; color:var(--muted); display:block; margin-bottom:3px;">Date</label>
        <input class="sp-date" type="date" value="${todayVal}" style="width:100%;" />
      </div>
      <button class="sp-confirm btn-primary" style="height:36px; padding:0 14px; font-size:12px;">✓ Confirm</button>
      <button class="sp-cancel btn-secondary" style="height:36px; padding:0 10px;">✕</button>
    `;
    anchorEl.appendChild(panel);
    panel.querySelector('.sp-cancel').addEventListener('click', () => panel.remove());
    panel.querySelector('.sp-confirm').addEventListener('click', () => {
      const bank = panel.querySelector('.sp-bank').value || 'Cash';
      const date = panel.querySelector('.sp-date').value || todayVal;
      panel.remove();
      if (typeof onConfirm === 'function') onConfirm(bank, date);
    });
  }

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

    const searchQuery = (DOM.summarySearchInput?.value || '').toLowerCase().trim();
    const searchScope = DOM.searchScopeEl ? DOM.searchScopeEl.value : 'month';

    let filtered = arr.filter(e => {
      // If Global search is active and user has typed, bypass time filters
      if (searchScope === 'global' && searchQuery.length >= 2) return true;
      
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

    // -- SUPPLEMENTARY FILTERS --
    if (document.getElementById('hideTransfers') && document.getElementById('hideTransfers').checked) {
      filtered = filtered.filter(e => e.type !== 'Transfer');
    }
    if (document.getElementById('hideSettlements') && document.getElementById('hideSettlements').checked) {
      filtered = filtered.filter(e => !e.isDueSettlement);
    }
    
    // -- SEARCH FILTER --
    if (searchQuery) {
      filtered = filtered.filter(e => 
        (e.description || '').toLowerCase().includes(searchQuery) ||
        (e.category || '').toLowerCase().includes(searchQuery) ||
        (e.note || '').toLowerCase().includes(searchQuery) ||
        (e.payMethod || '').toLowerCase().includes(searchQuery)
      );
    }

    // totals + category totals + daily totals for trend
    let totalExp = 0, totalInc = 0, totalOweMe = 0, totalIOwe = 0;
    const categoryTotals = {};
    const dailyTotals = {};
    const monthlyTotals = {};

    filtered.forEach(e => {
      let isSettlement = !!e.isDueSettlement;
      
      if (e.type === 'Income') {
           if (!isSettlement) totalInc += Number(e.amount || 0);
      }
      else if (e.type === 'Transfer') { }
      else {
           let effectiveAmount = Number(e.amount || 0);
           if (e.split && e.split.enabled) effectiveAmount = Number(e.split.myShare || 0);
           else if (e.isQuickDue && e.quickDueType !== 'i_owe') effectiveAmount = 0; 
           
           totalExp += effectiveAmount;
           
           const cat = e.category || 'Uncategorized';
           categoryTotals[cat] = (categoryTotals[cat] || 0) + effectiveAmount;
           dailyTotals[e.dateStr] = (dailyTotals[e.dateStr] || 0) + effectiveAmount;

           const monthKey = (e.dateStr || '').substring(0, 7);
           monthlyTotals[monthKey] = (monthlyTotals[monthKey] || 0) + effectiveAmount;
      }

      // --- Dues Logic ---
      if (e.split && e.split.enabled) {
        const notReceived = e.split.participants.filter(p => !p.received).reduce((a, p) => a + (p.amount || 0), 0);
        totalOweMe += notReceived;
      } else if (e.isQuickDue && !e.isSettled) {
        if (e.quickDueType === 'they_owe') totalOweMe += Number(e.amount || 0);
        else if (e.quickDueType === 'i_owe') totalIOwe += Number(e.amount || 0);
      }
    });

    if (DOM.monthSumExpenseEl) DOM.monthSumExpenseEl.textContent = currencyFmt(totalExp);
    if (DOM.monthSumIncomeEl) DOM.monthSumIncomeEl.textContent = currencyFmt(totalInc);
    if (DOM.splitOutstandingEl) DOM.splitOutstandingEl.textContent = currencyFmt(totalOweMe);
    if (DOM.totalIOweEl) DOM.totalIOweEl.textContent = currencyFmt(totalIOwe);

    // --- TRUE BALANCE CALCULATOR ---
    if (DOM.trueBalanceValueEl) {
        const currentMonth = mode === 'month' ? monthVal : ((window.MT?.db?.todayISO ? window.MT.db.todayISO() : new Date().toISOString()).slice(0, 7));
        const bankTotal = window.MT?.accounts?.getTotalBalance ? window.MT.accounts.getTotalBalance(currentMonth) : 0;
        const netWorth = bankTotal + totalOweMe - totalIOwe;
        DOM.trueBalanceValueEl.textContent = currencyFmt(netWorth);
    }

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
    renderHistoryList(filtered, dailyTotals, monthlyTotals);

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

    renderHeatmap(dailyTotals, mode, monthVal);
    renderInsights(filtered, totalExp, totalInc, mode === 'month' ? monthVal : '');
    renderAchievements(arr);
  }

  function renderAchievements(arr) {
    if (!DOM.badgeListEl) return;
    DOM.badgeListEl.innerHTML = '';
    const badges = [];
    
    // 1. Streak Badge
    const uniqueDates = Array.from(new Set(arr.map(e => e.dateStr))).sort().reverse();
    let streak = 0;
    const todayISO = (window.MT?.db?.todayISO ? window.MT.db.todayISO() : new Date().toISOString().slice(0, 10));
    if (uniqueDates[0] === todayISO) {
        streak = 1;
        for (let i = 1; i < uniqueDates.length; i++) {
           const d = new Date(uniqueDates[i-1]);
           d.setDate(d.getDate() - 1);
           if (uniqueDates[i] === d.toISOString().slice(0, 10)) streak++;
           else break;
        }
    }
    if (streak >= 7) {
        badges.push({ icon: '🔥', label: `${streak}d Streak`, color: '#f97316' });
        // Bonus: First time streak confetti logic could go here or in store logic
    }

    // 2. High Saver Badge
    const thisMonth = todayISO.slice(0, 7);
    const mEntries = arr.filter(e => e.dateStr.startsWith(thisMonth));
    let mExp = 0, mInc = 0;
    mEntries.forEach(e => {
        if (e.type === 'Income') mInc += Number(e.amount || 0);
        else if (e.type === 'Expense') mExp += Number(e.amount || 0);
    });
    if (mInc > 0 && (mExp / mInc) < 0.4) {
        badges.push({ icon: '💰', label: 'Super Saver', color: '#10b981' });
    }

    // 3. Veteran Tracker
    if (arr.length > 100) badges.push({ icon: '🎓', label: 'Finance Pro', color: '#6366f1' });

    if (badges.length === 0) {
        DOM.badgeListEl.innerHTML = '<div class="info" style="font-size:11px;">Track more to earn badges!</div>';
        return;
    }

    DOM.badgeListEl.innerHTML = badges.map(b => `
        <div class="badge-item" style="flex:0 0 auto; display:flex; align-items:center; gap:6px; padding:6px 12px; border-radius:30px; background:rgba(255,255,255,0.05); border:1px solid ${b.color}44;">
            <span style="font-size:14px;">${b.icon}</span>
            <span style="font-size:11px; font-weight:700; color:${b.color}; white-space:nowrap;">${b.label}</span>
        </div>
    `).join('');
  }

  function renderHeatmap(dailyTotals, mode, monthVal) {
    if (!DOM.heatmapCardEl || !DOM.heatmapGridEl) return;
    
    if (mode !== 'month' || !monthVal) {
        DOM.heatmapCardEl.style.display = 'none';
        return;
    }
    
    DOM.heatmapCardEl.style.display = 'block';
    DOM.heatmapGridEl.innerHTML = '';
    
    const [y, m] = monthVal.split('-').map(Number);
    const lastDay = new Date(y, m, 0).getDate();
    
    // Find max spend in this month for scaling
    let max = 1;
    for (let d = 1; d <= lastDay; d++) {
        const key = `${monthVal}-${String(d).padStart(2, '0')}`;
        max = Math.max(max, dailyTotals[key] || 0);
    }
    
    // Render cells
    for (let d = 1; d <= lastDay; d++) {
        const key = `${monthVal}-${String(d).padStart(2, '0')}`;
        const spend = dailyTotals[key] || 0;
        const opacity = spend === 0 ? 0.03 : Math.max(0.1, spend / max);
        
        const cell = document.createElement('div');
        cell.style.cssText = `
            height:32px; 
            border-radius:4px; 
            background:rgba(244, 63, 94, ${opacity}); 
            display:flex; 
            align-items:center; 
            justify-content:center; 
            font-size:10px; 
            font-weight:700;
            color:${spend/max > 0.5 ? '#fff' : 'var(--text-secondary)'};
            cursor: help;
        `;
        cell.title = `${key}: ${currencyFmt(spend)}`;
        cell.textContent = d;
        DOM.heatmapGridEl.appendChild(cell);
    }
  }

  function renderInsights(filtered, totalExp, totalInc, monthVal) {
    if (!DOM.insightsListEl) return;
    DOM.insightsListEl.innerHTML = '';
    
    if (filtered.length === 0) {
        DOM.insightsListEl.innerHTML = '<div class="info" style="font-size:12px;">No data for insights yet.</div>';
        return;
    }

    const insights = [];
    
    // 1. Top Category
    const categoryTotals = {};
    filtered.forEach(e => {
        if (e.type !== 'Income' && e.type !== 'Transfer') {
            const c = e.category || 'Uncategorized';
            categoryTotals[c] = (categoryTotals[c] || 0) + (e.amount || 0);
        }
    });
    const sortedCats = Object.entries(categoryTotals).sort((a,b) => b[1] - a[1]);
    if (sortedCats.length > 0) {
        insights.push(`👑 Your biggest expense is <strong>${sortedCats[0][0]}</strong> (${currencyFmt(sortedCats[0][1])}).`);
    }

    // 2. Income vs Expense ratio
    if (totalInc > 0) {
        const pct = (totalExp / totalInc) * 100;
        if (pct < 50) insights.push(`📈 Excellent! You spent only <strong>${pct.toFixed(0)}%</strong> of your income.`);
        else if (pct > 100) insights.push(`⚠️ Caution: You spent <strong>${(pct-100).toFixed(0)}% more</strong> than you earned.`);
    }

    // 3. Frequency insight
    const count = filtered.filter(e => e.type !== 'Income').length;
    if (count > 20) insights.push(`📱 You log transactions very frequently (<strong>${count}</strong> entries). Good tracking habit!`);

    DOM.insightsListEl.innerHTML = insights.map(i => `
        <div style="padding:8px 0; border-bottom:1px solid var(--card-border); font-size:12px; color:var(--text-secondary); display:flex; align-items:flex-start; gap:8px;">
            <span>💡</span>
            <div style="flex:1;">${i}</div>
        </div>
    `).join('') || '<div class="info">Keep logging to see smart patterns!</div>';
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
  function renderHistoryList(entries, dailyTotals, monthlyTotals) {
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
          
          let groupSum = 0;
          if (groupMode === 'date') groupSum = dailyTotals[e.dateStr] || 0;
          else if (groupMode === 'month') groupSum = monthlyTotals[e.dateStr.substring(0, 7)] || 0;
          
          header.innerHTML = `<span>${currentGroup}</span> <span style="color:var(--text-secondary); font-weight:800;">${currencyFmt(groupSum)}</span>`;
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

        if (e.fuel && e.fuel.currentKm > 0) {
          const fn = document.createElement('div'); fn.className = 'entry-note';
          fn.style.color = 'var(--warning)';
          let fuelText = `⛽ <strong>Mileage: ${e.fuel.mileage.toFixed(1)} km/l</strong> · ODO: ${e.fuel.currentKm} km${e.fuel.liters ? ` · ${e.fuel.liters}L` : ''}`;
          if (e.fuel.price) fuelText += ` · <span style="color:var(--text); opacity:0.8;">₹${e.fuel.price.toFixed(2)}/L</span>`;
          fn.innerHTML = fuelText;
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
          const allPaid = (e.split.participants || []).every(p => p.received);
          sp.innerHTML = `Split: your ${currencyFmt(e.split.myShare)} · to receive ${currencyFmt((e.split.participants || []).reduce((a, p) => a + (p.amount || 0), 0))} ${allPaid ? '<span class="badge badge-success">✓ ALL SETTLED</span>' : ''}`;
          left.appendChild(sp);

          if (Array.isArray(e.split.participants)) {
            e.split.participants.forEach((p, pidx) => {
              const prow = document.createElement('div'); prow.style.display = 'flex'; prow.style.justifyContent = 'space-between'; prow.style.alignItems = 'center'; prow.style.marginTop = '6px';
              // Try to look up paidDate from matching due
              let paidDateStr = '';
              if (p.received && window.MT && window.MT.dues && window.MT.dues.loadDues) {
                const dList = window.MT.dues.loadDues();
                const dMatch = dList.find(d => d.date === e.dateStr && (d.person||'').trim() === (p.name||'').trim() && Math.abs(d.amount - p.amount) < 0.01);
                if (dMatch && dMatch.paidDate) paidDateStr = ` · Settled ${formatDateLabel(dMatch.paidDate)}`;
              }
              const pleft = document.createElement('div'); 
              pleft.innerHTML = `${p.name} — ${currencyFmt(p.amount)}${p.received ? `<span style="font-size:10px; color:var(--muted); margin-left:6px;">${paidDateStr}</span>` : ''}`;
              pleft.style.color = p.received ? 'var(--success)' : 'var(--muted)';
              pleft.style.fontSize = '12px';
              const pright = document.createElement('div'); const cb = document.createElement('input'); cb.type = 'checkbox'; cb.checked = !!p.received;
              cb.addEventListener('change', () => {
                  if (cb.checked) {
                    // Ask for bank/date before settling
                    let matchFound = false;
                    if (window.MT && window.MT.dues && window.MT.dues.loadDues) {
                      const dList = window.MT.dues.loadDues();
                      const dMatch = dList.find(d => d.date === e.dateStr && (d.person||'').trim() === (p.name||'').trim() && Math.abs(d.amount - p.amount) < 0.01);
                      if (dMatch && !dMatch.paid) {
                        matchFound = true;
                        const prow2 = cb.closest('div') || left;
                        showSummarySettlePanel(dMatch.id, prow2.parentElement || left, (bank, date) => {
                          window.MT.dues.markPaid(dMatch.id, date, bank);
                          if (typeof renderSummary === 'function') renderSummary();
                          if (window.MT.entry && window.MT.entry.renderEntries) window.MT.entry.renderEntries();
                        });
                        // Revert checkbox visually; it will reflect reality after panel confirm
                        cb.checked = false;
                      }
                    }
                    if (!matchFound) {
                      const s = loadStoreSafe(); const day = s.days[e.dateStr] || []; const idxItem = day.findIndex(x => x.id === e.id);
                      if (idxItem >= 0 && day[idxItem].split) {
                        day[idxItem].split.participants[pidx].received = true;
                        if (window.MT && window.MT.db && window.MT.db.saveStore) window.MT.db.saveStore(s);
                        if (typeof renderSummary === 'function') renderSummary();
                      }
                    }
                  } else {
                    // Uncheck = undo
                    if (window.MT && window.MT.dues && window.MT.dues.loadDues) {
                      const dList = window.MT.dues.loadDues();
                      const dMatch = dList.find(d => d.date === e.dateStr && (d.person||'').trim() === (p.name||'').trim() && Math.abs(d.amount - p.amount) < 0.01);
                      if (dMatch && dMatch.paid) { window.MT.dues.undoPaid(dMatch.id, true); if (typeof renderSummary === 'function') renderSummary(); return; }
                    }
                    const s = loadStoreSafe(); const day = s.days[e.dateStr] || []; const idxItem = day.findIndex(x => x.id === e.id);
                    if (idxItem >= 0 && day[idxItem].split) {
                      day[idxItem].split.participants[pidx].received = false;
                      if (window.MT && window.MT.db && window.MT.db.saveStore) window.MT.db.saveStore(s);
                      if (typeof renderSummary === 'function') renderSummary();
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
               if (allChk.checked) {
                 // Build list of unpaid matching dues
                 const unpaidMatches = [];
                 if (window.MT && window.MT.dues && window.MT.dues.loadDues) {
                   const dList = window.MT.dues.loadDues();
                   e.split.participants.forEach(p => {
                     const dMatch = dList.find(d => d.date === e.dateStr && (d.person||'').trim() === (p.name||'').trim() && Math.abs(d.amount - p.amount) < 0.01 && !d.paid);
                     if (dMatch) unpaidMatches.push(dMatch.id);
                   });
                 }
                 if (unpaidMatches.length > 0) {
                   allChk.checked = false; // revert until confirmed
                   showSummarySettlePanel('all', allRow, (bank, date) => {
                     unpaidMatches.forEach(dId => window.MT.dues.markPaid(dId, date, bank));
                     if (typeof renderSummary === 'function') renderSummary();
                     if (window.MT.entry && window.MT.entry.renderEntries) window.MT.entry.renderEntries();
                   });
                 } else {
                   // Fallback: mark locally
                   const s = loadStoreSafe(); const day = s.days[e.dateStr] || []; const idxItem = day.findIndex(x => x.id === e.id);
                   if (idxItem >= 0 && day[idxItem].split) {
                     day[idxItem].split.participants.forEach(p => p.received = true);
                     if (window.MT && window.MT.db && window.MT.db.saveStore) window.MT.db.saveStore(s);
                     if (typeof renderSummary === 'function') renderSummary();
                   }
                 }
               } else {
                 // Uncheck all = undo all
                 if (window.MT && window.MT.dues && window.MT.dues.loadDues) {
                   const dList = window.MT.dues.loadDues();
                   e.split.participants.forEach(p => {
                     const dMatch = dList.find(d => d.date === e.dateStr && (d.person||'').trim() === (p.name||'').trim() && Math.abs(d.amount - p.amount) < 0.01 && d.paid);
                     if (dMatch) window.MT.dues.undoPaid(dMatch.id, true);
                   });
                   if (typeof renderSummary === 'function') renderSummary();
                   if (window.MT.entry && window.MT.entry.renderEntries) window.MT.entry.renderEntries();
                 }
               }
          });
          allRow.appendChild(allChk);
          const allLbl = document.createElement('span'); allLbl.style.marginLeft = '8px'; allLbl.textContent = 'Mark all received';
          allRow.appendChild(allLbl);
          left.appendChild(allRow);
        } else if (e.duePerson && !e.isSettled) {
          const isIOwe = e.quickDueType === 'i_owe';
          // Show due info banner
          const infoNote = document.createElement('div');
          const bannerColor = isIOwe ? 'rgba(248,113,113,0.15)' : 'rgba(251,191,36,0.1)';
          const bannerBorder = isIOwe ? 'rgba(248,113,113,0.4)' : 'rgba(251,191,36,0.3)';
          const textColor = isIOwe ? '#f87171' : '#fbbf24';
          infoNote.style.cssText = `margin-top:6px; padding:7px 10px; background:${bannerColor}; border:1px solid ${bannerBorder}; border-radius:8px; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:6px;`;
          const infoText = document.createElement('div');
          const dueLabel = isIOwe ? '💸 You owe' : '💰 They owe you';
          infoText.innerHTML = `<span style="font-size:12px; font-weight:700; color:${textColor};">${dueLabel} <strong>${e.duePerson}</strong>:</span> <span style="font-size:14px; font-weight:800; color:${textColor};">${currencyFmt(e.amount)}</span>`;
          const markBtn = document.createElement('button');
          markBtn.textContent = isIOwe ? '✓ Mark as Paid' : '✓ Mark Received';
          markBtn.className = 'btn-small';
          const btnBg = isIOwe ? 'rgba(248,113,113,0.15)' : 'rgba(52,211,153,0.15)';
          const btnColor = isIOwe ? 'var(--danger)' : 'var(--success)';
          const btnBorder = isIOwe ? 'var(--danger)' : 'var(--success)';
          markBtn.style.cssText = `background:${btnBg}; color:${btnColor}; border:1px solid ${btnBorder}; padding:3px 9px; font-size:11px;`;
          markBtn.addEventListener('click', () => {
               if (window.MT && window.MT.dues && window.MT.db) {
                    const dList = window.MT.dues.loadDues();
                    const matchIdx = dList.findIndex(d => d.date === e.dateStr && (d.person||'').trim() === (e.duePerson||'').trim() && Math.abs(d.amount - e.amount) < 0.01 && !d.paid);
                    if (matchIdx >= 0) {
                         const match = dList[matchIdx];
                         showSummarySettlePanel(match.id, infoNote.parentElement || left, (bank, date) => {
                           window.MT.dues.markPaid(match.id, date, bank);
                           if (typeof renderSummary === 'function') renderSummary();
                           if (window.MT.entry && window.MT.entry.renderEntries) window.MT.entry.renderEntries();
                         });
                         return;
                    }
               }
               // Fallback
               if (window.MT && window.MT.db) {
                 const sStore = window.MT.db.loadStore();
                 const dayData = sStore.days[e.dateStr];
                 if (dayData) {
                     const m = dayData.find(x => x.id === e.id);
                     if (m) { m.isSettled = true; m.settledBy = e.duePerson; }
                     window.MT.db.saveStore(sStore);
                     if (typeof renderSummary === 'function') renderSummary();
                 }
               }
          });
          infoNote.appendChild(infoText); infoNote.appendChild(markBtn); left.appendChild(infoNote);
        } else if (e.duePerson && e.isSettled) {
          const isIOwe = e.quickDueType === 'i_owe';
          const sdiv = document.createElement('div'); sdiv.className = 'entry-note';
          const settledLabel = isIOwe ? `✓ PAID` : `✓ RECEIVED`;
          const toFrom = isIOwe ? `Paid to ${e.settledBy || e.duePerson}` : `Received from ${e.settledBy || e.duePerson}`;
          // Try to get settlement date from dues record
          let settledOnStr = '';
          if (window.MT && window.MT.dues && window.MT.dues.loadDues) {
            const dList = window.MT.dues.loadDues();
            const dMatch = dList.find(d => (d.person||'').trim() === (e.duePerson||'').trim() && Math.abs(d.amount - e.amount) < 0.01 && d.paid && d.paidDate);
            if (dMatch) settledOnStr = ` · ${formatDateLabel(dMatch.paidDate)}`;
          }
          sdiv.innerHTML = `<span class="badge badge-success">${settledLabel}</span> <small>${toFrom} — ${currencyFmt(e.amount)}<span style="color:var(--muted);">${settledOnStr}</span></small>`;
          left.appendChild(sdiv);
        } else if (e.isSettled) {
          const sdiv = document.createElement('div'); sdiv.className = 'entry-note';
          sdiv.innerHTML = `<span class="badge badge-success">✓ SETTLED</span> <small>Received from ${e.settledBy || 'Person'}</small>`;
          left.appendChild(sdiv);
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
        const amt = document.createElement('div');
        amt.className = 'entry-amount ' + (e.type === 'Income' ? 'income' : (e.type === 'Transfer' ? '' : 'expense'));
        if (e.isQuickDue && !e.isSettled) {
          const isIOwe = e.quickDueType === 'i_owe';
          // i_owe = red (money going out), they_owe = amber (pending recovery)
          amt.style.color = isIOwe ? 'var(--danger)' : '#fbbf24';
          amt.textContent = (isIOwe ? '-' : '') + currencyFmt(e.amount || 0);
        } else if (e.isQuickDue && e.isSettled) {
          const isIOwe = e.quickDueType === 'i_owe';
          amt.style.color = isIOwe ? 'var(--muted)' : 'var(--success)';
          amt.textContent = (isIOwe ? '-' : '+') + currencyFmt(e.amount || 0);
        } else {
          amt.textContent = (e.type === 'Income' ? '+' : '-') + currencyFmt(e.amount || 0);
        }
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
