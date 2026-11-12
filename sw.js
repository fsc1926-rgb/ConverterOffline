const CACHE_NAME = 'conv-offline-v5-pro';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './css/style.css',
  './js/app.js',
  './manifest.webmanifest',
  './icons/favicon.png',
  './icons/apple-touch-icon.png',
  './icons/icon-192.png',
  './icons/icon-512.png'
  // IMPORTANTE: Se decidi di scaricare in locale le librerie CDN, aggiungi i percorsi qui.
  // Es: './js/vendor/pdf-lib.min.js'
];

// Installazione: pre-caching delle risorse essenziali
self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      console.log('[Service Worker] Caching risorse offline');
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
});

// Attivazione: pulizia delle vecchie cache
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.filter(key => key !== CACHE_NAME)
            .map(key => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

// Fetch: Network First per i CDN, Cache First per i file locali
self.addEventListener('fetch', event => {
  const requestUrl = new URL(event.request.url);

  // Se la richiesta è verso un CDN esterno (es. jsdelivr, cdnjs)
  if (requestUrl.origin !== location.origin) {
    event.respondWith(
      caches.match(event.request).then(cachedResponse => {
        return cachedResponse || fetch(event.request).then(networkResponse => {
          return caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, networkResponse.clone());
            return networkResponse;
          });
        }).catch(() => {
          console.warn('[Service Worker] Fetch fallito per risorsa esterna (Offline).');
        });
      })
    );
    return;
  }

  // Risorse Locali (Stale-while-revalidate pattern)
  event.respondWith(
    caches.match(event.request).then(cachedResponse => {
      if (cachedResponse) return cachedResponse;
      return fetch(event.request).then(response => {
        return caches.open(CACHE_NAME).then(cache => {
          cache.put(event.request, response.clone());
          return response;
        });
      });
    }).catch(() => {
      // Fallback in caso di assenza totale di rete e cache miss
      if (event.request.mode === 'navigate') {
        return caches.match('./index.html');
      }
    })
  );
});
