const CACHE_NAME = 'manageme-v5';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/index.css',
  '/manifest.json',
  'https://cdn.tailwindcss.com',
  'https://fonts.googleapis.com/css2?family=Hind+Siliguri:wght@300;400;500;600;700&display=swap'
];

// Detect if we are in development/preview mode
const isDev = 
  self.location.hostname === 'localhost' || 
  self.location.hostname === '127.0.0.1' || 
  self.location.hostname.includes('-dev-') || 
  self.location.hostname.includes('-pre-');

// Install Event - Pre-cache essential assets resiliently
self.addEventListener('install', (event) => {
  if (isDev) {
    console.log('Service Worker: Bypass install in development mode.');
    self.skipWaiting();
    return;
  }
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('Pre-caching assets in background...');
      const cachePromises = ASSETS_TO_CACHE.map((asset) => {
        return cache.add(asset).catch((err) => {
          console.warn(`Pre-cache failed for asset: ${asset}. Service Worker will still continue.`, err);
        });
      });
      return Promise.all(cachePromises);
    })
  );
  self.skipWaiting();
});

// Activate Event - Clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME || isDev) {
            console.log('Deleting cache:', cache);
            return caches.delete(cache);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch Event - Stale-While-Revalidate with resilient fallbacks
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  // CRITICAL: Always bypass caching entirely in development/preview modes
  if (isDev) {
    return; // Let browser handle normally
  }

  const url = new URL(event.request.url);

  // CRITICAL: NEVER cache Supabase API calls. Always go to network.
  if (url.hostname.includes('supabase.co')) {
    event.respondWith(fetch(event.request));
    return;
  }

  // Bypass chrome-extension or other non-http schemes
  if (!event.request.url.startsWith('http')) return;

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      const fetchPromise = fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse.status === 200 || networkResponse.status === 0) {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseClone);
            });
          }
          return networkResponse;
        })
        .catch(() => {
          // If we are completely offline and network fetch fails, we return cachedResponse if present
          if (cachedResponse) {
            return cachedResponse;
          }
          // If no cache and it's navigation, return fallback index routing
          if (event.request.mode === 'navigate') {
            return caches.match('/');
          }
        });

      // Serve from cache immediately if available, otherwise fetch from network
      return cachedResponse || fetchPromise;
    })
  );
});

