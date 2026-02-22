'use strict';
/* statement.js
   Provides a bank-statement-like tabular view of all entries.
*/
(function () {
    const DOM = {
        view: document.getElementById('view-statement'),
        tbody: document.getElementById('statementTableBody'),
        monthFilter: document.getElementById('stmtMonthFilter'),
        typeFilter: document.getElementById('stmtTypeFilter'),
        exportBtn: document.getElementById('stmtExportBtn'),
        pdfBtn: document.getElementById('stmtPdfBtn')
    };

    if (!DOM.view) return; // Not initialized in HTML yet

    function renderStatement() {
        if (!DOM.tbody) return;
        const s = window.MT.db.loadStore();
        if (!s) return;

        let entries = [];
        Object.keys(s.days || {}).forEach(d => {
            (s.days[d] || []).forEach(e => {
                entries.push({ ...e, dateStr: d });
            });
        });

        // Sort by date desc, then by id desc
        entries.sort((a, b) => {
            if (a.dateStr === b.dateStr) return b.id - a.id;
            return a.dateStr < b.dateStr ? 1 : -1;
        });

        // Filter
        const m = DOM.monthFilter?.value;
        const t = DOM.typeFilter?.value;

        if (m) entries = entries.filter(e => e.dateStr.startsWith(m));
        if (t && t !== 'All') entries = entries.filter(e => e.type === t);

        DOM.tbody.innerHTML = '';
        if (entries.length === 0) {
            DOM.tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding: 20px;">No records found</td></tr>';
            return;
        }

        let balance = 0; // If we wanted a running balance, we'd sort asc, but let's just list them

        entries.forEach(e => {
            const tr = document.createElement('tr');

            // Format Date
            const dStr = new Date(e.dateStr).toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' });

            // Amount styling
            let amtStr = window.MT.db.currencyFmt(e.amount);
            let amtClass = '';
            if (e.type === 'Income') { amtStr = '+' + amtStr; amtClass = 'income text-success'; }
            else if (e.type === 'Expense') { amtStr = '-' + amtStr; amtClass = 'expense text-danger'; }

            // Details
            let details = e.description || '';
            if (e.note) details += ` <span style="opacity:0.6;font-size:0.85em;">(${e.note})</span>`;

            tr.innerHTML = `
                <td><div style="font-size:0.9em; white-space:nowrap;">${dStr}</div></td>
                <td><div class="badge ${e.type.toLowerCase()}">${e.type}</div></td>
                <td>${e.category || '-'}</td>
                <td>${details}</td>
                <td><div style="font-size:0.9em;">${e.payMethod || '-'}${e.paySubType ? '<br><small>' + e.paySubType + '</small>' : ''}</div></td>
                <td style="text-align:right;" class="${amtClass}"><b>${amtStr}</b></td>
            `;
            DOM.tbody.appendChild(tr);
        });
    }

    function exportPDF() {
        if (!window.jspdf) return alert('PDF library not loaded');
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();

        const m = DOM.monthFilter?.value || 'Full History';
        const s = window.MT.db.loadStore();

        // Header
        doc.setFontSize(18);
        doc.text('LUDARP Money Tracker - Statement', 14, 20);
        doc.setFontSize(11);
        doc.text(`Period: ${m}`, 14, 30);
        doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 35);

        const rows = [];
        const table = document.getElementById('statementTableBody');
        if (!table || table.rows.length === 0 || table.rows[0].innerText.includes('No records')) {
            return alert('No data to export');
        }

        Array.from(table.rows).forEach(tr => {
            const row = [];
            Array.from(tr.cells).forEach(td => row.push(td.innerText));
            rows.push(row);
        });

        doc.autoTable({
            startY: 45,
            head: [['Date', 'Type', 'Category', 'Details', 'Method', 'Amount']],
            body: rows,
            theme: 'striped',
            headStyles: { fillColor: [37, 99, 235] }, // Match accent color
            columnStyles: {
                5: { halign: 'right' }
            }
        });

        doc.save(`Money_Tracker_Statement_${m}.pdf`);
    }

    function init() {
        if (!DOM.view) {
            // we will inject the HTML dynamically if not present, but better to edit index.html
            return;
        }

        DOM.monthFilter?.addEventListener('change', renderStatement);
        DOM.typeFilter?.addEventListener('change', renderStatement);

        DOM.exportBtn?.addEventListener('click', () => {
            const m = DOM.monthFilter?.value;
            if (window.ExporterModule && window.ExporterModule.exportXLSX) {
                window.ExporterModule.exportXLSX(m || null);
            } else {
                alert('Excel Export module not available.');
            }
        });

        DOM.pdfBtn?.addEventListener('click', () => {
            exportPDF();
        });

        // Set current month in filter
        const now = new Date();
        if (DOM.monthFilter) DOM.monthFilter.value = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

        renderStatement();
    }

    window.MT = window.MT || {};
    window.MT.statement = { renderStatement };

    window.addEventListener('mt:auth-entered', init);
    window.addEventListener('mt:entries-changed', renderStatement);
    window.addEventListener('mt:view-changed', e => {
        if (e.detail?.viewName === 'statement') renderStatement();
    });

})();
