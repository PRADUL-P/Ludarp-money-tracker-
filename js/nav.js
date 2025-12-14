'use strict';
/* nav.js
   Navigation wiring, menu reparenting and positioning
*/

(function(){
  const headerTop = document.querySelector('.header-top');
  let mainMenu = document.getElementById('mainMenu');
  let menuToggle = document.getElementById('menuToggle');
  const navItems = document.querySelectorAll('.nav-item');

  function ensureMenuElementsInBody(){
    try {
      if(!mainMenu) mainMenu = document.getElementById('mainMenu');
      if(!menuToggle) menuToggle = document.getElementById('menuToggle');

      if(mainMenu && mainMenu.parentElement !== document.body){
        document.body.appendChild(mainMenu);
        mainMenu.style.position = 'fixed';
        mainMenu.style.zIndex = 99999;
        mainMenu.style.pointerEvents = 'none';
      }

      if(menuToggle && menuToggle.parentElement !== document.body){
        document.body.appendChild(menuToggle);
        menuToggle.style.position = 'fixed';
        menuToggle.style.zIndex = 100000;
        menuToggle.style.background = 'transparent';
        menuToggle.style.border = 'none';
        menuToggle.style.pointerEvents = 'auto';
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
      const top = Math.max(8, headerRect.top + 8);
      let finalRight = 18;
      if(headerTop){
        finalRight = Math.max(12, window.innerWidth - (headerRect.right - 18));
      }
      menuToggle.style.top = `${top}px`;
      menuToggle.style.right = `${finalRight}px`;
      menuToggle.style.left = 'auto';
      menuToggle.style.boxShadow = 'none';
      menuToggle.style.transform = 'none';
    } catch(e){
      if(menuToggle){
        menuToggle.style.top = '12px';
        menuToggle.style.right = '18px';
      }
    }
  }

  function positionMainMenu(){
    try{
      if(!mainMenu) return;
      const headerRect = headerTop ? headerTop.getBoundingClientRect() : { bottom: 64 };
      const viewportTop = (headerRect.bottom || 64) + 8; // px
      const viewportHeight = window.innerHeight;
      const menuHeight = mainMenu.offsetHeight || 260;
      let topPx = viewportTop;
      if(topPx + menuHeight > viewportHeight - 12){
        topPx = Math.max(12, viewportHeight - menuHeight - 12);
      }
      mainMenu.style.position = 'fixed';
      mainMenu.style.top = `${topPx}px`;
      mainMenu.style.right = '12px';
      mainMenu.style.left = 'auto';
      mainMenu.style.zIndex = 99999;
      mainMenu.style.background = mainMenu.style.background || getComputedStyle(document.body).getPropertyValue('--panel-bg') || '#0b1220';
      mainMenu.style.boxShadow = mainMenu.style.boxShadow || '0 8px 28px rgba(2,6,23,0.6)';
    }catch(err){
      if(mainMenu){
        mainMenu.style.position = 'fixed';
        mainMenu.style.top = '64px';
        mainMenu.style.right = '12px';
      }
    }
  }

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
    mainMenu.style.pointerEvents = 'none';
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

    if(menuToggle){
      const newToggle = menuToggle.cloneNode(true);
      menuToggle.parentElement.replaceChild(newToggle, menuToggle);
      menuToggle = newToggle;
      menuToggle.addEventListener('click', e=>{
        e.stopPropagation();
        const isOpen = mainMenu.classList.toggle('open');
        if(isOpen) openMainMenu(); else closeMainMenu();
      });
    }

    if(mainMenu){
      mainMenu.addEventListener('click', e => e.stopPropagation());
      if(mainMenu.parentElement !== document.body) document.body.appendChild(mainMenu);
      mainMenu.style.display = 'none';
      mainMenu.style.pointerEvents = 'none';
      mainMenu.style.zIndex = 99999;
      mainMenu.setAttribute('aria-hidden', 'true');
    }

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

    if(mainMenu) mainMenu.querySelectorAll('button[data-to]').forEach(b=>{
      b.addEventListener('click', ()=> {
        const to = b.dataset.to;
        if(to) showView(to);
        closeMainMenu();
      });
    });

    window.addEventListener('resize', ()=> { positionMenuToggle(); if(mainMenu.classList.contains('open')) positionMainMenu(); });
    window.addEventListener('scroll', ()=> { positionMenuToggle(); if(mainMenu.classList.contains('open')) positionMainMenu(); });
  }

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

    // let other modules handle extra rendering via events
    window.dispatchEvent(new CustomEvent('mt:view-changed', { detail: { viewName: name } }));
  }

  // expose
  window.MT = window.MT || {};
  window.MT.nav = { initNav, showView, openMainMenu, closeMainMenu };

  // init nav when DOM loaded
  document.addEventListener('DOMContentLoaded', initNav);
})();
