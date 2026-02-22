const CACHE_NAME = "quran-offline-v4";
const USER_DATA_CACHE_NAME = "quran-offline-v2";
const APP_SHELL = [
  "./",
  "./index.html",
  "./styles.css",
  "./script.js",
  "./manifest.webmanifest",
  "./app-icon.svg",
  "./assets/logo.png",
  "./assets/OIP.webp",
  "./assets/logo.svg",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(APP_SHELL);
    })
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME && key !== USER_DATA_CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  const requestUrl = new URL(event.request.url);
  const isSameOrigin = requestUrl.origin === self.location.origin;
  const isNavigation = event.request.mode === "navigate";
  const isAppShellRequest =
    isSameOrigin &&
    APP_SHELL.some((assetPath) => new URL(assetPath, self.location.href).href === requestUrl.href);

  if (isAppShellRequest || isNavigation) {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        if (cached) return cached;

        return fetch(event.request)
          .then((response) => {
            if (!response || response.status !== 200) return response;

            const responseClone = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseClone);
            });
            return response;
          })
          .catch(() => {
            if (isNavigation) {
              return caches.match("./index.html");
            }
            return new Response("Offline and resource not cached.", { status: 503 });
          });
      })
    );
    return;
  }

  event.respondWith(
    fetch(event.request).catch(() => {
      if (isNavigation) {
        return caches.match("./index.html");
      }
      return new Response("Offline and resource not cached.", { status: 503 });
    })
  );
});
