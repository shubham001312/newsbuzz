// ============================================================
//  sw.js — NewsBuzz Service Worker
//  Provides offline support via Cache API + fallback page
// ============================================================

const CACHE_NAME = 'newsbuzz-v1';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/about.html',
  '/privacy.html',
  '/offline.html',
  '/css/theme.css',
  '/css/main.css',
  '/css/cards.css',
  '/css/modal.css',
  '/js/config.js',
  '/js/firebase.js',
  '/js/news.js',
  '/js/lang.js',
  '/js/search.js',
  '/js/chat.js',
  '/js/openrouter.js',
  '/js/deepseek.js',
  '/manifest.json',
  '/robots.txt',
  '/sitemap.xml'
];

// ── Install: Cache all static assets ─────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] Caching static assets…');
      return cache.addAll(STATIC_ASSETS).catch((err) => {
        console.warn('[SW] Some assets failed to cache:', err.message);
      });
    })
  );
  // Activate immediately (don't wait for page reload)
  self.skipWaiting();
});

// ── Activate: Clean old caches ───────────────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => {
            console.log('[SW] Deleting old cache:', name);
            return caches.delete(name);
          })
      );
    })
  );
  // Take control of all clients immediately
  self.clients.claim();
});

// ── Fetch: Serve cached content, fallback to network ─────────
self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);

  // ── Skip non-GET requests and external URLs ────────────────
  if (request.method !== 'GET') return;
  
  // For external URLs (Firebase, wttr.in, fonts, unsplash, openrouter),
  // use network-first with cache fallback
  if (url.origin !== self.location.origin) {
    event.respondWith(networkFirstWithFallback(request));
    return;
  }

  // ── For our own static assets, use cache-first strategy ────
  // Check if this is a known static asset
  const isStatic = STATIC_ASSETS.some(
    (asset) => url.pathname === asset || url.pathname.endsWith(asset)
  );

  if (isStatic || url.pathname.match(/\.(css|js|json|xml|html|ico)$/)) {
    event.respondWith(cacheFirstWithNetworkUpdate(request));
    return;
  }

  // ── For everything else (API calls, etc.) ───────────────────
  event.respondWith(networkFirstWithFallback(request));
});

// ── Cache-First Strategy ─────────────────────────────────────
async function cacheFirstWithNetworkUpdate(request) {
  const cached = await caches.match(request);
  if (cached) {
    // Return cached version immediately, but update cache in background
    fetch(request)
      .then((response) => {
        if (response && response.ok) {
          caches.open(CACHE_NAME).then((cache) => cache.put(request, response));
        }
      })
      .catch(() => {}); // Silent fail on background update
    return cached;
  }

  // Not in cache — fetch from network
  try {
    const response = await fetch(request);
    if (response && response.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    return response;
  } catch (e) {
    // Network failed — return offline fallback for HTML requests
    if (request.headers.get('Accept')?.includes('text/html')) {
      return caches.match('/offline.html');
    }
    throw e;
  }
}

// ── Network-First Strategy ───────────────────────────────────
async function networkFirstWithFallback(request) {
  try {
    const response = await fetch(request);
    // Cache successful responses for future offline use
    if (response && response.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    return response;
  } catch (e) {
    // Network failed — try cache
    const cached = await caches.match(request);
    if (cached) return cached;

    // For HTML navigation requests, show offline page
    if (request.headers.get('Accept')?.includes('text/html')) {
      return caches.match('/offline.html');
    }

    throw e;
  }
}

// ── Listen for messages from the page ─────────────────────────
self.addEventListener('message', (event) => {
  if (event.data?.type === 'CACHE_ARTICLES') {
    const articles = event.data.articles;
    if (articles && Array.isArray(articles)) {
      // Store articles in a dedicated cache store for offline reading
      caches.open('newsbuzz-articles-v1').then((cache) => {
        const articleData = new Response(JSON.stringify(articles), {
          headers: { 'Content-Type': 'application/json' }
        });
        cache.put('/api/articles', articleData);
      }).catch(() => {});
    }
  }

  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
