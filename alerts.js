// Met Éireann warnings feed for alerts.html
const MET_EIREANN_URL = 'https://www.met.ie/Open_Data/json/warning_IRELAND.json';
const PROXY_URL = 'https://weather-alerts-sam.sampatton176.workers.dev/';
const ALERTS_DATA_URL = PROXY_URL + MET_EIREANN_URL;

const ALERT_LEVEL_COLORS = { YELLOW: '#ffd700', ORANGE: '#ff8c00', RED: '#ff3b30', STATUS: '#38b000' };

function formatTime(isoString) {
    const options = { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Dublin' };
    try { return new Date(isoString).toLocaleTimeString('en-IE', options); } catch (e) { return 'N/A'; }
}

async function fetchAlertsAndRender() {
    const container = document.getElementById('alerts-container');
    container.innerHTML = '<p class="alert-loading">Fetching live alerts…</p>';
    try {
        const response = await fetch(ALERTS_DATA_URL);
        if (!response.ok) throw new Error(`Failed to fetch alerts: ${response.status} ${response.statusText}`);

        const rawData = await response.json();
        const ALERTS_DATA = Array.isArray(rawData) ? rawData : [];
        container.innerHTML = '';

        if (ALERTS_DATA.length === 0) {
            container.innerHTML = '<p class="alert-empty">No active weather warnings currently issued by Met Éireann.</p>';
            return;
        }

        ALERTS_DATA.forEach(alert => {
            const level = (alert.level || 'STATUS').toUpperCase();
            const color = ALERT_LEVEL_COLORS[level] || '#6d7680';
            const textColor = (level === 'YELLOW' || level === 'STATUS') ? '#1a1d21' : '#ffffff';
            const alertHtml = `
                <div class="gauge-card alert-card" style="border-left-color: ${color};">
                    <div class="alert-header">
                        <span class="alert-level" style="background-color: ${color}; color: ${textColor};">${level}</span>
                        <span class="alert-times">
                            Issued: ${formatTime(alert.issued)} &bull; Starts: ${formatTime(alert.onset)} &bull; Ends: ${formatTime(alert.expiry)}
                        </span>
                    </div>
                    <div class="alert-headline">${alert.headline}</div>
                    <div class="alert-details"><p>${alert.description}</p></div>
                </div>
            `;
            container.insertAdjacentHTML('beforeend', alertHtml);
        });
    } catch (error) {
        container.innerHTML = '<p class="alert-error">⚠️ Could not load live alerts directly from Met Éireann due to security/CORS restrictions.</p>';
        console.error('Fetch error:', error);
    }
}

document.addEventListener('DOMContentLoaded', fetchAlertsAndRender);
setInterval(fetchAlertsAndRender, 300000);
