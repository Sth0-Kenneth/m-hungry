const CACHE = "foodtrack-shell-v2";

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.add("/offline"))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key.startsWith("foodtrack-shell-") && key !== CACHE)
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  // Never intercept private APIs, Next.js assets, or ordinary subresource
  // requests. The PWA fallback is only for top-level page navigation.
  if (event.request.mode !== "navigate" || event.request.method !== "GET") return;

  event.respondWith(
    fetch(event.request).catch(() => caches.match("/offline")),
  );
});
