'use strict';

/* ------------- Keys & defaults ------------- */
const STORAGE_KEY = 'money_tracker_v3';
const USER_KEY = 'money_tracker_user_v3';
const CUSTOM_KEY = 'money_tracker_custom_v3';

const DEFAULTS = {
  settings: {
    categories: ['Food','Travel','Bills','Shopping','Salary','Other'],
    upiApps: ['GPay','PhonePe','Paytm'],
    cards: ['Canara','HDFC','SBI','Credit Card'],
    banks: ['Canara','HDFC','SBI']
  },
  custom: {
    accent: '#2563eb',
    currency: '₹'
  }
};

/* ------------- Storage helpers ------------- */
function loadStore(){
  try{
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : { version:1, days:{}, settings: DEFAULTS.settings, accounts:{}, paymentBankMap:{} };
  }catch(e){ console.error(e); return { version:1, days:{}, settings: DEFAULTS.settings, accounts:{}, paymentBankMap:{} }; }
}
function saveStore(store){ localStorage.setItem(STORAGE_KEY, JSON.stringify(store)); }

function loadUser(){ try{ const r=localStorage.getItem(USER_KEY); return r?JSON.parse(r):null;}catch{return null;} }
function saveUser(u){ localStorage.setItem(USER_KEY, JSON.stringify(u)); }

function loadCustom(){ try{ const r=localStorage.getItem(CUSTOM_KEY); return r?JSON.parse(r):DEFAULTS.custom;}catch{return DEFAULTS.custom;} }
function saveCustom(c){ localStorage.setItem(CUSTOM_KEY, JSON.stringify(c)); applyCustom(); }

/* ------------- DOM refs ------------- */
const authScreen = document.getElementById('authScreen');
const authForm = document.getElementById('authForm');
const authNameRow = document.getElementById('authNameRow');
const authNameInput = document.getElementById('authName');
const authSecurityHintInput = document.getElementById('authSecurityHint');
const authPasswordInput = document.getElementById('authPassword');
const authSubmitBtn = document.getElementById('authSubmitBtn');
const forgotBtn = document.getElementById('forgotBtn');
const authHint = document.getElementById('authHint');

const appRoot = document.getElementById('appRoot');
const navItems = document.querySelectorAll('.nav-item');
let mainMenu = document.getElementById('mainMenu'); // will be reparented to body
let menuToggle = document.getElementById('menuToggle'); // will be reparented to body
const themeToggleTop = document.getElementById('themeToggleTop');
const headerTop = document.querySelector('.header-top');

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

const dateModeSelect = document.getElementById('dateMode');
const monthPicker = document.getElementById('monthPicker');
const yearPicker = document.getElementById('yearPicker');
const monthPickerWrap = document.getElementById('monthPickerWrap');
const yearPickerWrap = document.getElementById('yearPickerWrap');
const filterPaymentSelect = document.getElementById('filterPayment');
const filterCategorySelect = document.getElementById('filterCategory');
const typeFilterSelect = document.getElementById('typeFilter');

const categoryPieCanvas = document.getElementById('categoryPie');
const categoryLegendEl = document.getElementById('categoryLegend');
const summaryHistoryEl = document.getElementById('summaryHistory');
const monthSumExpenseEl = document.getElementById('monthSumExpense');
const monthSumIncomeEl = document.getElementById('monthSumIncome');
const splitOutstandingEl = document.getElementById('splitOutstanding');

const settingsUpiEl = document.getElementById('settingsUpi');
const settingsCardsEl = document.getElementById('settingsCards');
const settingsBanksEl = document.getElementById('settingsBanks');
const newUpiInput = document.getElementById('newUpi');
const addUpiBtn = document.getElementById('addUpiBtn');
const newCardInput = document.getElementById('newCard');
const addCardBtn = document.getElementById('addCardBtn');
const newBankInput = document.getElementById('newBank');
const addBankBtn = document.getElementById('addBankBtn');

const accentColorInput = document.getElementById('accentColor');
const currencySymbolInput = document.getElementById('currencySymbol');
const settingCategoriesInput = document.getElementById('settingCategories');
const saveCustomizationBtn = document.getElementById('saveCustomization');
const resetCustomizationBtn = document.getElementById('resetCustomization');
const themeSelect = document.getElementById('themeSelect');

const userNameField = document.getElementById('userNameField');
const securityHintInput = document.getElementById('securityHint');
const biometricEnabledCheckbox = document.getElementById('biometricEnabled');
const oldPasswordInput = document.getElementById('oldPassword');
const newPasswordInput = document.getElementById('newPassword');
const changePasswordBtn = document.getElementById('changePasswordBtn');
const passwordStatusEl = document.getElementById('passwordStatus');

const rowsPerPageSelect = document.getElementById('rowsPerPage');
const summaryExportBtn = document.getElementById('summaryExportBtn');

const accountsMonthInput = document.getElementById('accountsMonth');
const accountsBankSelect = document.getElementById('accountsBankSelect');
const accountsInitialAmount = document.getElementById('accountsInitialAmount');
const saveInitialBtn = document.getElementById('saveInitialBtn');
const bankBalancesList = document.getElementById('bankBalancesList');

const exportMenuBtn = document.getElementById('exportMenuBtn');
const clearAppDataBtn = document.getElementById('clearAppDataBtn');

const settingsExpCsvBtn = document.getElementById('settingsExpCsv');
const settingsExpJsonBtn = document.getElementById('settingsExpJson');
const settingsExpXlsxBtn = document.getElementById('settingsExpXlsx');
const settingsImportFileInput = document.getElementById('settingsImportFile');

let currentEdit = null;
let custom = loadCustom();

/* ---------- util ---------- */
function getTZOffsetMs(){ return new Date().getTimezoneOffset()*60000; }
function todayISO(){ const d=new Date(); return new Date(d - getTZOffsetMs()).toISOString().slice(0,10); }
function formatDateLabel(dateStr){
  if(!dateStr) return '';
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString(undefined,{day:'2-digit',month:'short',year:'numeric'});
}
function currencyFmt(v){ return (custom.currency||'₹') + Number(v).toFixed(2); }

/* ------------- AUTH ------------- */
function setupAuth(){
  const user = loadUser();
  if(!user){
    authNameRow.style.display='block';
    document.getElementById('authTitle').textContent='Create account';
    document.getElementById('authSubtitle').textContent='Set a password to secure your data on this device.';
    authSubmitBtn.textContent='Create & Enter';
  } else {
    authNameRow.style.display='none';
    document.getElementById('authTitle').textContent=`Welcome back, ${user.name||'User'}`;
    document.getElementById('authSubtitle').textContent='Enter your password to continue.';
    authSubmitBtn.textContent='Unlock';
    authHint.textContent = user.securityHint ? `Hint: ${user.securityHint}` : '';
  }

  authForm.addEventListener('submit', e=>{
    e.preventDefault();
    const pw = authPasswordInput.value.trim();
    if(!pw){ alert('Password required'); return; }
    const existing = loadUser();
    if(!existing){
      const name = authNameInput.value.trim() || 'User';
      const hint = authSecurityHintInput ? authSecurityHintInput.value.trim() : '';
      const u = { name, password: pw, biometricPreferred:false, securityHint: hint };
      saveUser(u);
      enterApp();
    } else {
      if(pw !== existing.password){ alert('Incorrect password'); return; }
      enterApp();
    }
  });

  forgotBtn.addEventListener('click', ()=>{
    const u = loadUser();
    if(!u){ alert('No account exists. Create one first.'); return; }
    const name = prompt('Enter your user name to reset password:');
    if(!name) return;
    if(name.trim() !== u.name){ alert('Name does not match. Cannot reset.'); return; }
    if(u.securityHint){
      const hintAns = prompt(`Security hint: ${u.securityHint}\nType anything to confirm:`);
      if(!hintAns){ alert('Reset cancelled'); return; }
    }
    const newPw = prompt('Enter a new password (will replace old):');
    if(!newPw) return;
    u.password = newPw;
    saveUser(u);
    alert('Password reset locally. Please login with new password.');
  });
}

function enterApp(){
  authScreen.style.display='none';
  appRoot.style.display='block';
  initApp();
}

/* ------------- THEME & CUSTOM ------------- */
function applyCustom(){
  custom = loadCustom();
  document.documentElement.style.setProperty('--accent', custom.accent||DEFAULTS.custom.accent);
  if(accentColorInput) accentColorInput.value = custom.accent || DEFAULTS.custom.accent;
  if(currencySymbolInput) currencySymbolInput.value = custom.currency || DEFAULTS.custom.currency;
}

function setupTheme(){
  const theme = localStorage.getItem('money_theme') || 'dark';
  document.body.dataset.theme = theme;
  if(themeToggleTop) themeToggleTop.textContent = theme === 'dark' ? '🌙' : '☀️';
  themeToggleTop && themeToggleTop.addEventListener('click', ()=>{
    const cur = document.body.dataset.theme || 'dark';
    const next = cur === 'dark' ? 'light' : 'dark';
    document.body.dataset.theme = next;
    localStorage.setItem('money_theme', next);
    themeToggleTop.textContent = next === 'dark' ? '🌙' : '☀️';
    if(themeSelect) themeSelect.value = next;
  });

  if(themeSelect){
    themeSelect.value = document.body.dataset.theme || 'dark';
    themeSelect.addEventListener('change', ()=>{
      const v = themeSelect.value || 'dark';
      document.body.dataset.theme = v;
      localStorage.setItem('money_theme', v);
      themeToggleTop.textContent = v === 'dark' ? '🌙' : '☀️';
    });
  }
}

