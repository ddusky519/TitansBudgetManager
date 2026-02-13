// ==========================================
// SERVICE WORKER (OFFLINE CAPABILITIES)
// ==========================================
// This file runs in the background to:
// 1. Cache core assets (HTML, JS, CSS) so the app works offline.
// 2. Intercept network requests and serve from cache if available (Offline-First).
// 3. Handle updates by taking control immediately (SkipWaiting).

const CACHE_NAME = 'titans-budget-v59';
const urlsToCache = [
    './',
    './index.html',
    './manifest.json',
    './app.js',
    './icon-192.png',
    './icon-512.png',
    // External Libraries (CDNs) - Cached for offline use
    'https://cdn.tailwindcss.com',
    'https://unpkg.com/react@18/umd/react.production.min.js',
    'https://unpkg.com/react-dom@18/umd/react-dom.production.min.js',
    'https://unpkg.com/@babel/standalone/babel.min.js',
    'https://unpkg.com/lucide@latest',
    'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js',
    'https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.5.31/jspdf.plugin.autotable.min.js',
    'https://cdn.jsdelivr.net/npm/pulltorefreshjs@0.1.22/dist/index.umd.min.js'
];

// 1. INSTALL EVENT
// Runs when browser sees a new SW version. Caches the "App Shell".
self.addEventListener('install', event => {
    // Force immediate update
    self.skipWaiting();
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('Caching app shell');
                return cache.addAll(urlsToCache);
            })
    );
});

// 2. FETCH EVENT
// Intercepts every network request. Returns cached version if found, otherwise fetches from network.
self.addEventListener('fetch', event => {
    event.respondWith(
        caches.match(event.request)
            .then(response => {
                if (response) return response;
                return fetch(event.request);
            })
    );
});

// 3. ACTIVATE EVENT
// Runs after Install. Cleans up old caches (v57, v56, etc.) to free space.
self.addEventListener('activate', event => {
    const cacheWhitelist = [CACHE_NAME];
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (cacheWhitelist.indexOf(cacheName) === -1) {
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(() => self.clients.claim()) // Take control immediately
    );
});