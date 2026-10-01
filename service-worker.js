// Copie de l'appli pour un démarrage hors-ligne. Réseau d'abord (une mise à
// jour publiée est prise tout de suite), la copie ne sert que sans réseau.
// Le coffre (déjà chiffré) est dans le localStorage : rien d'autre à cacher.

const CACHE_NOM = "coffre-v4";
const FICHIERS_COQUILLE = ["./", "./index.html", "./style.css", "./manifest.json", "./js/main.js", "./js/verrou.js", "./js/liste.js", "./js/formulaire.js", "./js/reglages.js", "./js/coffre.js", "./js/crypto.js", "./js/chargeur.js", "./js/entrees.js", "./js/generateur.js", "./js/restauration.js", "./js/storage.js", "./js/theme.js", "./js/utils.js", "./js/config.js", "./js/mentions.js", "./js/vendor/hash-wasm.umd.min.js", "./icons/icon-192.png", "./icons/icon-512.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NOM)
      .then((cache) => cache.addAll(FICHIERS_COQUILLE.map((f) => new Request(f, { cache: "reload" }))))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((noms) => Promise.all(noms.filter((n) => n.startsWith("coffre-v") && n !== CACHE_NOM).map((n) => caches.delete(n))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (event.request.method !== "GET" || url.origin !== self.location.origin) return;
  event.respondWith(
    fetch(event.request.url, { cache: "no-cache" })
      .then((reponse) => {
        if (reponse.ok) {
          const copie = reponse.clone();
          caches.open(CACHE_NOM).then((cache) => cache.put(event.request, copie));
        }
        return reponse;
      })
      .catch(() => caches.match(event.request).then((r) => r || caches.match("./index.html"))),
  );
});
