// Shared light/dark theme toggle for all Howth Weather Station pages.
// The `data-theme` attribute is set as early as possible (inline in <head>)
// to avoid a flash of the wrong theme; this file wires up the switch and
// keeps the browser chrome's theme-color meta tag in sync with it.
(function () {
    var THEME_COLORS = { dark: '#14161a', light: '#f1f3f6' };

    function syncThemeColor(theme) {
        var meta = document.querySelector('meta[name="theme-color"]');
        if (meta) meta.setAttribute('content', THEME_COLORS[theme] || THEME_COLORS.dark);
    }

    function init() {
        var current = document.documentElement.getAttribute('data-theme') || 'dark';
        syncThemeColor(current);

        var toggle = document.getElementById('theme-switch');
        if (!toggle) return;

        toggle.checked = current === 'light';

        toggle.addEventListener('change', function () {
            var theme = this.checked ? 'light' : 'dark';
            document.documentElement.setAttribute('data-theme', theme);
            localStorage.setItem('theme', theme);
            syncThemeColor(theme);
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
