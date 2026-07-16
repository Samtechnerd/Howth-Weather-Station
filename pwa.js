// Registers the service worker that makes this installable as a PWA.
// Registration failures (unsupported browser, blocked, etc.) are silently
// ignored — the site works fine without it, just without the app-shell
// caching / installability.
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('sw.js').catch(() => {});
    });
}
