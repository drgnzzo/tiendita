/**
 * TIENDITA — Service Worker
 * Estrategia:
 *   - Estaticos (CSS, JS, SVG): cache-first con fallback a red
 *   - HTML: network-first con fallback a cache
 *   - Cache busting via CACHE_VERSION (incrementa cuando subas cambios)
 *
 * v2: filtra schemes no http(s) para no chocar con extensiones de Chrome
 *     que inyectan requests con scheme chrome-extension://
 */

const CACHE_VERSION = 'tiendita-v2';
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

  let url;
  try { url = new URL(req.url); } catch (_) { return; }

  // Solo cachear http(s). Esto descarta chrome-extension://, moz-extension://,
  // data:, blob:, etc., que el Cache API no soporta.
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return;

  // No interceptar llamadas al backend de Apps Script ni a otros origenes externos
  if (url.origin !== self.location.origin) return;

  const isHtml = (req.headers.get('accept') || '').includes('text/html');

  if (isHtml) {
    // Network-first para HTML
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE_VERSION).then((cache) => cache.put(req, copy).catch(() => {}));
          return res;
        })
        .catch(() => caches.match(req).then((r) => r || caches.match('./index.html')))
    );
  } else {
    // Cache-first para estaticos del mismo origen
    event.respondWith(
      caches.match(req).then((cached) => cached || fetch(req).then((res) => {
        // Solo cachea respuestas validas del mismo origen
        if (res && res.status === 200 && res.type === 'basic') {
          const copy = res.clone();
          caches.open(CACHE_VERSION).then((cache) => cache.put(req, copy).catch(() => {}));
        }
        return res;
      }))
    );
  }
});
