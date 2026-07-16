// Live data feed + gauge rendering for index.html
const DATA_SOURCE_URL = 'https://ecowit-proxy.sampatton176.workers.dev/';
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

function fToC(f) { return (f - 32) * 5 / 9; }
function mphToKmh(mph) { return mph * 1.60934; }
function inHgToHpa(inHg) { return inHg * 33.8639; }

function setLiveStatus(ok) {
    const dot = document.getElementById('status-dot');
    const label = document.getElementById('status-label');
    if (!dot || !label) return;
    dot.classList.toggle('error', !ok);
    label.textContent = ok
        ? 'Live · updated ' + new Date().toLocaleTimeString('en-IE', { hour: '2-digit', minute: '2-digit' })
        : 'Connection error';
}

async function fetchAndUpdateData() {
    try {
        const response = await fetch(DATA_SOURCE_URL);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const data = await response.json();

        const obs = data.observations[0];
        const imp = obs.imperial;

        const tempC = fToC(imp.temp);
        document.getElementById('temp-value').textContent = tempC.toFixed(1);
        updateCircleGauge('temp-progress', tempC, -10, 40);

        const humidity = obs.humidity;
        document.getElementById('humidity-value').textContent = humidity;
        updateCircleGauge('humidity-progress', humidity, 0, 100);

        const windDir = obs.winddir;
        const windKmh = mphToKmh(imp.windSpeed);
        document.getElementById('wind-dir-value').textContent = windDegreesToText(windDir);
        document.getElementById('wind-dir-deg').textContent = windDir + '°';
        document.getElementById('wind-arrow').style.transform = `rotate(${windDir}deg)`;
        document.getElementById('wind-speed-value').textContent = windKmh.toFixed(1);
        updateCircleGauge('wind-speed-progress', windKmh, 0, 80);

        const rainMm = imp.precipRate * 25.4 / 60;
        const rainTotalMm = imp.precipTotal * 25.4;
        document.getElementById('rain-value').textContent = rainMm.toFixed(2);
        document.getElementById('rain-rate-stat').textContent = rainMm.toFixed(2);
        document.getElementById('rain-event-stat').textContent = rainTotalMm.toFixed(2);
        document.getElementById('rain-daily-stat').textContent = rainTotalMm.toFixed(2);
        updateCircleGauge('rain-progress', rainMm, 0, 10);

        const pressureHpa = inHgToHpa(imp.pressure);
        document.getElementById('relative-pressure-value').textContent = pressureHpa.toFixed(1) + ' hPa';

        setLiveStatus(true);
    } catch (error) {
        console.error('Error fetching weather data:', error);
        document.getElementById('temp-value').textContent = 'X';
        document.getElementById('humidity-value').textContent = 'X';
        document.getElementById('wind-dir-value').textContent = 'X';
        document.getElementById('wind-speed-value').textContent = 'X';
        document.getElementById('rain-value').textContent = 'X';
        document.getElementById('relative-pressure-value').textContent = 'X hPa';
        setLiveStatus(false);
    }
}

fetchAndUpdateData();
setInterval(fetchAndUpdateData, 60000);
