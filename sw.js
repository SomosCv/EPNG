const CACHE = 'emergency-preparedness-knoxville-v3';

const CLIENT = './clients/emergency-preparedness-knoxville/';

const PRECACHE = [
  './',
  './index.html',
  './active-client.json',

  './core/app.js',
  './core/styles.css',

  CLIENT + 'config.json',
  CLIENT + 'theme.css',
  CLIENT + 'manifest.json',

  CLIENT + 'languages/en.json',
  CLIENT + 'languages/es.json',

  CLIENT + 'data/cards.json',
  CLIENT + 'data/sections.json',
  CLIENT + 'data/checklists.json',
  CLIENT + 'data/flows.json',
  CLIENT + 'data/roles.json',
  CLIENT + 'data/resources.json',

  CLIENT + 'assets/logos/logo.png',
  CLIENT + 'assets/images/background.jpg',
  CLIENT + 'assets/icons/icon-192.png',
  CLIENT + 'assets/icons/icon-512.png',
  CLIENT + 'assets/pdfs/emergency-preparedness-neighborhood-guide.pdf'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE)
      .then(cache => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys =>
        Promise.all(
          keys
            .filter(key => key !== CACHE)
            .map(key => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const req = event.request;

  if (req.method !== 'GET') return;

  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req).catch(() => caches.match('./index.html'))
    );
    return;
  }

  event.respondWith(
    caches.match(req).then(cached => {
      if (cached) return cached;

      return fetch(req).then(res => {
        const copy = res.clone();
        const url = new URL(req.url);
        const isSameOrigin = url.origin === self.location.origin;
        const isFontAwesome = url.hostname === 'cdnjs.cloudflare.com' && url.pathname.includes('/font-awesome/');

        if ((isSameOrigin || isFontAwesome) && (res.ok || res.type === 'opaque')) {
          caches.open(CACHE).then(cache => cache.put(req, copy));
        }

        return res;
      });
    })
  );
});
