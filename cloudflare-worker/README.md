# Ecowitt live-data proxy

Replaces the old Weather Underground-based proxy with a direct call to
Ecowitt's own Cloud API (`api.ecowitt.net`), so the dashboard reads straight
from the station's native platform instead of round-tripping through WU.

## 1. Get your Ecowitt API credentials

1. Sign in at https://www.ecowitt.net (use the account this station is
   registered to).
2. Go to **My Profile** (or account settings) and look for **API** —
   generate/copy your **Application Key** and **API Key**. If you don't see
   an API section, Ecowitt requires requesting API access first from the
   same page.
3. Go to **My Devices**, open this station, and copy its **MAC address**
   (looks like `5C:CF:7F:XX:XX:XX`).

## 2. Deploy the worker

From this directory:

```bash
npx wrangler login
npx wrangler secret put ECOWITT_APPLICATION_KEY
npx wrangler secret put ECOWITT_API_KEY
npx wrangler secret put ECOWITT_MAC
npx wrangler deploy
```

This deploys a worker named `ecowitt-live-proxy`, reachable at:

```
https://ecowitt-live-proxy.<your-workers-dev-subdomain>.workers.dev
```

## 3. Point the site at it

`app.js` and `charts.js` in the repo root already point at
`https://ecowitt-live-proxy.sampatton176.workers.dev`. If your
workers.dev subdomain differs, update the `DATA_SOURCE_URL` constant in
both files to match the URL `wrangler deploy` prints out.

## Routes

### `GET /` — current conditions

Polled by `app.js` every ~60s.

```json
{
  "tempC": 14.8,
  "dewPointC": 11.2,
  "humidity": 82,
  "indoorTempC": 21.6,
  "indoorHumidity": 45,
  "windDirDeg": 240,
  "windSpeedKmh": 18.3,
  "windGustKmh": 24.1,
  "pressureHpa": 1008.4,
  "rainRateMm": 0,
  "rainEventMm": 0,
  "rainDailyMm": 1.2,
  "rainWeeklyMm": 4.8,
  "rainMonthlyMm": 12.6,
  "rainYearlyMm": 482,
  "solarWm2": 22.6,
  "uvi": 0,
  "consoleBatteryV": 4.07,
  "stationTime": "1700000000"
}
```

### `GET /trends` — 24h conditions + 7-day rainfall

Polled by `charts.js` every ~10 min (edge-cached 10 min, so more frequent
polling wouldn't get fresher data anyway).

```json
{
  "temperature": [{ "t": 1700000000000, "v": 14.2 }, ...],
  "windSpeed":   [{ "t": 1700000000000, "v": 12.1 }, ...],
  "pressure":    [{ "t": 1700000000000, "v": 1012.3 }, ...],
  "rainfallDaily": [{ "t": 1700000000000, "v": 1.2 }, ...]
}
```

`t` is a millisecond Unix timestamp, `v` is already metric. Any series that
fails to parse comes back as `[]` rather than breaking the response — see
below.

Any field the current-conditions endpoint doesn't return comes back as
`null`; the frontend already renders `--` for that case.

## If the field names don't match

Ecowitt's `device/real_time` response is grouped by category (`outdoor`,
`indoor`, `wind`, `pressure`, `rainfall_piezo` or `rainfall`,
`solar_and_uvi`, `battery`, etc.), each leaf shaped like
`{ "time": ..., "unit": ..., "value": ... }`. This station uses Ecowitt's
piezo rain sensor, so its rainfall fields live under `rainfall_piezo`
(confirmed from a live response on 2026-07-16) — `worker.js` reads that
group and falls back to `rainfall` for tipping-bucket stations.

The `/trends` endpoint calls `device/history`, which — per Ecowitt's docs
and community integrations — mirrors the same nested shape but with a
`list: { "<unix_seconds>": "<value>" }` object instead of a single `value`.
This wasn't verified against a live response while building this (the
sandbox that built it can't reach `api.ecowitt.net`), so if the trend
charts show no data:

1. Call `/trends` on your deployed worker directly in a browser.
2. If it returns empty arrays, call `device/history` directly —
   `https://api.ecowitt.net/api/v3/device/history?application_key=...&api_key=...&mac=...&start_date=2026-07-15%2000:00:00&end_date=2026-07-16%2000:00:00&cycle_type=30min&call_back=outdoor.temperature`
   — and check the actual shape returned.
3. Adjust `toSeries()` / the `call_back` field paths in `worker.js` to match.
