// Shared light/dark theme toggle for all Howth Weather Station pages.
// The `data-theme` attribute is set as early as possible (inline in <head>)
// to avoid a flash of the wrong theme; this file only wires up the switch.
(function () {
    function init() {
        var toggle = document.getElementById('theme-switch');
        if (!toggle) return;

        var current = document.documentElement.getAttribute('data-theme') || 'dark';
        toggle.checked = current === 'light';

        toggle.addEventListener('change', function () {
            var theme = this.checked ? 'light' : 'dark';
            document.documentElement.setAttribute('data-theme', theme);
            localStorage.setItem('theme', theme);
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
