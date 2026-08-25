const CACHE_NAME = 'atlas-workspace-v1.0.0';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.svg',
  '/favicon-96x96.png',
  '/web-app-manifest-192x192.png',
  '/web-app-manifest-512x512.png',
  '/apple-touch-icon.png'
];

// Install Event - Pre-cache core application shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch((err) => {
        console.warn('PWA: Failed to cache some initial assets', err);
      });
    })
  );
  self.skipWaiting();
});

// Activate Event - Clean up obsolete caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch Event - Handle network requests with offline fallback & caching
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Ignore non-GET, Chrome extension, or external non-http schemes
  if (request.method !== 'GET' || !url.protocol.startsWith('http')) {
    return;
  }

  // Handle SPA navigation requests (network-first, falling back to cached shell)
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response && response.status === 200) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          }
          return response;
        })
        .catch(async () => {
          const cached = await caches.match(request);
          if (cached) return cached;
          const fallback = await caches.match('/index.html') || await caches.match('/');
          if (fallback) return fallback;
          return new Response('Offline - Atlas Workspace', {
            status: 200,
            headers: { 'Content-Type': 'text/html; charset=utf-8' }
          });
        })
    );
    return;
  }

  // Static Assets (JS, CSS, images, icons, fonts) - Stale While Revalidate
  const isStaticAsset = (
    url.origin === self.location.origin &&
    (url.pathname.startsWith('/assets/') ||
     url.pathname.match(/\.(js|css|png|jpg|jpeg|svg|webp|woff|woff2|ttf|ico|json)$/i))
  );

  if (isStaticAsset) {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        const fetchPromise = fetch(request)
          .then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              const copy = networkResponse.clone();
              caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
            }
            return networkResponse;
          })
          .catch(() => cachedResponse);

        return cachedResponse || fetchPromise;
      })
    );
    return;
  }

  // Default network with cache fallback
  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response && response.status === 200 && url.origin === self.location.origin) {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
        }
        return response;
      })
      .catch(() => caches.match(request))
  );
});

// Listen for message events (e.g. manual skipWaiting)
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
