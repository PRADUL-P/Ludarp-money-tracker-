const CACHE_NAME = 'ludarp-moneytracker-v38';
const ASSETS = [
  './',
  './index.html',
  './style.css?v=2',
  './manifest.webmanifest',
  './logo.png',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './js/db.js',
  './js/security.js',
  './js/ui.js',
  './js/colors.js',
  './js/nav.js',
  './js/entry.js',
  './js/summary.js',
  './js/accounts.js',
  './js/settings.js',
  './js/pwa.js',
  './js/automation.js',
  './js/budget.js',
  './js/recurring.js',
  './js/dues.js',
  './js/exporter.js',
  './js/gsheets.js',
  './js/parser.js',
  './js/calc.js',
  './js/notifications.js',
  './js/voice.js',
  './js/statement.js',
  './js/goals.js',
  './js/pdf-generator.js',
  './js/whatsnew.js',
  './js/undolog.js',
  './js/salary-dist.js',
  './js/lab.js',
  'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap',
  'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js',
  'https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/html5-qrcode/2.3.8/html5-qrcode.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.5.25/jspdf.plugin.autotable.min.js'
];

// INSTALL: Cache all core assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS);
    })
  );
  self.skipWaiting();
});

// ACTIVATE: Cleanup old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
      );
    })
  );
  self.clients.claim();
});

// FETCH: Stale-While-Revalidate strategy
self.addEventListener('fetch', (event) => {
  // Skip non-GET requests
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.match(event.request).then((cachedResponse) => {
        const fetchPromise = fetch(event.request).then((networkResponse) => {
          // If valid response, update cache
          if (networkResponse && networkResponse.status === 200) {
            cache.put(event.request, networkResponse.clone());
          }
          return networkResponse;
        }).catch(() => {
          // Fallback if network fails and no cache
          if (event.request.mode === 'navigate') {
            return cache.match('./index.html');
          }
        });

        // Return cached immediately, or wait for network
        return cachedResponse || fetchPromise;
      });
    })
  );
});

// NOTIFICATION CLICK: Open or focus the app
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      if (clientList.length > 0) {
        let client = clientList[0];
        for (let i = 0; i < clientList.length; i++) {
          if (clientList[i].focused) { client = clientList[i]; }
        }
        return client.focus();
      }
      return clients.openWindow('./');
    })
  );
});