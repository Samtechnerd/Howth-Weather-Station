// Service worker for the Howth Weather Station PWA.
//
// Caches the static app shell (HTML/CSS/JS/icons) so the site loads
// instantly and still opens on a flaky connection. Live data — the
// Ecowitt proxy, Open-Meteo, Met Éireann alerts, and any embedded
// iframe (RainViewer, Windy, met.ie) — is never cached: those requests
// pass straight through to the network untouched.
const CACHE_NAME = 'hws-shell-v1';

const APP_SHELL = [
    'index.html',
    'forecast.html',
    'widgets.html',
    'alerts.html',
    'windy.html',
    'styles.css',
    'theme.js',
    'pwa.js',
    'app.js',
    'moon.js',
    'charts.js',
    'forecast.js',
    'alerts.js',
    'vendor/chart.umd.min.js',
    'howthw.png',
    'manifest.json',
    'icons/icon-192.png',
    'icons/icon-512.png',
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => cache.addAll(APP_SHELL))
            .then(() => self.skipWaiting())
    );
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys()
            .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
            .then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url);

    // Only the static shell is handled here — same-origin GET requests.
    // Everything else (cross-origin API calls, iframes) is left alone so
    // it always hits the network for live data.
    if (event.request.method !== 'GET' || url.origin !== self.location.origin) return;

    event.respondWith(
        caches.match(event.request).then((cached) => {
            const fetchAndUpdate = fetch(event.request)
                .then((response) => {
                    if (response.ok) {
                        const clone = response.clone();
                        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
                    }
                    return response;
                })
                .catch(() => cached);
            // Stale-while-revalidate: serve the cached shell instantly if we
            // have it, refreshing the cache in the background for next time.
            return cached || fetchAndUpdate;
        })
    );
});
