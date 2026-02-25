const CACHE_NAME = "kritere-pwa-cache-v2";
const OFFLINE_URL = "https://www.kritere.com/p/assistenza-tv.html";

const OFFLINE_ASSETS = [
  OFFLINE_URL,
  "https://johngrischam.github.io/kritere-pwa/icons/icon-72x72.png",
  "https://johngrischam.github.io/kritere-pwa/icons/icon-128x128.png",
  "https://johngrischam.github.io/kritere-pwa/icons/icon-144x144.png",
  "https://johngrischam.github.io/kritere-pwa/icons/icon-192x192.png",
  "https://johngrischam.github.io/kritere-pwa/icons/icon-512x512.png"
];

// --- INSTALL HANDLER ---
self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(OFFLINE_ASSETS);
    })
  );
  self.skipWaiting();
});

// --- ACTIVATE HANDLER ---
self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(key => key !== CACHE_NAME)
          .map(key => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

// --- FETCH HANDLER (Bypass for Worker Downloads) ---
self.addEventListener("fetch", event => {
  const request = event.request;
  const url = new URL(request.url);

  // 1. CRITICAL FIX: If the request is NOT for your domain (e.g., workers.dev), 
  // stop the Service Worker from handling it. This lets the browser take over.
  if (!url.hostname.includes("kritere.com")) {
    return; 
  }

  // 2. Skip non-GET requests and specific download paths
  if (request.method !== "GET" || url.pathname.includes("/download")) {
    return;
  }

  // 3. Special case: Cache-Only for the OFFLINE_URL
  if (request.url === OFFLINE_URL) {
    event.respondWith(caches.match(request));
    return;
  }

  // 4. Default strategy: Network-First
  event.respondWith(
    fetch(request)
      .then(response => {
        if (response && response.status === 200 && response.type === 'basic') {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(request, responseClone);
          });
        }
        return response;
      })
      .catch(() => {
        return caches.match(request)
          .then(cachedResponse => {
            return cachedResponse || caches.match(OFFLINE_URL);
          });
      })
  );
});

