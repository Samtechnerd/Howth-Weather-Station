// Howth Weather Station — Ecowitt live-data proxy
//
// Calls Ecowitt's own Cloud API (api.ecowitt.net) directly for this station,
// instead of going through Weather Underground. Normalizes the response to
// flat metric JSON so the frontend (app.js / charts.js) doesn't need any
// unit handling.
//
// Required secrets (set with `wrangler secret put <NAME>`):
//   ECOWITT_APPLICATION_KEY  — from ecowitt.net account -> API settings
//   ECOWITT_API_KEY          — from ecowitt.net account -> API settings
//   ECOWITT_MAC              — the station's MAC address, from My Devices
//
// Routes:
//   GET /         — current conditions (polled every ~60s by the dashboard)
//   GET /trends   — 24h temperature/wind/pressure series + 7-day daily
//                   rainfall, for the trend charts (polled every ~10 min)
//
// Ecowitt always returns a "unit" string alongside every "value"/"list", so
// rather than pass unit_id query params (whose exact numeric codes aren't
// verified here), we read the returned unit and convert to metric ourselves.
// This is correct no matter which default unit system the account is set to.
//
// This station reports rainfall under "rainfall_piezo" (it uses Ecowitt's
// piezo rain sensor — visible from the "haptic_array_*" battery fields).
// Traditional tipping-bucket stations report under "rainfall" instead, so we
// fall back to that if "rainfall_piezo" isn't present.

const API_BASE = 'https://api.ecowitt.net/api/v3';

function toCelsius(unit, value) {
    const v = parseFloat(value);
    if (Number.isNaN(v)) return null;
    if (unit && unit.toLowerCase().includes('f')) return (v - 32) * 5 / 9;
    return v;
}

function toKmh(unit, value) {
    const v = parseFloat(value);
    if (Number.isNaN(v)) return null;
    const u = (unit || '').toLowerCase();
    if (u.includes('mph')) return v * 1.60934;
    if (u.includes('m/s') || u.includes('mps')) return v * 3.6;
    if (u.includes('knot')) return v * 1.852;
    return v;
}

function toHpa(unit, value) {
    const v = parseFloat(value);
    if (Number.isNaN(v)) return null;
    const u = (unit || '').toLowerCase();
    if (u.includes('inhg')) return v * 33.8639;
    if (u.includes('mmhg')) return v * 1.33322;
    return v;
}

function toMm(unit, value) {
    const v = parseFloat(value);
    if (Number.isNaN(v)) return null;
    const u = (unit || '').toLowerCase();
    if (u.includes('in')) return v * 25.4;
    return v;
}

function field(node) {
    if (!node || node.value === undefined || node.value === null) return { unit: null, value: null };
    return { unit: node.unit, value: node.value };
}

function num(f, converter) {
    return f.value !== null ? converter(f.unit, f.value) : null;
}

function raw(f) {
    return f.value !== null ? parseFloat(f.value) : null;
}

function corsHeaders() {
    return {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Content-Type': 'application/json; charset=utf-8',
    };
}

function jsonResponse(body, status = 200) {
    return new Response(JSON.stringify(body), { status, headers: corsHeaders() });
}

function ecowittUrl(path, env, extraParams) {
    const url = new URL(`${API_BASE}${path}`);
    url.searchParams.set('application_key', env.ECOWITT_APPLICATION_KEY);
    url.searchParams.set('api_key', env.ECOWITT_API_KEY);
    url.searchParams.set('mac', env.ECOWITT_MAC);
    for (const [key, value] of Object.entries(extraParams)) {
        url.searchParams.set(key, value);
    }
    return url;
}

