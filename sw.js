// Service worker for the Howth Weather Station PWA.
//
// Caches the static app shell (CSS/JS/icons) so the site loads instantly
// and still opens on a flaky connection. Live data — the Ecowitt proxy,
// Open-Meteo, Met Éireann alerts — and any embedded iframe (RainViewer,
// Windy, met.ie) is never cached: those requests pass straight through
// to the network untouched.
//
// Cache name bumped to v2: v1 could end up with a *redirected* Response
// cached for a page navigation, which is what caused the Safari bug this
// version fixes — see the comment above the navigate check below. Bumping
// the name forces those stale/broken v1 entries out via the existing
// version-mismatch cleanup in `activate`.
const CACHE_NAME = 'hws-shell-v2';

// Static assets only — HTML pages are deliberately not precached here;
// see the navigate handling note below for why.
const APP_SHELL = [
    'styles.css',
    'theme.js',
    'pwa.js',
    'app.js',
    'moon.js',
    'charts.js',
    'forecast.js',
    'alerts.js',
    'settings.js',
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
    // Page navigations are never intercepted — always let the browser fetch
    // them straight from the network. Cloudflare Pages redirects
    // /index.html -> / by default, and Safari refuses outright to let a
    // service worker fulfil a navigation with a Response whose `redirected`
    // flag is true ("Response served by service worker has redirections
    // which is disallowed"). Reconstructing a redirect-free Response here
    // turned out to have its own sharp edges — a same-origin redirect
    // encountered inside a fetch handler's own fetch() call can make the
    // browser spin up a second, separate navigate-mode fetch event for the
    // redirect target — so the simplest robust fix is to just not touch
    // navigations at all. Static assets below are still cached for instant
    // loads and offline resilience.
    if (event.request.mode === 'navigate') return;

    const url = new URL(event.request.url);

    // Only same-origin GET requests are handled here. Everything else
    // (cross-origin API calls, iframes) is left alone so it always hits
    // the network for live data.
    if (event.request.method !== 'GET' || url.origin !== self.location.origin) return;

    event.respondWith(
        caches.match(event.request).then((cached) => {
            const fetchAndUpdate = fetch(event.request)
                .then((response) => {
                    if (response.ok && !response.redirected) {
                        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, response.clone()));
                    }
                    return response;
                })
                .catch(() => cached);
            // Stale-while-revalidate: serve the cached asset instantly if we
            // have it, refreshing the cache in the background for next time.
            return cached || fetchAndUpdate;
        })
    );
});
