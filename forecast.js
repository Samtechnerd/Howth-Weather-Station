// 7-day forecast for Howth, Co. Dublin, via Open-Meteo (free, no API key,
// CORS-enabled — fetched directly from the browser, no proxy worker needed).
const LATITUDE = 53.3898;
const LONGITUDE = -6.0657;
const FORECAST_URL = `https://api.open-meteo.com/v1/forecast?latitude=${LATITUDE}&longitude=${LONGITUDE}` +
    '&daily=weathercode,temperature_2m_max,temperature_2m_min,precipitation_probability_max,windspeed_10m_max,uv_index_max' +
    '&hourly=temperature_2m,precipitation_probability,weathercode' +
    '&timezone=Europe%2FDublin&forecast_days=7';

// WMO weather interpretation codes — https://open-meteo.com/en/docs (stable,
// standardized table used across weather APIs).
const WEATHER_LABELS = {
    0: 'Clear sky', 1: 'Mainly clear', 2: 'Partly cloudy', 3: 'Overcast',
    45: 'Fog', 48: 'Rime fog',
    51: 'Light drizzle', 53: 'Drizzle', 55: 'Dense drizzle',
    56: 'Freezing drizzle', 57: 'Freezing drizzle',
    61: 'Slight rain', 63: 'Rain', 65: 'Heavy rain',
    66: 'Freezing rain', 67: 'Freezing rain',
    71: 'Slight snow', 73: 'Snow', 75: 'Heavy snow', 77: 'Snow grains',
    80: 'Rain showers', 81: 'Rain showers', 82: 'Violent showers',
    85: 'Snow showers', 86: 'Snow showers',
    95: 'Thunderstorm', 96: 'Thunderstorm', 99: 'Thunderstorm',
};

const ICON_PATHS = {
    sun: '<circle cx="12" cy="12" r="4"/><line x1="12" y1="2" x2="12" y2="4"/><line x1="12" y1="20" x2="12" y2="22"/><line x1="4.93" y1="4.93" x2="6.34" y2="6.34"/><line x1="17.66" y1="17.66" x2="19.07" y2="19.07"/><line x1="2" y1="12" x2="4" y2="12"/><line x1="20" y1="12" x2="22" y2="12"/><line x1="4.93" y1="19.07" x2="6.34" y2="17.66"/><line x1="17.66" y1="6.34" x2="19.07" y2="4.93"/>',
    cloudSun: '<path d="M17 16.6A4.5 4.5 0 0 0 15.5 8h-.9a6 6 0 0 0-11.4 2.6"/><path d="M4 17a3.5 3.5 0 0 0 0 7h11a4 4 0 0 0 .4-8"/><line x1="12" y1="2" x2="12" y2="4"/><line x1="4.93" y1="4.93" x2="6.34" y2="6.34"/><line x1="20" y1="12" x2="22" y2="12"/>',
    cloud: '<path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z"/>',
    fog: '<path d="M16 6.34A6 6 0 0 1 17.5 18H6a4.5 4.5 0 0 1 .5-8.97A5 5 0 0 1 16 6.34"/><line x1="3" y1="21" x2="21" y2="21"/><line x1="5" y1="17" x2="19" y2="17"/>',
    drizzle: '<line x1="8" y1="19" x2="8" y2="21"/><line x1="8" y1="13" x2="8" y2="15"/><line x1="16" y1="19" x2="16" y2="21"/><line x1="16" y1="13" x2="16" y2="15"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="12" y1="15" x2="12" y2="17"/><path d="M20 16.58A5 5 0 0 0 18 7h-1.26A8 8 0 1 0 4 15.25"/>',
    rain: '<line x1="16" y1="13" x2="16" y2="21"/><line x1="8" y1="13" x2="8" y2="21"/><line x1="12" y1="15" x2="12" y2="23"/><path d="M20 16.58A5 5 0 0 0 18 7h-1.26A8 8 0 1 0 4 15.25"/>',
    snow: '<path d="M20 17.58A5 5 0 0 0 18 8h-1.26A8 8 0 1 0 4 16.25"/><line x1="8" y1="16" x2="8.01" y2="16"/><line x1="8" y1="20" x2="8.01" y2="20"/><line x1="12" y1="18" x2="12.01" y2="18"/><line x1="12" y1="22" x2="12.01" y2="22"/><line x1="16" y1="16" x2="16.01" y2="16"/><line x1="16" y1="20" x2="16.01" y2="20"/>',
    storm: '<path d="M19 16.9A5 5 0 0 0 18 7h-1.26a8 8 0 1 0-10.02 10"/><polyline points="13 11 9 17 15 17 11 23"/>',
};

