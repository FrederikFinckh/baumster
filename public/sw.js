// Minimal service worker for Baumster PWA
// Strategy: Pass-through to network (NO CACHING)
// All requests go directly to the network to avoid stale content

const CACHE_NAME = 'baumster-v1';

// Install event - just skip waiting, don't cache anything
self.addEventListener('install', (event) => {
  console.log('[Service Worker] Install event - no caching strategy');
  // Skip waiting to activate immediately
  self.skipWaiting();
});

// Activate event - clean up any old caches if they exist
self.addEventListener('activate', (event) => {
  console.log('[Service Worker] Activate event');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          // Delete any old caches to ensure fresh content
          console.log('[Service Worker] Deleting old cache:', cacheName);
          return caches.delete(cacheName);
        })
      );
    })
  );
  // Take control of all clients immediately
  return self.clients.claim();
});

// Fetch event - minimal interception for PWA compliance
self.addEventListener('fetch', (event) => {
  // Skip service worker for navigation requests (like OAuth redirects)
  // This prevents interfering with Spotify OAuth flow
  if (event.request.mode === 'navigate') {
    return; // Let browser handle navigation naturally
  }
  
  // For other requests (assets, etc.), pass through to network
  // No caching, no offline support
  event.respondWith(fetch(event.request));
});