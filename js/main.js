// main.js
import './db.js'; // ensures constants loaded (not strictly required)
import { applyCustom, setupTheme, ensureSelectColors, DOM } from './ui.js';
import { initNav, positionMenuToggle, ensureMenuElementsInBody } from './nav.js';
import { initEntryModule, renderEntries } from './entry.js';
import { initSummaryModule, renderSummary } from './summary.js';
import { exportCSV, exportJSON, exportXLSX } from './exporter.js';
import { loadUser, saveUser } from './db.js';

// expose some helpers globally used by modules
window.renderEntries = renderEntries;
window.renderSummary = renderSummary;
window.exportCSV = exportCSV;
window.exportJSON = exportJSON;
window.exportXLSX = exportXLSX;
function initApp(){
  if(window.ensureSettingsSeeded) window.ensureSettingsSeeded();

  applyCustom();
  setupTheme();
  // initNav handled by nav.js DOMContentLoaded

  ensureSelectColors();
  initEntryModule();
  initSummaryModule();
}

function setupAuthSimple(){
  // simple migration: use the same setupAuth logic you had but minimal here
  const authForm = DOM.authForm;
  const authNameRow = DOM.authNameRow;
  const authSubmitBtn = DOM.authSubmitBtn;
  const forgotBtn = DOM.forgotBtn;
  const authPasswordInput = DOM.authPasswordInput;
  const authNameInput = DOM.authNameInput;
  const authSecurityHintInput = DOM.authSecurityHintInput;
  const authHint = DOM.authHint;

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
  DOM.authScreen.style.display='none';
  DOM.appRoot.style.display='block';
  initApp2();
}

function initApp2(){ // merged into single initApp
  if(window.ensureSettingsSeeded) window.ensureSettingsSeeded();
  applyCustom();
  setupTheme();
  // initNav handled by nav.js DOMContentLoaded

  ensureSelectColors();
  initEntryModule();
  initSummaryModule();

  // wire basic export button
  DOM.summaryExportBtn && DOM.summaryExportBtn.addEventListener('click', ()=>{
    const mon = DOM.monthPicker.value;
    if(!mon){ if(confirm('Export full to XLSX? OK=full, Cancel=pick month first')) exportXLSX(false,null); else return; }
    exportCSV(true, mon);
  });

  // when entries change, re-render summary
  document.addEventListener('entries:changed', ()=> { renderSummary(); });

  // initial render
  renderEntries();
  renderSummary();

  // small layout fixes
  setTimeout(()=> { ensureMenuElementsInBody(); positionMenuToggle(); }, 80);
  
  // handle shortcuts
  handleAppShortcuts();
}

function handleAppShortcuts() {
  const urlParams = new URLSearchParams(window.location.search);
  const action = urlParams.get('action');
  const view = urlParams.get('view');
  
  if (view) {
    if (window.MT && window.MT.nav) {
      window.MT.nav.showView(view);
    } else {
      showView(view);
    }
  } else if (action === 'add_expense') {
    if (window.MT && window.MT.nav) {
      window.MT.nav.showView('entry');
    } else {
      showView('entry');
    }
    setTimeout(() => {
      document.getElementById('amount')?.focus();
    }, 300);
  }
}

// Navigation is now handled exclusively by js/nav.js


// Start auth
setupAuthSimple();
