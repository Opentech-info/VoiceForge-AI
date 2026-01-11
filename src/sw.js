/* ============================================
   SERVICE WORKER - OFFLINE FUNCTIONALITY
   ============================================ */

const CACHE_NAME = "voiceforge-v1";
const urlsToCache = [
  "/",
  "/index.html",
  "/styles/main.css",
  "/styles/components.css",
  "/styles/responsive.css",
  "/js/utils.js",
  "/js/audio-engine.js",
  "/js/ui-controller.js",
  "/js/app.js",
  "/js/i18n.js",
  "/i18n/en.json",
  "/i18n/sw.json",
  "/favicon.ico",
  "/.well-known/appspecific/com.chrome.devtools.json",
];

// Install event - cache assets
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(urlsToCache).catch((err) => {
        console.warn("Cache addAll failed:", err);
        // Don't fail installation if some assets are missing
        return Promise.resolve();
      });
    })
  );
  self.skipWaiting();
});

// Activate event - clean old caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch event - serve from cache, fallback to network
self.addEventListener("fetch", (event) => {
  // Skip non-GET requests
  if (event.request.method !== "GET") {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((response) => {
      if (response) {
        return response;
      }

      return fetch(event.request)
        .then((response) => {
          // Don't cache non-successful responses
          if (
            !response ||
            response.status !== 200 ||
            response.type === "error"
          ) {
            return response;
          }

          // Clone the response
          const responseToCache = response.clone();

          // Cache GET requests
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });

          return response;
        })
        .catch(() => {
          // Return offline page or cached asset
          return caches.match("/index.html");
        });
    })
  );
});
