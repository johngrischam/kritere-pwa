const CACHE_NAME = "kritere-pwa-cache-v2";
const OFFLINE_URLS = [
  "https://www.kritere.com/",
  "https://www.kritere.com/2025/06/guarda-50-canali-tv-italiani-gratis.html"
];

// Trusted domains allowed inside the PWA
const TRUSTED_DOMAINS = ["kritere.com", "1fakt.com", "sportzonline.site"];

// Install event: cache offline URLs
self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(OFFLINE_URLS))
  );
  self.skipWaiting();
});

// Activate event: clean old caches
self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key)))
    )
  );
  self.clients.claim();
});

// Fetch event: handle trusted domains, block about:blank
self.addEventListener("fetch", event => {
  const url = new URL(event.request.url);

  // 🚫 Block about:blank navigations
  if (url.protocol === "about:") {
    event.respondWith(new Response("", { status: 204 })); // Empty response
    return;
  }

  // Only enforce trusted domains for navigation requests
  if (event.request.mode === "navigate") {
    const isTrusted = TRUSTED_DOMAINS.some(domain => url.hostname.endsWith(domain));

    if (!isTrusted) {
      // Redirect untrusted navigation back to kritere home
      event.respondWith(Response.redirect("https://www.kritere.com/"));
      return;
    }
  }

  // Handle caching only for kritere.com (your origin)
  if (url.origin === self.location.origin) {
    event.respondWith(
      caches.match(event.request).then(cachedResponse => {
        if (cachedResponse) {
          return cachedResponse;
        }
        return fetch(event.request).then(networkResponse => {
          return caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, networkResponse.clone());
            return networkResponse;
          });
        }).catch(() => caches.match(OFFLINE_URLS[1]));
      })
    );
  }
});



