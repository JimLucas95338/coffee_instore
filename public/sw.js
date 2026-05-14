/* eslint-disable no-restricted-globals */
/**
 * Minimal service worker for 3rd Space Coffee.
 *
 * Strategy:
 * - Pre-cache the kiosk shell and core static assets at install time so the
 *   kiosk can boot when the network is flaky.
 * - For navigation requests, prefer the network; fall back to the cached
 *   kiosk shell so the customer-facing iPad never shows a "no internet" page.
 * - For all other GETs, network-first with a cache update — anything we've
 *   already fetched (fonts, icons) is served from cache when offline.
 * - POSTs and other writes are NOT intercepted; orders still need
 *   connectivity to land in the DB. Offline order queueing is a follow-up.
 */

const CACHE = '3sc-v1';
const PRECACHE = [
  '/',
  '/instore/kiosk',
  '/icon-192.svg',
  '/icon-512.svg',
  '/manifest.webmanifest',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((c) =>
      Promise.all(
        PRECACHE.map((url) =>
          fetch(url, { credentials: 'same-origin' })
            .then((res) => (res.ok ? c.put(url, res.clone()) : undefined))
            .catch(() => undefined),
        ),
      ),
    ),
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))),
    ),
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // Never cache the SSE stream or any /api/* — those need live data.
  if (url.pathname.startsWith('/api/')) return;
  if (url.pathname.includes('/stream')) return;

  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((res) => {
          if (res && res.status === 200 && !url.pathname.startsWith('/admin/')) {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(req, copy));
          }
          return res;
        })
        .catch(() =>
          caches.match(req).then(
            (cached) => cached || caches.match('/instore/kiosk') || caches.match('/'),
          ),
        ),
    );
    return;
  }

  event.respondWith(
    fetch(req)
      .then((res) => {
        if (res && res.status === 200) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy));
        }
        return res;
      })
      .catch(() => caches.match(req)),
  );
});
