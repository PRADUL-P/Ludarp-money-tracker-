'use strict';
/* pwa.js - small helpers for PWA behavior, registration of service worker if present. */

(function(){
  if('serviceWorker' in navigator){
    window.addEventListener('load', ()=> {
      navigator.serviceWorker.register('./sw.js').catch(()=>{/* silent */});
    });
  }

  let deferredPrompt;
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    const installBtn = document.getElementById('installAppBtn');
    const manualMsg = document.getElementById('installManualMsg');
    if(installBtn) {
       installBtn.style.display = 'flex';
       if(manualMsg) manualMsg.style.display = 'none';
       installBtn.addEventListener('click', async () => {
          if (deferredPrompt) {
             deferredPrompt.prompt();
             const { outcome } = await deferredPrompt.userChoice;
             if (outcome === 'accepted') {
                installBtn.style.display = 'none';
             }
             deferredPrompt = null;
          }
       });
    }
  });

  window.addEventListener('appinstalled', () => {
     const installBtn = document.getElementById('installAppBtn');
     const manualMsg = document.getElementById('installManualMsg');
     if(installBtn) installBtn.style.display = 'none';
     if(manualMsg) manualMsg.style.display = 'none';
     deferredPrompt = null;
  });

})();
