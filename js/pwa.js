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
    const menuInstallBtn = document.getElementById('menuInstallBtn');
    const manualMsg = document.getElementById('installManualMsg');

    const triggerInstall = async (btn) => {
      if (deferredPrompt) {
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === 'accepted') {
          if(installBtn) installBtn.style.display = 'none';
          if(menuInstallBtn) menuInstallBtn.style.display = 'none';
        }
        deferredPrompt = null;
      }
    };

    if(installBtn) {
       installBtn.style.display = 'flex';
       if(manualMsg) manualMsg.style.display = 'none';
       installBtn.onclick = () => triggerInstall(installBtn);
    }
    if(menuInstallBtn) {
       menuInstallBtn.style.display = 'block';
       menuInstallBtn.onclick = () => triggerInstall(menuInstallBtn);
    }
  });

  // Handle Refresh / Update Logic
  const handleUpdate = async () => {
    window.MT?.ui?.showToast('Cleaning cache and updating...', 'warning');
    
    // 1. Unregister all service workers
    if ('serviceWorker' in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      for (let registration of registrations) {
        await registration.unregister();
      }
    }

    // 2. Clear all caches
    if ('caches' in window) {
      const cacheNames = await caches.keys();
      for (let cacheName of cacheNames) {
        await caches.delete(cacheName);
      }
    }

    // 3. Hard reload
    window.location.reload();
  };

  const updateStatusUI = () => {
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone;
    const appStatusTag = document.getElementById('appStatusTag');
    const appInstalledMsg = document.getElementById('appInstalledMsg');
    const manualMsg = document.getElementById('installManualMsg');

    if (isStandalone) {
        if(appStatusTag) appStatusTag.innerText = 'App Status: Premium App Mode';
        if(appInstalledMsg) appInstalledMsg.style.display = 'block';
        if(manualMsg) manualMsg.style.display = 'none';
    }
  };

  // Wire up Refresh buttons
  const refreshBtns = ['refreshAppBtn', 'menuUpdateBtn'];
  refreshBtns.forEach(id => {
    const btn = document.getElementById(id);
    if(btn) btn.onclick = handleUpdate;
  });

  updateStatusUI();

  window.addEventListener('appinstalled', () => {
     const installBtn = document.getElementById('installAppBtn');
     const menuInstallBtn = document.getElementById('menuInstallBtn');
     const manualMsg = document.getElementById('installManualMsg');
     const appInstalledMsg = document.getElementById('appInstalledMsg');
     
     if(installBtn) installBtn.style.display = 'none';
     if(menuInstallBtn) menuInstallBtn.style.display = 'none';
     if(manualMsg) manualMsg.style.display = 'none';
     if(appInstalledMsg) appInstalledMsg.style.display = 'block';
     
     updateStatusUI();
     deferredPrompt = null;
  });

})();
