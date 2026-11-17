/* Kraft-Check Service Worker · Version 2026-11-17a (vom Build erzeugt) */
const CACHE = 'kraft-f5088f9bdd';
const FONTS = 'kraft-fonts';
const FILES = ['./','./index.html','./test.html','./profil.html','./plan.html','./uebungen.html','./figuren.js','./dtv-icon.png','./manifest.webmanifest'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k.startsWith('kraft-') && k !== CACHE && k !== FONTS).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

function timeout(ms) { return new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), ms)); }

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  /* Schriften: aus dem Speicher, im Hintergrund auffrischen */
  if (url.host === 'fonts.googleapis.com' || url.host === 'fonts.gstatic.com') {
    e.respondWith(caches.open(FONTS).then(async c => {
      const hit = await c.match(req);
      const net = fetch(req).then(r => { if (r && (r.ok || r.type === 'opaque')) c.put(req, r.clone()); return r; }).catch(() => hit);
      return hit || net;
    }));
    return;
  }
  if (url.origin !== location.origin) return;
  /* Seiten: erst Netz (max. 3 s), sonst Speicher */
  if (req.mode === 'navigate' || url.pathname.endsWith('.html') || url.pathname.endsWith('/')) {
    e.respondWith(Promise.race([fetch(req), timeout(3000)]).then(r => {
      if (r && r.ok) { const cp = r.clone(); caches.open(CACHE).then(c => c.put(req, cp)); }
      return r;
    }).catch(() => caches.match(req, { ignoreSearch: true }).then(r => r || caches.match('./index.html'))));
    return;
  }
  /* Übrige Dateien: aus dem Speicher, sonst Netz */
  e.respondWith(caches.match(req, { ignoreSearch: true }).then(r => r || fetch(req)));
});
