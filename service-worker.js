const CACHE_NAME = "kritere-pwa-cache-v1";

const OFFLINE_URLS = [
  "https://www.kritere.com/", // root page
  "https://www.kritere.com/2025/06/guarda-50-canali-tv-italiani-gratis.html" // main PWA page
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
  const requestURL = new URL(event.request.url);

  // Only handle requests on our origin (https://www.kritere.com)
  if (requestURL.origin === self.location.origin) {
    event.respondWith(
      caches.match(event.request).then(cachedResponse => {
        if (cachedResponse) {
          return cachedResponse;
        }

        return fetch(event.request)
          .then(networkResponse => {
            // Only cache GET requests
            if (event.request.method === "GET") {
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
  }
});
