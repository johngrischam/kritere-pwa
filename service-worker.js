const CACHE_NAME = "kritere-pwa-cache-v3";
const TRUSTED_ORIGINS = [
  "https://www.kritere.com",
  "https://1fakt.com",
  "https://sportzonline.site"
];
const OFFLINE_URLS = [
  "https://www.kritere.com/",
  "https://www.kritere.com/2025/06/guarda-50-canali-tv-italiani-gratis.html",
  "https://www.1fakt.com/p/redirect.html"
];

// Install: cache core assets
self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(OFFLINE_URLS))
  );
  self.skipWaiting();
});

// Activate: clean old caches
self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch: trusted caching + redirect untrusted navigations
self.addEventListener("fetch", event => {
  const reqUrl = new URL(event.request.url);

  // Top-level navigation
  if (event.request.mode === "navigate") {
    const isTrusted = TRUSTED_ORIGINS.some(origin => reqUrl.href.startsWith(origin + "/") || reqUrl.href === origin);
    if (isTrusted) {
      event.respondWith(
        caches.match(event.request).then(cached => {
          if (cached) return cached;
          return fetch(event.request).then(networkResponse => {
            return caches.open(CACHE_NAME).then(cache => {
              try { cache.put(event.request, networkResponse.clone()); } catch(e){}
              return networkResponse;
            });
          }).catch(() => caches.match(OFFLINE_URLS[1]));
        })
      );
      return;
    } else {
      // Untrusted navigation → redirect through intermediate page
      const redirectUrl = new URL('/p/redirect.html', self.location.origin);
      redirectUrl.searchParams.set('to', reqUrl.href);
      event.respondWith(Response.redirect(redirectUrl.href));
      return;
    }
  }

  // Subresources
  if (reqUrl.origin === location.origin) {
    event.respondWith(
      caches.match(event.request).then(cached => {
        if (cached) return cached;
        return fetch(event.request).then(networkResponse => {
          return caches.open(CACHE_NAME).then(cache => {
            try { cache.put(event.request, networkResponse.clone()); } catch(e){}
            return networkResponse;
          });
        }).catch(() => caches.match(OFFLINE_URLS[1]));
      })
    );
  } else {
    // Cross-origin subresources → default network fetch
    return;
  }
});





