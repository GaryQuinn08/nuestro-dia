/* Nuestro Día — service worker mínimo.
   Red primero: si hay internet, siempre se baja la versión más nueva de la página
   (así no se queda una copia vieja). Sin internet, abre la última copia guardada.
   Firebase, fuentes y las APIs de búsqueda van directo a la red, no se guardan aquí. */
const CACHE = 'nuestro-dia-v2';
const SHELL = [
  './', 'index.html', 'style.css', 'app.js', 'manifest.json',
  'icons/icon-192.png', 'icons/icon-512.png', 'icons/apple-touch-icon.png',
  'icons/notas-192.png', 'icons/fotos-192.png', 'icons/badge-96.png'
];

self.addEventListener('install', function (e) {
  e.waitUntil(
    caches.open(CACHE).then(function (c) { return c.addAll(SHELL); }).then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys()
      .then(function (keys) { return Promise.all(keys.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); })); })
      .then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET') return;
  if (new URL(req.url).origin !== self.location.origin) return;

  e.respondWith(
    fetch(req.url, { cache: 'no-cache' })
      .then(function (res) {
        if (res && res.ok) {
          var copy = res.clone();
          caches.open(CACHE).then(function (c) { c.put(req, copy); });
        }
        return res;
      })
      .catch(function () {
        return caches.match(req, { ignoreSearch: true }).then(function (hit) {
          return hit || (req.mode === 'navigate' ? caches.match('index.html') : Response.error());
        });
      })
  );
});

/* ---------- Avisos push ---------- */
self.addEventListener('push', function (e) {
  var j = {};
  try { j = e.data ? e.data.json() : {}; } catch (err) {}
  var d = j.data || j.notification || j;
  var title = d.title || 'Nuestro Día';
  e.waitUntil(self.registration.showNotification(title, {
    body: d.body || '',
    icon: 'icons/icon-192.png',
    badge: 'icons/badge-96.png',
    tag: d.tag || undefined,
    data: { tab: d.tab || '', sub: d.sub || '' }
  }));
});

self.addEventListener('notificationclick', function (e) {
  e.notification.close();
  var d = e.notification.data || {};
  var qs = d.tab ? '?tab=' + encodeURIComponent(d.tab) + (d.sub ? '&sub=' + encodeURIComponent(d.sub) : '') : '';
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (list) {
    for (var i = 0; i < list.length; i++) {
      var c = list[i];
      if ('focus' in c) {
        c.postMessage({ type: 'nd-goto', tab: d.tab, sub: d.sub });
        return c.focus();
      }
    }
    return self.clients.openWindow('./' + qs);
  }));
});
