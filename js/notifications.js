'use strict';
/* notifications.js
   Handles local PWA notifications and reminders.
   NOTE: Chrome/Safari on Mobile requires user interaction to grant permission.
   True scheduled background notifications at exact times are limited in PWAs,
   so we implement a "Check on Open" and a "Mock Periodic Sync" logic.
*/

(function () {

    const STORAGE_KEY = 'mt_reminder_settings';

    function loadSettings() {
        try {
            return JSON.parse(localStorage.getItem(STORAGE_KEY)) || { enabled: false, time: '21:00', lastShown: null };
        } catch {
            return { enabled: false, time: '21:00', lastShown: null };
        }
    }

    function saveSettings(s) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
    }

    /* ---- PERMISSION ---- */
    async function requestPermission() {
        if (!('Notification' in window)) return false;
        const permission = await Notification.requestPermission();
        return permission === 'granted';
    }

    function showNotification(title, options) {
        if (Notification.permission === 'granted' && navigator.serviceWorker.controller) {
            navigator.serviceWorker.ready.then(registration => {
                registration.showNotification(title, {
                    icon: './icon-192.png', // Fallback if icon not found
                    badge: './icon-192.png',
                    vibrate: [200, 100, 200],
                    ...options
                });
            });
        }
    }

    /* ---- LOGIC ---- */
    function checkAndNotify() {
        const settings = loadSettings();
        if (!settings.enabled) return;

        const now = new Date();
        const todayStr = now.toISOString().slice(0, 10);

        // Don't show twice today
        if (settings.lastShown === todayStr) return;

        // NEW: Only notify if they HAVEN'T logged anything today
        const store = window.MT.db.loadStore();
        const todayEntries = store.days[todayStr] || [];
        if (todayEntries.length > 0) return;

        // Check if current time >= reminder time
        const [targetH, targetM] = settings.time.split(':').map(Number);
        const currentH = now.getHours();
        const currentM = now.getMinutes();

        if (currentH > targetH || (currentH === targetH && currentM >= targetM)) {
            showNotification('Money Tracker Reminder', {
                body: "Don't forget to log your expenses for today! 💸",
                tag: 'daily-reminder',
                renotify: true
            });
            settings.lastShown = todayStr;
            saveSettings(settings);
        }
    }

    /* ---- UI SETUP ---- */
    function initUI() {
        const toggle = document.getElementById('reminderToggle');
        const timeInput = document.getElementById('reminderTime');
        const timeWrap = document.getElementById('reminderTimeWrap');
        const testBtn = document.getElementById('testNotifyBtn');
        const status = document.getElementById('reminderStatus');

        if (!toggle) return;

        const settings = loadSettings();
        toggle.checked = settings.enabled;
        timeInput.value = settings.time;
        timeWrap.style.display = settings.enabled ? 'block' : 'none';

        toggle.onchange = async () => {
            if (toggle.checked) {
                const granted = await requestPermission();
                if (!granted) {
                    toggle.checked = false;
                    status.textContent = '❌ Notification permission denied';
                    return;
                }
                timeWrap.style.display = 'block';
            } else {
                timeWrap.style.display = 'none';
            }
            saveSettings({ ...loadSettings(), enabled: toggle.checked });
            status.textContent = 'Settings saved';
            setTimeout(() => status.textContent = '', 2000);
        };

        timeInput.onchange = () => {
            saveSettings({ ...loadSettings(), time: timeInput.value });
            status.textContent = 'Time updated';
            setTimeout(() => status.textContent = '', 2000);
        };

        testBtn.onclick = async () => {
            if (Notification.permission !== 'granted') {
                const granted = await requestPermission();
                if (!granted) return alert('Permission denied');
            }
            showNotification('Test Notification', {
                body: 'It works! This is how your reminder will look.',
                tag: 'test'
            });
        };
    }

    /* ---- EXPOSE ---- */
    window.MT = window.MT || {};
    window.MT.notifications = {
        checkAndNotify,
        initUI
    };

    // Run check on login
    window.addEventListener('mt:auth-entered', () => {
        initUI();
        checkAndNotify();

        // Optional: Check every 15 mins if app is open
        setInterval(checkAndNotify, 15 * 60 * 1000);
    });

})();
