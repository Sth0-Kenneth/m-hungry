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

self.addEventListener("push", (event) => {
  let payload = {};
  try { payload = event.data?.json() ?? {}; } catch { payload = { notification: { title: "mHungry", body: event.data?.text() } }; }
  const notification = payload.notification ?? payload.data ?? {};
  event.waitUntil(self.registration.showNotification(notification.title ?? "mHungry", {
    body: notification.body ?? "You have a food expiration reminder.",
    icon: "/icon.svg",
    badge: "/icon.svg",
    data: { url: payload.fcmOptions?.link ?? payload.data?.url ?? "/dashboard" },
  }));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(self.clients.openWindow(event.notification.data?.url ?? "/dashboard"));
});
