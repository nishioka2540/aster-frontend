// Retire the previously installed PWA worker. Keep this URL available for
// existing clients; the application no longer registers a service worker.
self.addEventListener('install', () => {
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil((async () => {
        const names = await caches.keys();
        await Promise.all(names
            .filter((name) => name.startsWith('workbox-precache-') && name.endsWith(self.registration.scope))
            .map((name) => caches.delete(name)));
        await self.registration.unregister();
    })());
});