async function handleRealtime(env) {
    const url = ecowittUrl('/device/real_time', env, { call_back: 'all' });

    const upstream = await fetch(url.toString(), { cf: { cacheTtl: 30, cacheEverything: true } });
    if (!upstream.ok) return jsonResponse({ error: `Ecowitt API returned ${upstream.status}` }, 502);

    const payload = await upstream.json();
    if (payload.code !== 0) return jsonResponse({ error: payload.msg || 'Ecowitt API error' }, 502);

    const data = payload.data || {};
    const outdoor = data.outdoor || {};
    const indoor = data.indoor || {};
    const wind = data.wind || {};
    const pressure = data.pressure || {};
    const rainfall = data.rainfall_piezo || data.rainfall || {};
    const solar = data.solar_and_uvi || {};
    const battery = data.battery || {};

    const temp = field(outdoor.temperature);
    const dewPoint = field(outdoor.dew_point);
    const humidity = field(outdoor.humidity);
    const indoorTemp = field(indoor.temperature);
    const indoorHumidity = field(indoor.humidity);
    const windSpeed = field(wind.wind_speed);
    const windGust = field(wind.wind_gust);
    const windDir = field(wind.wind_direction);
    const relPressure = field(pressure.relative);
    const rainRate = field(rainfall.rain_rate);
    const rainEvent = field(rainfall.event);
    const rainDaily = field(rainfall.daily);
    const rainWeekly = field(rainfall.weekly);
    const rainMonthly = field(rainfall.monthly);
    const rainYearly = field(rainfall.yearly);
    const solarRadiation = field(solar.solar);
    const uvi = field(solar.uvi);
    const consoleBattery = field(battery.console);

    return jsonResponse({
        tempC: num(temp, toCelsius),
        dewPointC: num(dewPoint, toCelsius),
        humidity: raw(humidity),
        indoorTempC: num(indoorTemp, toCelsius),
        indoorHumidity: raw(indoorHumidity),
        windDirDeg: raw(windDir),
        windSpeedKmh: num(windSpeed, toKmh),
        windGustKmh: num(windGust, toKmh),
        pressureHpa: num(relPressure, toHpa),
        rainRateMm: num(rainRate, toMm),
        rainEventMm: num(rainEvent, toMm),
        rainDailyMm: num(rainDaily, toMm),
        rainWeeklyMm: num(rainWeekly, toMm),
        rainMonthlyMm: num(rainMonthly, toMm),
        rainYearlyMm: num(rainYearly, toMm),
        solarWm2: raw(solarRadiation),
        uvi: raw(uvi),
        consoleBatteryV: raw(consoleBattery),
        stationTime: payload.time || null,
    });
}

function pad(n) { return String(n).padStart(2, '0'); }

function formatEcowittDate(date) {
    return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())} ${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())}:${pad(date.getUTCSeconds())}`;
}

// Converts a history node ({ unit, list: { "<unix_seconds>": "<value>" } }) into
// a sorted [{ t: <unix_ms>, v: <converted number> }] array. Returns [] for any
// shape that doesn't match, so a single unexpected field can't break the page.
function toSeries(node, converter) {
    if (!node || typeof node.list !== 'object' || node.list === null) return [];
    const unit = node.unit;
    return Object.entries(node.list)
        .map(([ts, val]) => ({ t: parseInt(ts, 10) * 1000, v: converter(unit, val) }))
        .filter((p) => Number.isFinite(p.t) && p.v !== null && !Number.isNaN(p.v))
        .sort((a, b) => a.t - b.t);
}

async function handleTrends(env) {
    const now = new Date();
    const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const conditionsUrl = ecowittUrl('/device/history', env, {
        start_date: formatEcowittDate(dayAgo),
        end_date: formatEcowittDate(now),
        cycle_type: '30min',
        call_back: 'outdoor.temperature,wind.wind_speed,pressure.relative',
    });

    const rainUrl = ecowittUrl('/device/history', env, {
        start_date: formatEcowittDate(weekAgo),
        end_date: formatEcowittDate(now),
        cycle_type: '1day',
        call_back: 'rainfall_piezo.daily',
    });

    const [conditionsRes, rainRes] = await Promise.all([
        fetch(conditionsUrl.toString(), { cf: { cacheTtl: 600, cacheEverything: true } }),
        fetch(rainUrl.toString(), { cf: { cacheTtl: 600, cacheEverything: true } }),
    ]);

    if (!conditionsRes.ok || !rainRes.ok) {
        return jsonResponse({ error: 'Ecowitt history API request failed' }, 502);
    }

    const conditionsPayload = await conditionsRes.json();
    const rainPayload = await rainRes.json();

    if (conditionsPayload.code !== 0 || rainPayload.code !== 0) {
        return jsonResponse({ error: conditionsPayload.msg || rainPayload.msg || 'Ecowitt history API error' }, 502);
    }

    const cData = conditionsPayload.data || {};
    const rData = rainPayload.data || {};
    const rainfallGroup = rData.rainfall_piezo || rData.rainfall || {};

    return jsonResponse({
        temperature: toSeries(cData.outdoor && cData.outdoor.temperature, toCelsius),
        windSpeed: toSeries(cData.wind && cData.wind.wind_speed, toKmh),
        pressure: toSeries(cData.pressure && cData.pressure.relative, toHpa),
        rainfallDaily: toSeries(rainfallGroup.daily, toMm),
    });
}

export default {
    async fetch(request, env) {
        if (request.method === 'OPTIONS') {
            return new Response(null, { headers: corsHeaders() });
        }
        const url = new URL(request.url);
        try {
            if (url.pathname === '/trends') return await handleTrends(env);
            return await handleRealtime(env);
        } catch (err) {
            return jsonResponse({ error: err.message || 'Unexpected error' }, 500);
        }
    },
};
