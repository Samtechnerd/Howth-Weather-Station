// Moon phase widget — pure client-side astronomy, no API dependency.
// Synodic month and reference new moon are standard constants used across
// most lunar-phase calculators.
const SYNODIC_MONTH_DAYS = 29.530588853;
const REFERENCE_NEW_MOON = Date.UTC(2000, 0, 6, 18, 14, 0); // 2000-01-06 18:14 UTC

function getMoonPhase(date) {
    const daysSinceRef = (date.getTime() - REFERENCE_NEW_MOON) / 86400000;
    let ageFraction = (daysSinceRef % SYNODIC_MONTH_DAYS) / SYNODIC_MONTH_DAYS;
    if (ageFraction < 0) ageFraction += 1;

    const theta = ageFraction * 2 * Math.PI;
    const illumination = (1 - Math.cos(theta)) / 2;
    const waxing = ageFraction < 0.5;

    let name;
    if (ageFraction < 0.0625 || ageFraction >= 0.9375) name = 'New Moon';
    else if (ageFraction < 0.1875) name = 'Waxing Crescent';
    else if (ageFraction < 0.3125) name = 'First Quarter';
    else if (ageFraction < 0.4375) name = 'Waxing Gibbous';
    else if (ageFraction < 0.5625) name = 'Full Moon';
    else if (ageFraction < 0.6875) name = 'Waning Gibbous';
    else if (ageFraction < 0.8125) name = 'Last Quarter';
    else name = 'Waning Crescent';

    const daysUntilFull = ageFraction <= 0.5
        ? (0.5 - ageFraction) * SYNODIC_MONTH_DAYS
        : (1.5 - ageFraction) * SYNODIC_MONTH_DAYS;
    const daysUntilNew = (1 - ageFraction) * SYNODIC_MONTH_DAYS;

    return { ageFraction, illumination, waxing, name, daysUntilFull, daysUntilNew };
}

// Verified against reference renders: base disc is the lit color, the path
// drawn on top is the shadow. Waxing lights up on the right (growing toward
// full); waning shrinks back down on the left.
function moonPathD(illumination, waxing, r) {
    const cosTheta = 1 - 2 * illumination;
    const rx = r * Math.abs(cosTheta);
    const top = `${r},0`;
    const bottom = `${r},${2 * r}`;
    const limbSweep = waxing ? 1 : 0;
    const sameSide = cosTheta >= 0;
    const termSweep = waxing ? (sameSide ? 0 : 1) : (sameSide ? 1 : 0);
    return `M ${top} A ${r},${r} 0 0 ${limbSweep} ${bottom} A ${rx},${r} 0 0 ${termSweep} ${top} Z`;
}

function renderMoonIcon(container, illumination, waxing) {
    if (!container) return;
    const r = 22;
    container.innerHTML = `
        <svg viewBox="0 0 ${2 * r} ${2 * r}" width="100%" height="100%">
            <circle cx="${r}" cy="${r}" r="${r - 1.5}" fill="#e8e3d3"/>
            <path d="${moonPathD(illumination, waxing, r - 1.5)}" fill="#2b2f36" transform="translate(1.5,1.5)"/>
        </svg>
    `;
}

function formatDays(days) {
    const rounded = Math.round(days);
    if (rounded <= 0) return 'today';
    if (rounded === 1) return 'in 1 day';
    return `in ${rounded} days`;
}

function updateMoonWidget() {
    const phase = getMoonPhase(new Date());

    renderMoonIcon(document.getElementById('moon-icon'), phase.illumination, phase.waxing);

    const nameEl = document.getElementById('moon-phase-name');
    if (nameEl) nameEl.textContent = phase.name;

    const illumEl = document.getElementById('moon-illumination');
    if (illumEl) illumEl.textContent = Math.round(phase.illumination * 100) + '% illuminated';

    const nextEl = document.getElementById('moon-next-event');
    if (nextEl) {
        nextEl.textContent = phase.ageFraction <= 0.5
            ? `Full moon ${formatDays(phase.daysUntilFull)}`
            : `New moon ${formatDays(phase.daysUntilNew)}`;
    }
}

function init() {
    updateMoonWidget();
    setInterval(updateMoonWidget, 60 * 60 * 1000); // phase barely moves hour to hour
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
