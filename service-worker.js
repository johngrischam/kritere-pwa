const CACHE_NAME = "kritere-pwa-cache-v1";
const OFFLINE_URL = "https://www.kritere.com/p/assistenza-tv.html";

// Assets that are crucial for the offline page and PWA shell, which are pre-cached.
const OFFLINE_ASSETS = [
  OFFLINE_URL,
  "https://johngrischam.github.io/kritere-pwa/icons/icon-72x72.png",
  "https://johngrischam.github.io/kritere-pwa/icons/icon-128x128.png",
  "https://johngrischam.github.io/kritere-pwa/icons/icon-144x144.png",
  "https://johngrischam.github.io/kritere-pwa/icons/icon-192x192.png",
  "https://johngrischam.github.io/kritere-pwa/icons/icon-512x512.png"
];

// --- INSTALL HANDLER (Pre-caching Core Assets) ---
self.addEventListener("install", event => {
  console.log('[Service Worker] Install event: Pre-caching core assets.');
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      // Add all core assets to the cache
      return cache.addAll(OFFLINE_ASSETS);
    })
  );
  // Force the waiting service worker to become the active service worker immediately
  self.skipWaiting();
});

// --- ACTIVATE HANDLER (Cleaning Old Caches) ---
self.addEventListener("activate", event => {
  console.log('[Service Worker] Activate event: Cleaning old caches.');
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        // Filter out the current cache and delete all others
        keys.filter(key => key !== CACHE_NAME)
          .map(key => caches.delete(key))
      )
    )
  );
  // Take control of uncontrolled clients (tabs) immediately
  self.clients.claim();
});

// --- FETCH HANDLER (Network-First Strategy) ---
self.addEventListener("fetch", event => {
  const request = event.request;

  // 1. Only handle GET requests and skip cross-origin requests for navigation
  if (request.method !== "GET" || !request.url.startsWith(self.location.origin)) {
    return;
  }

  // 2. Special case: Cache-Only for the OFFLINE_URL (it's already cached)
  if (request.url === OFFLINE_URL) {
    event.respondWith(caches.match(request));
    return;
  }

  // 3. Default strategy: Network-First, then Cache, then Offline Fallback
  event.respondWith(
    fetch(request)
      .then(response => {
        // Network was successful. We can return the response.
        // Optional: Cache successful network responses here for future offline use.
        if (response && response.status === 200 && response.type === 'basic') {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(request, responseClone);
          });
        }
        return response;
      })
      .catch(() => {
        // Network failed (user is offline or server is down)

        // a) Try to find the requested resource in the cache
        return caches.match(request)
          .then(cachedResponse => {
            // b) If found, return the cached version
            if (cachedResponse) {
              return cachedResponse;
            }

            // c) If not found in cache, fall back to the generic offline page
            return caches.match(OFFLINE_URL);
          });
      })
  );
});
