/**
 * BACKSTAGE WHEELS — LÄTTVIKTIG PWA SERVICE WORKER (sw.js)
 */

const CACHE_NAME = "backstage-wheels-pwa-v11";
const CORE_ASSETS = [
  "./",
  "./index.html",
  "./css/style.css",
  "./js/config.js",
  "./js/lightbox.js",
  "./js/app.js",
  "./manifest.webmanifest",
  "./bilder/app-icon-192.png",
  "./bilder/app-icon-512.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(CORE_ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  if (
    url.pathname.includes("/bw-admin") ||
    url.pathname.includes("bw-admin.html") ||
    url.pathname.includes("/api/") ||
    url.pathname.endsWith(".php")
  ) {
    return;
  }

  event.respondWith(
    fetch(req)
      .then((networkRes) => {
        if (networkRes && networkRes.status === 200 && url.origin === self.location.origin) {
          const clone = networkRes.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, clone));
        }
        return networkRes;
      })
      .catch(() => caches.match(req))
  );
});
