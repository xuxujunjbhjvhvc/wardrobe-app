const CACHE_NAME = 'wardrobe-v1.0.0';
const urlsToCache = ['/', '/index.html', '/css/style.css', '/js/api.js', '/js/app.js', '/manifest.json'];
self.addEventListener('install', function(event) {
  event.waitUntil(caches.open(CACHE_NAME).then(function(cache) { return cache.addAll(urlsToCache); }).catch(function() {}));
  self.skipWaiting();
});
self.addEventListener('activate', function(event) {
  event.waitUntil(caches.keys().then(function(keys) { return Promise.all(keys.filter(function(k) { return k !== CACHE_NAME; }).map(function(k) { return caches.delete(k); })); }));
  self.clients.claim();
});
self.addEventListener('fetch', function(event) {
  if (event.request.url.includes('/api/')) return;
  event.respondWith(caches.match(event.request).then(function(response) {
    if (response) return response;
    return fetch(event.request).then(function(res) {
      if (res.status === 200 && res.type === 'basic') {
        var clone = res.clone();
        caches.open(CACHE_NAME).then(function(cache) { cache.put(event.request, clone); });
      }
      return res;
    }).catch(function() { return caches.match('/index.html'); });
  }));
});