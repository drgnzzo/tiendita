/**
 * TIENDITA — Service Worker
 * Estrategia:
 *   - Estaticos (CSS, JS, SVG): cache-first con fallback a red
 *   - HTML: network-first con fallback a cache
 *   - Cache busting via CACHE_VERSION (incrementa cuando subas cambios)
 */

const CACHE_VERSION = 'tiendita-v1';
const ASSETS = [
  './',
  './index.html',
  './catalogo.html',
  './perfil.html',
  './styles.css',
  './api.js',
  './app.js',
  './logo.svg',
  './manifest.json'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) => cache.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(
        names.filter((n) => n !== CACHE_VERSION).map((n) => caches.delete(n))
      )
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // No interceptar llamadas al backend de Apps Script
  if (url.hostname.includes('script.google.com')) return;

  const isHtml = req.headers.get('accept')?.includes('text/html');

  if (isHtml) {
    // Network-first para HTML
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE_VERSION).then((cache) => cache.put(req, copy));
          return res;
        })
        .catch(() => caches.match(req).then((r) => r || caches.match('./index.html')))
    );
  } else {
    // Cache-first para estaticos
    event.respondWith(
      caches.match(req).then((cached) => cached || fetch(req).then((res) => {
        const copy = res.clone();
        caches.open(CACHE_VERSION).then((cache) => cache.put(req, copy));
        return res;
      }))
    );
  }
});
