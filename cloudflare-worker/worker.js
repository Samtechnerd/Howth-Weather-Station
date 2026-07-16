// Howth Weather Station — Ecowitt live-data proxy
//
// Calls Ecowitt's own Cloud API (api.ecowitt.net) directly for this station,
// instead of going through Weather Underground. Normalizes the response to
// flat metric JSON so the frontend (app.js) doesn't need any unit handling.
//
// Required secrets (set with `wrangler secret put <NAME>`):
//   ECOWITT_APPLICATION_KEY  — from ecowitt.net account -> API settings
//   ECOWITT_API_KEY          — from ecowitt.net account -> API settings
//   ECOWITT_MAC              — the station's MAC address, from My Devices
//
// Ecowitt always returns a "unit" string alongside every "value", so rather
// than pass unit_id query params (whose exact numeric codes aren't verified
// here), we read the returned unit and convert to metric ourselves. This is
// correct no matter which default unit system the account is set to.

const ECOWITT_ENDPOINT = 'https://api.ecowitt.net/api/v3/device/real_time';

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

function corsHeaders() {
    return {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Content-Type': 'application/json; charset=utf-8',
    };
}

async function handleRequest(env) {
    const url = new URL(ECOWITT_ENDPOINT);
    url.searchParams.set('application_key', env.ECOWITT_APPLICATION_KEY);
    url.searchParams.set('api_key', env.ECOWITT_API_KEY);
    url.searchParams.set('mac', env.ECOWITT_MAC);
    url.searchParams.set('call_back', 'all');

    const upstream = await fetch(url.toString(), { cf: { cacheTtl: 30, cacheEverything: true } });
    if (!upstream.ok) {
        return new Response(JSON.stringify({ error: `Ecowitt API returned ${upstream.status}` }), {
            status: 502,
            headers: corsHeaders(),
        });
    }

    const payload = await upstream.json();
    if (payload.code !== 0) {
        return new Response(JSON.stringify({ error: payload.msg || 'Ecowitt API error' }), {
            status: 502,
            headers: corsHeaders(),
        });
    }

    const data = payload.data || {};
    const outdoor = data.outdoor || {};
    const wind = data.wind || {};
    const pressure = data.pressure || {};
    const rainfall = data.rainfall || {};

    const temp = field(outdoor.temperature);
    const humidity = field(outdoor.humidity);
    const windSpeed = field(wind.wind_speed);
    const windDir = field(wind.wind_direction);
    const relPressure = field(pressure.relative);
    const rainRate = field(rainfall.rain_rate);
    const rainEvent = field(rainfall.event);
    const rainDaily = field(rainfall.daily);

    const result = {
        tempC: toCelsius(temp.unit, temp.value),
        humidity: humidity.value !== null ? parseFloat(humidity.value) : null,
        windDirDeg: windDir.value !== null ? parseFloat(windDir.value) : null,
        windSpeedKmh: toKmh(windSpeed.unit, windSpeed.value),
        pressureHpa: toHpa(relPressure.unit, relPressure.value),
        rainRateMm: toMm(rainRate.unit, rainRate.value),
        rainEventMm: toMm(rainEvent.unit, rainEvent.value),
        rainDailyMm: toMm(rainDaily.unit, rainDaily.value),
        stationTime: payload.time || null,
    };

    return new Response(JSON.stringify(result), { headers: corsHeaders() });
}

export default {
    async fetch(request, env) {
        if (request.method === 'OPTIONS') {
            return new Response(null, { headers: corsHeaders() });
        }
        try {
            return await handleRequest(env);
        } catch (err) {
            return new Response(JSON.stringify({ error: err.message || 'Unexpected error' }), {
                status: 500,
                headers: corsHeaders(),
            });
        }
    },
};
