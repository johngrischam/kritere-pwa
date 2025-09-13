const CACHE_NAME = "kritere-pwa-cache-v4";
const TRUSTED_ORIGINS = [
  "https://www.kritere.com",
  "https://1fakt.com",
  "https://sportzonline.site"
];
const OFFLINE_URLS = [
  "https://www.1fakt.com/",
  "https://www.1fakt.com/p/redirect.html"
];
const REDIRECT_PATH = "/p/redirect.html?to=";

// Install: cache core assets
self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(OFFLINE_URLS))
  );
  self.skipWaiting();
});

// Activate: clean up old caches
self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch: intercept requests
self.addEventListener("fetch", event => {
  const reqUrl = new URL(event.request.url);

  // Handle navigation requests (top-level)
  if (event.request.mode === "navigate") {
    const isTrusted = TRUSTED_ORIGINS.some(origin =>
      reqUrl.href === origin || reqUrl.href.startsWith(origin + "/")
    );

    if (isTrusted) {
      // Serve from cache if available, otherwise fetch from network
      event.respondWith(
        caches.match(event.request).then(cached => {
          if (cached) return cached;
          return fetch(event.request).then(networkResp => {
            return caches.open(CACHE_NAME).then(cache => {
              try { cache.put(event.request, networkResp.clone()); } catch(e){}
              return networkResp;
            });
          }).catch(() => caches.match(OFFLINE_URLS[0]));
        })
      );
    } else {
      // Untrusted navigation -> route to intermediate redirect page
      const redirectUrl = new URL(REDIRECT_PATH, self.location.origin);
      redirectUrl.searchParams.set('to', reqUrl.href);
      event.respondWith(Response.redirect(redirectUrl.href));
    }
    return;
  }

  // Handle subresource requests
  if (reqUrl.origin === location.origin) {
    event.respondWith(
      caches.match(event.request).then(cached => {
        if (cached) return cached;
        return fetch(event.request).then(networkResp => {
          return caches.open(CACHE_NAME).then(cache => {
            try { cache.put(event.request, networkResp.clone()); } catch(e){}
            return networkResp;
          });
        }).catch(() => caches.match(OFFLINE_URLS[0]));
      })
    );
  } else {
    // Cross-origin resources: fetch normally
    return;
  }
});







