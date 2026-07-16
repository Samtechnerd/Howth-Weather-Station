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

`app.js` in the repo root already points `DATA_SOURCE_URL` at
`https://ecowitt-live-proxy.sampatton176.workers.dev`. If your
workers.dev subdomain differs, update that constant to match the URL
`wrangler deploy` prints out.

## Response shape

```json
{
  "tempC": 14.8,
  "humidity": 82,
  "windDirDeg": 240,
  "windSpeedKmh": 18.3,
  "pressureHpa": 1008.4,
  "rainRateMm": 0,
  "rainEventMm": 0,
  "rainDailyMm": 1.2,
  "stationTime": "1700000000"
}
```

Any field that Ecowitt doesn't return comes back as `null`; the frontend
already renders `--` for that case.

## If the field names don't match

Ecowitt's `device/real_time` response is grouped by category
(`outdoor`, `wind`, `pressure`, `rainfall`, etc.), each leaf shaped like
`{ "time": ..., "unit": ..., "value": ... }`. `worker.js` reads
`outdoor.temperature`, `outdoor.humidity`, `wind.wind_speed`,
`wind.wind_direction`, `pressure.relative`, `rainfall.rain_rate`,
`rainfall.event`, and `rainfall.daily`. If any of these come back empty,
call the endpoint directly with `call_back=all` in a browser and check the
actual field names returned for your device/firmware, then adjust the
`field(...)` lookups in `worker.js` to match.