/* ------------- NAV & menu placement changes ------------- */

/*
  Important changes:
  - Move the menu toggle and the main menu element to document.body so they won't be clipped by any parent containers (carousel, header card etc)
  - Position the menu toggle in fixed coords aligned with header and keep it visible (z-index)
  - The main menu is a fixed element; positionMainMenu computes top based on header rect and places menu below header
  - Pointer-events toggled off when menu closed to avoid invisible overlay preventing clicks
*/

function ensureMenuElementsInBody(){
  // Try to reparent mainMenu and menuToggle into document.body to avoid container clipping
  try {
    if(!mainMenu) mainMenu = document.getElementById('mainMenu');
    if(!menuToggle) menuToggle = document.getElementById('menuToggle');

    if(mainMenu && mainMenu.parentElement !== document.body){
      document.body.appendChild(mainMenu);
      // ensure style basics
      mainMenu.style.position = 'fixed';
      mainMenu.style.zIndex = 99999;
      mainMenu.style.pointerEvents = 'none';
    }

    if(menuToggle && menuToggle.parentElement !== document.body){
      // preserve existing event listeners by cloning node content into a new button wrapper
      const rect = menuToggle.getBoundingClientRect();
      // Move original element to body; some CSS may rely on it, so try to keep class/id
      document.body.appendChild(menuToggle);
      menuToggle.style.position = 'fixed';
      menuToggle.style.zIndex = 100000;
      menuToggle.style.background = 'transparent';
      menuToggle.style.border = 'none';
      menuToggle.style.pointerEvents = 'auto';
      // initial placement
      positionMenuToggle();
    }
  } catch(e){
    console.warn('Menu reparent failed', e);
  }
}

function positionMenuToggle(){
  try {
    if(!menuToggle) return;
    const headerRect = headerTop ? headerTop.getBoundingClientRect() : { top: 12, right: window.innerWidth - 12, height: 56 };
    // Place button slightly inside header top-left corner area (but fixed so not inside header DOM)
    const top = Math.max(8, headerRect.top + 8); // px from viewport top
    const right = Math.max(8, window.innerWidth - (headerRect.right - 12)); // region aligned to header right
    // If headerRect.right is 0 or not available, place at top-right
    const fallbackRight = 18;
    // Compute a final right coordinate in px from viewport right
    // Simpler: place near top-right corner with offset if header exists
    let finalRight = 18;
    if(headerTop){
      // use headerRect.right as anchor
      finalRight = Math.max(12, window.innerWidth - (headerRect.right - 18));
    }
    // set styles
    menuToggle.style.top = `${top}px`;
    menuToggle.style.right = `${finalRight}px`;
    menuToggle.style.left = 'auto';
    menuToggle.style.boxShadow = 'none';
    menuToggle.style.transform = 'none';
  } catch(e){
    // fallback
    menuToggle.style.top = '12px';
    menuToggle.style.right = '18px';
    menuToggle.style.left = 'auto';
  }
}

function initNav(){
  ensureMenuElementsInBody();

  navItems.forEach(btn=>{
    btn.addEventListener('click', ()=>{
      navItems.forEach(b=>b.classList.remove('active'));
      btn.classList.add('active');
      const view = btn.dataset.view;
      showView(view);
      closeMainMenu();
    });
  });

  // safe toggle binding: remove old handlers (if any) then add new
  if(menuToggle){
    // Remove duplicate listeners by replacing with a small wrapper
    const newToggle = menuToggle.cloneNode(true);
    menuToggle.parentElement.replaceChild(newToggle, menuToggle);
    menuToggle = newToggle;
    menuToggle.addEventListener('click', e=>{
      e.stopPropagation();
      const isOpen = mainMenu.classList.toggle('open');
      if(isOpen) openMainMenu(); else closeMainMenu();
    });
  }

  // ensure mainMenu exists and listen to clicks inside it
  if(mainMenu){
    mainMenu.addEventListener('click', e => e.stopPropagation());
    // ensure it is a direct child of body (to avoid clip/overflow hidden)
    if(mainMenu.parentElement !== document.body) document.body.appendChild(mainMenu);
    // default to hidden
    mainMenu.style.display = 'none';
    mainMenu.style.pointerEvents = 'none';
    mainMenu.style.zIndex = 99999;
    mainMenu.setAttribute('aria-hidden', 'true');
  }

  // document click: close only when click outside menu, outside toggle and outside nav-item
  document.addEventListener('click', (e) => {
    try {
      const target = e.target;
      if(mainMenu && mainMenu.classList.contains('open')) {
        const clickedInsideMenu = mainMenu.contains(target);
        const clickedToggle = menuToggle && (menuToggle.contains(target) || menuToggle === target);
        const clickedNavItem = !!target.closest?.('.nav-item');
        if(!clickedInsideMenu && !clickedToggle && !clickedNavItem){
          closeMainMenu();
        }
      }
    } catch(err){
      if(mainMenu && mainMenu.classList.contains('open')) closeMainMenu();
    }
  });

  // wire menu internal buttons (if any have data-to)
  if(mainMenu) mainMenu.querySelectorAll('button[data-to]').forEach(b=>{
    b.addEventListener('click', ()=> {
      const to = b.dataset.to;
      if(to) showView(to);
      closeMainMenu();
    });
  });

  // keep menu positioning aligned on resize/scroll
  window.addEventListener('resize', ()=> { positionMenuToggle(); if(mainMenu.classList.contains('open')) positionMainMenu(); });
  window.addEventListener('scroll', ()=> { positionMenuToggle(); if(mainMenu.classList.contains('open')) positionMainMenu(); });
}

/* open/close functions for menu (mainMenu is fixed on body) */
function openMainMenu(){
  if(!mainMenu) return;
  mainMenu.classList.add('open');
  mainMenu.style.display = 'block';
  mainMenu.setAttribute('aria-hidden', 'false');
  mainMenu.style.pointerEvents = 'auto';
  positionMainMenu();
}

function closeMainMenu(){
  if(!mainMenu) return;
  mainMenu.classList.remove('open');
  mainMenu.style.display = 'none';
  mainMenu.setAttribute('aria-hidden', 'true');
  // prevent it from intercepting events while hidden
  mainMenu.style.pointerEvents = 'none';
}

/* Robust menu position so it won't clip under browser chrome */
function positionMainMenu(){
  try{
    if(!mainMenu) return;
    const headerRect = headerTop ? headerTop.getBoundingClientRect() : { bottom: 64 };
    // place menu under header bottom by default
    const viewportTop = (headerRect.bottom || 64) + 8; // px from viewport top
    const viewportHeight = window.innerHeight;
    const menuHeight = mainMenu.offsetHeight || 260;
    let topPx = viewportTop;
    if(topPx + menuHeight > viewportHeight - 12){
      topPx = Math.max(12, viewportHeight - menuHeight - 12);
    }
    mainMenu.style.position = 'fixed';
    mainMenu.style.top = `${topPx}px`;
    // prefer placing menu near the right edge of viewport
    mainMenu.style.right = '12px';
    mainMenu.style.left = 'auto';
    mainMenu.style.zIndex = 99999;
    // Ensure a background and pointer-events exist
    mainMenu.style.background = mainMenu.style.background || getComputedStyle(document.body).getPropertyValue('--panel-bg') || '#0b1220';
    mainMenu.style.boxShadow = mainMenu.style.boxShadow || '0 8px 28px rgba(2,6,23,0.6)';
  }catch(err){
    // fallback
    mainMenu.style.position = 'fixed';
    mainMenu.style.top = '64px';
    mainMenu.style.right = '12px';
    mainMenu.style.left = 'auto';
    mainMenu.style.zIndex = 99999;
  }
}

/* Robust showView implementation */
function showView(name){
  document.querySelectorAll('.view').forEach(v=>v.classList.remove('active'));
  if(!name || name==='entry') document.getElementById('view-entry')?.classList.add('active');
  if(name==='summary') document.getElementById('view-summary')?.classList.add('active');
  if(name==='accounts') document.getElementById('view-accounts')?.classList.add('active');
  if(name==='settings') document.getElementById('view-settings')?.classList.add('active');
  if(name==='user') document.getElementById('view-user')?.classList.add('active');
  if(name==='about') document.getElementById('view-about')?.classList.add('active');

  if(mainMenu) mainMenu.style.display='none';

  document.querySelectorAll('.nav-item').forEach(btn => {
    if(btn.dataset.view === name || (!name && btn.dataset.view === 'entry')) btn.classList.add('active');
    else btn.classList.remove('active');
  });

  try { if(name === 'summary') renderSummary(); } catch(e){}
  try { if(name === 'entry' || !name) renderEntries(); } catch(e){}
  try { if(name === 'settings') renderSettingsUI(); } catch(e){}
  try { if(name === 'user') renderUserUI(); } catch(e){}
  try { if(name === 'accounts') renderBankBalances(); } catch(e){}
}

