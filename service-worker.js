const CACHE_NAME = "pp-editor-hub-v1";
const OFFLINE_FALLBACK = "/index.html";

const PRE_CACHE = [
  "/",
  "/index.html",
  "/pwa.js",
  "/manifest.webmanifest"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRE_CACHE))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.map((key) => (key !== CACHE_NAME ? caches.delete(key) : Promise.resolve()))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;

  event.respondWith(
    fetch(request)
      .then((response) => {
        const clone = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
        return response;
      })
      .catch(async () => {
        const cached = await caches.match(request);
        return cached || caches.match(OFFLINE_FALLBACK);
      })
  );
});


self.addEventListener("message", (event) => {
  const data = event.data || {};
  if (data.type !== "PP_SET_BADGE") return;

  const count = Number(data.count) || 0;
  try {
    if ("navigator" in self && "setAppBadge" in navigator && "clearAppBadge" in navigator) {
      const badgeOp = count > 0 ? navigator.setAppBadge(count) : navigator.clearAppBadge();
      event.waitUntil(Promise.resolve(badgeOp).catch(() => {}));
    }
  } catch (error) {
    console.warn("Service worker badge update failed:", error);
  }
});
