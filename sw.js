/* Finance Intelligence OS - public offline application shell. */
const CACHE_PREFIX = 'fios-shell-';
const CACHE_NAME = CACHE_PREFIX + 'v1.1.0-public-shell';
const BASE_PATH = new URL('./', self.registration.scope).pathname;
const HOME = BASE_PATH + 'index.html';
const NAVIGATION_PATHS = [BASE_PATH, HOME];
const ASSET_PATHS = ['manifest.webmanifest', 'icon.svg', 'resources.json'].map(name => BASE_PATH + name);

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    await Promise.all([HOME, ...ASSET_PATHS].map(async path => {
      try {
        const response = await fetch(path, { cache: 'reload', credentials: 'omit', redirect: 'error' });
        if (response.ok) await cache.put(path, response);
      } catch (_) { /* Offline support is best effort at install time. */ }
    }));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(key => key.startsWith(CACHE_PREFIX) && key !== CACHE_NAME).map(key => caches.delete(key)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', event => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== self.location.origin || url.search) return;
  if (request.mode === 'navigate' && NAVIGATION_PATHS.includes(url.pathname)) {
    event.respondWith(fetch(request).catch(async () => {
      const cache = await caches.open(CACHE_NAME);
      return await cache.match(HOME) || Response.error();
    }));
  } else if (ASSET_PATHS.includes(url.pathname)) {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE_NAME);
      return await cache.match(url.pathname) || fetch(request);
    })());
  }
});

