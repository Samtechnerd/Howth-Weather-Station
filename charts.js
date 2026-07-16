// Trend charts for index.html — temperature/wind/pressure over 24h and daily
// rainfall over the last 7 days. Pulls from the /trends route of the Ecowitt
// proxy worker (see cloudflare-worker/) and renders with Chart.js (loaded via
// CDN in index.html).
const TRENDS_URL = 'https://ecowitt-live-proxy.sampatton176.workers.dev/trends';
const TRENDS_REFRESH_MS = 10 * 60 * 1000; // matches the worker's edge-cache TTL

let charts = {};
let lastTrendsData = null;

function themeColors() {
    const styles = getComputedStyle(document.documentElement);
    const read = (name, fallback) => (styles.getPropertyValue(name).trim() || fallback);
    return {
        text: read('--color-text-dim', '#a2abb5'),
        grid: read('--color-border', 'rgba(255,255,255,0.07)'),
        tooltipBg: read('--color-card', '#1f2227'),
        tooltipTitle: read('--color-text', '#f4f6f8'),
    };
}

function baseOptions(yLabel) {
    const c = themeColors();
    return {
        responsive: true,
        maintainAspectRatio: false,
        animation: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
            legend: { display: false },
            tooltip: {
                backgroundColor: c.tooltipBg,
                titleColor: c.tooltipTitle,
                bodyColor: c.text,
                borderColor: c.grid,
                borderWidth: 1,
                padding: 10,
                cornerRadius: 8,
            },
        },
        scales: {
            x: {
                ticks: { color: c.text, maxRotation: 0, autoSkip: true, maxTicksLimit: 8 },
                grid: { color: c.grid },
            },
            y: {
                ticks: { color: c.text },
                grid: { color: c.grid },
                title: { display: !!yLabel, text: yLabel, color: c.text },
            },
        },
    };
}

function timeLabel(ms) {
    return new Date(ms).toLocaleTimeString('en-IE', { hour: '2-digit', minute: '2-digit' });
}

function dayLabel(ms) {
    return new Date(ms).toLocaleDateString('en-IE', { weekday: 'short' });
}

function toggleEmptyState(canvas, isEmpty) {
    canvas.style.display = isEmpty ? 'none' : 'block';
    const card = canvas.closest('.chart-card');
    if (!card) return;
    let empty = card.querySelector('.chart-empty');
    if (isEmpty) {
        if (!empty) {
            empty = document.createElement('p');
            empty.className = 'chart-empty';
            empty.textContent = 'No trend data available yet.';
            card.appendChild(empty);
        }
    } else if (empty) {
        empty.remove();
    }
}

function renderLineChart(canvasId, series, color, yLabel) {
    const canvas = document.getElementById(canvasId);
    if (!canvas || typeof Chart === 'undefined') return;
    if (charts[canvasId]) charts[canvasId].destroy();

    toggleEmptyState(canvas, series.length === 0);
    if (series.length === 0) return;

    charts[canvasId] = new Chart(canvas, {
        type: 'line',
        data: {
            labels: series.map((p) => timeLabel(p.t)),
            datasets: [{
                data: series.map((p) => p.v),
                borderColor: color,
                backgroundColor: color + '22',
                borderWidth: 2,
                pointRadius: 0,
                pointHoverRadius: 4,
                fill: true,
                tension: 0.3,
            }],
        },
        options: baseOptions(yLabel),
    });
}

function renderBarChart(canvasId, series, color, yLabel) {
    const canvas = document.getElementById(canvasId);
    if (!canvas || typeof Chart === 'undefined') return;
    if (charts[canvasId]) charts[canvasId].destroy();

    toggleEmptyState(canvas, series.length === 0);
    if (series.length === 0) return;

    charts[canvasId] = new Chart(canvas, {
        type: 'bar',
        data: {
            labels: series.map((p) => dayLabel(p.t)),
            datasets: [{
                data: series.map((p) => p.v),
                backgroundColor: color,
                borderRadius: 4,
                maxBarThickness: 36,
            }],
        },
        options: baseOptions(yLabel),
    });
}

function renderAll(data) {
    renderLineChart('temp-trend-chart', data.temperature || [], '#ea4228', '°C');
    renderLineChart('wind-trend-chart', data.windSpeed || [], '#5be12c', 'km/h');
    renderLineChart('pressure-trend-chart', data.pressure || [], '#4a90e2', 'hPa');
    renderBarChart('rain-trend-chart', data.rainfallDaily || [], '#00bcd4', 'mm');
}

async function fetchAndRenderTrends() {
    try {
        const response = await fetch(TRENDS_URL);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const data = await response.json();
        if (data.error) throw new Error(data.error);
        lastTrendsData = data;
        renderAll(data);
    } catch (error) {
        console.error('Error fetching trend data:', error);
    }
}

function showChartsUnavailable() {
    document.querySelectorAll('.chart-card canvas').forEach((canvas) => {
        canvas.style.display = 'none';
        const card = canvas.closest('.chart-card');
        if (!card || card.querySelector('.chart-empty')) return;
        const msg = document.createElement('p');
        msg.className = 'chart-empty';
        msg.textContent = 'Charts failed to load.';
        card.appendChild(msg);
    });
}

function init() {
    if (typeof Chart === 'undefined') {
        // vendor/chart.umd.min.js didn't load (blocked, offline, etc.) —
        // show a clear message instead of leaving the canvases blank.
        showChartsUnavailable();
        return;
    }

    fetchAndRenderTrends();
    setInterval(fetchAndRenderTrends, TRENDS_REFRESH_MS);

    const themeSwitch = document.getElementById('theme-switch');
    if (themeSwitch) {
        themeSwitch.addEventListener('change', () => {
            // Re-render with theme-appropriate axis/grid colors without
            // hitting the network again — CSS vars flip synchronously via
            // theme.js's own change handler, so read them just after.
            setTimeout(() => { if (lastTrendsData) renderAll(lastTrendsData); }, 0);
        });
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
