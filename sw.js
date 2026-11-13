// Uygulama kabuğunu önbelleğe alır: telefonda ana ekrandan açılınca hızlı yüklenir,
// daha önce okunan yazılar internetsiz de açılır (yazılar localStorage'da durur).
const VERSION = "v1";
const SHELL = `sabah-shell-${VERSION}`;
const RUNTIME = `sabah-runtime-${VERSION}`;
const FILES = [
  "./", "index.html", "styles.css", "app.js", "manifest.webmanifest",
  "icons/icon.svg", "icons/icon-192.png", "icons/icon-512.png", "icons/apple-touch-icon.png",
];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(SHELL).then((c) => c.addAll(FILES)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== SHELL && k !== RUNTIME).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);

  // API çağrılarına asla dokunma.
  if (url.hostname === "api.anthropic.com") return;

  // Kendi dosyalarımız: önce ağ (güncel sürüm), olmazsa önbellek.
  if (url.origin === location.origin) {
    e.respondWith(
      fetch(req)
        .then((res) => {
          if (res.ok) { const copy = res.clone(); caches.open(SHELL).then((c) => c.put(req, copy)); }
          return res;
        })
        .catch(() => caches.match(req).then((r) => r || caches.match("index.html")))
    );
    return;
  }

  // Yazı tipleri ve SDK (sürümü sabit): önce önbellek.
  if (["esm.sh", "fonts.googleapis.com", "fonts.gstatic.com"].includes(url.hostname)) {
    e.respondWith(
      caches.match(req).then((hit) => hit || fetch(req).then((res) => {
        if (res.ok || res.type === "opaque") { const copy = res.clone(); caches.open(RUNTIME).then((c) => c.put(req, copy)); }
        return res;
      }))
    );
  }
});
