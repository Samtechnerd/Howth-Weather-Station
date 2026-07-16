// Live data feed + gauge rendering for index.html
// Fetches directly from the station's own Ecowitt Cloud API via a Cloudflare
// Worker proxy (see cloudflare-worker/), which already normalizes everything
// to metric — no unit conversion needed here.
const DATA_SOURCE_URL = 'https://ecowitt-live-proxy.sampatton176.workers.dev/';
const GAUGE_ARC_RADIUS = 75; // matches the SVG arc paths in index.html

function updateCircleGauge(id, value, min, max) {
    const path = document.getElementById(id);
    if (!path) return;
    const percent = Math.max(0, Math.min(100, ((value - min) / (max - min)) * 100));
    const circumference = 2 * Math.PI * GAUGE_ARC_RADIUS;
    const arcLength = (270 / 360) * circumference;
    const offset = arcLength - (percent / 100) * arcLength;
    path.style.strokeDasharray = `${arcLength} ${circumference}`;
    path.style.strokeDashoffset = offset;
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
        if (data.tempC != null) updateCircleGauge('temp-progress', data.tempC, -10, 40);
        setText('dew-point-value', data.dewPointC != null ? fmt(data.dewPointC, 1) + '°C' : '--');

        setText('humidity-value', data.humidity != null ? data.humidity : 'X');
        if (data.humidity != null) updateCircleGauge('humidity-progress', data.humidity, 0, 100);

        setText('wind-dir-value', windDegreesToText(data.windDirDeg));
        setText('wind-dir-deg', data.windDirDeg != null ? data.windDirDeg + '°' : '--°');
        const arrow = document.getElementById('wind-arrow');
        if (arrow && data.windDirDeg != null) arrow.style.transform = `rotate(${data.windDirDeg}deg)`;

        setText('wind-speed-value', fmt(data.windSpeedKmh, 1));
        if (data.windSpeedKmh != null) updateCircleGauge('wind-speed-progress', data.windSpeedKmh, 0, 80);
        setText('wind-gust-value', data.windGustKmh != null ? fmt(data.windGustKmh, 1) + ' km/h' : '--');

        const rainRate = fmt(data.rainRateMm, 2);
        setText('rain-value', rainRate);
        setText('rain-rate-stat', rainRate);
        setText('rain-event-stat', fmt(data.rainEventMm, 2));
        setText('rain-daily-stat', fmt(data.rainDailyMm, 2));
        setText('rain-weekly-stat', fmt(data.rainWeeklyMm, 1));
        setText('rain-monthly-stat', fmt(data.rainMonthlyMm, 1));
        setText('rain-yearly-stat', fmt(data.rainYearlyMm, 0));
        if (data.rainRateMm != null) updateCircleGauge('rain-progress', data.rainRateMm, 0, 10);

        setText('relative-pressure-value', data.pressureHpa != null ? fmt(data.pressureHpa, 1) + ' hPa' : 'X hPa');

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
        setText('relative-pressure-value', 'X hPa');
        setLiveStatus(false);
    }
}

fetchAndUpdateData();
setInterval(fetchAndUpdateData, 60000);