/* ------------- DATE & FORM UI ------------- */
function initDatePickers(){
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth()+1).padStart(2,'0');
  monthPicker && (monthPicker.value = `${y}-${m}`);
  yearPicker && (yearPicker.value = y);
  accountsMonthInput && (accountsMonthInput.value = monthPicker.value);
  dateInput && (dateInput.value = new Date(Date.now() - getTZOffsetMs()).toISOString().slice(0,10));
  updateSelectedDateLabel();
  dateInput && dateInput.addEventListener('change', ()=> { updateSelectedDateLabel(); renderEntries(); });
}
function updateSelectedDateLabel(){ if(selectedDateLabel) selectedDateLabel.textContent = formatDateLabel(dateInput.value); }

function renderCategoryPills(){
  const s = loadStore();
  const cats = s.settings && s.settings.categories ? s.settings.categories : DEFAULTS.settings.categories;
  if(!categoryPillsRow) return;
  categoryPillsRow.innerHTML='';
  cats.forEach(cat=>{
    const b = document.createElement('button'); b.type='button'; b.className='pill'; b.textContent=cat;
    b.addEventListener('click', ()=> { if(categoryEl) categoryEl.value = cat; });
    categoryPillsRow.appendChild(b);
  });
}

/* pay subtype */
function updatePaySubTypeOptions(){
  if(!payMethodSelect) return;
  const s = loadStore();
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
        const s2 = loadStore();
        if(method==='UPI' && !s2.settings.upiApps.includes(t)) s2.settings.upiApps.push(t);
        if(method==='Card' && !s2.settings.cards.includes(t)) s2.settings.cards.push(t);
        if(method==='Bank' && !s2.settings.banks.includes(t)) s2.settings.banks.push(t);
        saveStore(s2); renderSettingsUI(); updatePaySubTypeOptions();
        paySubTypeSelect.value = t;
      } else {
        paySubTypeSelect.value = list[0] || '';
      }
    }
  };
}

/* transfer UI */
function updateTransferUI(){
  const method = payMethodSelect ? payMethodSelect.value : null;
  const wrap = document.getElementById('transferWrap');
  if(!wrap) return;
  if(method === 'Self transfer' || (typeEl && typeEl.value === 'Transfer')){
    wrap.style.display = 'block';
    const s = loadStore();
    const banks = s.settings && s.settings.banks ? s.settings.banks : DEFAULTS.settings.banks;
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

/* split UI behavior */
isGroupCheckbox && isGroupCheckbox.addEventListener('change', ()=> {
  if(splitOptions) splitOptions.style.display = isGroupCheckbox.checked ? 'block' : 'none';
});
splitModeSelect && splitModeSelect.addEventListener('change', ()=>{
  const isCustom = splitModeSelect.value === 'custom';
  if(customSplitsDiv) customSplitsDiv.style.display = isCustom ? 'block' : 'none';
  if(myShareWrap) myShareWrap.style.display = isCustom ? 'block' : 'none';
});

/* update selects color for desktop users (workaround) */
function ensureSelectColors(){
  document.querySelectorAll('select').forEach(s => s.style.color = getComputedStyle(document.body).getPropertyValue('--text') || '');
}

/* ------------- FORM submit (add/update) ------------- */
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
  const s = loadStore();
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
    const s2 = loadStore();
    const oldDate = currentEdit.dateStr;
    if(s2.days[oldDate]){ s2.days[oldDate] = s2.days[oldDate].filter(x => x.id !== currentEdit.id); if(s2.days[oldDate].length === 0) delete s2.days[oldDate]; }
    if(!s2.days[dateStr]) s2.days[dateStr] = [];
    s2.days[dateStr].push(entry);
    saveStore(s2);
    currentEdit = null;
    submitBtn.textContent = 'Save entry';
    statusEl.textContent = 'Updated ✓';
    showToast('Updated');
  } else {
    const s2 = loadStore();
    if(!s2.days[dateStr]) s2.days[dateStr] = [];
    s2.days[dateStr].push(entry);
    saveStore(s2);
    statusEl.textContent = 'Saved ✓';
    showToast('Saved');
  }

  form.reset(); splitOptions.style.display='none'; customSplitsDiv.style.display='none'; myShareWrap.style.display='none';
  updatePaySubTypeOptions(); updateTransferUI();
  renderCategoryPills(); renderEntries(); renderSummary();
});

/* ------------- Clear handler ------------- */
clearBtn && clearBtn.addEventListener('click', ()=>{
  form.reset(); splitOptions.style.display='none'; customSplitsDiv.style.display='none'; myShareWrap.style.display='none';
  if(statusEl) statusEl.textContent = ''; currentEdit = null; submitBtn.textContent = 'Save entry';
});

/* ------------- Render entries (Entry view) ------------- */
function renderEntries(){
  if(!entriesListEl) return;
  entriesListEl.innerHTML = '';
  const dateStr = dateInput.value;
  const s = loadStore();
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
      const sdiv = document.createElement('div'); sdiv.className = 'entry-note'; sdiv.textContent = `Split: your share ${currencyFmt(entry.split.myShare)}, to receive ${currencyFmt(entry.split.participants.reduce((a,p)=>a+p.amount,0))}`;
      main.appendChild(sdiv);
      const pList = document.createElement('div'); pList.className = 'entry-note';
      pList.textContent = entry.split.participants.map(p => `${p.name}${p.received ? ' ✓' : ''} (${currencyFmt(p.amount)})`).join(' · ');
      main.appendChild(pList);
    }
    if(entry.type === 'Transfer' && entry.transfer){
      const tr = document.createElement('div'); tr.className = 'entry-note'; tr.textContent = `Transfer: ${entry.transfer.from || '-'} → ${entry.transfer.to || '-'}`;
      main.appendChild(tr);
    }

    const right = document.createElement('div'); right.className = 'entry-right';
    const amt = document.createElement('div'); amt.className = 'entry-amount ' + (entry.type==='Income' ? 'income' : (entry.type==='Transfer' ? '' : 'expense')); amt.textContent = (entry.type==='Income'?'+':'-') + currencyFmt(entry.amount);
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
    else if(e.type === 'Transfer') { /* ignore in totals but show separately if needed */ }
    else exp += e.amount;
  });
  if(sumExpenseEl) sumExpenseEl.textContent = currencyFmt(exp);
  if(sumIncomeEl) sumIncomeEl.textContent = currencyFmt(inc);
  if(sumNetEl) sumNetEl.textContent = currencyFmt(inc - exp);
}

/* ------------- Edit & Delete ------------- */
function startEdit(dateStr, entry){
  currentEdit = { id: entry.id, dateStr };
  showView('entry');
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
  const s = loadStore();
  if(!s.days[dateStr]) return;
  s.days[dateStr] = s.days[dateStr].filter(e => e.id !== id);
  if(s.days[dateStr].length === 0) delete s.days[dateStr];
  saveStore(s);
  renderEntries(); renderSummary();
}

/* ------------- SUMMARY ------------- */
function initSummaryControls(){
  dateModeSelect && dateModeSelect.addEventListener('change', ()=>{
    const mode = dateModeSelect.value;
    const existing = document.getElementById('dayPickerWrap');
    if(existing) existing.remove();
    if(mode === 'month'){
      monthPickerWrap.style.display = 'block';
      yearPickerWrap.style.display = 'none';
    } else if(mode === 'year'){
      monthPickerWrap.style.display = 'none';
      yearPickerWrap.style.display = 'block';
    } else if(mode === 'day'){
      monthPickerWrap.style.display = 'none';
      yearPickerWrap.style.display = 'none';
      const wrap = document.createElement('div'); wrap.id = 'dayPickerWrap'; wrap.style.marginTop='8px'; wrap.innerHTML = '<label>Day</label><input id="dayPicker" type="date" />';
      dateModeSelect.parentElement.parentElement.appendChild(wrap);
      document.getElementById('dayPicker').addEventListener('change', renderSummary);
    } else {
      monthPickerWrap.style.display = 'none';
      yearPickerWrap.style.display = 'none';
    }
    renderSummary();
  });
  monthPicker && monthPicker.addEventListener('change', renderSummary);
  yearPicker && yearPicker.addEventListener('change', renderSummary);
  filterPaymentSelect && filterPaymentSelect.addEventListener('change', renderSummary);
  filterCategorySelect && filterCategorySelect.addEventListener('change', renderSummary);
  typeFilterSelect && typeFilterSelect.addEventListener('change', renderSummary);
}

/* get rows per page */
function getRowsPerPage(){ return parseInt(localStorage.getItem('rows_per_page') || '10', 10); }
function setRowsPerPage(n){ localStorage.setItem('rows_per_page', String(n)); }

/* get flat array of entries */
function allEntriesArray(){
  const s = loadStore(); const arr = [];
  Object.keys(s.days || {}).forEach(d=>{
    (s.days[d] || []).forEach(e => arr.push({ ...e, dateStr: d }));
  });
  return arr;
}

