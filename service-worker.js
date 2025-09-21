const CACHE_NAME = "kritere-pwa-cache-v1";

const OFFLINE_URLS = [
  "https://www.kritere.com/",
  "https://www.kritere.com/2025/06/guarda-50-canali-tv-italiani-gratis.html",
  "https://johngrischam.github.io/kritere-pwa/icons/icon-72x72.png",
  "https://johngrischam.github.io/kritere-pwa/icons/icon-128x128.png",
  "https://johngrischam.github.io/kritere-pwa/icons/icon-144x144.png",
  "https://johngrischam.github.io/kritere-pwa/icons/icon-192x192.png",
  "https://johngrischam.github.io/kritere-pwa/icons/icon-512x512.png"
];

// Install event: cache offline URLs
self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(OFFLINE_URLS);
    })
  );
  self.skipWaiting();
});

// Activate event: clean old caches
self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

// Fetch event: cache-first, fallback network, fallback offline
self.addEventListener("fetch", event => {
  event.respondWith(
    caches.match(event.request).then(cachedResponse => {
      if (cachedResponse) {
        return cachedResponse;
      }

      return fetch(event.request)
        .then(networkResponse => {
          // Only cache successful GET requests
          if (event.request.method === "GET" && networkResponse.ok) {
            caches.open(CACHE_NAME).then(cache => {
              cache.put(event.request, networkResponse.clone());
            });
          }
          return networkResponse;
        })
        .catch(() => {
          // Fallback to cached offline page(s)
          return (
            caches.match(OFFLINE_URLS[1]) || caches.match(OFFLINE_URLS[0])
          );
        });
    })
  );
});
