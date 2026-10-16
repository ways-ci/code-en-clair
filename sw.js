/* Garde l'outil utilisable sans connexion. Changer VERSION à chaque mise en ligne, comme le ?v= de index.html. */
const VERSION = "20261016c";
const FICHIERS = ["./", "index.html", "style.css?v=20261016c", "app.js?v=20261016c", "donnees.js?v=20261016c", "manifest.json", "icone.svg"];
self.addEventListener("install", e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(FICHIERS)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
/* Réseau d'abord quand il y en a (pour avoir la dernière version), sinon la copie gardée. */
self.addEventListener("fetch", e => {
  if (e.request.method !== "GET" || new URL(e.request.url).origin !== location.origin) return;
  e.respondWith(
    fetch(e.request).then(r => {
      if (r.ok) { const copie = r.clone(); caches.open(VERSION).then(c => c.put(e.request, copie)); }
      return r;
    }).catch(() => caches.match(e.request, {ignoreSearch: false}).then(r => r || caches.match("index.html")))
  );
});
