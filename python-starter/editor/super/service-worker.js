const CACHE = "python-editor-offline-v25-pandas-champuter";
const SHELL = ["./", "./index.html", "./style.css?v=20261016-8", "./speaker-integration.css?v=20261111-18", "./speaker-integration.js?v=20261111-18", "./comment-dialogues.js?v=20261111-3", "./teaching-presentation.js?v=20261111-16", "./teaching-presentation.css?v=20261111-13", "./walking-teacher.js?v=20261111-18", "./walking-teacher.css?v=20261111-13", "./app.js?v=20261111-18", "./pandas-visualizer.js?v=20261111-17", "./pandas-visualizer.css?v=20261111-17", "./judge-worker.js?v=20261111-17", "./manifest.webmanifest", "./icon.svg"];

self.addEventListener("install", event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key !== CACHE).map(key => caches.delete(key)))).then(() => self.clients.claim()));
});

self.addEventListener("fetch", event => {
  if(event.request.method !== "GET") return;
  const url = new URL(event.request.url);
  const cacheable = url.origin === self.location.origin || url.hostname === "cdn.jsdelivr.net";
  if(!cacheable) return;
  // Fetch HTML fresh when online, so a prior offline cache cannot freeze the UI.
  if(event.request.mode === "navigate" && url.origin === self.location.origin){
    event.respondWith(fetch(event.request).then(response=>{
      if(response.ok){
        const copy=response.clone();
        caches.open(CACHE).then(cache=>cache.put(event.request,copy));
      }
      return response;
    }).catch(()=>caches.match(event.request).then(cached=>cached||caches.match("./index.html"))));
    return;
  }
  event.respondWith(caches.match(event.request).then(cached => cached || fetch(event.request).then(response => {
    if(response && (response.ok || response.type === "opaque")){
      const copy = response.clone();
      caches.open(CACHE).then(cache => cache.put(event.request, copy));
    }
    return response;
  })));
});
