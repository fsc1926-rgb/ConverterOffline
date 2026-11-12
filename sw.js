const CACHE_NAME = 'conv-offline-github-v5';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './css/style.css',
  './js/app.js',
  './js/worker-audio.js',
  './manifest.webmanifest',
  './icons/icon-192.png',
  './icons/icon-512.png',
  // Salviamo direttamente le CDN così non devi scaricarle a mano!
  'https://cdn.jsdelivr.net/npm/pdf-lib@1.17.1/dist/pdf-lib.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js',
  'https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js',
  'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js',
  'https://cdn.jsdelivr.net/npm/lamejs@1.2.1/lame.min.js',
  'https://cdn.jsdelivr.net/npm/marked@9.1.6/marked.min.js',
  'https://cdn.jsdelivr.net/npm/qrcode-generator@1.4.4/qrcode.min.js',
  'https://cdn.jsdelivr.net/npm/heic2any@0.0.4/heic2any.min.js',
  'https://cdn.jsdelivr.net/npm/turndown@7.1.3/dist/turndown.js',
  'https://cdn.jsdelivr.net/npm/dompurify@3.0.8/dist/purify.min.js'
];

self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
    ))
  );
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(cachedResponse => {
      // Ritorna la cache se c'è, altrimenti prova la rete
      return cachedResponse || fetch(event.request).then(response => {
        return caches.open(CACHE_NAME).then(cache => {
          cache.put(event.request, response.clone());
          return response;
        });
      });
    })
  );
});
