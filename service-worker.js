const CACHE_NAME = 'bmx-v1';
const INDEX_CACHE_NAME = 'bmx-index-v1';

const SHELL = [
  './',
  './index.html',
  './common.js',
  './theme.css',
  './stats/index.html',
  './category/index.html',
  './h2h/index.html',
  './club/index.html',
  './ranking/index.html',
];

const NO_CACHE = [
  'pilots-index.json',
  'uci-index.json',
  'uec-index.json',
  'uci-worldcup-index.json',
  'perf-rankings.json',
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(SHELL))
  );
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME && k !== INDEX_CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (url.origin !== self.location.origin) return;
  if (e.request.method !== 'GET') return;
  if (NO_CACHE.some(n => url.pathname.endsWith(n))) return;

  const freshFetch = fetch(e.request, { cache: 'no-cache' })
    .then(response => {
      const clone = response.clone();
      caches.open(CACHE_NAME).then(cache => cache.put(e.request, clone));
      return response;
    })
    .catch(() => caches.match(e.request))
    .then(r => r || new Response('', { status: 404, statusText: 'Not Found' }));

  if (e.request.mode === 'navigate') {
    e.respondWith(
      freshFetch.then(r =>
        r.ok ? r : caches.match(new URL('./', self.location).href)
      ).then(r => r || new Response('', { status: 503, statusText: 'Service Unavailable' }))
    );
    return;
  }

  e.respondWith(freshFetch);
});
