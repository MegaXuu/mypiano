const CACHE = 'piano-b5-2';
const ASSETS = ['./','./index.html',
  './js/opus.js','./js/state.js','./js/ui.js','./js/home.js','./js/session.js','./js/carnet.js',
  './js/repertoire.js','./js/piece-detail.js','./js/parcours.js','./js/settings.js',
  './js/gamification.js','./js/plan.js','./js/boot.js',
  './manifest.webmanifest','./icon-180.png','./icon-192.png','./icon-512.png'];
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);
  if (url.hostname.includes('openopus.org')) return; // toujours réseau pour l'API
  e.respondWith(caches.match(e.request).then(hit => hit || fetch(e.request).then(res => {
    const copy = res.clone(); caches.open(CACHE).then(c => c.put(e.request, copy)).catch(() => {}); return res;
  }).catch(() => caches.match('./index.html'))));
});
