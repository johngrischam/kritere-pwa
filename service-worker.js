const CACHE_NAME = "kritere-pwa-cache-v1";
const OFFLINE_URLS = [
  "https://www.kritere.com/p/pwa.html"
];

// Install
self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(OFFLINE_URLS);
    })
  );
  self.skipWaiting();
});

// Fetch
self.addEventListener("fetch", event => {
  const requestURL = new URL(event.request.url);

  // Only cache /p/ pages
  if (requestURL.pathname.startsWith("/p/")) {
    event.respondWith(
      caches.match(event.request).then(response => {
        return response || fetch(event.request).then(networkResponse => {
          return caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, networkResponse.clone());
            return networkResponse;
          });
        }).catch(() => caches.match(OFFLINE_URLS[0]));
      })
    );
  }
});
