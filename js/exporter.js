// exporter.js — enhanced with Settings / Transactions / Full export + smart import
(function () {

  /* =========================
     Store helpers
     ========================= */
  function loadStoreSafe() {
    try {
      if (window.MT && window.MT.db && window.MT.db.loadStore) return window.MT.db.loadStore();
      const raw = localStorage.getItem('money_tracker_v3');
      return raw ? JSON.parse(raw) : { days: {}, settings: {} };
    } catch { return { days: {}, settings: {} }; }
  }

  function saveStoreSafe(s) {
    try {
      if (window.MT && window.MT.db && window.MT.db.saveStore) window.MT.db.saveStore(s);
      else localStorage.setItem('money_tracker_v3', JSON.stringify(s));
    } catch(e) { console.error('Save error:', e); }
  }

  function download(blob, filename) {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }

  function dateTag() {
    return new Date().toISOString().slice(0, 10);
  }

  function parseCSVLine(line) {
    const result = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++; // skip next quote
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        result.push(current);
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current);
    return result;
  }

  function normalizeDate(d) {
    if (!d) return '';
    let dateObj;
    if (typeof d === 'number' || (!isNaN(d) && !isNaN(parseFloat(d)) && String(d).trim().length > 0 && !String(d).includes('-') && !String(d).includes('/'))) {
      const serial = parseFloat(d);
      dateObj = new Date(1899, 11, 30);
      dateObj.setDate(dateObj.getDate() + Math.floor(serial));
    } else {
      const s = String(d).trim();
      if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
      
      dateObj = new Date(s);
      if (isNaN(dateObj.getTime())) {
        const parts = s.split(/[-/]/);
        if (parts.length === 3) {
          let day, month, year;
          if (parts[2].length === 4) {
            year = parseInt(parts[2], 10);
            const p0 = parseInt(parts[0], 10);
            const p1 = parseInt(parts[1], 10);
            if (p0 > 12) {
              day = p0; month = p1;
            } else if (p1 > 12) {
              day = p1; month = p0;
            } else {
              day = p0; month = p1; // default to DD/MM/YYYY
            }
            dateObj = new Date(year, month - 1, day);
          } else if (parts[0].length === 4) {
            year = parseInt(parts[0], 10);
            month = parseInt(parts[1], 10);
            day = parseInt(parts[2], 10);
            dateObj = new Date(year, month - 1, day);
          }
        }
      }
    }
    if (dateObj && !isNaN(dateObj.getTime())) {
      const yyyy = dateObj.getFullYear();
      const mm = String(dateObj.getMonth() + 1).padStart(2, '0');
      const dd = String(dateObj.getDate()).padStart(2, '0');
      return `${yyyy}-${mm}-${dd}`;
    }
    return '';
  }

  /* =========================
     FLATTEN transactions for CSV / XLSX
     ========================= */
  function flattenTransactions(s) {
    const rows = [];
    Object.keys(s.days || {}).sort().forEach(date => {
      (s.days[date] || []).forEach(e => {
        rows.push({
          date,
          type: e.type || '',
          description: e.description || '',
          category: e.category || '',
          payMethod: e.payMethod || '',
          paySubType: e.paySubType || '',
          amount: e.amount || 0,
          note: e.note || '',
          split: e.split ? 'Yes' : 'No'
        });
      });
    });
    return rows;
  }

  /* ======================================================
     EXPORT — TRANSACTIONS ONLY
     ====================================================== */
  function exportTransactionsCSV() {
    const s = loadStoreSafe();
    const rows = flattenTransactions(s);
    const header = ['date','type','description','category','payMethod','paySubType','amount','note','split'];
    const lines = [header.join(','), ...rows.map(r => header.map(k => `"${String(r[k]).replace(/"/g,'""')}"`).join(','))];
    download(new Blob([lines.join('\n')], { type: 'text/csv' }), `mt_transactions_${dateTag()}.csv`);
  }

  function exportTransactionsJSON() {
    const s = loadStoreSafe();
    const payload = {
      type: 'transactions',
      days: s.days,
      timestamp: new Date().toISOString(),
      version: '2.0'
    };
    download(new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' }), `mt_transactions_${dateTag()}.json`);
  }

  function exportTransactionsXLSX() {
    if (!window.XLSX) return alert('Excel library not loaded yet. Try again in a moment.');
    const s = loadStoreSafe();
    const rows = flattenTransactions(s);
    const header = ['date','type','description','category','payMethod','paySubType','amount','note','split'];
    const aoa = [header, ...rows.map(r => header.map(k => r[k]))];
    const ws = XLSX.utils.aoa_to_sheet(aoa);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Transactions');
    const out = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    download(new Blob([out], { type: 'application/octet-stream' }), `mt_transactions_${dateTag()}.xlsx`);
  }

  /* ======================================================
     EXPORT — SETTINGS ONLY
     ====================================================== */
  function exportSettingsJSON() {
    const s = loadStoreSafe();
    const custom = JSON.parse(localStorage.getItem('mt_custom_settings') || '{}');
    const payload = {
      type: 'settings',
      settings: s.settings || {},
      paymentBankMap: s.paymentBankMap || {},
      custom,
      timestamp: new Date().toISOString(),
      version: '2.0'
    };
    download(new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' }), `mt_settings_${dateTag()}.json`);
  }

  function exportSettingsCSV() {
    const s = loadStoreSafe();
    const st = s.settings || {};
    const rows = [
      ['type','key','value'],
      ...((st.categories || []).map(c => ['category','name', c])),
      ...((st.upiApps || []).map(u => ['upiApp','name', u])),
      ...((st.cards || []).map(c => ['card','name', c])),
      ...((st.banks || []).map(b => ['bank','name', b])),
    ];
    const lines = rows.map(r => r.map(v => `"${String(v).replace(/"/g,'""')}"`).join(','));
    download(new Blob([lines.join('\n')], { type: 'text/csv' }), `mt_settings_${dateTag()}.csv`);
  }

  function exportSettingsXLSX() {
    if (!window.XLSX) return alert('Excel library not loaded yet.');
    const s = loadStoreSafe();
    const st = s.settings || {};
    const aoa = [
      ['type', 'key', 'value'],
      ...((st.categories || []).map(c => ['category', 'name', c])),
      ...((st.upiApps || []).map(u => ['upiApp', 'name', u])),
      ...((st.cards || []).map(c => ['card', 'name', c])),
      ...((st.banks || []).map(b => ['bank', 'name', b])),
    ];
    const ws = XLSX.utils.aoa_to_sheet(aoa);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Settings');
    const out = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    download(new Blob([out], { type: 'application/octet-stream' }), `mt_settings_${dateTag()}.xlsx`);
  }

  /* ======================================================
     EXPORT — FULL BACKUP (ALL DATA)
     ====================================================== */
  function exportAllJSON() {
    const fullBackup = {
      type: 'full',
      main: loadStoreSafe(),
      dues: JSON.parse(localStorage.getItem('mt_dues_v1') || '[]'),
      budgets: JSON.parse(localStorage.getItem('mt_budgets_v1') || '{}'),
      recurring: JSON.parse(localStorage.getItem('mt_recurring_v1') || '[]'),
      custom: JSON.parse(localStorage.getItem('mt_custom_settings') || '{}'),
      timestamp: new Date().toISOString(),
      version: '2.0-full'
    };
    download(new Blob([JSON.stringify(fullBackup, null, 2)], { type: 'application/json' }), `mt_FULL_backup_${dateTag()}.json`);
  }

  // Legacy alias
  const exportJSON = exportAllJSON;

  function exportAllCSV() {
    const s = loadStoreSafe();
    const txRows = flattenTransactions(s);
    const dues = JSON.parse(localStorage.getItem('mt_dues_v1') || '[]');

    const txHeader = ['section','date','type','description','category','payMethod','amount','note'];
    const txLines = txRows.map(r => ['transaction', r.date, r.type, r.description, r.category, r.payMethod, r.amount, r.note]);

    const dueHeader = ['section','person','type','amount','description','date','paid','paidDate'];
    const dueLines = dues.map(d => ['due', d.person, d.type, d.amount, d.description, d.date, d.paid ? 'Yes' : 'No', d.paidDate || '']);

    const allRows = [txHeader, ...txLines, [], dueHeader, ...dueLines];
    const csv = allRows.map(r => Array.isArray(r) ? r.map(v => `"${String(v||'').replace(/"/g,'""')}"`).join(',') : '').join('\n');
    download(new Blob([csv], { type: 'text/csv' }), `mt_ALL_${dateTag()}.csv`);
  }

  function exportAllXLSX() {
    if (!window.XLSX) return alert('Excel library not loaded yet.');
    const s = loadStoreSafe();
    const dues = JSON.parse(localStorage.getItem('mt_dues_v1') || '[]');

    // Sheet 1 – Transactions
    const txRows = flattenTransactions(s);
    const txHeader = ['date','type','description','category','payMethod','paySubType','amount','note','split'];
    const txAoa = [txHeader, ...txRows.map(r => txHeader.map(k => r[k]))];

    // Sheet 2 – Dues
    const dueHeader = ['person','type','amount','description','date','paid','paidDate','note'];
    const dueAoa = [dueHeader, ...dues.map(d => [d.person, d.type, d.amount, d.description, d.date, d.paid ? 'Yes' : 'No', d.paidDate || '', d.note || ''])];

    // Sheet 3 – Settings
    const st = s.settings || {};
    const setAoa = [
      ['type','value'],
      ...((st.categories||[]).map(c => ['Category', c])),
      ...((st.upiApps||[]).map(u => ['UPI App', u])),
      ...((st.cards||[]).map(c => ['Card', c])),
      ...((st.banks||[]).map(b => ['Bank', b])),
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(txAoa), 'Transactions');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(dueAoa), 'Dues');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(setAoa), 'Settings');

    const out = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    download(new Blob([out], { type: 'application/octet-stream' }), `mt_ALL_${dateTag()}.xlsx`);
  }

  /* ======================================================
     SMART IMPORT — auto-detects file type + content
     ====================================================== */
  async function smartImport(file) {
    if (!file) return;
    const name = file.name.toLowerCase();

    if (name.endsWith('.json')) {
      await importJSON(file);
    } else if (name.endsWith('.csv')) {
      await importCSV(file);
    } else if (name.endsWith('.xlsx') || name.endsWith('.xls')) {
      await importXLSX(file);
    } else {
      alert('Unsupported file type. Please use .json, .csv, or .xlsx');
    }
  }

  async function importJSON(file) {
    try {
      const text = await file.text();
      const data = JSON.parse(text);

      // Full backup
      if (data.main && (data.main.days !== undefined)) {
        if (!confirm('Import FULL backup? This will overwrite ALL current data (transactions, dues, settings).')) return;
        saveStoreSafe(data.main);
        if (data.dues) localStorage.setItem('mt_dues_v1', JSON.stringify(data.dues));
        if (data.budgets) localStorage.setItem('mt_budgets_v1', JSON.stringify(data.budgets));
        if (data.recurring) localStorage.setItem('mt_recurring_v1', JSON.stringify(data.recurring));
        if (data.custom) localStorage.setItem('mt_custom_settings', JSON.stringify(data.custom));
        alert('✅ Full backup restored successfully!');
        location.reload();
        return;
      }

      // Transactions-only JSON
      if (data.type === 'transactions' && data.days) {
        if (!confirm('Import transaction data? This MERGES with existing transactions.')) return;
        const s = loadStoreSafe();
        Object.keys(data.days).forEach(date => {
          s.days[date] = s.days[date] || [];
          (data.days[date] || []).forEach(entry => {
            if (!s.days[date].find(e => e.id === entry.id)) s.days[date].push(entry);
          });
        });
        saveStoreSafe(s);
        alert('✅ Transactions imported (merged)!');
        location.reload();
        return;
      }

      // Settings-only JSON
      if (data.type === 'settings' && (data.settings || data.paymentBankMap || data.custom)) {
        if (!confirm('Import settings? This will overwrite your current settings.')) return;
        const s = loadStoreSafe();
        if (data.settings) s.settings = data.settings;
        if (data.paymentBankMap) s.paymentBankMap = data.paymentBankMap;
        saveStoreSafe(s);
        if (data.custom) localStorage.setItem('mt_custom_settings', JSON.stringify(data.custom));
        alert('✅ Settings imported!');
        location.reload();
        return;
      }

      // Legacy format (old full backup without type field)
      if (data.days !== undefined) {
        if (!confirm('Import backup? This will overwrite current transaction data.')) return;
        saveStoreSafe(data);
        alert('✅ Data imported!');
        location.reload();
        return;
      }

      alert('⚠️ Unrecognized JSON format. Please use a file exported from this app.');
    } catch (err) {
      console.error(err);
      alert('❌ Invalid JSON file. Make sure it was exported from this app.');
    }
  }

  async function importCSV(file) {
    try {
      const text = await file.text();
      const lines = text.trim().split('\n');
      const header = parseCSVLine(lines[0]).map(h => h.trim());

      if (!confirm('Import CSV data? This MERGES with existing transactions.')) return;

      const s = loadStoreSafe();
      lines.slice(1).forEach(line => {
        if (!line.trim()) return;
        const cols = parseCSVLine(line);
        const row = {};
        header.forEach((h, i) => { row[h] = (cols[i] || '').trim(); });

        const date = normalizeDate(row.date);
        if (!date) return;
        s.days[date] = s.days[date] || [];
        s.days[date].push({
          id: Date.now() + Math.random(),
          dateStr: date,
          type: row.type || 'Expense',
          description: row.description || '',
          category: row.category || '',
          payMethod: row.payMethod || row.paymethod || 'Cash',
          paySubType: row.paySubType || row.paysubtype || '',
          amount: parseFloat(row.amount) || 0,
          note: row.note || '',
          createdAt: new Date().toISOString(),
          split: null
        });
      });
      saveStoreSafe(s);
      alert('✅ CSV transactions imported (merged)!');
      location.reload();
    } catch(err) {
      console.error(err);
      alert('❌ Failed to import CSV. Please check the file format.');
    }
  }

  async function importXLSX(file) {
    if (!window.XLSX) return alert('Excel library not loaded. Try again in a moment.');
    try {
      const ab = await file.arrayBuffer();
      const wb = XLSX.read(new Uint8Array(ab), { type: 'array' });

      if (!confirm('Import Excel data? Transactions sheet will be MERGED with existing data.')) return;

      const s = loadStoreSafe();

      // Process each sheet
      wb.SheetNames.forEach(sheetName => {
        const rows = XLSX.utils.sheet_to_json(wb.Sheets[sheetName]);
        if (!rows.length) return;
        const first = rows[0];
        
        // Transactions sheet (has 'date' & 'amount')
        if ('date' in first && 'amount' in first) {
          rows.forEach(r => {
            const date = normalizeDate(r.date);
            if (!date) return;
            s.days[date] = s.days[date] || [];
            s.days[date].push({
              id: Date.now() + Math.random(),
              dateStr: date,
              type: r.type || 'Expense',
              description: r.description || '',
              category: r.category || '',
              payMethod: r.payMethod || r.paymethod || 'Cash',
              paySubType: r.paySubType || '',
              amount: parseFloat(r.amount) || 0,
              note: r.note || '',
              createdAt: new Date().toISOString(),
              split: null
            });
          });
        }

        // Settings sheet (has 'type' & 'value')
        if ('type' in first && 'value' in first && !('date' in first)) {
          s.settings = s.settings || {};
          rows.forEach(r => {
            const t = r.type; const v = r.value;
            if (!v) return;
            if (t === 'Category') { s.settings.categories = s.settings.categories || []; if (!s.settings.categories.includes(v)) s.settings.categories.push(v); }
            if (t === 'UPI App') { s.settings.upiApps = s.settings.upiApps || []; if (!s.settings.upiApps.includes(v)) s.settings.upiApps.push(v); }
            if (t === 'Card') { s.settings.cards = s.settings.cards || []; if (!s.settings.cards.includes(v)) s.settings.cards.push(v); }
            if (t === 'Bank') { s.settings.banks = s.settings.banks || []; if (!s.settings.banks.includes(v)) s.settings.banks.push(v); }
          });
        }
      });

      saveStoreSafe(s);
      alert('✅ Excel data imported (merged)!');
      location.reload();
    } catch(err) {
      console.error(err);
      alert('❌ Failed to import Excel file.');
    }
  }

  /* =========================
     GLOBAL API
     ========================= */
  window.ExporterModule = {
    // Settings
    exportSettingsJSON, exportSettingsCSV, exportSettingsXLSX,
    // Transactions
    exportTransactionsJSON, exportTransactionsCSV, exportTransactionsXLSX,
    // Full / All
    exportAllJSON, exportAllCSV, exportAllXLSX,
    // Legacy aliases
    exportJSON, exportCSV: exportTransactionsCSV, exportXLSX: exportTransactionsXLSX,
    // Import
    smartImport, importJSON, importCSV, importXLSX,
  };

})();
