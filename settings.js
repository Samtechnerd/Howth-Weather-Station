// Mobile settings sheet — appearance (System/Light/Dark) and the About link.
// Relies on window.HWSTheme, exposed by theme.js, for the actual theme state.
(function () {
    function openSheet(overlay) {
        overlay.hidden = false;
        requestAnimationFrame(function () { overlay.classList.add('open'); });
        document.body.style.overflow = 'hidden';
    }

    function closeSheet(overlay) {
        overlay.classList.remove('open');
        document.body.style.overflow = '';
        setTimeout(function () { overlay.hidden = true; }, 250);
    }

    function syncSegmented(pref) {
        document.querySelectorAll('#theme-segmented button').forEach(function (btn) {
            btn.classList.toggle('active', btn.dataset.themeOption === pref);
        });
    }

    function init() {
        var trigger = document.getElementById('settings-trigger');
        var overlay = document.getElementById('settings-overlay');
        var closeBtn = document.getElementById('settings-close');
        if (!trigger || !overlay || !window.HWSTheme) return;

        trigger.addEventListener('click', function () { openSheet(overlay); });
        overlay.addEventListener('click', function (e) {
            if (e.target === overlay) closeSheet(overlay);
        });
        if (closeBtn) closeBtn.addEventListener('click', function () { closeSheet(overlay); });

        document.querySelectorAll('#theme-segmented button').forEach(function (btn) {
            btn.addEventListener('click', function () {
                var pref = btn.dataset.themeOption;
                window.HWSTheme.set(pref);
                syncSegmented(pref);
            });
        });

        syncSegmented(window.HWSTheme.get());
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
