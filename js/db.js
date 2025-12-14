'use strict';
/* db.js
   Storage keys, defaults, load/save helpers and small format helpers
*/

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

// small util formatters used broadly
function getTZOffsetMs(){ return new Date().getTimezoneOffset()*60000; }
function todayISO(){ const d=new Date(); return new Date(d - getTZOffsetMs()).toISOString().slice(0,10); }
function formatDateLabel(dateStr){
  if(!dateStr) return '';
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString(undefined,{day:'2-digit',month:'short',year:'numeric'});
}

// currency formatting reads custom from local storage; expose a getter/setter pattern
let custom = loadCustom();
function currencyFmt(v){ custom = loadCustom(); return (custom.currency||'₹') + Number(v).toFixed(2); }

// expose to global so other modules can use
window.MT = window.MT || {};
window.MT.db = {
  STORAGE_KEY, USER_KEY, CUSTOM_KEY, DEFAULTS,
  loadStore, saveStore, loadUser, saveUser, loadCustom, saveCustom,
  getTZOffsetMs, todayISO, formatDateLabel, currencyFmt
};
// 🔥 AUTO-SEED ON FIRST LOAD
ensureSettingsSeeded();