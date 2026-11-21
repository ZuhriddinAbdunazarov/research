# MARS × MOON — Interplanetary Scientific Data Explorer

A scientific web platform about Mars and Earth's Moon built on authentic NASA / JPL data
(NASA Space Apps Challenge). Part of the *Mission Mars* repository; it does not modify the Unity game or the handbook.

## Run locally
```bash
cd Explorer
cp .env.example .env      # optional: add NASA_API_KEY (free at https://api.nasa.gov/)
npm start                 # http://localhost:8080   (Node ≥ 18, no npm install needed)
npm test                  # unit tests (Horizons parser, Mars24, interpolation, phases, known events)
npm run snapshot          # optional: rebuild the cached Horizons snapshot (2020–2035)
```

## Sections
Dashboard · Mars Explorer · Moon Explorer · Mars↔Moon Distance Calculator · 3D Solar System ·
Mars vs Moon comparison · NASA Missions · NASA Image Gallery · Analytics · Data Sources & methodology.

## Data & architecture
| Data | Source | Where |
|---|---|---|
| Earth/Moon/Mars positions | JPL Horizons API (VECTORS, Sun-centred, ecliptic J2000/ICRF, km, geometric, UT) | `lib/horizons.mjs` → `/api/ephemeris` proxy (Horizons has no CORS) |
| Offline fallback | Real Horizons daily vectors 2020–2035 (`public/data/ephemeris-snapshot.json`), 4-point Lagrange interpolation (measured error ≈ 30 km) | `public/js/services/ephemeris.js` |
| Picture of the Day | NASA APOD (api.nasa.gov) | `lib/apod.mjs` → `/api/apod` (key stays server-side) |
| Images | NASA Image and Video Library (images-api.nasa.gov, CORS, no key) | `public/js/services/nasa.js` |
| Reference constants | NASA NSSDCA fact sheets, NASA Science pages | `public/js/data/*.js` (each value cites its source) |
| Mars time / season | NASA GISS Mars24 algorithm | `public/js/services/marsTime.js` |

The UI labels every value as LIVE, CACHED, REFERENCE, CALCULATED or ILLUSTRATIVE.
Single-instant distances are cross-checked against an independent Horizons query (Mars observed from the Moon's centre, `500@301`).

## Environment variables
| Variable | Required | Purpose |
|---|---|---|
| `NASA_API_KEY` | No (falls back to `DEMO_KEY`, ~30 req/h/IP) | APOD on the dashboard |
| `PORT` | No (8080) | Local server port |

JPL Horizons and the NASA Image Library need no key.

## Deploy (Netlify)
`Site/assemble.sh` copies `Explorer/public` to `/explorer/`. Deploy the functions too:
`netlify deploy --prod --dir Build/Netlify --functions Explorer/netlify/functions`
and set `NASA_API_KEY` in the site environment. Without functions the site still works on cached Horizons data (clearly labelled).

## Credits
Mars & Earth textures: NASA 3D Resources. Moon texture: NASA SVS CGI Moon Kit (LRO LROC).
Star map: NASA (Hipparcos). Photos: NASA/JPL-Caltech (public domain). Not an official NASA product.
