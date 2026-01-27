// FiestApp Service Worker v4
const CACHE_NAME = 'fiestapp-v4';
const OFFLINE_URL = '/offline';

// Assets to cache immediately (critical for app shell)
const PRECACHE_ASSETS = [
  '/',
  '/offline',
  '/manifest.json',
  '/images/icons/fiestapp-logo.svg',
  '/images/icons/web-app-manifest-192x192.png',
  '/images/icons/web-app-manifest-512x512.png',
];

// Static asset patterns that use cache-first strategy
const CACHE_FIRST_PATTERNS = [
  /\/_next\/static\//,      // Next.js static assets
  /\/images\//,             // Images
  /\/fonts\//,              // Fonts
  /\.(?:png|jpg|jpeg|svg|gif|webp|ico)$/i,  // Image files
  /\.(?:woff|woff2|ttf|otf)$/i,              // Font files
  /\.(?:css|js)$/i,         // CSS and JS bundles (versioned by Next.js)
];

// Install event - precache assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] Precaching app shell');
      return cache.addAll(PRECACHE_ASSETS);
    })
  );
  self.skipWaiting();
});

// Activate event - cleanup old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name.startsWith('fiestapp-') && name !== CACHE_NAME)
          .map((name) => {
            console.log('[SW] Deleting old cache:', name);
            return caches.delete(name);
          })
      );
    })
  );
  self.clients.claim();
});

// Check if request should use cache-first strategy
function shouldCacheFirst(url) {
  return CACHE_FIRST_PATTERNS.some((pattern) => pattern.test(url));
}

// Fetch event - smart caching strategies
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') return;

  // Skip cross-origin requests (except for CDN assets)
  if (url.origin !== self.location.origin) {
    // Allow caching for common CDNs
    if (!url.hostname.includes('cloudinary') &&
        !url.hostname.includes('googleapis') &&
        !url.hostname.includes('gstatic')) {
      return;
    }
  }

  // Skip API requests (always go to network)
  if (url.pathname.includes('/api/')) return;

  // Skip WebSocket upgrade requests
  if (request.headers.get('upgrade') === 'websocket') return;

  // Strategy selection based on request type
  if (shouldCacheFirst(url.href)) {
    // Cache-first for static assets
    event.respondWith(cacheFirst(request));
  } else if (request.mode === 'navigate') {
    // Network-first for navigation (HTML pages)
    event.respondWith(networkFirstNavigation(request));
  } else {
    // Stale-while-revalidate for other requests
    event.respondWith(staleWhileRevalidate(request));
  }
});

// Cache-first strategy: best for static, versioned assets
async function cacheFirst(request) {
  const cachedResponse = await caches.match(request);
  if (cachedResponse) {
    return cachedResponse;
  }

  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch {
    // Return a placeholder for images if offline
    if (request.url.match(/\.(png|jpg|jpeg|gif|webp|svg)$/i)) {
      return new Response(
        '<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100"><rect fill="#f3f4f6" width="100" height="100"/><text x="50" y="55" text-anchor="middle" fill="#9ca3af" font-size="12">Offline</text></svg>',
        { headers: { 'Content-Type': 'image/svg+xml' } }
      );
    }
    return new Response('Offline', { status: 503 });
  }
}

// Network-first strategy for navigation
async function networkFirstNavigation(request) {
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch {
    // Try cache
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    // Fallback to offline page
    return caches.match(OFFLINE_URL);
  }
}

// Stale-while-revalidate: return cache immediately, update in background
async function staleWhileRevalidate(request) {
  const cachedResponse = await caches.match(request);

  // Start the network fetch in background
  const fetchPromise = fetch(request)
    .then(async (networkResponse) => {
      if (networkResponse.ok) {
        // Clone BEFORE using the response for anything else
        const responseToCache = networkResponse.clone();
        const cache = await caches.open(CACHE_NAME);
        await cache.put(request, responseToCache);
      }
      return networkResponse;
    })
    .catch(() => {
      // Return cached response if network fails
      return cachedResponse || new Response('Offline', { status: 503 });
    });

  // If we have a cached response, return it immediately
  // The fetch will update the cache in the background
  if (cachedResponse) {
    // Still run fetch in background to update cache, but don't wait for it
    fetchPromise.catch(() => {}); // Prevent unhandled promise rejection
    return cachedResponse;
  }

  // No cached response, wait for network
  return fetchPromise;
}

// Handle push notifications
self.addEventListener('push', (event) => {
  if (!event.data) return;

  let data;
  try {
    data = event.data.json();
  } catch {
    data = { title: 'FiestApp', body: event.data.text() };
  }

  const options = {
    body: data.body || data.message,
    icon: '/images/icons/web-app-manifest-192x192.png',
    badge: '/images/icons/favicon-96x96.png',
    vibrate: [100, 50, 100],
    tag: data.tag || 'fiestapp-notification',
    renotify: true,
    data: {
      url: data.url || data.data?.url || '/',
      notificationId: data.id,
    },
    actions: data.actions || [],
  };

  event.waitUntil(
    self.registration.showNotification(data.title || 'FiestApp', options)
  );
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const url = event.notification.data?.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // If there's already a window open at the URL, focus it
      for (const client of clientList) {
        if (client.url.includes(url) && 'focus' in client) {
          return client.focus();
        }
      }
      // Try to focus any existing window
      for (const client of clientList) {
        if ('focus' in client && 'navigate' in client) {
          client.focus();
          return client.navigate(url);
        }
      }
      // Otherwise, open a new window
      if (clients.openWindow) {
        return clients.openWindow(url);
      }
    })
  );
});

// Handle notification close
self.addEventListener('notificationclose', (event) => {
  // Could track analytics here
  console.log('[SW] Notification closed:', event.notification.tag);
});

// Background sync (for future offline message sending)
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-messages') {
    event.waitUntil(syncMessages());
  }
});

async function syncMessages() {
  // Future implementation for syncing offline messages
  console.log('[SW] Background sync triggered');
}

// Periodic background sync (for keeping content fresh)
self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'refresh-content') {
    event.waitUntil(refreshContent());
  }
});

async function refreshContent() {
  // Future implementation for refreshing cached content
  console.log('[SW] Periodic sync triggered');
}
