'use strict';
/* =========================================================
   Accounts / Bank Balances Module
   - Month-based opening balance
   - Bank-wise balance calculation
   - Ledger modal with filters
   - Running balance
   - Export per bank CSV
   Depends on window.MT.db
========================================================= */

(function () {
  const db = window.MT.db;

  /* ---------- DOM ---------- */
  const accountsMonthInput = document.getElementById('accountsMonth');
  const accountsBankSelect = document.getElementById('accountsBankSelect');
  const accountsInitialAmount = document.getElementById('accountsInitialAmount');
  const saveInitialBtn = document.getElementById('saveInitialBtn');
  const bankBalancesList = document.getElementById('bankBalancesList');

  /* ---------- OPENING BALANCE ---------- */
  function setInitialBalanceForBank(month, bank, amount) {
    const s = db.loadStore();
    s.accounts = s.accounts || {};
    s.accounts[month] = s.accounts[month] || {};
    s.accounts[month][bank] = Number(amount);
    db.saveStore(s);
  }

  function getInitialBalance(month, bank) {
    const s = db.loadStore();
    return Number(
      s.accounts &&
      s.accounts[month] &&
      typeof s.accounts[month][bank] === 'number'
        ? s.accounts[month][bank]
        : 0
    );
  }

  /* ---------- BANK LIST ---------- */
  function populateAccountsBanks() {
    const s = db.loadStore();
    const banks = (s.settings && s.settings.banks) || [];
    accountsBankSelect.innerHTML = '';
    banks.forEach(b => {
      const o = document.createElement('option');
      o.value = b;
      o.textContent = b;
      accountsBankSelect.appendChild(o);
    });
  }

  /* ---------- BANK DETECTION ---------- */
  function transactionTouchesBank(entry, bankName) {
    if (!entry) return false;

    if (entry.type === 'Transfer' && entry.transfer) {
      if (!bankName) return true;
      return entry.transfer.from === bankName || entry.transfer.to === bankName;
    }

    if (entry.payMethod === 'Bank' && entry.paySubType) {
      return !bankName ? true : entry.paySubType === bankName;
    }

    const s = db.loadStore();
    const map = s.paymentBankMap || {};

    if (entry.payMethod === 'UPI' && entry.paySubType) {
      const m = map[`upi:${entry.paySubType}`];
      return !bankName ? !!m : m === bankName;
    }

    if (entry.mappedBank) {
      return !bankName ? true : entry.mappedBank === bankName;
    }

    return false;
  }

  /* ---------- BALANCE CALCULATION WITH CARRY-FORWARD ---------- */
  function getLatestInitialBalanceInfo(bank, targetMonth) {
    const s = db.loadStore();
    const months = Object.keys(s.accounts || {})
      .filter(m => s.accounts[m]?.[bank] !== undefined && (!targetMonth || m <= targetMonth))
      .sort();
    if (months.length === 0) return { startMonth: null, baseAmount: 0 };
    const startMonth = months[months.length - 1];
    const baseAmount = Number(s.accounts[startMonth][bank]) || 0;
    return { startMonth, baseAmount };
  }

  function getBankBalancesForMonth(targetMonth) {
    const s = db.loadStore();
    const balances = {};

    const bankSet = new Set();
    (s.settings?.banks || ['Cash', 'SBI', 'HDFC', 'Canara', 'Credit Card']).forEach(b => bankSet.add(b));
    Object.keys(s.accounts || {}).forEach(m => {
      Object.keys(s.accounts[m] || {}).forEach(b => bankSet.add(b));
    });

    Object.values(s.days || {}).forEach(dayEntries => {
      (dayEntries || []).forEach(e => {
        if (e.type === 'Transfer' && e.transfer) {
          if (e.transfer.from) bankSet.add(e.transfer.from);
          if (e.transfer.to) bankSet.add(e.transfer.to);
        } else {
          const bank = e.mappedBank || (e.payMethod === 'Cash' ? 'Cash' : e.paySubType) || (e.payMethod === 'Bank' ? 'SBI' : null);
          if (bank) bankSet.add(bank);
        }
      });
    });

    bankSet.forEach(bank => {
      const { startMonth, baseAmount } = getLatestInitialBalanceInfo(bank, targetMonth);
      let bal = baseAmount;

      Object.keys(s.days || {}).sort().forEach(dateStr => {
        const txMonth = dateStr.slice(0, 7);
        if (startMonth && txMonth < startMonth) return;
        if (targetMonth && txMonth > targetMonth) return;

        (s.days[dateStr] || []).forEach(e => {
          const amt = Number(e.amount) || 0;
          if (e.type === 'Transfer' && e.transfer) {
            if (e.transfer.from === bank) bal -= amt;
            if (e.transfer.to === bank) bal += amt;
            return;
          }
          const b = e.mappedBank || (e.payMethod === 'Cash' ? 'Cash' : e.paySubType) || (e.payMethod === 'Bank' ? 'SBI' : null);
          if (b === bank) {
            if (e.type === 'Income') bal += amt;
            else if (e.type === 'Expense') bal -= amt;
          }
        });
      });

      balances[bank] = bal;
    });

    return balances;
  }

  function getOpeningBalance(targetMonth, bank) {
    const s = db.loadStore();
    if (!targetMonth) return 0;

    if (s.accounts?.[targetMonth]?.[bank] !== undefined) {
      return Number(s.accounts[targetMonth][bank]) || 0;
    }

    const priorMonths = Object.keys(s.accounts || {})
      .filter(m => s.accounts[m]?.[bank] !== undefined && m < targetMonth)
      .sort();

    let startMonth = null;
    let balance = 0;
    if (priorMonths.length > 0) {
      startMonth = priorMonths[priorMonths.length - 1];
      balance = Number(s.accounts[startMonth][bank]) || 0;
    }

    Object.keys(s.days || {}).sort().forEach(dateStr => {
      const txMonth = dateStr.slice(0, 7);
      if (startMonth && txMonth < startMonth) return;
      if (txMonth >= targetMonth) return;

      (s.days[dateStr] || []).forEach(e => {
        const amt = Number(e.amount) || 0;
        if (e.type === 'Transfer' && e.transfer) {
          if (e.transfer.from === bank) balance -= amt;
          if (e.transfer.to === bank) balance += amt;
          return;
        }
        const b = e.mappedBank || (e.payMethod === 'Cash' ? 'Cash' : e.paySubType) || (e.payMethod === 'Bank' ? 'SBI' : null);
        if (b === bank) {
          if (e.type === 'Income') balance += amt;
          else if (e.type === 'Expense') balance -= amt;
        }
      });
    });

    return balance;
  }

  /* ---------- RENDER BANK CARDS ---------- */
  function renderBankBalances() {
    const month = accountsMonthInput.value;
    bankBalancesList.innerHTML = '';

    if (!month) {
      bankBalancesList.innerHTML = '<div class="info">Select month</div>';
      return;
    }

    const s = db.loadStore();
    const balances = getBankBalancesForMonth(month);

    const bankSet = new Set();
    (s.settings?.banks || ['Cash', 'SBI', 'HDFC', 'Canara', 'Credit Card']).forEach(b => bankSet.add(b));
    Object.keys(s.accounts?.[month] || {}).forEach(b => bankSet.add(b));
    Object.keys(balances).forEach(b => bankSet.add(b));

    Array.from(bankSet).sort().forEach(bank => {
      const opening = getOpeningBalance(month, bank);
      const current = balances[bank] || 0;
      const row = document.createElement('div');
      row.className = 'entry';

      row.innerHTML = `
        <div class="entry-main">
          <div class="entry-title">${bank}</div>
          <div class="entry-meta">
            Opening: ${db.currencyFmt(opening)}
          </div>
        </div>
        <div class="entry-right">
          <div class="entry-amount" style="color: ${current < 0 ? 'var(--danger)' : 'var(--text)'};">${db.currencyFmt(current)}</div>
          <button class="bank-action">Ledger</button>
          <button class="btn-small">Export</button>
        </div>
      `;

      row.querySelector('.bank-action').onclick =
        () => openBankTransactionsModal(month, bank);

      row.querySelector('.btn-small').onclick =
        () => exportBankCSV(month, bank);

      bankBalancesList.appendChild(row);
    });
  }

  /* ---------- EXPORT ---------- */
  function exportBankCSV(month, bank) {
    if (!confirm(`Export ${bank} transactions?`)) return;

    const s = db.loadStore();
    const rows = [['date','type','description','category','amount','note']];

    Object.keys(s.days || {}).sort().forEach(d => {
      if (!d.startsWith(month)) return;
      (s.days[d] || []).forEach(e => {
        if (transactionTouchesBank(e, bank)) {
          rows.push([
            d,
            e.type,
            e.description || '',
            e.category || '',
            e.amount || 0,
            e.note || ''
          ]);
        }
      });
    });

    const csv = rows.map(r =>
      r.map(c => `"${String(c).replace(/"/g,'""')}"`).join(',')
    ).join('\n');

    const blob = new Blob([csv], { type:'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `bank_${bank}_${month}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  /* ---------- LEDGER MODAL WITH FILTERS ---------- */
  function openBankTransactionsModal(month, bank) {
    const s = db.loadStore();
    const modal = document.createElement('div');
    modal.className = 'export-modal';

    const card = document.createElement('div');
    card.className = 'export-card';
    card.style.maxWidth = '860px';

    card.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;">
        <h3>${bank} — ${month}</h3>
        <button class="btn-secondary" id="closeLedger">Close</button>
      </div>

      <div class="row" style="margin-top:10px;gap:12px;flex-wrap:wrap;">
        <div>
          <label>Type</label>
          <select id="fType">
            <option value="All">All</option>
            <option>Income</option>
            <option>Expense</option>
            <option>Transfer</option>
          </select>
        </div>
        <div>
          <label>Category</label>
          <select id="fCategory"><option value="All">All</option></select>
        </div>
        <div>
          <label>Date</label>
          <input type="date" id="fDate">
        </div>
        <div style="align-self:flex-end;">
          <button class="btn-primary" id="applyFilters">Apply</button>
        </div>
      </div>

      <div id="ledgerList" style="margin-top:12px;max-height:380px;overflow:auto;"></div>
    `;

    modal.appendChild(card);
    document.body.appendChild(modal);

    card.querySelector('#closeLedger').onclick = () => modal.remove();

    const fType = card.querySelector('#fType');
    const fCategory = card.querySelector('#fCategory');
    const fDate = card.querySelector('#fDate');
    const ledgerList = card.querySelector('#ledgerList');

    const categories = new Set();
    Object.keys(s.days || {}).forEach(d => {
      if (!d.startsWith(month)) return;
      (s.days[d] || []).forEach(e => {
        if (transactionTouchesBank(e, bank)) {
          categories.add(e.category || 'Uncategorized');
        }
      });
    });

    categories.forEach(c => {
      const o = document.createElement('option');
      o.value = c;
      o.textContent = c;
      fCategory.appendChild(o);
    });

    function renderLedger() {
      ledgerList.innerHTML = '';
      let running = getInitialBalance(month, bank);

      ledgerList.innerHTML += `
        <div class="entry">
          <div class="entry-main">
            <div class="entry-title">Opening balance</div>
          </div>
          <div class="entry-right">
            <div class="entry-amount">${db.currencyFmt(running)}</div>
          </div>
        </div>
      `;

      Object.keys(s.days || {}).sort().forEach(d => {
        if (!d.startsWith(month)) return;
        if (fDate.value && d !== fDate.value) return;

        (s.days[d] || []).forEach(e => {
          if (!transactionTouchesBank(e, bank)) return;
          if (fType.value !== 'All' && e.type !== fType.value) return;
          if (fCategory.value !== 'All' && (e.category || 'Uncategorized') !== fCategory.value) return;

          const amt = Number(e.amount) || 0;

          if (e.type === 'Income') running += amt;
          else if (e.type === 'Expense') running -= amt;
          else if (e.type === 'Transfer') {
            if (e.transfer?.to === bank) running += amt;
            if (e.transfer?.from === bank) running -= amt;
          }

          ledgerList.innerHTML += `
            <div class="entry">
              <div class="entry-main">
                <div class="entry-title">${db.formatDateLabel(d)} — ${e.description || ''}</div>
                <div class="entry-meta">${e.type} • ${e.category || 'Uncategorized'}</div>
              </div>
              <div class="entry-right">
                <div class="entry-amount">${db.currencyFmt(running)}</div>
              </div>
            </div>
          `;
        });
      });
    }

    card.querySelector('#applyFilters').onclick = renderLedger;
    renderLedger();
  }

  /* ---------- INIT ---------- */
  function getTotalBalance(month) {
    if (!month) return 0;
    const balances = getBankBalancesForMonth(month);
    return Object.values(balances).reduce((sum, v) => sum + (Number(v) || 0), 0);
  }

  window.MT = window.MT || {};
  window.MT.accounts = {
    populateAccountsBanks,
    renderBankBalances,
    getTotalBalance,
    getBankBalancesForMonth,
    getOpeningBalance,
    rebuildAccountBalances: renderBankBalances
  };

  window.addEventListener('mt:auth-entered', () => {
    populateAccountsBanks();

    const globalMonth = document.getElementById('monthPicker')?.value;
    if (globalMonth) accountsMonthInput.value = globalMonth;

    accountsMonthInput.addEventListener('change', renderBankBalances);

    saveInitialBtn.addEventListener('click', () => {
      const m = accountsMonthInput.value;
      const bank = accountsBankSelect.value;
      const amt = Number(accountsInitialAmount.value);

      if (!m || !bank) return alert('Select month & bank');

      const existing = getInitialBalance(m, bank);
      if (existing !== 0 && !confirm(`Replace existing balance (${db.currencyFmt(existing)})?`)) return;

      setInitialBalanceForBank(m, bank, amt);
      window.MT.ui?.showToast?.('Initial balance saved');
      renderBankBalances();
    });

    renderBankBalances();
  });
})();
// 🔥 LIVE update Accounts page when settings change (banks added/removed) or entries change
document.addEventListener('settingsUpdated', () => {
  if (window.MT?.accounts?.populateAccountsBanks) {
    window.MT.accounts.populateAccountsBanks();
  }
  if (window.MT?.accounts?.renderBankBalances) {
    window.MT.accounts.renderBankBalances();
  }
});
window.addEventListener('mt:entries-changed', () => {
  if (window.MT?.accounts?.renderBankBalances) {
    window.MT.accounts.renderBankBalances();
  }
});