function iconKeyFor(code) {
    if (code === 0) return 'sun';
    if (code === 1) return 'cloudSun';
    if (code === 2 || code === 3) return 'cloud';
    if (code === 45 || code === 48) return 'fog';
    if ([51, 53, 55, 56, 57].includes(code)) return 'drizzle';
    if ([61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return 'rain';
    if ([71, 73, 75, 77, 85, 86].includes(code)) return 'snow';
    if ([95, 96, 99].includes(code)) return 'storm';
    return 'cloud';
}

function iconSvg(code, size) {
    const key = iconKeyFor(code);
    return `<svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${ICON_PATHS[key]}</svg>`;
}

function labelFor(code) {
    return WEATHER_LABELS[code] || 'Unsettled';
}

function setText(id, text) {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
}

function setHtml(id, html) {
    const el = document.getElementById(id);
    if (el) el.innerHTML = html;
}

function dayLabel(dateStr, index) {
    if (index === 0) return 'Today';
    const d = new Date(dateStr + 'T12:00:00');
    return d.toLocaleDateString('en-IE', { weekday: 'short' });
}

function renderHero(daily) {
    const code = daily.weathercode[0];
    setHtml('forecast-hero-icon', iconSvg(code, 64));
    setText('forecast-hero-temp', Math.round(daily.temperature_2m_max[0]));
    setText('forecast-hero-desc', labelFor(code));
    setText('forecast-hero-high', Math.round(daily.temperature_2m_max[0]));
    setText('forecast-hero-low', Math.round(daily.temperature_2m_min[0]));
    setText('forecast-hero-rain', (daily.precipitation_probability_max[0] ?? 0) + '%');
    setText('forecast-hero-wind', Math.round(daily.windspeed_10m_max[0]) + ' km/h');
    setText('forecast-hero-uv', daily.uv_index_max[0] != null ? Math.round(daily.uv_index_max[0]) : '--');
}

function renderDays(daily) {
    const container = document.getElementById('forecast-days');
    if (!container) return;
    const count = Math.min(daily.time.length, 7);
    let html = '';
    for (let i = 0; i < count; i++) {
        const code = daily.weathercode[i];
        html += `
            <div class="gauge-card forecast-day-card${i === 0 ? ' today' : ''}">
                <span class="forecast-day-name">${dayLabel(daily.time[i], i)}</span>
                <div class="forecast-day-icon">${iconSvg(code, 34)}</div>
                <div class="forecast-day-temps">
                    <span class="hi">${Math.round(daily.temperature_2m_max[i])}°</span>
                    <span class="lo">${Math.round(daily.temperature_2m_min[i])}°</span>
                </div>
                <span class="forecast-day-rain">${daily.precipitation_probability_max[i] ?? 0}% rain</span>
            </div>
        `;
    }
    container.innerHTML = html;
}

function renderHourlyChart(hourly) {
    const canvas = document.getElementById('hourly-trend-chart');
    if (!canvas || typeof Chart === 'undefined') return;

    const count = Math.min(hourly.time.length, 48);
    const labels = hourly.time.slice(0, count).map((t) =>
        new Date(t).toLocaleTimeString('en-IE', { hour: '2-digit' }));
    const temps = hourly.temperature_2m.slice(0, count);
    const rainChance = hourly.precipitation_probability.slice(0, count);

    const styles = getComputedStyle(document.documentElement);
    const text = styles.getPropertyValue('--color-text-dim').trim() || '#a2abb5';
    const grid = styles.getPropertyValue('--color-border').trim() || 'rgba(255,255,255,0.07)';

    new Chart(canvas, {
        type: 'line',
        data: {
            labels,
            datasets: [
                {
                    label: 'Temperature (°C)',
                    data: temps,
                    borderColor: '#ea4228',
                    backgroundColor: '#ea422822',
                    borderWidth: 2,
                    pointRadius: 0,
                    fill: true,
                    tension: 0.3,
                    yAxisID: 'y',
                },
                {
                    label: 'Rain chance (%)',
                    data: rainChance,
                    borderColor: '#4a90e2',
                    backgroundColor: 'transparent',
                    borderWidth: 2,
                    borderDash: [4, 4],
                    pointRadius: 0,
                    fill: false,
                    tension: 0.3,
                    yAxisID: 'y1',
                },
            ],
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: false,
            interaction: { mode: 'index', intersect: false },
            plugins: {
                legend: { display: true, labels: { color: text, boxWidth: 12, font: { size: 11 } } },
            },
            scales: {
                x: { ticks: { color: text, maxTicksLimit: 12 }, grid: { color: grid } },
                y: { position: 'left', ticks: { color: text }, grid: { color: grid }, title: { display: true, text: '°C', color: text } },
                y1: { position: 'right', min: 0, max: 100, ticks: { color: text }, grid: { display: false }, title: { display: true, text: '%', color: text } },
            },
        },
    });
}

async function fetchForecast() {
    try {
        const response = await fetch(FORECAST_URL);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const data = await response.json();
        if (!data.daily || !data.hourly) throw new Error('Unexpected forecast response shape');

        renderHero(data.daily);
        renderDays(data.daily);
        renderHourlyChart(data.hourly);

        setText('forecast-updated', 'Updated ' + new Date().toLocaleTimeString('en-IE', { hour: '2-digit', minute: '2-digit' }));
    } catch (error) {
        console.error('Error fetching forecast:', error);
        setText('forecast-updated', 'Forecast unavailable');
        const days = document.getElementById('forecast-days');
        if (days) days.innerHTML = '<p class="alert-error">Could not load the forecast. Please try again later.</p>';
    }
}

fetchForecast();
setInterval(fetchForecast, 30 * 60 * 1000);
