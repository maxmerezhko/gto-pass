/* Запоминает страницы анкеты и пропуска в телефоне, чтобы они открывались
 * без интернета. Ничего не отправляет: только отдаёт свои файлы из кэша. */
var CACHE = 'gto-pages-v2';
var FILES = ['./', 'index.html', 'anketa.js', 'gto.js', 'qrcode.js', 'style.css',
  'manifest.webmanifest', 'p/', 'p/index.html', 'p/pass.js'];

self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(CACHE).then(function (c) { return c.addAll(FILES); }));
  self.skipWaiting();
});

self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (keys) {
    return Promise.all(keys.filter(function (k) { return k !== CACHE; })
      .map(function (k) { return caches.delete(k); }));
  }));
  self.clients.claim();
});

// Сначала сеть (свежая версия), без сети — из кэша.
self.addEventListener('fetch', function (e) {
  if (e.request.method !== 'GET' || new URL(e.request.url).origin !== location.origin) return;
  e.respondWith(fetch(e.request).then(function (r) {
    var copy = r.clone();
    caches.open(CACHE).then(function (c) { c.put(e.request, copy); });
    return r;
  }).catch(function () {
    return caches.match(e.request, { ignoreSearch: true });
  }));
});
