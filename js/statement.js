'use strict';
/* statement.js
   Provides a bank-statement-like tabular view + petrol log tab.
*/
(function () {
    const DOM = {
        view: document.getElementById('view-accounts'),
        tbody: document.getElementById('statementTableBody'),
        monthFilter: document.getElementById('stmtMonthFilter'),
        typeFilter: document.getElementById('stmtTypeFilter'),
        exportBtn: document.getElementById('stmtExportBtn'),
        pdfBtn: document.getElementById('stmtPdfBtn')
    };

    if (!DOM.view) return;

    /* ============================================
       📄 STATEMENT
    ============================================ */
    function renderStatement() {
        if (!DOM.tbody) return;
        const s = window.MT.db.loadStore();
        if (!s) return;

        let entries = [];
        Object.keys(s.days || {}).forEach(d => {
            (s.days[d] || []).forEach(e => entries.push({ ...e, dateStr: d }));
        });

        entries.sort((a, b) => {
            if (a.dateStr === b.dateStr) return b.id - a.id;
            return a.dateStr < b.dateStr ? 1 : -1;
        });

        const m = DOM.monthFilter?.value;
        const t = DOM.typeFilter?.value;
        if (m) entries = entries.filter(e => e.dateStr.startsWith(m));
        if (t && t !== 'All') entries = entries.filter(e => e.type === t);

        const sortBy = document.getElementById('stmtSortBy')?.value || 'date';
        const sortOrder = document.getElementById('stmtSortOrder')?.value || 'desc';

        entries.sort((a, b) => {
            let valA, valB;
            if (sortBy === 'amount') { valA = a.amount; valB = b.amount; }
            else if (sortBy === 'category') { valA = (a.category || '').toLowerCase(); valB = (b.category || '').toLowerCase(); }
            else { valA = a.dateStr + (a.id || ''); valB = b.dateStr + (b.id || ''); }

            if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
            if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
            return 0;
        });

        DOM.tbody.innerHTML = '';
        if (entries.length === 0) {
            DOM.tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding:20px; color:var(--muted);">No records found for this period</td></tr>';
            return;
        }

        let lastDate = null;
        entries.forEach(e => {
            // Add date grouping header if sorting by date
            if (sortBy === 'date' && e.dateStr !== lastDate) {
                lastDate = e.dateStr;
                const groupTr = document.createElement('tr');
                groupTr.style.background = 'rgba(255,255,255,0.02)';
                const dLabel = new Date(e.dateStr + 'T00:00:00').toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' });
                groupTr.innerHTML = `<td colspan="6" style="padding:6px 12px; font-size:10px; font-weight:700; color:var(--accent); text-transform:uppercase;">📅 ${dLabel}</td>`;
                DOM.tbody.appendChild(groupTr);
            }

            const tr = document.createElement('tr');
            const dStr = new Date(e.dateStr + 'T00:00:00').toLocaleDateString(undefined, { day: '2-digit', month: 'short' });
            let amtStr = window.MT.db.currencyFmt(e.amount);
            let amtClass = '';
            if (e.type === 'Income') { amtStr = '+' + amtStr; amtClass = 'income'; }
            else if (e.type === 'Expense') { amtStr = '-' + amtStr; amtClass = 'expense'; }
            let details = e.description || '';
            if (e.note) details += ` <span style="opacity:0.6;font-size:0.85em;">(${e.note})</span>`;
            const typeIcon = e.type === 'Income' ? '📈' : e.type === 'Transfer' ? '🔁' : '📉';
            tr.innerHTML = `
                <td><div style="font-size:0.9em; white-space:nowrap;">${dStr}</div></td>
                <td><span>${typeIcon} ${e.type}</span></td>
                <td>${e.category || '–'}</td>
                <td>${details}</td>
                <td style="font-size:0.9em;">${e.payMethod || '–'}${e.paySubType ? '<br><small style="color:var(--muted);">' + e.paySubType + '</small>' : ''}</td>
                <td style="text-align:right;" class="${amtClass}"><b>${amtStr}</b></td>
            `;
            DOM.tbody.appendChild(tr);
        });
    }

    /* ============================================
       ⛽ PETROL LOG
    ============================================ */
    function renderPetrolLog() {
        const list = document.getElementById('petrolLogList');
        const summaryLine = document.getElementById('petrolSummaryLine');
        const statsBar = document.getElementById('petrolStatsBar');
        const monthFilter = document.getElementById('petrolMonthFilter');
        const yearFilter = document.getElementById('petrolYearFilter');
        if (!list) return;

        const s = window.MT.db.loadStore();
        let all = [];
        Object.keys(s.days || {}).forEach(d => {
            (s.days[d] || []).forEach(e => {
                if ((e.category || '').toLowerCase() === 'petrol' && e.fuel && e.fuel.currentKm) {
                    all.push({ ...e, dateStr: d });
                }
            });
        });

        // Populate year filter
        if (yearFilter && yearFilter.options.length <= 1) {
            const years = [...new Set(all.map(e => e.dateStr.slice(0, 4)))].sort().reverse();
            years.forEach(y => {
                const opt = document.createElement('option');
                opt.value = y; opt.textContent = y;
                yearFilter.appendChild(opt);
            });
        }

        // Sort oldest first for progressive distance calc
        all.sort((a, b) => a.dateStr < b.dateStr ? -1 : 1);

        // Apply filters (filter display list only, keep `all` intact for prev-km reference)
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
              <div style="text-align:center; padding:40px 20px; color:var(--muted);">
                <div style="font-size:2.5rem; margin-bottom:10px;">⛽</div>
                <div style="font-weight:700; margin-bottom:6px;">${mVal || yVal ? 'No entries for this period' : 'No petrol entries yet'}</div>
                <div style="font-size:0.85rem;">Add a transaction with <b>Petrol</b> category and fill the ODO reading.</div>
              </div>`;
            if (summaryLine) summaryLine.textContent = '';
            if (statsBar) statsBar.innerHTML = '';
            return;
        }

        const sym = (window.MT.db.currencyFmt(0)).replace('0.00', '');
        let totalSpent = 0, totalLiters = 0, totalKm = 0;

        // Render newest first for display
        const displayList = [...filtered].reverse();
        displayList.forEach(e => {
            // Find previous fill (from full sorted `all` list, not filtered)
            const origIdx = all.findIndex(x => x.dateStr === e.dateStr && x.id === e.id);
            const prev = origIdx > 0 ? all[origIdx - 1] : null;
            const prevKm = e.fuel.prevKm || (prev ? prev.fuel.currentKm : 0);
            const dist = e.fuel.currentKm - prevKm;
            const liters = parseFloat(e.fuel.liters) || 0;
            const mileage = liters > 0 && dist > 0 ? (dist / liters).toFixed(1) : '–';
            const costPKm = dist > 0 && e.amount ? (e.amount / dist).toFixed(2) : '–';
            const dateLabel = new Date(e.dateStr + 'T00:00:00').toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' });

            totalSpent += e.amount || 0;
            totalLiters += liters;
            if (dist > 0) totalKm += dist;

            const card = document.createElement('div');
            card.className = 'entry';
            card.style.cssText = 'margin-bottom:8px; padding:12px; border-left:3px solid var(--warning);';
            card.innerHTML = `
              <div class="entry-main" style="flex:1;">
                <div class="entry-title" style="color:var(--warning); margin-bottom:6px;">⛽ ${dateLabel}</div>
                <div style="display:flex; flex-wrap:wrap; gap:6px 16px; font-size:12px;">
                  <span>🛵 ODO: <b>${e.fuel.currentKm} km</b></span>
                  <span>📏 Run: <b>${dist > 0 ? dist + ' km' : '–'}</b></span>
                  ${liters > 0 ? `<span>💧 <b>${liters} L</b></span>` : ''}
                  <span style="color:var(--success);">📊 <b>${mileage} km/L</b></span>
                  ${costPKm !== '–' ? `<span>💸 <b>${sym}${costPKm}/km</b></span>` : ''}
                </div>
                ${e.description ? `<div class="entry-note" style="margin-top:4px; font-size:11px; color:var(--muted);">${e.description}</div>` : ''}
              </div>
              <div class="entry-right" style="text-align:right; display:flex; flex-direction:column; align-items:flex-end; gap:6px;">
                <div class="entry-amount expense">${window.MT.db.currencyFmt(e.amount || 0)}</div>
              </div>
            `;
            const editBtn = document.createElement('button');
            editBtn.className = 'btn-small';
            editBtn.textContent = '✏️ Edit';
            editBtn.style.cssText = 'font-size:10px; padding:3px 8px;';
            editBtn.addEventListener('click', () => {
                if (window.MT && window.MT.entry && window.MT.entry.startEdit) window.MT.entry.startEdit(e.dateStr, e);
            });
            card.querySelector('.entry-right').appendChild(editBtn);
            list.appendChild(card);
        });

        // Stats bar
        const avgMil = totalLiters > 0 && totalKm > 0 ? (totalKm / totalLiters).toFixed(1) : '–';
        if (statsBar) {
            const stats = [
                { icon: '⛽', label: 'Fills', value: filtered.length },
                { icon: '📏', label: 'Total KM', value: totalKm + ' km' },
                { icon: '💧', label: 'Liters', value: totalLiters.toFixed(1) + ' L' },
                { icon: '📊', label: 'Avg Mileage', value: avgMil + ' km/L', highlight: true },
            ];
            statsBar.innerHTML = stats.map(st => `
              <div style="flex:1; text-align:center; padding:10px 4px; background:var(--card-hover); border-right:1px solid var(--card-border);">
                <div style="font-size:16px;">${st.icon}</div>
                <div style="font-size:10px; color:var(--muted); margin:2px 0;">${st.label}</div>
                <div style="font-size:13px; font-weight:700; ${st.highlight ? 'color:var(--success);' : ''}">${st.value}</div>
              </div>
            `).join('');
        }

        if (summaryLine) {
            summaryLine.innerHTML = `${sym}${totalSpent.toFixed(0)} total spent`;
        }
    }

    /* ============================================
       📤 PDF EXPORT
    ============================================ */
    function exportPDF() {
        if (!window.jspdf) return alert('PDF library not loaded');
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        const m = DOM.monthFilter?.value || 'Full History';
        doc.setFontSize(18);
        doc.text('LUDARP Money Tracker - Statement', 14, 20);
        doc.setFontSize(11);
        doc.text(`Period: ${m}`, 14, 30);
        doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 35);
        const table = document.getElementById('statementTableBody');
        if (!table || table.rows.length === 0 || table.rows[0].innerText.includes('No records')) return alert('No data to export');
        const rows = Array.from(table.rows).map(tr => Array.from(tr.cells).map(td => td.innerText));
        doc.autoTable({
            startY: 45,
            head: [['Date', 'Type', 'Category', 'Details', 'Method', 'Amount']],
            body: rows,
            theme: 'striped',
            headStyles: { fillColor: [37, 99, 235] },
            columnStyles: { 5: { halign: 'right' } }
        });
        doc.save(`Statement_${m}.pdf`);
    }

    /* ============================================
       🗂️ FINANCE TAB SWITCHING
    ============================================ */
    function initFinanceTabs() {
        document.querySelectorAll('#view-accounts .tab-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('#view-accounts .tab-btn').forEach(b => {
                    b.classList.remove('active');
                    b.style.background = 'none';
                    b.style.color = 'var(--text-secondary)';
                });
                document.querySelectorAll('#view-accounts .tab-content').forEach(p => p.style.display = 'none');
                btn.classList.add('active');
                btn.style.background = 'var(--accent)';
                btn.style.color = '#fff';
                const target = document.getElementById(btn.dataset.target);
                if (target) target.style.display = 'block';
                if (btn.dataset.target === 'finance-statement') renderStatement();
                if (btn.dataset.target === 'finance-petrol') renderPetrolLog();
            });
        });
        // Style active tab initially
        const activeBtn = document.querySelector('#view-accounts .tab-btn.active');
        if (activeBtn) { activeBtn.style.background = 'var(--accent)'; activeBtn.style.color = '#fff'; }
    }

    /* ============================================
       INIT
    ============================================ */
    function init() {
        if (!DOM.view) return;
        DOM.monthFilter?.addEventListener('change', renderStatement);
        DOM.typeFilter?.addEventListener('change', renderStatement);
        document.getElementById('stmtSortBy')?.addEventListener('change', renderStatement);
        document.getElementById('stmtSortOrder')?.addEventListener('change', renderStatement);
        DOM.exportBtn?.addEventListener('click', () => {
            const m = DOM.monthFilter?.value;
            if (window.ExporterModule?.exportXLSX) window.ExporterModule.exportXLSX(m || null);
            else alert('Excel Export module not available.');
        });
        DOM.pdfBtn?.addEventListener('click', exportPDF);

        // Petrol log filters
        document.getElementById('petrolMonthFilter')?.addEventListener('change', renderPetrolLog);
        document.getElementById('petrolYearFilter')?.addEventListener('change', () => {
            // When year changes, clear month filter
            const mf = document.getElementById('petrolMonthFilter');
            if (mf) mf.value = '';
            renderPetrolLog();
        });
        document.getElementById('petrolClearFilter')?.addEventListener('click', () => {
            const mf = document.getElementById('petrolMonthFilter');
            const yf = document.getElementById('petrolYearFilter');
            if (mf) mf.value = '';
            if (yf) yf.value = '';
            renderPetrolLog();
        });

        const now = new Date();
        if (DOM.monthFilter) DOM.monthFilter.value = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
        initFinanceTabs();
        renderStatement();
    }

    window.MT = window.MT || {};
    window.MT.statement = { renderStatement, renderPetrolLog };

    window.addEventListener('mt:auth-entered', init);
    window.addEventListener('mt:entries-changed', () => {
        renderStatement();
        const petrolTab = document.getElementById('finance-petrol');
        if (petrolTab && petrolTab.style.display !== 'none') renderPetrolLog();
    });
    window.addEventListener('mt:view-changed', e => {
        if (e.detail?.viewName === 'accounts' || e.detail?.viewName === 'statement') {
            renderStatement();
        }
    });

})();
