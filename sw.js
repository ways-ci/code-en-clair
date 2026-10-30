/* Garde l'outil utilisable sans connexion. Changer VERSION à chaque mise en ligne, comme le ?v= de index.html. */
const VERSION = "20261030c";
const FICHIERS = ["./", "index.html", "style.css?v=20261030c", "app.js?v=20261030c", "donnees.js?v=20261030c", "pocketbase.umd.js?v=20261030c", "compte.js?v=20261030c", "confidentialite.html", "connexion-terminee.html", "connexion-terminee.js", "manifest.json", "icone.svg"];
self.addEventListener("install", e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(FICHIERS)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
/* Réseau d'abord quand il y en a (pour avoir la dernière version), sinon la copie gardée. */
self.addEventListener("fetch", e => {
  const url = new URL(e.request.url);
  /* Le compte passe toujours par le réseau : rien de ce qui touche à /api/ n'est gardé en copie */
  if (e.request.method !== "GET" || url.origin !== location.origin || url.pathname.startsWith("/api/")) return;
  e.respondWith(
    fetch(e.request).then(r => {
      if (r.ok) { const copie = r.clone(); caches.open(VERSION).then(c => c.put(e.request, copie)); }
      return r;
    }).catch(() => caches.match(e.request, {ignoreSearch: false}).then(r => r || caches.match("index.html")))
  );
});
