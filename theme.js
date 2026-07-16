// Shared theme system for all Howth Weather Station pages — System / Light /
// Dark. The `data-theme` attribute is set as early as possible (inline in
// <head>) to avoid a flash of the wrong theme; this file resolves the full
// preference, wires up the desktop toggle, reacts to OS scheme changes when
// on "system", and keeps the theme-color meta tag in sync. It also exposes
// window.HWSTheme so the mobile settings sheet (settings.js) can read/set
// the preference without duplicating this logic.
(function () {
    var THEME_COLORS = { dark: '#14161a', light: '#f1f3f6' };
    var STORAGE_KEY = 'themePreference';
    var LEGACY_STORAGE_KEY = 'theme'; // pre-3-way binary toggle
    var media = window.matchMedia('(prefers-color-scheme: dark)');

    function resolvePreference(pref) {
        if (pref === 'light' || pref === 'dark') return pref;
        return media.matches ? 'dark' : 'light';
    }

    function syncThemeColor(theme) {
        var meta = document.querySelector('meta[name="theme-color"]');
        if (meta) meta.setAttribute('content', THEME_COLORS[theme] || THEME_COLORS.dark);
    }

    function getPreference() {
        try {
            return localStorage.getItem(STORAGE_KEY) || localStorage.getItem(LEGACY_STORAGE_KEY) || 'system';
        } catch (e) {
            return 'system';
        }
    }

    function apply(pref) {
        var resolved = resolvePreference(pref);
        document.documentElement.setAttribute('data-theme', resolved);
        syncThemeColor(resolved);
        var toggle = document.getElementById('theme-switch');
        if (toggle) toggle.checked = resolved === 'light';
        return resolved;
    }

    function setPreference(pref) {
        try { localStorage.setItem(STORAGE_KEY, pref); } catch (e) {}
        apply(pref);
    }

    window.HWSTheme = { get: getPreference, set: setPreference, resolve: resolvePreference };

    function init() {
        apply(getPreference());

        var toggle = document.getElementById('theme-switch');
        if (toggle) {
            toggle.addEventListener('change', function () {
                setPreference(this.checked ? 'light' : 'dark');
            });
        }

        media.addEventListener('change', function () {
            if (getPreference() === 'system') apply('system');
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
