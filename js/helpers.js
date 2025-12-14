// helpers.js
import { loadCustom } from './db.js';

export function getTZOffsetMs(){ return new Date().getTimezoneOffset()*60000; }
export function todayISO(){ const d=new Date(); return new Date(d - getTZOffsetMs()).toISOString().slice(0,10); }
export function formatDateLabel(dateStr){
  if(!dateStr) return '';
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString(undefined,{day:'2-digit',month:'short',year:'numeric'});
}
export function currencyFmt(v){
  const custom = loadCustom();
  return (custom.currency||'₹') + Number(v || 0).toFixed(2);
}
export function showToast(text, short=true){
  const t = document.createElement('div'); t.className='toast-success';
  t.innerHTML = `<svg width="16" height="16" aria-hidden="true"><use href="#icon-check"></use></svg><div>${text}</div>`;
  document.body.appendChild(t);
  t.style.position = 'fixed'; t.style.right = '18px'; t.style.bottom = '18px'; t.style.zIndex = 99999;
  setTimeout(()=> { t.style.transition = 'opacity .32s ease'; t.style.opacity = '0'; setTimeout(()=> t.remove(), 320); }, short ? 1500 : 3000);
}
