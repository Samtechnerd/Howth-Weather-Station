// Mobile settings sheet — appearance (System/Light/Dark), accent color, and
// the About link. Relies on window.HWSTheme, exposed by theme.js, for the
// actual theme state.
(function () {
    var ACCENT_STORAGE_KEY = 'accentColor';
    var DEFAULT_ACCENT = 'blue';

    function openSheet(overlay) {
        overlay.hidden = false;
        requestAnimationFrame(function () {
            overlay.classList.add('open');
            // The sheet (and its glass lens) is hidden/zero-sized until now,
            // so the very first positioning has to skip the spring transition —
            // otherwise it visibly grows from a point every time you open Settings.
            var lens = document.getElementById('segmented-glass');
            if (lens) lens.classList.add('no-anim');
            moveGlassLens();
            if (lens) requestAnimationFrame(function () { lens.classList.remove('no-anim'); });
        });
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
        moveGlassLens();
    }

    // iOS-only: slide the frosted-glass lens under whichever segmented-control
    // button is active. `<html class="is-ios">` is set synchronously in the
    // inline head script, so this is a no-op (and cheap) everywhere else.
    function moveGlassLens() {
        if (!document.documentElement.classList.contains('is-ios')) return;
        var lens = document.getElementById('segmented-glass');
        var active = document.querySelector('#theme-segmented button.active');
        if (!lens || !active) return;
        lens.style.width = active.offsetWidth + 'px';
        lens.style.transform = 'translateX(' + active.offsetLeft + 'px)';
    }

    function getAccent() {
        try { return localStorage.getItem(ACCENT_STORAGE_KEY) || DEFAULT_ACCENT; } catch (e) { return DEFAULT_ACCENT; }
    }

    function setAccent(accent) {
        try { localStorage.setItem(ACCENT_STORAGE_KEY, accent); } catch (e) {}
        if (accent === DEFAULT_ACCENT) {
            document.documentElement.removeAttribute('data-accent');
        } else {
            document.documentElement.setAttribute('data-accent', accent);
        }
    }

    function syncSwatches(accent) {
        document.querySelectorAll('.accent-swatch').forEach(function (btn) {
            btn.classList.toggle('active', btn.dataset.accent === accent);
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

        document.querySelectorAll('.accent-swatch').forEach(function (btn) {
            btn.addEventListener('click', function () {
                var accent = btn.dataset.accent;
                setAccent(accent);
                syncSwatches(accent);
            });
        });
        syncSwatches(getAccent());
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
