// Minimal service worker placeholder. TODO 2: offline shell + install prompt
// if/when the storyteller app is added to the home screen.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));
