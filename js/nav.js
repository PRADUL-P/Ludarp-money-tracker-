'use strict';
/* nav.js - REBUILT FOR v6.0 STABILITY */

// Global State
window.MT = window.MT || {};

(function() {
    const views = ['entry', 'summary', 'accounts', 'settings', 'dues', 'about', 'lab'];

    function showView(name) {
        if (!name) name = 'entry';
        const cleanName = (name === 'statement') ? 'accounts' : name;
        console.log('[NAV] Switching to:', cleanName);

        // 1. Hide all views
        const allViews = document.querySelectorAll('section.view');
        allViews.forEach(v => {
            v.classList.remove('active');
            v.style.setProperty('display', 'none', 'important');
        });

        // 2. Show target
        const target = document.getElementById(`view-${cleanName}`);
        if (target) {
            target.classList.add('active');
            target.style.setProperty('display', 'block', 'important');

            // --- Sub-tab Sync (Finance) ---
            if (cleanName === 'accounts') {
                const defaultTab = (name === 'statement') ? 'finance-statement' : 'finance-accounts';
                const tabs = target.querySelectorAll('.tab-content');
                tabs.forEach(t => {
                    t.style.display = (t.id === defaultTab) ? 'block' : 'none';
                    if (t.id === defaultTab) t.classList.add('active');
                });

                // Update header tab button styling and class
                const buttons = target.querySelectorAll('.tab-btn');
                buttons.forEach(btn => {
                    if (btn.dataset.target === defaultTab) {
                        btn.classList.add('active');
                        btn.style.background = 'var(--accent)';
                        btn.style.color = '#fff';
                    } else {
                        btn.classList.remove('active');
                        btn.style.background = 'none';
                        btn.style.color = 'var(--text-secondary)';
                    }
                });
            }

            // --- Lab Back to Hub ---
            if (cleanName === 'lab' && window.MT.lab) {
                window.MT.lab.back();
            }
        }

        // 3. Sync UI (Nav Buttons)
        document.querySelectorAll('[data-view]').forEach(btn => {
            if (btn.dataset.view === cleanName) btn.classList.add('active');
            else btn.classList.remove('active');
        });

        // 4. Close menu
        const menu = document.getElementById('mainMenu');
        if (menu) {
            menu.classList.remove('open');
            menu.style.display = 'none';
        }

        window.dispatchEvent(new CustomEvent('mt:view-changed', { detail: { viewName: cleanName } }));
    }

    function initNav() {
        console.log('[NAV] Initializing delegated listeners...');
        
        // Use Global Event Delegation on WINDOW for ultimate reach
        window.addEventListener('click', (e) => {
            const btn = e.target.closest('[data-view]');
            if (btn) {
                const v = btn.dataset.view;
                console.log('[NAV] Click detected for view:', v);
                
                // Special case for middle FAB: if already on entry, just reset/clear form
                if (btn.id === 'fabAdd' && document.getElementById('view-entry').classList.contains('active')) {
                    console.log('[NAV] FAB clicked on entry view - clearing form');
                    if (window.MT.entry && window.MT.entry.startEdit) {
                        // Using startEdit with empty values or just triggering clear
                        const clearBtn = document.getElementById('clear-btn');
                        if (clearBtn) clearBtn.click();
                        window.MT.ui?.showToast('Form Cleared', 'success');
                    }
                    return;
                }

                if (v) showView(v);
            }
            
            // Side Menu Toggle
            const toggle = e.target.closest('#menuToggle');
            if (toggle) {
                console.log('[NAV] Menu Toggle clicked');
                const menu = document.getElementById('mainMenu');
                if (menu) {
                    const isOpen = menu.classList.contains('open');
                    if (isOpen) {
                        menu.classList.remove('open');
                        menu.style.setProperty('display', 'none', 'important');
                    } else {
                        // Position dynamically near the toggle
                        const rect = toggle.getBoundingClientRect();
                        menu.style.position = 'fixed';
                        menu.style.top = `${rect.bottom + 8}px`;
                        menu.style.right = '18px';
                        menu.style.left = 'auto';
                        menu.style.zIndex = '200000'; // Higher than everything
                        
                        menu.classList.add('open');
                        menu.style.setProperty('display', 'block', 'important');
                    }
                }
            }
        }, true); // Use capture phase to ensure we get it first

        // Swipe support
        let startX = 0;
        let startY = 0;
        let cancelSwipe = false;
        document.addEventListener('touchstart', e => {
            const touch = e.touches[0];
            startX = touch.clientX;
            startY = touch.clientY;
            
            // Ignore swipe if touch target originates inside a due item to prevent conflicts
            if (touch.target && touch.target.closest && touch.target.closest('.due-item')) {
                cancelSwipe = true;
            } else {
                cancelSwipe = false;
            }
        }, {passive:true});

        document.addEventListener('touchend', e => {
            if (cancelSwipe || !startX) return;
            const touch = e.changedTouches[0];
            const dx = touch.clientX - startX;
            const dy = touch.clientY - startY;
            
            // Track vertical coordinates. Cancel swipe if vertical movement is dominant or excessive.
            if (Math.abs(dy) > Math.abs(dx) || Math.abs(dy) > 30) {
                startX = 0;
                startY = 0;
                return;
            }
            if (Math.abs(dx) < 80) return;
            
            const active = document.querySelector('section.view.active');
            const current = active ? active.id.replace('view-', '') : 'entry';
            const idx = views.indexOf(current);
            if (idx === -1) return;

            if (dx < 0 && idx < views.length - 1) showView(views[idx + 1]);
            if (dx > 0 && idx > 0) showView(views[idx - 1]);
            startX = 0;
            startY = 0;
        }, {passive:true});

        // Initial Sync
        const active = document.querySelector('section.view.active');
        if (active) showView(active.id.replace('view-', ''));
        else showView('entry');
    }

    // Export
    window.MT.nav = { showView, initNav };
    window.showView = showView;

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initNav);
    } else {
        initNav();
    }

})();
