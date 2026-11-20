// Service Worker do app Clínica Pet
// Guarda a "casca" do app (ícones, páginas, JS/CSS) para abrir rápido.
// Os dados (API) sempre vêm do servidor, para o estoque estar sempre correto.
const CACHE = 'clinica-pet-v1';

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(['/logo.png', '/icons/icon-192.png'])));
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))),
  );
  self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  const url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== self.location.origin) return; // API: sempre rede

  // Arquivos estáticos do Next: cache primeiro
  if (url.pathname.startsWith('/_next/static') || url.pathname.startsWith('/icons') || url.pathname === '/logo.png') {
    e.respondWith(
      caches.match(req).then(
        (r) =>
          r ||
          fetch(req).then((res) => {
            const copia = res.clone();
            caches.open(CACHE).then((c) => c.put(req, copia));
            return res;
          }),
      ),
    );
    return;
  }
  // Páginas: rede primeiro, cache se estiver sem internet
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req)
        .then((res) => {
          const copia = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copia));
          return res;
        })
        .catch(() => caches.match(req).then((r) => r || caches.match('/'))),
    );
  }
});
