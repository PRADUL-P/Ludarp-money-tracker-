'use strict';
/* nav.js
   Navigation wiring, menu handling, bottom nav + FAB support
*/

(function () {

  const headerTop = document.querySelector('.header-top');
  let mainMenu = document.getElementById('mainMenu');
  let menuToggle = document.getElementById('menuToggle');

  // 🔥 Top + Bottom navigation buttons
  const navItems = document.querySelectorAll('.nav-item, .fn-item');

  /* ================= MENU REPARENT ================= */

  function ensureMenuElementsInBody() {
    try {
      if (!mainMenu) mainMenu = document.getElementById('mainMenu');
      if (!menuToggle) menuToggle = document.getElementById('menuToggle');

      if (mainMenu && mainMenu.parentElement !== document.body) {
        document.body.appendChild(mainMenu);
        mainMenu.style.position = 'fixed';
        mainMenu.style.zIndex = 99999;
        mainMenu.style.pointerEvents = 'none';
      }

      if (menuToggle && menuToggle.parentElement !== document.body) {
        document.body.appendChild(menuToggle);
        menuToggle.style.position = 'fixed';
        menuToggle.style.zIndex = 100000;
        menuToggle.style.pointerEvents = 'auto';
        positionMenuToggle();
      }
    } catch (e) {
      console.warn('Menu reparent failed', e);
    }
  }

  function positionMenuToggle() {
    if (!menuToggle) return;
    try {
      const rect = headerTop
        ? headerTop.getBoundingClientRect()
        : { top: 12 };

      menuToggle.style.top = `${Math.max(8, rect.top + 8)}px`;
      menuToggle.style.right = '18px';
      menuToggle.style.left = 'auto';
    } catch (e) {
      menuToggle.style.top = '12px';
      menuToggle.style.right = '18px';
    }
  }

  function positionMainMenu() {
    if (!mainMenu) return;
    try {
      const rect = headerTop
        ? headerTop.getBoundingClientRect()
        : { bottom: 64 };

      mainMenu.style.position = 'fixed';
      mainMenu.style.top = `${rect.bottom + 8}px`;
      mainMenu.style.right = '12px';
      mainMenu.style.left = 'auto';
      mainMenu.style.zIndex = 99999;
    } catch (e) {
      mainMenu.style.top = '64px';
      mainMenu.style.right = '12px';
    }
  }

  function openMainMenu() {
    if (!mainMenu) return;
    mainMenu.classList.add('open');
    mainMenu.style.display = 'block';
    mainMenu.style.pointerEvents = 'auto';
    mainMenu.setAttribute('aria-hidden', 'false');
    positionMainMenu();
  }

  function closeMainMenu() {
    if (!mainMenu) return;
    mainMenu.classList.remove('open');
    mainMenu.style.display = 'none';
    mainMenu.style.pointerEvents = 'none';
    mainMenu.setAttribute('aria-hidden', 'true');
  }

  /* ================= INIT NAV ================= */

  function initNav() {
    ensureMenuElementsInBody();

    /* ===== TOP + BOTTOM NAV (SAME LOGIC) ===== */
    navItems.forEach(btn => {
      btn.addEventListener('click', () => {
        const view = btn.dataset.view;
        if (!view) return;

        showView(view);
        closeMainMenu();
      });
    });

    /* ===== MENU TOGGLE ===== */
    if (menuToggle) {
      menuToggle.addEventListener('click', (e) => {
        e.stopPropagation();
        if (mainMenu.classList.contains('open')) {
          closeMainMenu();
        } else {
          openMainMenu();
        }
      });
    }

    /* ===== CLICK OUTSIDE MENU ===== */
    document.addEventListener('click', (e) => {
      if (
        mainMenu &&
        mainMenu.classList.contains('open') &&
        !mainMenu.contains(e.target) &&
        !menuToggle.contains(e.target)
      ) {
        closeMainMenu();
      }
    });

    /* ===== MENU PANEL BUTTONS ===== */
    if (mainMenu) {
      mainMenu.querySelectorAll('button[data-to]').forEach(btn => {
        btn.addEventListener('click', () => {
          const to = btn.dataset.to;
          if (to) showView(to);
          closeMainMenu();
        });
      });
    }

    /* ===== FAB (+) — PRIMARY ACTION ===== */
    const fab = document.getElementById('fabAdd');
    if (fab) {
      fab.addEventListener('click', () => {
        showView('entry');

        // Focus amount input if exists
        const amountInput = document.getElementById('amount');
        if (amountInput) {
          setTimeout(() => amountInput.focus(), 50);
        }
      });
    }

    /* ===== WINDOW EVENTS ===== */
    window.addEventListener('resize', () => {
      positionMenuToggle();
      if (mainMenu?.classList.contains('open')) positionMainMenu();
    });

    window.addEventListener('scroll', () => {
      positionMenuToggle();
      if (mainMenu?.classList.contains('open')) positionMainMenu();
    });
  }

  /* ================= VIEW SWITCHER ================= */

  function showView(name) {
    document.querySelectorAll('.view').forEach(v =>
      v.classList.remove('active')
    );

    if (!name || name === 'entry')
      document.getElementById('view-entry')?.classList.add('active');
    if (name === 'summary')
      document.getElementById('view-summary')?.classList.add('active');
    if (name === 'accounts')
      document.getElementById('view-accounts')?.classList.add('active');
    if (name === 'settings')
      document.getElementById('view-settings')?.classList.add('active');
    if (name === 'user')
      document.getElementById('view-user')?.classList.add('active');
    if (name === 'about')
      document.getElementById('view-about')?.classList.add('active');
    if (name === 'dues')
      document.getElementById('view-dues')?.classList.add('active');
    if (name === 'statement')
      document.getElementById('view-statement')?.classList.add('active');

    /* ===== ACTIVE STATE (TOP + BOTTOM) ===== */
    document.querySelectorAll('.nav-item, .fn-item').forEach(btn => {
      if (btn.dataset.view === name) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });

    window.dispatchEvent(
      new CustomEvent('mt:view-changed', {
        detail: { viewName: name }
      })
    );
  }

  /* ================= EXPORT ================= */

  window.MT = window.MT || {};
  window.MT.nav = {
    initNav,
    showView,
    openMainMenu,
    closeMainMenu
  };

  // Compatibility with older / other modules
  window.showView = showView;

  document.addEventListener('DOMContentLoaded', initNav);

})();

