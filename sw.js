/**
 * ============================================================================
 * DHARTI RAKSHAK - PWA SERVICE WORKER
 * ============================================================================
 * Enables Progressive Web App installability on Android, Windows, Mac, and iOS.
 * Implements Stale-While-Revalidate caching for fast loading and offline resilience.
 */

const CACHE_NAME = 'dharti-rakshak-v2.1';
const STATIC_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './styles/main.css',
  './js/app.js',
  './js/charts.js',
  './js/ai-insights.js',
  './js/chatbot.js',
  './js/firebase-config.js',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon.svg'
];

// Install: Cache essential assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[ServiceWorker] Caching App Shell & Core Assets');
      return cache.addAll(STATIC_ASSETS);
    }).then(() => self.skipWaiting())
  );
});

// Activate: Clean up older cache versions
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => {
          console.log('[ServiceWorker] Removing old cache version:', key);
          return caches.delete(key);
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch: Network first with cache fallback for HTML, stale-while-revalidate for assets
self.addEventListener('fetch', (event) => {
  const req = event.request;

  // Skip Firebase Realtime Database and Groq API requests (they must always be fresh)
  if (req.url.includes('firebasedatabase.app') || req.url.includes('/api/')) {
    return;
  }

  // Handle standard HTTP requests
  if (req.method === 'GET') {
    event.respondWith(
      caches.match(req).then((cachedResponse) => {
        const fetchPromise = fetch(req).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(req, responseToCache);
            });
          }
          return networkResponse;
        }).catch(() => {
          return cachedResponse;
        });

        return cachedResponse || fetchPromise;
      })
    );
  }
});
