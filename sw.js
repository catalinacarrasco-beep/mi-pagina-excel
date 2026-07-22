// Kill-switch service worker.
// Replaces the previous pass-through SW that interfered with fresh HTML delivery
// (it served the embedded dashboard data from the HTTP cache, so updates reverted).
// On activation it clears all caches and unregisters itself, then reloads open tabs
// so every client loads fresh HTML straight from the network / Vercel revalidation.
self.addEventListener('install', function () { self.skipWaiting(); });
self.addEventListener('activate', function (e) {
  e.waitUntil((async function () {
    try {
      var keys = await caches.keys();
      await Promise.all(keys.map(function (k) { return caches.delete(k); }));
    } catch (_) {}
    try { await self.registration.unregister(); } catch (_) {}
    try {
      var cs = await self.clients.matchAll({ type: 'window' });
      cs.forEach(function (c) { c.navigate(c.url); });
    } catch (_) {}
  })());
});