/* ===============================
   HIDE BOTTOM BAR ON SCROLL
================================ */
(function () {
  const bar = document.querySelector('.floating-nav-wrap');
  if (!bar) return;

  let lastScrollY = window.scrollY;

  window.addEventListener('scroll', () => {
    const current = window.scrollY;

    // scrolling down → hide
    if (current > lastScrollY + 6) {
      bar.classList.add('hide');
    }
    // scrolling up → show
    else if (current < lastScrollY - 6) {
      bar.classList.remove('hide');
    }

    lastScrollY = current;
  }, { passive: true });
})();

/* ===============================
   SWIPE NAVIGATION
================================ */
(function () {

  const views = ['entry', 'summary', 'accounts', 'dues', 'statement', 'settings', 'user', 'about'];
  let startX = 0;
  let startY = 0;

  function getCurrentView() {
    const active = document.querySelector('.view.active');
    if (!active) return 'entry';
    return active.id.replace('view-', '');
  }

  document.addEventListener('touchstart', e => {
    if (e.touches.length !== 1) return;
    startX = e.touches[0].clientX;
    startY = e.touches[0].clientY;
  }, { passive: true });

  document.addEventListener('touchend', e => {
    if (!startX) return;

    const dx = e.changedTouches[0].clientX - startX;
    const dy = e.changedTouches[0].clientY - startY;

    // Ignore vertical scroll gestures
    if (Math.abs(dx) < 60 || Math.abs(dx) < Math.abs(dy)) return;

    const current = getCurrentView();
    const index = views.indexOf(current);
    if (index === -1) return;

    // swipe left → next
    if (dx < 0 && index < views.length - 1) {
      window.MT.nav.showView(views[index + 1]);
    }

    // swipe right → previous
    if (dx > 0 && index > 0) {
      window.MT.nav.showView(views[index - 1]);
    }

    startX = 0;
    startY = 0;
  });

})();
