// Transitional worker delivered at the existing scoped worker URL after cutover.
self.addEventListener('install', event => event.waitUntil(self.skipWaiting()));
self.addEventListener('activate', event => event.waitUntil((async () => {
  const keys = await caches.keys();
  await Promise.all(keys.filter(key => key.startsWith('ict-futures-shell-')).map(key => caches.delete(key)));
  await self.clients.claim();
  await self.registration.unregister();
})()));
