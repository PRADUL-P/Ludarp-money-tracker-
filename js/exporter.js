// exporter.js
(function () {

  /* =========================
     Inject modal CSS (once)
     ========================= */
  if (!document.getElementById('exporter-style')) {
    const style = document.createElement('style');
    style.id = 'exporter-style';
    style.textContent = `
      .export-modal {
        position: fixed;
        inset: 0;
        z-index: 999999;
        background: rgba(0,0,0,0.6);
        backdrop-filter: blur(6px);
        display: flex;
        align-items: center;
        justify-content: center;
      }
      .export-card {
        width: min(92vw, 460px);
        max-height: 90vh;
        overflow-y: auto;
        background: #0b1220;
        color: #e5e7eb;
        border-radius: 16px;
        padding: 18px;
        box-shadow: 0 30px 80px rgba(0,0,0,0.7);
        animation: modalPop .2s ease;
      }
      .export-card h3 {
        margin: 0 0 12px;
        text-align: center;
      }
      .export-card button,
      .export-card input {
        width: 100%;
        margin-top: 6px;
      }
      @keyframes modalPop {
        from { transform: scale(.95); opacity: 0; }
        to   { transform: scale(1); opacity: 1; }
      }
    `;
    document.head.appendChild(style);
  }

  /* =========================
     Store helpers
     ========================= */
  function loadStoreSafe() {
    if (window.loadStore) return loadStore();
    const raw = localStorage.getItem('money_tracker_v3');
    return raw ? JSON.parse(raw) : { days: {}, settings: {} };
  }

  function saveStoreSafe(s) {
    if (window.saveStore) saveStore(s);
    else localStorage.setItem('money_tracker_v3', JSON.stringify(s));
  }

  function download(blob, filename) {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  /* =========================
     EXPORT FUNCTIONS
     ========================= */
  function exportCSV(month) {
    const s = loadStoreSafe();
    const rows = [['date', 'type', 'description', 'category', 'amount']];
    Object.keys(s.days).forEach(d => {
      if (month && !d.startsWith(month)) return;
      s.days[d].forEach(e =>
        rows.push([d, e.type, e.description, e.category, e.amount])
      );
    });
    const csv = rows.map(r => r.join(',')).join('\n');
    download(new Blob([csv], { type: 'text/csv' }), 'money_tracker.csv');
  }

  function exportJSON() {
    const fullBackup = {
      main: loadStoreSafe(),
      dues: JSON.parse(localStorage.getItem('mt_dues_v1') || '[]'),
      budgets: JSON.parse(localStorage.getItem('mt_budgets_v1') || '{}'),
      recurring: JSON.parse(localStorage.getItem('mt_recurring_v1') || '[]'),
      custom: JSON.parse(localStorage.getItem('mt_custom_settings') || '{}'),
      timestamp: new Date().toISOString(),
      version: '2.0-full'
    };

    download(
      new Blob([JSON.stringify(fullBackup, null, 2)], { type: 'application/json' }),
      'money_tracker_FULL_backup.json'
    );
  }

  function exportXLSX(month) {
    if (!window.XLSX) return alert('XLSX library not loaded');
    const s = loadStoreSafe();
    const rows = [['date', 'type', 'description', 'category', 'amount']];
    Object.keys(s.days).forEach(d => {
      if (month && !d.startsWith(month)) return;
      s.days[d].forEach(e =>
        rows.push([d, e.type, e.description, e.category, e.amount])
      );
    });
    const ws = XLSX.utils.aoa_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Data');
    const out = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    download(new Blob([out]), 'money_tracker.xlsx');
  }

  /* =========================
     IMPORT FUNCTIONS
     ========================= */
  function importJSON(file) {
    const r = new FileReader();
    r.onload = () => {
      try {
        const data = JSON.parse(r.result);
        if (!data.days) throw 0;
        saveStoreSafe(data);
        alert('Import successful');
        location.reload();
      } catch {
        alert('Invalid JSON file');
      }
    };
    r.readAsText(file);
  }

  function importCSV(file) {
    const r = new FileReader();
    r.onload = () => {
      const s = loadStoreSafe();
      r.result.split('\n').slice(1).forEach(line => {
        const [date, type, desc, cat, amt] = line.split(',');
        if (!date) return;
        s.days[date] ??= [];
        s.days[date].push({
          id: Date.now(),
          type, description: desc, category: cat,
          amount: Number(amt || 0)
        });
      });
      saveStoreSafe(s);
      alert('CSV imported');
      location.reload();
    };
    r.readAsText(file);
  }

  function importXLSX(file) {
    if (!window.XLSX) return alert('XLSX library not loaded');
    const r = new FileReader();
    r.onload = e => {
      const wb = XLSX.read(new Uint8Array(e.target.result), { type: 'array' });
      const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);
      const s = loadStoreSafe();
      rows.forEach(r => {
        if (!r.date) return;
        s.days[r.date] ??= [];
        s.days[r.date].push({
          id: Date.now(),
          type: r.type, description: r.description,
          category: r.category, amount: r.amount
        });
      });
      saveStoreSafe(s);
      alert('Excel imported');
      location.reload();
    };
    r.readAsArrayBuffer(file);
  }

  /* =========================
     MODAL POPUP (EXPORT + IMPORT)
     ========================= */
  function openExportModal() {
    if (document.querySelector('.export-modal')) return;

    const overlay = document.createElement('div');
    overlay.className = 'export-modal';

    const card = document.createElement('div');
    card.className = 'export-card';
    card.innerHTML = `
      <h3>Export / Import</h3>

      <label>Month (optional)</label>
      <input id="exMonth" type="month">

      <button id="exCsv">Export CSV</button>
      <button id="exJson">Export JSON</button>
      <button id="exXlsx">Export Excel</button>

      <hr style="margin:12px 0;opacity:.3">

      <label>Import file</label>
      <input id="imFile" type="file" accept=".json,.csv,.xlsx">

      <div style="text-align:right;margin-top:12px">
        <button id="exClose">Close</button>
      </div>
    `;

    overlay.appendChild(card);
    document.body.appendChild(overlay);


    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) overlay.remove();
    });

    // prevent clicks inside modal from closing it
    card.addEventListener('click', (e) => {
      e.stopPropagation();
    });

    document.getElementById('exClose').onclick = () => overlay.remove();
    document.getElementById('exCsv').onclick = () => exportCSV(exMonth.value);
    document.getElementById('exJson').onclick = exportJSON;
    document.getElementById('exXlsx').onclick = () => exportXLSX(exMonth.value);

    document.getElementById('imFile').onchange = e => {
      const f = e.target.files[0];
      if (!f) return;
      if (f.name.endsWith('.json')) importJSON(f);
      else if (f.name.endsWith('.csv')) importCSV(f);
      else importXLSX(f);
    };
  }

  /* =========================
     GLOBAL API
     ========================= */
  window.ExporterModule = {
    openExportModal,
    exportCSV,
    exportJSON,
    exportXLSX
  };

})();
