'use strict';
/* pwa.js - small helpers for PWA behavior, registration of service worker if present. */

(function(){
  if('serviceWorker' in navigator){
    window.addEventListener('load', ()=> {
      navigator.serviceWorker.register('/sw.js').catch(()=>{/* silent */});
    });
  }
})();
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('./sw.js');
}
