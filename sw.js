/* =============================================================
   sw.js — Service worker (PWA) del Mundial 2026
   -------------------------------------------------------------
   - Rutas RELATIVAS (./) para funcionar en GitHub Pages bajo una
     subruta (https://usuario.github.io/mundial-2026/).
   - Precachea SOLO el "app shell" (no incluye dist/ ni node_modules).
   - Shell: cache-first.  Datos (datos.js / partidos.json):
     network-first con fallback a caché → marcadores frescos con
     internet y app funcional sin conexión.
   ============================================================= */
const CACHE = "wc2026-v1";

// App shell — lista exacta de archivos del proyecto (sin dist/ ni node_modules).
const SHELL = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./css/styles.css",
  "./js/timezone.js",
  "./js/data.js",
  "./js/standings.js",
  "./js/filters.js",
  "./js/calendar.js",
  "./js/groups.js",
  "./js/bracket.js",
  "./js/export.js",
  "./js/app.js",
  "./data/datos.js",
  "./data/partidos.json",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/icon-maskable-192.png",
  "./icons/icon-maskable-512.png",
  "./icons/apple-touch-icon.png",
];

// Archivos de datos → estrategia network-first.
const DATA_SUFFIXES = ["/data/datos.js", "/data/partidos.json"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(SHELL)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

const isData = (url) => DATA_SUFFIXES.some((s) => url.pathname.endsWith(s));

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  // Solo gestionamos el mismo origen; lo externo pasa directo a la red.
  if (url.origin !== self.location.origin) return;

  // Datos → network-first (fallback a caché si no hay conexión).
  if (isData(url)) {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy));
          return res;
        })
        .catch(() => caches.match(req))
    );
    return;
  }

  // Navegación → cache-first con fallback final a index.html.
  if (req.mode === "navigate") {
    event.respondWith(
      caches.match(req).then((hit) =>
        hit || fetch(req).catch(() => caches.match("./index.html"))
      )
    );
    return;
  }

  // Resto del shell → cache-first (y cachea oportunistamente lo nuevo).
  event.respondWith(
    caches.match(req).then((hit) =>
      hit ||
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy));
          return res;
        })
        .catch(() => undefined)
    )
  );
});
