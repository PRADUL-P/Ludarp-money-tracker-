const CACHE_NAME = 'ludarp-cache-v1';
const ASSETS = [
  '/',
  '/index.html',
  '/style.css',
  '/app.js',
  '/manifest.webmanifest'
  // add icons here if you add them
];

self.addEventListener('install', (ev)=>{
  ev.waitUntil(caches.open(CACHE_NAME).then(cache=> cache.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', (ev)=>{
  ev.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (ev)=>{
  const req = ev.request;
  ev.respondWith(
    caches.match(req).then(cached => {
      if(cached) return cached;
      return fetch(req).then(resp => {
        // optionally cache new requests
        if(req.method === 'GET' && resp && resp.status === 200 && resp.type === 'basic'){
          const copy = resp.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(req, copy));
        }
        return resp;
      }).catch(()=> caches.match('/index.html'));
    })
  );
});