function renderSummary(){
  const arr = allEntriesArray();
  const mode = dateModeSelect ? dateModeSelect.value : 'all';
  const monthVal = monthPicker ? monthPicker.value : '';
  const yearVal = yearPicker ? yearPicker.value : '';
  const dayVal = document.getElementById('dayPicker') ? document.getElementById('dayPicker').value : null;

  let filtered = arr.filter(e => {
    if(mode === 'month' && monthVal) return e.dateStr.startsWith(monthVal);
    if(mode === 'year' && yearVal) return e.dateStr.startsWith(String(yearVal) + '-');
    if(mode === 'day' && dayVal) return e.dateStr === dayVal;
    return true;
  });

  const typeF = typeFilterSelect ? typeFilterSelect.value : 'All';
  if(typeF === 'Expense') filtered = filtered.filter(e => !e.split || !e.split.enabled).filter(e => e.type === 'Expense');
  if(typeF === 'Income') filtered = filtered.filter(e => e.type === 'Income');
  if(typeF === 'Split') filtered = filtered.filter(e => e.split && e.split.enabled);
  if(typeF === 'Transfer') filtered = filtered.filter(e => e.type === 'Transfer');

  const payFilter = filterPaymentSelect ? filterPaymentSelect.value : 'All';
  if(payFilter !== 'All') filtered = filtered.filter(e => e.payMethod === payFilter);

  const cats = new Set(filtered.map(e => e.category || 'Uncategorized'));
  if(filterCategorySelect){
    filterCategorySelect.innerHTML = '<option>All</option>';
    Array.from(cats).sort().forEach(c => {
      const o = document.createElement('option'); o.value = c; o.textContent = c; filterCategorySelect.appendChild(o);
    });
  }
  const catNow = filterCategorySelect ? filterCategorySelect.value : 'All';
  if(catNow && catNow !== 'All') filtered = filtered.filter(e => (e.category || 'Uncategorized') === catNow);

  let totalExp = 0, totalInc = 0, splitOutstanding = 0;
  const categoryTotals = {};
  filtered.forEach(e=>{
    if(e.type === 'Income') totalInc += e.amount;
    else if(e.type === 'Transfer') { /* ignore in totals */ }
    else totalExp += e.amount;
    if(e.split && e.split.enabled){
      const notReceived = e.split.participants.filter(p => !p.received).reduce((a,p)=>a+p.amount,0);
      splitOutstanding += notReceived;
    }
    const cat = e.category || 'Uncategorized';
    if(e.type !== 'Income' && e.type !== 'Transfer') categoryTotals[cat] = (categoryTotals[cat] || 0) + e.amount;
  });

  if(monthSumExpenseEl) monthSumExpenseEl.textContent = currencyFmt(totalExp);
  if(monthSumIncomeEl) monthSumIncomeEl.textContent = currencyFmt(totalInc);
  if(splitOutstandingEl) splitOutstandingEl.textContent = currencyFmt(splitOutstanding);

  drawCategoryPie(categoryTotals);
  renderHistoryList(filtered);
}

/* draw pie */
function drawCategoryPie(categoryTotals){
  if(!categoryPieCanvas) return;
  const canvas = categoryPieCanvas;
  const ctx = canvas.getContext('2d');
  const rect = canvas.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  const w = (rect.width || 300) * dpr, h = (rect.height || 200) * dpr;
  canvas.width = w; canvas.height = h;
  ctx.setTransform(dpr,0,0,dpr,0,0);
  const lw = w/dpr, lh = h/dpr;
  ctx.clearRect(0,0,lw,lh);
  const cats = Object.keys(categoryTotals);
  const total = cats.reduce((s,c) => s + categoryTotals[c], 0);
  if(!cats.length || total===0){ ctx.fillStyle = '#9ca3af'; ctx.font = '12px system-ui'; ctx.fillText('No expense data for this filter.', 10, lh/2); categoryLegendEl.innerHTML = ''; return; }
  const colors = {};
  cats.forEach((c,i)=> colors[c] = `hsl(${(i*60)%360} 70% 55%)`);
  const cx = lw/2, cy = lh/2, radius = Math.min(lw,lh)/2 - 20;
  let start = -Math.PI/2;
  cats.forEach(cat=>{
    const val = categoryTotals[cat];
    const angle = (val/total) * Math.PI * 2;
    const end = start + angle;
    ctx.beginPath(); ctx.moveTo(cx,cy); ctx.arc(cx,cy,radius,start,end); ctx.closePath(); ctx.fillStyle = colors[cat]; ctx.fill();
    start = end;
  });
  if(categoryLegendEl){
    categoryLegendEl.innerHTML = '';
    cats.forEach(cat => {
      const it = document.createElement('div'); it.className = 'legend-item';
      const left = document.createElement('div'); left.className = 'legend-left';
      const col = document.createElement('div'); col.style.width='12px'; col.style.height='12px'; col.style.backgroundColor = colors[cat]; col.style.borderRadius='3px';
      const lab = document.createElement('div'); lab.textContent = cat; lab.style.marginLeft='8px'; lab.style.color = getComputedStyle(document.body).getPropertyValue('--text');
      left.appendChild(col); left.appendChild(lab);
      const right = document.createElement('div'); right.textContent = currencyFmt(categoryTotals[cat]) + ` (${((categoryTotals[cat]/total)*100).toFixed(1)}%)`; right.style.fontWeight='600';
      it.appendChild(left); it.appendChild(right); categoryLegendEl.appendChild(it);
    });
  }
}

