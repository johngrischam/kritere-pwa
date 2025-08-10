const CACHE_NAME = "kritere-pwa-cache-v1";
const OFFLINE_URLS = [
  "https://www.kritere.com/",          // root page to cache
  "https://www.kritere.com/p/pwa.html" // your main PWA page
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

// Activate event: clean old caches if needed (optional best practice)
self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.filter(key => key !== CACHE_NAME)
            .map(key => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

// Fetch event: respond with cache, fallback to network, fallback offline page
self.addEventListener("fetch", event => {
  const requestURL = new URL(event.request.url);

  // Only handle requests on our origin (kritere.com)
  if (requestURL.origin === self.location.origin) {
    event.respondWith(
      caches.match(event.request).then(cachedResponse => {
        if (cachedResponse) {
          return cachedResponse;
        }
        return fetch(event.request).then(networkResponse => {
          // Cache the fetched response for future
          return caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, networkResponse.clone());
            return networkResponse;
          });
        }).catch(() => {
          // On failure (offline), fallback to your offline PWA page
          return caches.match(OFFLINE_URLS[1]);
        });
      })
    );
  }
});
