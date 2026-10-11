// Stale-while-revalidate app shell. Bump V when adding files.
const V = 'pb-7', FILES = ['./', 'index.html', 'style.css', 'logic.js', 'main.js', 'block.js', 'merge.js', 'manifest.webmanifest', 'icon-192.png', 'icon-512.png'];
addEventListener('install', e => e.waitUntil(caches.open(V).then(c => c.addAll(FILES)).then(() => skipWaiting())));
addEventListener('activate', e => e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== V).map(k => caches.delete(k)))).then(() => clients.claim())));
addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  e.respondWith(caches.open(V).then(async c => {
    const hit = await c.match(e.request);
    const net = fetch(e.request).then(r => { if (r.ok) c.put(e.request, r.clone()); return r; }).catch(() => hit);
    return hit || net;
  }));
});
