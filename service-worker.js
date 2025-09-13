const CACHE_NAME = "kritere-pwa-cache-v1";
const OFFLINE_URLS = [
  "https://www.kritere.com/",          
  "https://www.kritere.com/2025/06/guarda-50-canali-tv-italiani-gratis.html"
];

// Trusted domains allowed to load inside the PWA
const TRUSTED_DOMAINS = ["kritere.com", "1fakt.com", "sportzonline.site"];

// Install event: cache offline URLs
self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(OFFLINE_URLS))
  );
  self.skipWaiting();
});

// Activate event: clean old caches if needed
self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys => 
      Promise.all(keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key)))
    )
  );
  self.clients.claim();
});

// Fetch event: enforce trusted domain logic
self.addEventListener("fetch", event => {
  const requestURL = new URL(event.request.url);

  // Only handle top-level navigation (when user clicks a link or types URL)
  if (event.request.mode === "navigate") {
    const isTrusted = TRUSTED_DOMAINS.some(domain => requestURL.hostname.endsWith(domain));

    if (!isTrusted) {
      // 🚫 If not trusted → redirect to offline fallback or root
      event.respondWith(Response.redirect("https://www.kritere.com/"));
      return;
    }
  }

  // Handle caching only for kritere.com (your domain)
  if (requestURL.origin === self.location.origin) {
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