/* render history list */
function renderHistoryList(entries){
  if(!summaryHistoryEl) return;
  summaryHistoryEl.innerHTML = '';
  if(!entries.length){ summaryHistoryEl.innerHTML = '<div class="info">No entries for this filter.</div>'; return; }
  const sorted = [...entries].sort((a,b) => a.dateStr === b.dateStr ? b.id - a.id : (a.dateStr < b.dateStr ? 1 : -1));
  const rows = getRowsPerPage();
  const paged = sorted.slice(0, rows);
  let cur = null;
  paged.forEach((e, idx)=>{
    if(e.dateStr !== cur){
      cur = e.dateStr;
      const dl = document.createElement('div'); dl.className = 'summary-history-date'; dl.textContent = formatDateLabel(cur);
      summaryHistoryEl.appendChild(dl);
    }

    const row = document.createElement('div'); row.className = 'entry';
    const left = document.createElement('div'); left.className = 'entry-main';
    const title = document.createElement('div'); title.className = 'entry-title'; title.textContent = `${(idx+1)}. ${e.description}`;
    let metaText = `${e.type} • ${e.category || 'No category'} • ${e.payMethod}${e.paySubType?(' • '+e.paySubType):''}`;
    if(e.mappedBank) metaText += ` • ${e.mappedBank}`;
    const meta = document.createElement('div'); meta.className = 'entry-meta'; meta.textContent = metaText;
    left.appendChild(title); left.appendChild(meta);
    if(e.note){ const n = document.createElement('div'); n.className = 'entry-note'; n.textContent = e.note; left.appendChild(n); }

    if(e.split && e.split.enabled){
      const sp = document.createElement('div'); sp.className = 'entry-note';
      sp.textContent = `Split: your ${currencyFmt(e.split.myShare)} · to receive ${currencyFmt(e.split.participants.reduce((a,p)=>a+p.amount,0))}`;
      left.appendChild(sp);

      e.split.participants.forEach((p, pidx)=>{
        const prow = document.createElement('div'); prow.style.display='flex'; prow.style.justifyContent='space-between'; prow.style.alignItems='center'; prow.style.marginTop='6px';
        const pleft = document.createElement('div'); pleft.textContent = `${p.name} — ${currencyFmt(p.amount)}`; pleft.style.color = 'var(--muted)';
        const pright = document.createElement('div'); const cb = document.createElement('input'); cb.type='checkbox'; cb.checked = !!p.received; cb.addEventListener('change', ()=>{
          toggleSplitReceived(e.id, e.dateStr, pidx, cb.checked);
        });
        pright.appendChild(cb); prow.appendChild(pleft); prow.appendChild(pright); left.appendChild(prow);
      });

      const allRow = document.createElement('div'); allRow.style.marginTop='8px';
      const allChk = document.createElement('input'); allChk.type='checkbox';
      const allReceived = e.split.participants.every(p => p.received);
      allChk.checked = allReceived;
      allChk.addEventListener('change', ()=>{
        toggleAllSplit(e.id, e.dateStr, allChk.checked);
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
    const amt = document.createElement('div'); amt.className = 'entry-amount ' + (e.type==='Income' ? 'income' : (e.type==='Transfer' ? '' : 'expense')); amt.textContent = (e.type==='Income'?'+':'-') + currencyFmt(e.amount);
    const edit = document.createElement('button'); edit.className='btn-small'; edit.innerHTML = `<svg width="16" height="16" aria-hidden="true"><use href="#icon-edit"></use></svg> Edit`; edit.addEventListener('click', ()=> startEdit(e.dateStr, e));
    right.appendChild(amt); right.appendChild(edit);

    row.appendChild(left); row.appendChild(right);
    summaryHistoryEl.appendChild(row);
  });
}

/* toggle one participant received */
function toggleSplitReceived(entryId, dateStr, participantIdx, checked){
  const s = loadStore();
  const day = s.days[dateStr] || [];
  const idx = day.findIndex(x => x.id === entryId);
  if(idx < 0) return;
  const entry = day[idx];
  if(!entry.split) return;
  entry.split.participants[participantIdx].received = checked;
  const allReceived = entry.split.participants.every(p => p.received);
  entry.split.status = allReceived ? 'settled' : (entry.split.participants.some(p => p.received) ? 'partially' : 'pending');
  s.days[dateStr][idx] = entry; saveStore(s);
  renderSummary(); renderEntries();
}

/* toggle all received */
function toggleAllSplit(entryId, dateStr, checked){
  const s = loadStore(); const day = s.days[dateStr] || []; const idx = day.findIndex(x => x.id === entryId); if(idx < 0) return;
  const entry = day[idx];
  if(!entry.split) return;
  entry.split.participants.forEach(p => p.received = checked);
  entry.split.status = checked ? 'settled' : 'pending';
  s.days[dateStr][idx] = entry; saveStore(s);
  renderSummary(); renderEntries();
}

/* ------------- SETTINGS UI ------------- */
function renderSettingsUI(){
  const s = loadStore();
  const st = s.settings || DEFAULTS.settings;
  if(settingsUpiEl) settingsUpiEl.innerHTML='';
  if(settingsCardsEl) settingsCardsEl.innerHTML='';
  if(settingsBanksEl) settingsBanksEl.innerHTML='';
  st.upiApps.forEach(u => settingsUpiEl && settingsUpiEl.appendChild(makeSettingsPill(u,'upi')));
  st.cards.forEach(c => settingsCardsEl && settingsCardsEl.appendChild(makeSettingsPill(c,'cards')));
  st.banks.forEach(b => settingsBanksEl && settingsBanksEl.appendChild(makeSettingsPill(b,'banks')));

  custom = loadCustom();
  if(accentColorInput) accentColorInput.value = custom.accent || DEFAULTS.custom.accent;
  if(currencySymbolInput) currencySymbolInput.value = custom.currency || DEFAULTS.custom.currency;
  if(settingCategoriesInput) settingCategoriesInput.value = (st.categories||[]).join(',');

  // Mapping area (UPI/Card -> Bank)
  const mapWrapId = 'paymentBankMapWrap';
  let mapWrap = document.getElementById(mapWrapId);
  if(!mapWrap){
    mapWrap = document.createElement('div'); mapWrap.id = mapWrapId; mapWrap.style.marginTop='12px';
    mapWrap.innerHTML = `<div class="section-title">Map payment items to banks</div>
      <div class="info">Assign each UPI app / Card to a Bank so bank balances update automatically (editable).</div>
      <div id="mapList" style="margin-top:8px; display:flex; flex-direction:column; gap:8px;"></div>`;
    settingsBanksEl && settingsBanksEl.parentElement && settingsBanksEl.parentElement.appendChild(mapWrap);
  }
  const mapList = document.getElementById('mapList');
  if(mapList) mapList.innerHTML = '';
  const s2 = loadStore();
  const banks = s2.settings.banks || DEFAULTS.settings.banks;
  const upi = s2.settings.upiApps || [];
  const cards = s2.settings.cards || [];

  function makeMapRow(label, key, currentBank){
    const row = document.createElement('div'); row.style.display='flex'; row.style.gap='8px'; row.style.alignItems='center';
    const lbl = document.createElement('div'); lbl.style.minWidth='160px'; lbl.textContent = label;
    const sel = document.createElement('select'); banks.forEach(b=> { const o=document.createElement('option'); o.value=b; o.textContent=b; sel.appendChild(o); });
    const noneOpt = document.createElement('option'); noneOpt.value='__none__'; noneOpt.textContent='None'; sel.appendChild(noneOpt);
    sel.value = currentBank || '__none__';
    sel.addEventListener('change', ()=> {
      const map = s2.paymentBankMap || {};
      map[key] = sel.value === '__none__' ? null : sel.value;
      s2.paymentBankMap = map; saveStore(s2);
      showToast('Mapping saved');
    });
    row.appendChild(lbl); row.appendChild(sel);
    return row;
  }

  upi.forEach(u => mapList && mapList.appendChild(makeMapRow(`UPI: ${u}`, `upi:${u}`, (s2.paymentBankMap && s2.paymentBankMap[`upi:${u}`]) || null)));
  cards.forEach(c => mapList && mapList.appendChild(makeMapRow(`Card: ${c}`, `card:${c}`, (s2.paymentBankMap && s2.paymentBankMap[`card:${c}`]) || null)));
}
function makeSettingsPill(text,type){
  const p = document.createElement('div'); p.className = 'settings-pill'; p.textContent = text;
  const btn = document.createElement('button'); btn.textContent = '×'; btn.addEventListener('click', ()=>{
    const s = loadStore(); let list;
    if(type==='upi') list = s.settings.upiApps;
    if(type==='cards') list = s.settings.cards;
    if(type==='banks') list = s.settings.banks;
    const idx = list.indexOf(text); if(idx >= 0) list.splice(idx,1); saveStore(s); renderSettingsUI(); updatePaySubTypeOptions();
  });
  p.appendChild(btn); return p;
}
addUpiBtn && addUpiBtn.addEventListener('click', ()=>{
  const v = newUpiInput.value.trim(); if(!v) return; const s = loadStore(); if(!s.settings.upiApps.includes(v)) s.settings.upiApps.push(v); saveStore(s); newUpiInput.value=''; renderSettingsUI(); updatePaySubTypeOptions();
});
addCardBtn && addCardBtn.addEventListener('click', ()=>{
  const v = newCardInput.value.trim(); if(!v) return; const s = loadStore(); if(!s.settings.cards.includes(v)) s.settings.cards.push(v); saveStore(s); newCardInput.value=''; renderSettingsUI(); updatePaySubTypeOptions();
});
addBankBtn && addBankBtn.addEventListener('click', ()=>{
  const v = newBankInput.value.trim(); if(!v) return; const s = loadStore(); if(!s.settings.banks.includes(v)) s.settings.banks.push(v); saveStore(s); newBankInput.value=''; renderSettingsUI(); renderCategoryPills(); updatePaySubTypeOptions();
});

saveCustomizationBtn && saveCustomizationBtn.addEventListener('click', ()=>{
  const c = loadCustom();
  c.accent = accentColorInput.value || c.accent;
  c.currency = currencySymbolInput.value || c.currency;
  saveCustom(c);
  const cats = (settingCategoriesInput.value || DEFAULTS.settings.categories.join(',')).split(',').map(s => s.trim()).filter(Boolean);
  const s = loadStore(); s.settings.categories = cats; saveStore(s);
  renderCategoryPills(); renderSettingsUI(); showToast('Customization saved');
});
resetCustomizationBtn && resetCustomizationBtn.addEventListener('click', ()=>{
  localStorage.removeItem(CUSTOM_KEY);
  saveCustom(DEFAULTS.custom);
  const s = loadStore(); s.settings = DEFAULTS.settings; saveStore(s);
  renderCategoryPills(); renderSettingsUI(); showToast('Reset to defaults');
});

/* USER view */
function renderUserUI(){
  const u = loadUser();
  if(u){ userNameField.value = u.name || ''; securityHintInput.value = u.securityHint || ''; biometricEnabledCheckbox.checked = !!u.biometricPreferred; }
}
changePasswordBtn && changePasswordBtn.addEventListener('click', ()=>{
  const u = loadUser(); if(!u){ passwordStatusEl.textContent='No user'; passwordStatusEl.style.color='var(--danger)'; return; }
  const oldPw = oldPasswordInput.value.trim(); const newPw = newPasswordInput.value.trim();
  if(!oldPw || !newPw){ passwordStatusEl.textContent='Fill both'; passwordStatusEl.style.color='var(--danger)'; return; }
  if(oldPw !== u.password){ passwordStatusEl.textContent='Incorrect current password'; passwordStatusEl.style.color='var(--danger)'; return; }
  u.password = newPw; u.name = userNameField.value.trim() || u.name; u.securityHint = securityHintInput.value.trim() || '';
  u.biometricPreferred = biometricEnabledCheckbox.checked;
  saveUser(u); passwordStatusEl.textContent='Updated'; passwordStatusEl.style.color='var(--success)';
});

/* Save biometric preference right away when toggled */
biometricEnabledCheckbox && biometricEnabledCheckbox.addEventListener('change', ()=>{
  const u = loadUser() || { name:'User', password:'' };
  u.biometricPreferred = biometricEnabledCheckbox.checked;
  saveUser(u);
});

/* ------------- EXPORT helpers ------------- */
function exportCSV(filteredOnly=false, monthFilter=null){
  if(!confirm('Export CSV? This creates a file containing your data.')) return;
  const s = loadStore();
  const rows = [['date','type','description','category','payMethod','paySubType','amount','note','split','transfer']];
  Object.keys(s.days).sort().forEach(dateStr=>{
    if(filteredOnly && monthFilter && !dateStr.startsWith(monthFilter)) return;
    s.days[dateStr].forEach(e=>{
      rows.push([dateStr,e.type,e.description||'',e.category||'',e.payMethod||'',e.paySubType||'',e.amount||0,e.note||'', e.split?JSON.stringify(e.split):'', e.transfer?JSON.stringify(e.transfer):'']);
    });
  });
  const csv = rows.map(r=> r.map(cell=> {
    if(cell==null) return '';
    const s = String(cell).replace(/"/g,'""');
    return /,|\n|"/.test(s) ? `"${s}"` : s;
  }).join(',')).join('\n');
  const blob = new Blob([csv],{type:'text/csv'});
  const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = 'money_tracker_export.csv'; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
}
function exportJSON(filteredOnly=false, monthFilter=null){
  const s = loadStore();
  let out = {...s};
  if(filteredOnly && monthFilter){
    const days = {};
    Object.keys(s.days).forEach(k=>{ if(k.startsWith(monthFilter)) days[k]=s.days[k]; });
    out.days = days;
  }
  const blob = new Blob([JSON.stringify(out,null,2)],{type:'application/json'});
  const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = 'money_tracker_backup.json'; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
}

/* Export XLSX using SheetJS */
function exportXLSX(filteredOnly=false, monthFilter=null){
  if(typeof XLSX === 'undefined'){ alert('Excel export library not loaded'); return; }
  const s = loadStore();
  const rows = [['date','type','description','category','payMethod','paySubType','amount','note','split','transfer']];
  Object.keys(s.days).sort().forEach(dateStr=>{
    if(filteredOnly && monthFilter && !dateStr.startsWith(monthFilter)) return;
    s.days[dateStr].forEach(e=>{
      rows.push([dateStr,e.type,e.description||'',e.category||'',e.payMethod||'',e.paySubType||'',e.amount||0,e.note||'', e.split?JSON.stringify(e.split):'', e.transfer?JSON.stringify(e.transfer):'']);
    });
  });
  const ws = XLSX.utils.aoa_to_sheet(rows);
  const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, 'transactions');
  const wbout = XLSX.write(wb, {bookType:'xlsx', type:'array'});
  const blob = new Blob([wbout],{type:'application/octet-stream'});
  const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = 'money_tracker_export.xlsx'; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
}

/* Import XLSX (convert to same structure) */
function importXLSXFile(file){
  if(typeof XLSX === 'undefined'){ alert('Excel import library not loaded'); return; }
  const r = new FileReader();
  r.onload = (ev)=>{
    try{
      const data = new Uint8Array(ev.target.result);
      const wb = XLSX.read(data, {type:'array'});
      const sheetName = wb.SheetNames[0];
      const rows = XLSX.utils.sheet_to_json(wb.Sheets[sheetName], {header:1});
      // Expecting header row: date,type,description,category,payMethod,paySubType,amount,note,split,transfer
      const header = rows[0] || [];
      const idx = (h)=> header.indexOf(h);
      const byDate = {};
      for(let i=1;i<rows.length;i++){
        const r0 = rows[i];
        if(!r0 || r0.length===0) continue;
        const date = r0[idx('date')] || r0[0];
        const e = {
          id: Date.now() + i,
          type: r0[idx('type')] || '',
          description: r0[idx('description')] || '',
          category: r0[idx('category')] || '',
          payMethod: r0[idx('payMethod')] || '',
          paySubType: r0[idx('paySubType')] || '',
          amount: parseFloat(r0[idx('amount')]||0) || 0,
          note: r0[idx('note')] || '',
          split: null,
          transfer: null,
          createdAt: new Date().toISOString()
        };
        const splitRaw = r0[idx('split')];
        if(splitRaw){ try{ e.split = JSON.parse(splitRaw); }catch{} }
        const trRaw = r0[idx('transfer')];
        if(trRaw){ try{ e.transfer = JSON.parse(trRaw); }catch{} }
        if(!byDate[date]) byDate[date]=[];
        byDate[date].push(e);
      }
      // Offer to replace or merge
      if(confirm('Replace local data with imported XLSX data? (OK=Replace, Cancel=Merge)')){
        const out = loadStore();
        out.days = byDate;
        saveStore(out);
      } else {
        const out = loadStore();
        Object.keys(byDate).forEach(d=>{
          out.days[d] = (out.days[d] || []).concat(byDate[d]);
        });
        saveStore(out);
      }
      alert('Import complete. Refreshing UI.');
      renderEntries(); renderSummary(); renderSettingsUI(); renderBankBalances();
    }catch(err){
      console.error(err);
      alert('Invalid XLSX file');
    }
  };
  r.readAsArrayBuffer(file);
}

/* ------------- ACCOUNTS & TRANSFERS ------------- */
function setInitialBalanceForBank(month, bank, amount){
  const s = loadStore();
  s.accounts = s.accounts || {};
  s.accounts[month] = s.accounts[month] || {};
  s.accounts[month][bank] = +amount;
  saveStore(s);
}

function getBankBalancesForMonth(month){
  const s = loadStore();
  const initial = (s.accounts && s.accounts[month]) ? s.accounts[month] : {};
  const balances = {};
  Object.keys(initial).forEach(b => balances[b] = initial[b] || 0);

  Object.keys(s.days || {}).forEach(dateStr => {
    if(!dateStr.startsWith(month)) return;
    (s.days[dateStr] || []).forEach(e => {
      if(e.type === 'Transfer' && e.transfer){
        const from = e.transfer.from, to = e.transfer.to, amt = +e.amount;
        if(from) balances[from] = (balances[from] || 0) - amt;
        if(to) balances[to] = (balances[to] || 0) + amt;
      } else {
        if(transactionTouchesBank(e, null)){
          const bname = e.mappedBank || (e.paySubType && (e.payMethod === 'Bank' || e.payMethod === 'Card') ? e.paySubType : null);
          if(bname){
            if(e.type === 'Income') balances[bname] = (balances[bname] || 0) + (+e.amount);
            else balances[bname] = (balances[bname] || 0) - (+e.amount);
          }
        }
      }
    });
  });

  return balances;
}

function populateAccountsBanks(){
  const s = loadStore();
  const banks = s.settings && s.settings.banks ? s.settings.banks : DEFAULTS.settings.banks;
  accountsBankSelect && (accountsBankSelect.innerHTML = '');
  banks.forEach(b => { if(accountsBankSelect){ const o=document.createElement('option'); o.value=b; o.textContent=b; accountsBankSelect.appendChild(o); }});
}
function renderBankBalances(){
  if(!bankBalancesList) return;
  const month = accountsMonthInput.value;
  bankBalancesList.innerHTML = '';
  if(!month){ bankBalancesList.innerHTML = '<div class="info">Pick month</div>'; return; }
  const balances = getBankBalancesForMonth(month);
  const s = loadStore();
  const bankList = s.settings && s.settings.banks ? s.settings.banks : [];

  bankList.forEach(b=>{
    const row = document.createElement('div'); row.className = 'entry';
    const left = document.createElement('div'); left.className = 'entry-main';
    left.innerHTML = `<div style="display:flex;align-items:center;gap:10px"><div style="display:flex;align-items:center;gap:8px"><svg width="20" height="20" aria-hidden="true"><use href="#icon-bank"></use></svg><div class="entry-title">${b}</div></div><div class="entry-meta">Initial: ${currencyFmt((s.accounts && s.accounts[month] && s.accounts[month][b])||0)}</div></div>`;
    const right = document.createElement('div'); right.className = 'entry-right';
    const amt = document.createElement('div'); amt.className = 'entry-amount'; amt.textContent = currencyFmt(balances[b]||0);
    const showBtn = document.createElement('button'); showBtn.className = 'bank-action'; showBtn.innerHTML = `<svg width="16" height="16"><use href="#icon-search"></use></svg> Show transactions`;
    showBtn.addEventListener('click', ()=> openBankTransactionsModal(month, b));
    const exportBtn = document.createElement('button'); exportBtn.className = 'btn-small'; exportBtn.textContent = 'Export'; exportBtn.addEventListener('click', ()=> exportBankCSV(month, b));
    right.appendChild(amt); right.appendChild(showBtn); right.appendChild(exportBtn); row.appendChild(left); row.appendChild(right); bankBalancesList.appendChild(row);
  });
}

function exportBankCSV(month, bank){
  if(!confirm('Export bank transactions to CSV?')) return;
  const s = loadStore();
  const rows = [['date','type','description','category','payMethod','paySubType','amount','note','transfer']];
  Object.keys(s.days || {}).sort().forEach(dateStr=>{
    if(!dateStr.startsWith(month)) return;
    (s.days[dateStr] || []).forEach(e=>{
      if(transactionTouchesBank(e, bank)){
        rows.push([dateStr,e.type,e.description||'',e.category||'',e.payMethod||'',e.paySubType||'',e.amount||0,e.note||'', e.transfer?JSON.stringify(e.transfer):'']);
      }
    });
  });
  const csv = rows.map(r=> r.map(cell=> {
    if(cell==null) return '';
    const s = String(cell).replace(/"/g,'""');
    return /,|\n|"/.test(s) ? `"${s}"` : s;
  }).join(',')).join('\n');
  const blob = new Blob([csv],{type:'text/csv'});
  const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = `bank_${bank}_${month}.csv`; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
}

function openBankTransactionsModal(month, bank){
  const s = loadStore();
  const modal = document.createElement('div'); modal.className = 'export-modal';
  const card = document.createElement('div'); card.className = 'export-card';
  card.style.maxWidth = '820px';
  card.innerHTML = `<div style="display:flex;justify-content:space-between;align-items:center;">
      <h3>Transactions — ${bank} • ${month}</h3>
      <button id="closeBankTx" class="btn-secondary">Close</button>
    </div>
    <div style="display:flex;gap:12px;margin-top:10px;flex-wrap:wrap;">
      <div><label>Type</label><select id="bankTxType"><option value="all">All</option><option value="Expense">Expense</option><option value="Income">Income</option><option value="Transfer">Transfer</option></select></div>
      <div><label>Payment</label><select id="bankTxPayment"><option value="All">All</option><option>Cash</option><option>UPI</option><option>Card</option><option>Bank</option></select></div>
      <div><label>Category</label><select id="bankTxCategory"><option value="All">All</option></select></div>
      <div><label>Day</label><input id="bankTxDay" type="date" /></div>
      <div style="margin-left:auto;"><button id="bankTxRefresh" class="btn-primary">Refresh</button></div>
    </div>
    <div id="bankTxList" style="margin-top:12px; max-height:360px; overflow:auto;"></div>`;
  modal.appendChild(card); document.body.appendChild(modal);

  document.getElementById('closeBankTx').addEventListener('click', ()=> modal.remove());
  const typeSel = document.getElementById('bankTxType');
  const paySel = document.getElementById('bankTxPayment');
  const catSel = document.getElementById('bankTxCategory');
  const dayInput = document.getElementById('bankTxDay');
  const refreshBtn = document.getElementById('bankTxRefresh');
  const listWrap = document.getElementById('bankTxList');

  const cats = new Set();
  Object.keys(s.days || {}).forEach(d=>{
    if(!d.startsWith(month)) return;
    (s.days[d] || []).forEach(e=>{
      if(transactionTouchesBank(e, bank)){
        cats.add(e.category || 'Uncategorized');
      }
    });
  });
  catSel.innerHTML = '<option value="All">All</option>';
  Array.from(cats).sort().forEach(c => {
    const o=document.createElement('option'); o.value=c; o.textContent=c; catSel.appendChild(o);
  });

  function renderBankTxList(){
    listWrap.innerHTML = '';
    const rows = [];
    const init = (s.accounts && s.accounts[month] && s.accounts[month][bank]) ? +s.accounts[month][bank] : null;
    if(init !== null) rows.push({ date: month + '-01', desc: 'Initial balance', type: 'Init', amount: init, meta: '' });
    Object.keys(s.days || {}).sort().forEach(d=>{
      if(!d.startsWith(month)) return;
      (s.days[d] || []).forEach(e=>{
        if(transactionTouchesBank(e, bank)){
          rows.push({ date: d, id: e.id, desc: e.description, type: e.type, amount: e.amount, meta: e.payMethod + (e.paySubType ? ' • '+e.paySubType : '') + (e.transfer ? ` • ${e.transfer.from}->${e.transfer.to}` : ''), entry:e });
        }
      });
    });
    let filtered = rows.slice();
    if(typeSel.value !== 'all') filtered = filtered.filter(r => r.type === typeSel.value);
    if(paySel.value !== 'All') filtered = filtered.filter(r => r.meta && r.meta.includes(paySel.value));
    if(catSel.value !== 'All') filtered = filtered.filter(r => r.entry && (r.entry.category || 'Uncategorized') === catSel.value);
    if(dayInput.value) filtered = filtered.filter(r => r.date === dayInput.value);

    if(filtered.length === 0){ listWrap.innerHTML = '<div class="info">No transactions</div>'; return; }
    filtered.forEach((r, idx) => {
      const row = document.createElement('div'); row.className='entry';
      const left = document.createElement('div'); left.className='entry-main';
      const title = document.createElement('div'); title.className='entry-title'; title.textContent = `${formatDateLabel(r.date)} — ${r.desc}`;
      const meta = document.createElement('div'); meta.className='entry-meta'; meta.textContent = (r.meta || r.type) + (r.entry && r.entry.category ? ' • ' + r.entry.category : '');
      left.appendChild(title); left.appendChild(meta);
      const right = document.createElement('div'); right.className='entry-right';
      const amt = document.createElement('div'); amt.className='entry-amount ' + (r.type === 'Income' ? 'income' : (r.type === 'Init' ? '' : 'expense'));
      amt.textContent = (r.type==='Income'?'+':'') + currencyFmt(r.amount);
      right.appendChild(amt);
      row.appendChild(left); row.appendChild(right);
      listWrap.appendChild(row);
    });
  }

  refreshBtn.addEventListener('click', renderBankTxList);
  renderBankTxList();
}

/* Helper: whether a transaction touches a specific bank (or any bank if bankName null) */
function transactionTouchesBank(entry, bankName){
  if(!entry) return false;
  if(entry.type === 'Transfer' && entry.transfer){
    if(!bankName) return true;
    return entry.transfer.from === bankName || entry.transfer.to === bankName;
  }
  if(entry.payMethod === 'Bank' && entry.paySubType) {
    if(!bankName) return true;
    if(entry.paySubType === bankName) return true;
  }
  if(entry.payMethod === 'Card' && entry.paySubType) {
    if(!bankName) return true;
    if(entry.paySubType === bankName) return true;
  }
  const s = loadStore();
  const map = s.paymentBankMap || {};
  if(entry.payMethod === 'UPI' && entry.paySubType){
    const m = map[`upi:${entry.paySubType}`];
    if(!bankName && m) return true;
    if(m && m === bankName) return true;
  }
  if(entry.payMethod === 'Card' && entry.paySubType){
    const m = map[`card:${entry.paySubType}`];
    if(!bankName && m) return true;
    if(m && m === bankName) return true;
  }
  if(entry.paySubType && bankName && entry.paySubType === bankName) return true;
  if(entry.mappedBank && bankName && entry.mappedBank === bankName) return true;
  return false;
}

/* ------------- INIT APP ------------- */
function initApp(){
  custom = loadCustom();
  applyCustom(); setupTheme(); initNav(); initDatePickers(); renderCategoryPills(); updatePaySubTypeOptions();
  renderEntries(); initSummaryControls(); renderSettingsUI(); renderUserUI();

  ensureSelectColors();

  payMethodSelect && payMethodSelect.addEventListener('change', () => { updatePaySubTypeOptions(); updateTransferUI(); });
  typeEl && typeEl.addEventListener('change', updateTransferUI);
  updateTransferUI();

  rowsPerPageSelect && (rowsPerPageSelect.value = localStorage.getItem('rows_per_page') || '10');
  rowsPerPageSelect && rowsPerPageSelect.addEventListener('change', ()=>{
    setRowsPerPage(rowsPerPageSelect.value);
    renderSummary();
  });

  populateAccountsBanks();
  accountsMonthInput && (accountsMonthInput.value = monthPicker.value);
  accountsMonthInput && accountsMonthInput.addEventListener('change', renderBankBalances);
  saveInitialBtn && saveInitialBtn.addEventListener('click', ()=>{
    const month = accountsMonthInput.value;
    const bank = accountsBankSelect.value;
    const amount = parseFloat(accountsInitialAmount.value) || 0;
    if(!month || !bank){ alert('Pick month and bank'); return; }
    setInitialBalanceForBank(month, bank, amount);
    showToast('Saved initial balance');
    renderBankBalances();
  });
  renderBankBalances();

  // export modal (summary)
  summaryExportBtn && summaryExportBtn.addEventListener('click', ()=>{
    const m = document.createElement('div'); m.className='export-modal';
    const c = document.createElement('div'); c.className='export-card';
    c.innerHTML = `<h3>Export / Import</h3>
      <div style="display:flex;gap:8px;margin-top:8px;">
        <button id="expCsv" class="btn-primary">Export CSV (month)</button>
        <button id="expJson" class="btn-secondary">Export JSON (full)</button>
        <button id="expExcel" class="btn-secondary">Export Excel (.xlsx)</button>
      </div>
      <div style="margin-top:12px;">
        <label>Import JSON / XLSX backup</label>
        <input id="importFile" type="file" accept=".json,.xlsx,.xls,.csv" />
      </div>
      <div style="margin-top:10px; text-align:right;"><button id="closeExport" class="btn-secondary">Close</button></div>`;
    m.appendChild(c); document.body.appendChild(m);
    document.getElementById('closeExport').addEventListener('click', ()=> m.remove());
    document.getElementById('expCsv').addEventListener('click', ()=>{
      const mon = monthPicker.value;
      if(!mon){ alert('Pick month first'); return; }
      exportCSV(true, mon);
    });
    document.getElementById('expJson').addEventListener('click', ()=> exportJSON(false,null));
    document.getElementById('expExcel').addEventListener('click', ()=> {
      const mon = monthPicker.value;
      if(!mon){ if(confirm('Export full to XLSX? OK=full, Cancel=pick month first')) exportXLSX(false,null); else return; }
      exportXLSX(true, mon);
    });
    document.getElementById('importFile').addEventListener('change', (ev)=>{
      const f = ev.target.files[0];
      if(!f) return;
      const ext = f.name.split('.').pop().toLowerCase();
      if(ext === 'json'){
        const r = new FileReader();
        r.onload = () => {
          try{
            const obj = JSON.parse(r.result);
            if(confirm('Replace local data with imported data? This will overwrite your current data.')) {
              saveStore(obj);
              alert('Imported. Refreshing view.');
              m.remove();
              renderEntries(); renderSummary(); renderSettingsUI(); renderBankBalances();
            }
          }catch(err){ alert('Invalid JSON'); }
        };
        r.readAsText(f);
      } else if(ext === 'xlsx' || ext === 'xls'){
        importXLSXFile(f);
        m.remove();
      } else if(ext === 'csv'){
        // CSV import - parse lines matching export CSV format
        const r = new FileReader();
        r.onload = ()=>{
          const text = r.result;
          const lines = text.split('\n').map(l=>l.trim()).filter(Boolean);
          const header = lines.shift().split(',');
          const byDate = {};
          lines.forEach((ln, i)=>{
            // use simple CSV split (works for typical exports)
            const cols = ln.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(c => c.replace(/^"|"$/g,''));
            const date = cols[0];
            const e = {
              id: Date.now() + i,
              type: cols[1],
              description: cols[2],
              category: cols[3],
              payMethod: cols[4],
              paySubType: cols[5],
              amount: parseFloat(cols[6]||0) || 0,
              note: cols[7] || '',
              split: (cols[8] ? JSON.parse(cols[8]) : null),
              transfer: (cols[9] ? JSON.parse(cols[9]) : null),
              createdAt: new Date().toISOString()
            };
            if(!byDate[date]) byDate[date]=[];
            byDate[date].push(e);
          });
          if(confirm('Replace local data with imported CSV data? (OK=Replace, Cancel=Merge)')){
            const out = loadStore(); out.days = byDate; saveStore(out);
          } else {
            const out = loadStore();
            Object.keys(byDate).forEach(d=>{
              out.days[d] = (out.days[d] || []).concat(byDate[d]);
            });
            saveStore(out);
          }
          alert('CSV import complete. Refreshing UI.');
          renderEntries(); renderSummary(); renderSettingsUI(); renderBankBalances();
        };
        r.readAsText(f);
      } else {
        alert('Unsupported import file');
      }
    });
  });

  // export menu quick
  exportMenuBtn && exportMenuBtn.addEventListener('click', ()=>{
    showView('summary');
    setTimeout(()=> { document.getElementById('summaryExportBtn').click(); }, 100);
  });

  // clear all with export prompt
  clearAppDataBtn && clearAppDataBtn.addEventListener('click', ()=>{
    if(confirm('Do you want to export transaction history now? (Recommended)')){
      document.getElementById('summaryExportBtn').click();
      return;
    }
    if(confirm('Finally confirm: Clear all app data? This cannot be undone.')){
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(USER_KEY);
      localStorage.removeItem(CUSTOM_KEY);
      showToast('Cleared local data', false);
      setTimeout(()=> location.reload(), 800);
    }
  });

  // Settings export/import wiring
  settingsExpCsvBtn && settingsExpCsvBtn.addEventListener('click', ()=>{
    const mon = monthPicker.value;
    if(!mon){ alert('Pick month first'); return; }
    exportCSV(true, mon);
  });
  settingsExpJsonBtn && settingsExpJsonBtn.addEventListener('click', ()=> exportJSON(false,null));
  settingsExpXlsxBtn && settingsExpXlsxBtn.addEventListener('click', ()=> {
    const mon = monthPicker.value;
    if(!mon){ if(confirm('Export full to XLSX? OK=full, Cancel=pick month first')) exportXLSX(false,null); else return; }
    exportXLSX(true, mon);
  });
  settingsImportFileInput && settingsImportFileInput.addEventListener('change', (ev)=>{
    const f = ev.target.files[0];
    if(!f) return;
    const ext = f.name.split('.').pop().toLowerCase();
    if(ext === 'json'){
      const r = new FileReader();
      r.onload = () => {
        try{
          const obj = JSON.parse(r.result);
          if(confirm('Replace local data with imported data? This will overwrite your current data.')) {
            saveStore(obj);
            alert('Imported. Refreshing view.');
            renderEntries(); renderSummary(); renderSettingsUI(); renderBankBalances();
          }
        }catch(err){ alert('Invalid JSON'); }
      };
      r.readAsText(f);
    } else if(ext === 'xlsx' || ext === 'xls'){
      importXLSXFile(f);
    } else if(ext === 'csv'){
      // reuse summary import logic
      const r = new FileReader();
      r.onload = ()=>{
        const text = r.result;
        const lines = text.split('\n').map(l=>l.trim()).filter(Boolean);
        const header = lines.shift().split(',');
        const byDate = {};
        lines.forEach((ln, i)=>{
          const cols = ln.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(c => c.replace(/^"|"$/g,''));
          const date = cols[0];
          const e = {
            id: Date.now() + i,
            type: cols[1],
            description: cols[2],
            category: cols[3],
            payMethod: cols[4],
            paySubType: cols[5],
            amount: parseFloat(cols[6]||0) || 0,
            note: cols[7] || '',
            split: (cols[8] ? JSON.parse(cols[8]) : null),
            transfer: (cols[9] ? JSON.parse(cols[9]) : null),
            createdAt: new Date().toISOString()
          };
          if(!byDate[date]) byDate[date]=[];
          byDate[date].push(e);
        });
        if(confirm('Replace local data with imported CSV data? (OK=Replace, Cancel=Merge)')){
          const out = loadStore(); out.days = byDate; saveStore(out);
        } else {
          const out = loadStore();
          Object.keys(byDate).forEach(d=>{
            out.days[d] = (out.days[d] || []).concat(byDate[d]);
          });
          saveStore(out);
        }
        alert('CSV import complete. Refreshing UI.');
        renderEntries(); renderSummary(); renderSettingsUI(); renderBankBalances();
      };
      r.readAsText(f);
    } else {
      alert('Unsupported import file');
    }
  });

  // keyboard shortcut for month export
  document.addEventListener('keydown', (e) => {
    if((e.ctrlKey || e.metaKey) && e.key === 'e'){ e.preventDefault(); const mon = monthPicker.value; if(!mon){ alert('Pick a month first'); return; } exportCSV(true, mon); }
  });

  updatePaySubTypeOptions(); updateTransferUI();

  // Ensure menu toggle and menu are placed and sized correctly after first render
  setTimeout(() => { ensureMenuElementsInBody(); positionMenuToggle(); }, 80);
}

/* ------------- Small helpers ------------- */
function showToast(text, short=true){
  const t = document.createElement('div'); t.className='toast-success';
  t.innerHTML = `<svg width="16" height="16" aria-hidden="true"><use href="#icon-check"></use></svg><div>${text}</div>`;
  document.body.appendChild(t);
  t.style.position = 'fixed'; t.style.right = '18px'; t.style.bottom = '18px'; t.style.zIndex = 99999;
  setTimeout(()=> { t.style.transition = 'opacity .32s ease'; t.style.opacity = '0'; setTimeout(()=> t.remove(), 320); }, short ? 1500 : 3000);
}

/* ------------- Swipe navigation for mobile (basic left/right) ------------- */
(function addSwipe(){
  let touchStartX = 0, touchStartY = 0;
  document.addEventListener('touchstart', e=>{ const t=e.touches[0]; touchStartX = t.clientX; touchStartY = t.clientY; });
  document.addEventListener('touchend', e=>{
    const t = e.changedTouches[0];
    const dx = t.clientX - touchStartX;
    const dy = t.clientY - touchStartY;
    if(Math.abs(dx) > 60 && Math.abs(dy) < 40){
      // left swipe -> next tab, right swipe -> prev tab
      const views = ['entry','summary','accounts','settings','user','about'];
      const active = [...document.querySelectorAll('.nav-item')].findIndex(n=>n.classList.contains('active'));
      if(dx < 0 && active < views.length-1){ showView(views[active+1]); }
      if(dx > 0 && active > 0){ showView(views[active-1]); }
    }
  });
})();

/* ---------- Brand icon click: go to Entry (small enhancement) ---------- */
document.addEventListener('DOMContentLoaded', ()=> {
  const brandIcon = document.querySelector('.brand-icon');
  if(brandIcon){
    brandIcon.style.cursor = 'pointer';
    brandIcon.addEventListener('click', ()=> {
      try {
        if(typeof showView === 'function') showView('entry');
        if(typeof closeMainMenu === 'function') closeMainMenu();
      } catch(err){
        // noop
      }
    });
  }
});

/* ------------- Start ------------- */
setupAuth();
