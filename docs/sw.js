// Service worker: deja la app abrir sin internet (solo la pantalla; los datos siempre vienen del servidor).
// Cambia VERSION cada vez que subas cambios importantes.
const VERSION = 'tiendita-v2-2';
const BASE = ['./', './index.html', './manifest.json', './css/app.css?v=1',
  './js/main.js?v=1', './js/api.js', './js/config.js', './js/state.js', './js/ui.js',
  './js/views-tienda.js', './js/views-admin.js', './img/logo-192.png', './img/logo-512.png'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION)
    .then((c) => Promise.all(BASE.map((u) => fetch(u, { cache: 'reload' }).then((r) => (r.ok ? c.put(u, r) : null)).catch(() => null))))
    .then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // API y fuentes: directo a la red
  // Red primero (siempre lo mas nuevo); si no hay internet, lo guardado.
  e.respondWith(fetch(req).then((res) => {
    if (res && res.ok) { const copia = res.clone(); caches.open(VERSION).then((c) => c.put(req, copia)).catch(() => {}); }
    return res;
  }).catch(() => caches.match(req).then((r) => r || caches.match('./index.html'))));
});
