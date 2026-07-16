// Live data feed + tile rendering for index.html
// Fetches directly from the station's own Ecowitt Cloud API via a Cloudflare
// Worker proxy (see cloudflare-worker/), which already normalizes everything
// to metric — no unit conversion needed here.
const DATA_SOURCE_URL = 'https://ecowitt-live-proxy.sampatton176.workers.dev/';

function updateBar(fillId, value, min, max) {
    const fill = document.getElementById(fillId);
    if (!fill || value == null) return;
    const percent = Math.max(0, Math.min(100, ((value - min) / (max - min)) * 100));
    fill.style.width = percent + '%';
    // Keep the gradient sized to the track's full width so colors stay
    // correct at the current fill position, whatever that width happens
    // to be (responsive layout) — rather than stretching to the fill's
    // own (smaller) width, which would compress/misalign the gradient.
    const trackWidth = fill.parentElement.clientWidth;
    if (trackWidth > 0) fill.style.backgroundSize = `${trackWidth}px 100%`;
}

function windDegreesToText(deg) {
    if (deg == null) return '--';
    const directions = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"];
    return directions[Math.round(deg / 22.5) % 16];
}

function setLiveStatus(ok) {
    const dot = document.getElementById('status-dot');
    const label = document.getElementById('status-label');
    if (!dot || !label) return;
    dot.classList.toggle('error', !ok);
    label.textContent = ok
        ? 'Live · updated ' + new Date().toLocaleTimeString('en-IE', { hour: '2-digit', minute: '2-digit' })
        : 'Connection error';
}

function setText(id, text) {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
}

function fmt(value, digits) {
    return value != null ? value.toFixed(digits) : 'X';
}

async function fetchAndUpdateData() {
    try {
        const response = await fetch(DATA_SOURCE_URL);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const data = await response.json();
        if (data.error) throw new Error(data.error);

        setText('temp-value', fmt(data.tempC, 1));
        updateBar('temp-fill', data.tempC, -10, 40);
        setText('dew-point-value', data.dewPointC != null ? fmt(data.dewPointC, 1) + '°C' : '--');

        setText('humidity-value', data.humidity != null ? data.humidity : 'X');
        updateBar('humidity-fill', data.humidity, 0, 100);

        setText('wind-dir-value', windDegreesToText(data.windDirDeg));
        setText('wind-dir-deg', data.windDirDeg != null ? data.windDirDeg + '°' : '--°');
        const arrow = document.getElementById('wind-arrow-icon');
        if (arrow && data.windDirDeg != null) arrow.style.transform = `rotate(${data.windDirDeg}deg)`;

        setText('wind-speed-value', fmt(data.windSpeedKmh, 1));
        updateBar('wind-fill', data.windSpeedKmh, 0, 80);
        setText('wind-gust-value', data.windGustKmh != null ? fmt(data.windGustKmh, 1) + ' km/h' : '--');

        setText('rain-value', fmt(data.rainRateMm, 2));
        updateBar('rain-fill', data.rainRateMm, 0, 10);
        setText('rain-event-stat', fmt(data.rainEventMm, 1));
        setText('rain-daily-stat', fmt(data.rainDailyMm, 1));
        setText('rain-weekly-stat', fmt(data.rainWeeklyMm, 1));
        setText('rain-monthly-stat', fmt(data.rainMonthlyMm, 1));
        setText('rain-yearly-stat', fmt(data.rainYearlyMm, 0));

        setText('relative-pressure-value', fmt(data.pressureHpa, 1));

        setText('indoor-temp-value', data.indoorTempC != null ? fmt(data.indoorTempC, 1) + '°C' : '--');
        setText('indoor-humidity-value', data.indoorHumidity != null ? data.indoorHumidity + '%' : '--');

        setText('solar-value', data.solarWm2 != null ? fmt(data.solarWm2, 0) + ' W/m²' : '--');
        setText('uvi-value', data.uvi != null ? data.uvi : '--');

        setText('battery-value', data.consoleBatteryV != null ? fmt(data.consoleBatteryV, 2) + 'V' : '--');

        setLiveStatus(true);
    } catch (error) {
        console.error('Error fetching weather data:', error);
        setText('temp-value', 'X');
        setText('humidity-value', 'X');
        setText('wind-dir-value', 'X');
        setText('wind-speed-value', 'X');
        setText('rain-value', 'X');
        setText('relative-pressure-value', 'X');
        setLiveStatus(false);
    }
}

fetchAndUpdateData();
setInterval(fetchAndUpdateData, 60000);
