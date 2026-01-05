
const CACHE_NAME = 'xeroxyt-cache-v10';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/styles.css',
  '/icon.svg',
  '/manifest.json'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        return cache.addAll(ASSETS_TO_CACHE);
      })
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // 1. API Requests: Network Only
  // Do not cache API responses in SW; they are handled by application logic (localStorage/indexedDB) if needed.
  if (url.pathname.startsWith('/api/')) {
    return;
  }

  // 2. Static Assets (JS, CSS, Images, Fonts, JSON): Cache First
  // This aggressively caches scripts and styles to satisfy "Js,cssをデバイスに保存させて"
  if (url.pathname.match(/\.(js|css|png|jpg|jpeg|svg|json|woff2?|ttf|ico)$/)) {
    event.respondWith(
      caches.match(event.request).then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }
        return fetch(event.request).then((networkResponse) => {
          if (!networkResponse || networkResponse.status !== 200 || (networkResponse.type !== 'basic' && networkResponse.type !== 'cors')) {
            return networkResponse;
          }
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
          return networkResponse;
        }).catch((err) => {
           console.log('Fetch failed for static asset:', url.href, err);
           // Optional: Return a placeholder image if it's an image request
           return new Response('', { status: 404, statusText: 'Offline' });
        });
      })
    );
    return;
  }

  // 3. Navigation Requests (HTML): Network First -> Fallback to Cache
  // Ensure we try to get the latest index.html, but fall back to cached version for offline.
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
            const responseToCache = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
                cache.put(event.request, responseToCache);
            });
            return response;
        })
        .catch(() => {
          return caches.match('/index.html')
            .then(response => response || caches.match('/'));
        })
    );
    return;
  }

  // 4. Default Fallback: Stale-While-Revalidate
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      const fetchPromise = fetch(event.request).then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
                cache.put(event.request, responseToCache);
            });
        }
        return networkResponse;
      });
      return cachedResponse || fetchPromise;
    })
  );
});
