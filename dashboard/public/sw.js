const APP_SHELL_CACHE = 'rv-app-shell-v1';
const DATA_CACHE = 'rv-data-v1';
const MAP_CACHE = 'rv-map-tiles-v1';
const FONT_CACHE = 'rv-fonts-v1';

const CURRENT_CACHES = [APP_SHELL_CACHE, DATA_CACHE, MAP_CACHE, FONT_CACHE];

const MAP_TILE_LIMIT = 2000;

const PRECACHE_URLS = [
  '/',
  '/today',
  '/map',
  '/checklist',
  '/budget',
  '/documents',
  '/weather',
  '/journal',
  '/commander',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(APP_SHELL_CACHE).then((cache) =>
      cache.addAll(PRECACHE_URLS).catch(() => {
        // Pages may not exist at build time in dev; ignore failures
      })
    )
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => !CURRENT_CACHES.includes(k) && k !== 'rv-tickets-v1')
          .map((k) => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

function isNavigationRequest(request) {
  return request.mode === 'navigate';
}

function isMapTile(url) {
  return url.hostname.includes('tile.openstreetmap.org');
}

function isFont(url) {
  return (
    url.hostname.includes('fonts.googleapis.com') ||
    url.hostname.includes('fonts.gstatic.com')
  );
}

function isSupabaseAPI(url) {
  return url.hostname.includes('supabase.co') && url.pathname.includes('/rest/');
}

function isWeatherAPI(url) {
  return url.hostname.includes('api.open-meteo.com');
}

function isExchangeAPI(url) {
  return url.hostname.includes('api.frankfurter.app');
}

function isDataAPI(url) {
  return isSupabaseAPI(url) || isWeatherAPI(url) || isExchangeAPI(url);
}

function isStaticAsset(url) {
  const ext = url.pathname.split('.').pop();
  return ['js', 'css', 'svg', 'png', 'jpg', 'jpeg', 'webp', 'ico', 'woff', 'woff2'].includes(ext);
}

// Network-first: try network, fall back to cache
async function networkFirst(request, cacheName) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await caches.match(request);
    if (cached) return cached;
    return new Response('Offline', { status: 503, statusText: 'Service Unavailable' });
  }
}

// Cache-first: try cache, fall back to network
async function cacheFirst(request, cacheName) {
  const cached = await caches.match(request);
  if (cached) return cached;

  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());

      if (cacheName === MAP_CACHE) {
        trimCache(MAP_CACHE, MAP_TILE_LIMIT);
      }
    }
    return response;
  } catch {
    return new Response('Offline', { status: 503, statusText: 'Service Unavailable' });
  }
}

// Stale-while-revalidate: return cache immediately, update in background
async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);

  const fetchPromise = fetch(request)
    .then((response) => {
      if (response.ok) cache.put(request, response.clone());
      return response;
    })
    .catch(() => cached);

  return cached || fetchPromise;
}

async function trimCache(cacheName, maxItems) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  if (keys.length > maxItems) {
    await cache.delete(keys[0]);
    trimCache(cacheName, maxItems);
  }
}

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Skip non-GET requests
  if (event.request.method !== 'GET') return;

  // Skip chrome-extension and other non-http(s) schemes
  if (!url.protocol.startsWith('http')) return;

  // Navigation requests: network-first with app shell fallback
  if (isNavigationRequest(event.request)) {
    event.respondWith(
      networkFirst(event.request, APP_SHELL_CACHE)
    );
    return;
  }

  // Map tiles: cache-first (tiles rarely change)
  if (isMapTile(url)) {
    event.respondWith(cacheFirst(event.request, MAP_CACHE));
    return;
  }

  // Fonts: cache-first (immutable)
  if (isFont(url)) {
    event.respondWith(cacheFirst(event.request, FONT_CACHE));
    return;
  }

  // Supabase / Weather / Exchange rate APIs: network-first
  if (isDataAPI(url)) {
    event.respondWith(networkFirst(event.request, DATA_CACHE));
    return;
  }

  // Static assets (_next/static, images, etc.): stale-while-revalidate
  if (isStaticAsset(url)) {
    event.respondWith(staleWhileRevalidate(event.request, APP_SHELL_CACHE));
    return;
  }
});
