/**
 * TIENDITA — Service Worker v5
 * Tolerante a fallos: si un asset falla, no rompe el install.
 */

const CACHE_VERSION = 'tiendita-v10';
const ASSETS = [
  './',
  './index.html',
  './catalogo.html',
  './perfil.html',
  './admin.html',
  './styles.css?v=9',
  './api.js?v=9',
  './app.js?v=9',
  './logo.png', './logo-192.png', './logo-512.png',
  './manifest.json'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) =>
      // Cachear uno por uno: si uno falla, los demás siguen.
      Promise.all(ASSETS.map((url) =>
        fetch(url, { cache: 'reload' })
          .then((res) => (res && res.ok ? cache.put(url, res) : null))
          .catch(() => null)
      ))
    ).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((names) => Promise.all(names.filter((n) => n !== CACHE_VERSION).map((n) => caches.delete(n))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  let url;
  try { url = new URL(req.url); } catch (_) { return; }

  if (url.protocol !== 'http:' && url.protocol !== 'https:') return;
  if (url.origin !== self.location.origin) return;

  const isHtml = (req.headers.get('accept') || '').includes('text/html');

  if (isHtml) {
    // HTML: network-first (siempre intenta lo mas fresco)
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE_VERSION).then((c) => c.put(req, copy).catch(() => {}));
          return res;
        })
        .catch(() => caches.match(req).then((r) => r || caches.match('./index.html')))
    );
  } else {
    // Estaticos: cache-first
    event.respondWith(
      caches.match(req).then((cached) => cached || fetch(req).then((res) => {
        if (res && res.status === 200 && res.type === 'basic') {
          const copy = res.clone();
          caches.open(CACHE_VERSION).then((c) => c.put(req, copy).catch(() => {}));
        }
        return res;
      }))
    );
  }
});
