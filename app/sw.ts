import type { PrecacheEntry, SerwistGlobalConfig } from "serwist";
import { CacheFirst, Serwist } from "serwist";
import { ExpirationPlugin } from "serwist";

// This declares the value of `injectionPoint` to TypeScript.
// `injectionPoint` is the string that will be replaced by the
// actual precache manifest. By default, this string is set to
// `"self.__SW_MANIFEST"`.
declare global {
  interface ServiceWorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
    addEventListener(type: string, listener: (event: any) => void): void;
    registration: any;
    clients: any;
    location: any;
  }
}

declare const self: ServiceWorkerGlobalScope;

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: [
    {
      matcher: /^https:\/\/tile\.openstreetmap\.org\/.+/,
      handler: new CacheFirst({
        cacheName: "osm-tiles",
        plugins: [
          new ExpirationPlugin({
            maxAgeSeconds: 60 * 60 * 24 * 7, // 1 week
            maxEntries: 200,
          }),
        ],
      }),
    },
  ],
});

serwist.addEventListeners();

// Push Notification Event Listener (FR-019 / AC-019-1, AC-019-2, AC-019-3)
self.addEventListener("push", (event: any) => {
  if (!event.data) {
    return;
  }

  try {
    const data = event.data.json();
    const title = data.title || "Regreso Seguro";
    const options: any = {
      body: data.body || "Actualización de tu viaje.",
      icon: data.icon || "/icon-192.png",
      badge: data.badge || "/icon-192.png",
      data: data.data || { url: "/" },
      vibrate: [100, 50, 100],
      tag: data.data?.serviceId ? `service-${data.data.serviceId}` : "regreso-seguro-notification",
      renotify: true,
    };

    event.waitUntil(self.registration.showNotification(title, options));
  } catch (err) {
    console.error("[sw:push] Error showing notification:", err);
  }
});

// Notification Click Event Listener: focus or open active service tab
self.addEventListener("notificationclick", (event: any) => {
  event.notification.close();
  const urlToOpen = event.notification.data?.url || "/";

  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList: any[]) => {
        for (const client of clientList) {
          if (client.url.includes(self.location.origin) && "focus" in client) {
            client.navigate(urlToOpen);
            return client.focus();
          }
        }
        if (self.clients.openWindow) {
          return self.clients.openWindow(urlToOpen);
        }
      })
  );
});
